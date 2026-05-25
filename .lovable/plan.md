
# خطة شاملة: ترقية إلى **Enterprise Document Rendering Subsystem**

تطوير الخطة السابقة لتنتقل من **«Export Feature»** إلى **«Document Rendering Platform»** كاملة مع طبقة Domain، Render Profiles لكل نوع مستند، Versioning، Asset Lifecycle، Auditability، وعزل المعاينة.

---

## المعمارية المستهدفة (الطبقات)

```text
┌─────────────────────────────────────────────┐
│ UI Layer        ExportCenterPage + Sections │
│                 LivePreviewPanel             │
├─────────────────────────────────────────────┤
│ Application     usePdfSettings (React Query) │
│                 PreviewRenderAdapter         │
│                 useAssetLifecycle            │
├─────────────────────────────────────────────┤
│ Domain          RenderProfile / PdfTheme     │
│                 PdfLayout / PdfBranding      │
│                 PdfWatermark / Versioning    │
├─────────────────────────────────────────────┤
│ Infrastructure  pdfSettingsRepository        │
│                 assetRepository (Storage)    │
│                 auditLogRepository           │
├─────────────────────────────────────────────┤
│ Engine          PdfRenderService             │
│                 → HtmlPdfEngine / JsPdfEngine│
└─────────────────────────────────────────────┘
```

**Source of Truth واحد:** `DocumentRenderProfile` يُغذّي **DB + Preview + Engine** معاً.

---

## المراحل الثمانية

### المرحلة 1 — Domain Layer (`src/domain/pdf/`)

ملفات نقية بلا أي اعتماد على React/Supabase:

```
src/domain/pdf/
├── entities/
│   ├── DocumentRenderProfile.ts   ← الكيان الجذر
│   └── PdfAsset.ts
├── value-objects/
│   ├── PdfTheme.ts
│   ├── PdfLayout.ts
│   ├── PdfBranding.ts
│   ├── PdfWatermark.ts
│   ├── PdfTypography.ts
│   └── ProfileVersion.ts
├── services/
│   ├── ProfileValidator.ts        ← يستخدم pdfConfigSchema (Zod)
│   ├── ProfileMerger.ts           ← دمج global + scoped
│   └── ProfileDiff.ts             ← للتدقيق
└── rendering/
    └── RenderProfileMapper.ts     ← Profile → PdfConfig
```

`DocumentRenderProfile`:
```ts
{
  id, tenantId, version, updatedBy, updatedAt,
  scopeType: 'global'|'invoice'|'quotation'|'purchase_order'|'delivery_note'|'statement',
  scopeId?: uuid,                  // مستقبلاً: لكل عميل/فرع
  layout: PdfLayout,
  typography: PdfTypography,
  branding: PdfBranding,
  watermark: PdfWatermark,
  header: { html?, height, showOnFirstPage },
  footer: { html?, height, pageNumbers },
  assets: { logoId?, watermarkImageId? },
}
```

`PdfWatermark` المحسّن:
```ts
{
  enabled, type: 'text'|'image',
  text?, imageAssetId?,
  opacity (0..1), rotation (-180..180),
  scale (0.1..3), position: 'center'|'top-left'|...|'tiled',
  repeat: boolean,
}
```

اختبارات وحدة لكل value-object (≥20 اختبار).

### المرحلة 2 — Database: جدول + إصدارات + تدقيق + أصول

**Migration رئيسية:**

```sql
-- 1) profiles مع versioning + scope + auditability
CREATE TABLE public.tenant_pdf_profiles (
  id uuid PK,
  tenant_id uuid NOT NULL,
  scope_type text NOT NULL DEFAULT 'global',  -- global|invoice|quotation|...
  scope_id uuid,                                -- nullable
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  -- layout
  page_size text, orientation text,
  margin_top/right/bottom/left numeric,
  -- typography
  primary_font text, base_font_size numeric, line_height numeric, letter_spacing numeric,
  -- header/footer
  header_height numeric, footer_height numeric,
  header_html text, footer_html text,
  show_page_numbers boolean, page_number_format text,
  -- jsonb للقابلية للتوسع
  branding jsonb NOT NULL DEFAULT '{}',
  watermark jsonb NOT NULL DEFAULT '{}',
  -- assets (FK)
  logo_asset_id uuid REFERENCES tenant_pdf_assets(id),
  watermark_asset_id uuid REFERENCES tenant_pdf_assets(id),
  -- audit
  created_by uuid, updated_by uuid,
  created_at, updated_at,
  UNIQUE(tenant_id, scope_type, scope_id, version)
);

-- 2) أصول مع دورة حياة
CREATE TABLE public.tenant_pdf_assets (
  id uuid PK, tenant_id uuid NOT NULL,
  kind text NOT NULL,                  -- logo|watermark
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  width integer, height integer,
  checksum text,                       -- لمنع التكرار
  uploaded_by uuid,
  ref_count integer DEFAULT 0,
  deleted_at timestamptz,              -- soft delete
  created_at
);

-- 3) سجل التغييرات
CREATE TABLE public.tenant_pdf_profile_audit (
  id uuid PK, tenant_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  version_from integer, version_to integer,
  changed_by uuid, changed_at,
  diff jsonb NOT NULL                   -- ناتج ProfileDiff
);
```

- **RLS**: كل الجداول بـ `tenant_id = get_current_tenant_id()`.
- **Validation triggers** (ليس CHECK): page_size enum، margins 0-100، base_font_size 8-24، line_height 1-3.
- **Optimistic locking trigger**: `UPDATE` يجب أن يرفع `version` ويفشل إذا كان الـversion في الطلب ≠ الحالي → يمنع overwrite race.
- **Audit trigger**: بعد كل UPDATE → INSERT في `tenant_pdf_profile_audit` مع diff.
- **Storage bucket** `pdf-branding` (private) + RLS بـ tenant_id من `storage.foldername(name)[1]`.
- **Cleanup function** `cleanup_orphan_pdf_assets()` (تُجدول لاحقاً عبر pg_cron): تحذف الأصول `ref_count = 0` الأقدم من 7 أيام.

### المرحلة 3 — Infrastructure Layer

ملفات repos:
- `src/lib/repositories/pdfProfileRepository.ts` — CRUD + scope-aware fetch + version-safe upsert.
- `src/lib/repositories/pdfAssetRepository.ts` — upload (مع checksum)، signed URL، increment/decrement ref_count، soft delete.
- `src/lib/repositories/pdfAuditRepository.ts` — جلب آخر N تغيير + diff معروض بالعربية.

قواعد دورة حياة الأصول (مفروضة):
- التحقق من MIME الفعلي (magic bytes) لا الـextension.
- حد أقصى: 2MB، أبعاد ≤ 2000×2000.
- استبدال الشعار → decrement ref_count القديم → trigger cleanup async.
- Signed URLs فقط (لا public bucket).

### المرحلة 4 — Application Layer (Hooks)

```
src/hooks/pdf/
├── usePdfProfile.ts          ← React Query، scope-aware، optimistic + version retry
├── usePdfAsset.ts            ← رفع + تتبع التقدم + معاينة فورية
├── useAssetLifecycle.ts      ← cleanup عند unmount/استبدال
├── usePreviewAdapter.ts      ← يعزل form state عن preview (debounced + memoized)
└── usePdfAudit.ts            ← سجل آخر 20 تغيير
```

**`PreviewRenderAdapter`** (الأهم لمنع re-renders):
- `useDeferredValue` + `useMemo` على hash الـprofile.
- يستقبل `formState` (يتغيّر كل keystroke) → يبثّ `stableProfile` (≤100ms).
- يحقن `RenderProfileMapper.toPdfConfig()` فقط عند تغيّر فعلي.

**Migration Safety:**
- Hook موحّد `useExportSettings` يقرأ:
  1. DB profile إذا وُجد.
  2. localStorage fallback إذا offline أو DB فارغ.
  3. defaults من Domain.
- Banner تنبيهي عند العمل بـlocalStorage فقط.
- مزامنة تلقائية عند عودة الاتصال.

### المرحلة 5 — UI Layer

```
src/components/settings/ExportCenter/
├── ExportCenterPage.tsx           ← split-screen: left tabs / right sticky preview
├── LivePreviewPanel.tsx           ← يتلقى stableProfile من Adapter فقط
├── ProfileScopeSelector.tsx       ← global / invoice / quotation / ...
├── ProfileVersionBadge.tsx        ← v3 • آخر تعديل: أحمد قبل ساعتين
├── AuditTimeline.tsx              ← Drawer يعرض آخر التغييرات بالعربية
├── sections/
│   ├── LayoutSection.tsx
│   ├── TypographySection.tsx
│   ├── BrandingSection.tsx        ← شعار + ألوان
│   ├── WatermarkSection.tsx       ← text/image/tiled/position
│   ├── HeaderFooterSection.tsx
│   └── AccessibilitySection.tsx   ← فحص التباين AA، fallback fonts
└── AssetUploader.tsx              ← Dropzone + magic-byte check + crop
```

**Profile Scope Selector**: يسمح بضبط Profile مختلف لكل نوع مستند (Invoice, Quotation, PO, Delivery Note, Statement).

**Accessibility Section** (جديد):
- فحص تباين تلقائي بين `primaryColor`/`textColor` (يجب ≥ 4.5:1).
- معاينة fallback chain للخطوط (Cairo → Tajawal → Amiri → system).
- تحذير إذا الهوامش < 8mm (غير قابلة للطباعة على معظم الطابعات).

### المرحلة 6 — Engine Abstraction

```
RenderProfile ──► PdfRenderService ──► IPdfEngine
                       │                  ├── HtmlPdfEngine
                       │                  └── JsPdfEngine
                       └── injects: font preload cache, asset cache, theme
```

- `src/lib/pdf/services/PdfRenderService.ts` (جديد) — الواجهة الوحيدة التي يستخدمها أي استدعاء تصدير.
- المحركات الحالية تبقى كما هي لكن لا تُستدعى مباشرة من UI.
- استبدال تدريجي لكل callsite (`printInvoiceHtmlPdf`, `bulkInvoicePdfGenerator`, `statementPdfGenerator`).

**Caching:**
- `fontCache` (موجود) + توسعته لـ asset cache (URL → Blob).
- `previewMemo`: نفس `profileHash` → نفس عقدة DOM (لا re-mount).

### المرحلة 7 — Testing Matrix

| النوع | الملفات | عدد الاختبارات |
|---|---|---|
| Unit — Domain | `PdfTheme.test`, `PdfLayout.test`, `PdfWatermark.test`, `ProfileMerger.test`, `ProfileDiff.test` | ~25 |
| Unit — Hooks | `usePdfProfile.test`, `usePreviewAdapter.test`, `useAssetLifecycle.test` | ~12 |
| Unit — Repo | `pdfProfileRepository.test` (version conflict)، `pdfAssetRepository.test` (checksum dedup) | ~8 |
| Integration | upload → ref_count↑ → save profile → preview reflects → fetch fresh → version=2 | 4 |
| RLS Security | tenant A لا يرى profiles/assets tenant B (`src/__tests__/security/pdf-profile-isolation.test.ts`) | 3 |
| E2E (Playwright) | `e2e/pdf-customization.spec.ts`: تعديل خط → معاينة → حفظ → توليد PDF حقيقي → مقارنة snapshot | 5 |

### المرحلة 8 — Migration & Rollout

1. **Phase A** — Domain + DB + Repos (بدون UI). Feature flag `pdf_profiles_v2 = off`.
2. **Phase B** — UI الجديد خلف الـflag، يقرأ DB لكن يكتب لـlocalStorage **و** DB (dual-write).
3. **Phase C** — تفعيل DB كمصدر أساسي، localStorage = fallback.
4. **Phase D** — استبدال callsites المحرّك بـ`PdfRenderService`.
5. **Phase E** — حذف المسارات القديمة + تفعيل cleanup pg_cron.

كل مرحلة قابلة للـrollback مستقل.

---

## الملفات (الإجمالي)

**جديدة (~28):**
- Domain (10): entities + value-objects + services + rendering mapper.
- DB (1 migration كبير).
- Repos (3).
- Hooks (5 تحت `src/hooks/pdf/`).
- UI (10): ExportCenter + 6 sections + Preview + Audit + Scope + Asset uploader.
- Service (1): `PdfRenderService.ts`.
- Tests (~12 ملف).

**معدّلة (5):**
- `useExportSettings.ts` (تكامل DB + Domain).
- `ExportCenterPage.tsx` (split-screen + scope selector).
- `HtmlPdfEngine.ts` (يقبل `RenderProfile`).
- `routePdfRequest.ts` (يستخدم `PdfRenderService`).
- `mem://pdf/font-preference` (تحديث).

---

## معايير القبول النهائية

- ✅ **Single Source of Truth**: `DocumentRenderProfile` يُغذّي DB + Preview + Engine.
- ✅ **Versioning + Optimistic Locking**: لا overwrite بدون مطابقة version.
- ✅ **Audit Trail**: كل تغيير مسجَّل مع diff و updated_by.
- ✅ **Asset Lifecycle**: ref_count، soft delete، cleanup مجدول، magic-byte validation.
- ✅ **Render Profiles per Document Type**: 5 scopes + global fallback عبر `ProfileMerger`.
- ✅ **Preview Isolation**: `PreviewRenderAdapter` يمنع re-renders، latency ≤100ms.
- ✅ **Engine Abstraction**: لا callsite يستدعي المحرّك مباشرة بعد Phase D.
- ✅ **Migration Safety**: dual-write + feature flag + rollback لكل phase.
- ✅ **Accessibility**: تباين AA إلزامي، RTL، fallback chain، تحذير هوامش الطباعة.
- ✅ **Security**: RLS على 3 جداول + Storage RLS + tenant isolation tests.
- ✅ **Testing**: ≥ 50 اختبار جديد (unit + integration + RLS + e2e).
- ✅ **Performance**: font/asset cache، memoized preview، preload chain.

---

## ترتيب التنفيذ المقترح (8 موجات)

1. Domain Layer + Unit tests (بدون أي تأثير على UI).
2. DB migration (3 جداول + triggers + RLS + bucket) — يحتاج موافقتك.
3. Repos + Hooks + PreviewRenderAdapter.
4. UI: ExportCenterPage الجديد + 6 sections + Scope selector.
5. AssetUploader + Lifecycle + Audit Timeline.
6. PdfRenderService + ربط محرّك واحد (Invoice).
7. استبدال باقي callsites + إزالة fallback القديم.
8. E2E + cleanup pg_cron + توثيق + تحديث mem://.

---

اعتمد الخطة لأبدأ بالموجة 1 (Domain Layer + اختباراتها — صفر مخاطر، صفر تأثير على الإنتاج).
