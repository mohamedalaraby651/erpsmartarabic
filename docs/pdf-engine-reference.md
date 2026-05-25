# مرجع نظام توليد PDF والتصدير (PDF Engine Reference)

> وثيقة هندسية حيّة — تُحدَّث مع كل تغيير في طبقة التصدير. الهدف: مرجع موحّد قبل أي توسعة لـ "v2 PDF Engine".
>
> آخر تحديث: 2026-05-25 · النطاق: `src/lib/pdf/**`, `src/domain/pdf/**`, `src/components/settings/ExportCenter/**`, جداول `tenant_pdf_*`.

---

## 1. البنية الحالية وخريطة الملفات

### 1.1 شجرة المجلدات الرئيسية

```
src/
├── lib/pdf/
│   ├── arabic/                    # دعم RTL والـ shaping
│   │   ├── bidi.ts                # كسر النصوص ثنائية الاتجاه + sanitize للعلامات الخفية
│   │   ├── arabicCss.ts           # توليد CSS خاص بالعربية (direction, font-feature-settings)
│   │   └── typographyRules.ts     # قواعد kashida / تمديد الحروف / line-height محسوب
│   ├── config/
│   │   ├── PageConfig.ts          # أبعاد A3/A4/A5/Letter/Legal بـ mm + portrait/landscape
│   │   ├── ThemeConfig.ts         # ألوان/شعار/خطوط (legacy، يُستبدل تدريجياً بـ DocumentRenderProfile)
│   │   └── pdfConfigSchema.ts     # Zod schema لمدخلات الإعدادات
│   ├── engine/
│   │   ├── IPdfEngine.ts          # عقد موحّد لجميع المحركات
│   │   ├── HtmlPdfEngine.ts       # المحرّك الأساسي (html2canvas + jsPDF) — يدعم RTL والخطوط الكاملة
│   │   ├── JsPdfEngine.ts         # محرّك نصّي خفيف — fallback للأجهزة الضعيفة
│   │   └── pickEngine.ts          # اختيار المحرّك بناءً على adaptive settings والـ feature flags
│   ├── fonts/
│   │   ├── fontRegistry.ts        # تسجيل Cairo / Tajawal / Amiri / Noto Naskh Arabic
│   │   ├── fontCache.ts           # IndexedDB cache للخطوط (تجنّب إعادة التحميل)
│   │   └── fontPreference.ts      # قراءة `company_settings.pdf_font` + mirror إلى localStorage
│   ├── layout/
│   │   ├── overflowGuard.ts       # كشف تجاوز المحتوى لحدود الصفحة
│   │   └── tablePagination.ts     # تقسيم الجداول الطويلة عبر صفحات متعددة
│   ├── routing/
│   │   ├── routePdfRequest.ts     # نقطة الدخول الموحدة لكل طلبات PDF
│   │   └── canaryRollout.ts       # تدرّج إطلاق v2 لمجموعة tenants
│   ├── services/
│   │   └── PdfRenderService.ts    # جسر domain ↔ engine: يحلّ الـ profile ويُحوّله إلى PdfConfigInput
│   ├── templates/                 # قوالب HTML لكل نوع مستند
│   │   ├── BaseTemplate.ts        # هيكل مشترك (head, meta, fonts injection)
│   │   ├── InvoiceHtmlTemplate.ts
│   │   ├── QuotationHtmlTemplate.ts
│   │   ├── PurchaseOrderHtmlTemplate.ts
│   │   ├── StatementHtmlTemplate.ts
│   │   └── templateRegistry.ts    # mapping: docType → template
│   ├── utils/
│   │   ├── filename.ts            # توليد أسماء ملفات معيارية (نوع_رقم_تاريخ.pdf)
│   │   └── formatters.ts          # تنسيق أرقام/تواريخ/عملات بالعربية
│   ├── featureFlags.ts            # PDF_ENGINE_V2, PDF_PROFILES_ENABLED ...
│   ├── printInvoiceHtmlPdf.ts     # واجهة عالية المستوى للفواتير
│   ├── printQuotationHtmlPdf.ts
│   ├── printPurchaseOrderHtmlPdf.ts
│   ├── printStatementHtmlPdf.ts
│   └── index.ts                   # public API
│
├── domain/pdf/                    # Domain-Driven Layer (Wave 1)
│   ├── entities/
│   │   ├── DocumentRenderProfile.ts   # كيان رئيسي: id + scope + version + value-objects
│   │   └── PdfAsset.ts                # ميتاداتا أصل (شعار/علامة مائية) + ref_count
│   ├── value-objects/
│   │   ├── PdfLayout.ts               # pageSize, orientation, margins
│   │   ├── PdfTypography.ts           # heading/body/mono fonts + sizes + line-height
│   │   ├── PdfBranding.ts             # company info + logo assetId + colors
│   │   ├── PdfWatermark.ts            # text/image + 5 positions + tiled + scale/rotation/opacity
│   │   ├── PdfTheme.ts                # primary/secondary/accent (HSL)
│   │   └── ProfileVersion.ts          # semver-like: major.minor.patch
│   ├── services/
│   │   ├── ProfileMerger.ts           # merge(global, scoped) → effective profile
│   │   └── ProfileDiff.ts             # JSONB diff للـ audit log
│   ├── rendering/
│   │   └── RenderProfileMapper.ts     # DocumentRenderProfile → PdfConfigInput (engine-ready)
│   └── index.ts
│
├── components/settings/ExportCenter/
│   ├── ExportCenterPage.tsx           # الصفحة الرئيسية (4 tabs)
│   ├── FormatPreferencesSection.tsx   # CSV/Excel preferences
│   ├── RenderProfileSection.tsx       # محرر الـ profile (Layout/Typography/Branding/Watermark)
│   └── LivePreviewPanel.tsx           # معاينة حيّة pixel-perfect لكل page size/orientation
│
├── hooks/
│   ├── usePdfProfile.ts               # React Query: fetch/update + invalidate render cache
│   └── useExportPdf.ts                # hook استدعاء عالي المستوى للمكوّنات
│
└── lib/repositories/
    └── pdfProfilesRepository.ts       # mapping DB rows ↔ DocumentRenderProfile
```

### 1.2 طبقة التخزين (Supabase)

| الجدول/المورد | الغرض | RLS |
|---|---|---|
| `tenant_pdf_profiles` | تخزين الإعدادات (global / scoped) + versioning | tenant-isolated، الكتابة `admin` فقط |
| `tenant_pdf_assets` | شعار/علامة مائية + `ref_count` للحماية من الحذف | tenant-isolated، الكتابة `admin` فقط |
| `tenant_pdf_profile_audit` | سجل التغييرات (JSONB diff) | قراءة tenant-isolated فقط |
| Storage bucket `pdf-branding` | تخزين خاص للأصول البصرية | RLS عبر `tenant_id/...` prefix |
| Trigger `fn_log_pdf_profile_change` | تسجيل الـ diff تلقائياً على كل UPDATE | — |

### 1.3 تدفّق البيانات (Data Flow)

```
┌────────────────────────────────────────────────────────────────────┐
│  UI Layer (InvoiceQuickActions, useExportPdf, ExportCenterPage)    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ tenantId, docType, payload
                               ▼
                ┌──────────────────────────────┐
                │   routePdfRequest()          │  ← نقطة الدخول الموحّدة
                │   - feature flags            │
                │   - canary rollout           │
                └──────────────┬───────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
   ┌──────────────────────┐         ┌──────────────────────┐
   │  PdfRenderService    │         │  pickEngine()        │
   │  - resolveActive()   │         │  - HtmlPdfEngine     │
   │  - merge global+     │         │  - JsPdfEngine       │
   │    scoped            │         │    (fallback)        │
   │  - TTL cache (60s)   │         └─────────┬────────────┘
   │  - → PdfConfigInput  │                   │
   └──────────┬───────────┘                   │
              │                               │
              └───────────────┬───────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  print*HtmlPdf()       │
                  │  + templateRegistry    │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  BaseTemplate + fonts  │
                  │  + arabicCss + bidi    │
                  │  + overflowGuard       │
                  └───────────┬────────────┘
                              ▼
                       ┌────────────┐
                       │  PDF Blob  │
                       └────────────┘
```

**الجسر الحيوي**: `RenderProfileMapper` يحوّل الكيان النظيف (`DocumentRenderProfile`) إلى الشكل القديم (`PdfConfigInput`) دون تعديل المحركات — مما يسمح بالاستبدال التدريجي.

---

## 2. تقييم دعم العربية و RTL

### 2.1 ما يعمل جيداً

- **خطوط مضمّنة** عبر `fontRegistry`: Cairo (افتراضي)، Tajawal، Amiri، Noto Naskh Arabic — مع IndexedDB cache (`fontCache`) لتفادي إعادة التحميل.
- **`bidi.ts`** يطبّق `sanitizeBidiMarkers()` لإزالة العلامات الخفية (U+200E/F، U+202A–E، U+2066–9) قبل الحقن في DOM — متوافق مع memory `[Data Sanitization]`.
- **`arabicCss.ts`** يحقن `direction: rtl; text-align: right; font-feature-settings: "liga", "calt";` على المستوى الجذري للقالب.
- **`HtmlPdfEngine`** يستخدم html2canvas الذي يحترم الـ shaping الأصلي للمتصفّح → لا تكسير للحروف العربية.
- **`fontPreference.ts`** يقرأ `company_settings.pdf_font` و يعكسه إلى localStorage — متوافق مع memory `[PDF Font Preference]`.

### 2.2 قيود ومشاكل معروفة

| المشكلة | المحرّك | الخطورة | الحالة |
|---|---|---|---|
| `JsPdfEngine` لا يدعم shaping عربي كامل (يعتمد TTF embed مباشر) | JsPdf | متوسطة | مستخدم كـ fallback فقط |
| Kashida (تمديد) غير مفعّل افتراضياً في `typographyRules` | الكل | منخفضة | قابل للتفعيل عبر profile لاحقاً |
| الأرقام العربية-الهندية (٠–٩) vs الغربية (0–9) تعتمد على `formatters.ts` فقط — لا يوجد toggle في الـ profile | الكل | متوسطة | مقترح ضمن v2 |
| Mixed bidi في الجداول (نص عربي + أرقام لاتينية) قد يُسبب قفز المؤشر في بعض المتصفحات قبل التصدير | HtmlPdf | منخفضة | يُحل عبر `unicode-bidi: isolate` المضاف في `arabicCss` |
| عدم وجود اختبار visual regression لرندر العربية تحديداً | — | عالية | مفقود — مقترح في الخارطة |

---

## 3. مراجعة قابلية التخصيص

### 3.1 مصفوفة المعاملات

| المعامل | الحالة قبل v2 | الحالة الحالية | المصدر |
|---|---|---|---|
| Page size (A3/A4/A5/Letter/Legal) | hardcoded A4 | ✅ قابل للتخصيص | `PdfLayout.pageSize` |
| Orientation | hardcoded portrait | ✅ قابل للتخصيص | `PdfLayout.orientation` |
| Margins (top/right/bottom/left) | hardcoded 15mm | ✅ قابل للتخصيص (mm) | `PdfLayout.margins` |
| Heading font + size + weight | hardcoded Cairo 16 | ✅ | `PdfTypography.heading` |
| Body font + size + line-height | hardcoded Cairo 11 | ✅ | `PdfTypography.body` |
| Mono font (للأرقام) | غير موجود | ✅ | `PdfTypography.mono` |
| Theme colors (primary/secondary/accent) | hardcoded HSL | ✅ | `PdfTheme` |
| Company name/tax#/address | من `company_settings` فقط | ✅ override per profile | `PdfBranding` |
| Logo | غير مدعوم (نص فقط) | ⚠️ `assetId` معرّف لكن **رفع الصورة غير مكتمل** | `PdfBranding.logoAssetId` |
| Watermark text | غير موجود | ✅ نص فقط | `PdfWatermark.text` |
| Watermark image | معرّف في الـ schema | ⚠️ **غير مفعّل بعد** | `PdfWatermark.imageAssetId` |
| Watermark position (5 + tiled) | — | ✅ | `PdfWatermark.position` |
| Watermark scale/rotation/opacity | — | ✅ | `PdfWatermark.*` |
| Custom header/footer text | hardcoded | ✅ | `PdfBranding.header/footer` |
| Page numbers | hardcoded "صفحة x من y" | ⚠️ غير قابل للتخصيص بعد | — |
| Fiscal/tax disclaimers | hardcoded | ⚠️ غير قابل للتخصيص | — |

### 3.2 آلية الدمج (Merge)

`ProfileMerger.merge(global, scoped?)`:
- إذا لم يوجد scoped → يعود global.
- إذا وجد scoped → deep-merge: `scoped` يطغى على `global` في الحقول المعرّفة فقط (undefined لا يكتب فوق).
- يحفظ الإصدار النهائي بـ `ProfileVersion.bump('patch'|'minor'|'major')`.

### 3.3 سجل التدقيق (Audit)

`ProfileDiff.compute(prev, next)` → ينتج JSONB من النمط:
```json
{
  "layout.margins.top": { "from": 15, "to": 20 },
  "branding.companyName": { "from": "Acme", "to": "Acme Ltd" }
}
```
يُكتب تلقائياً عبر trigger `fn_log_pdf_profile_change` بعد كل UPDATE.

### 3.4 ربط القالب الديناميكي

- `templateRegistry.get(docType)` → القالب المناسب.
- القالب يستقبل `(payload, mappedConfig)` ويولّد HTML نقي (بدون style مدمج خارج `<style>`).
- بيانات JSON (الفواتير/العروض) تُمرَّر مباشرة — لا توجد طبقة DSL وسيطة بعد.

---

## 4. المشاكل والـ Edge Cases الحالية

### 4.1 Overflow & Pagination

- `overflowGuard.ts` يقيس ارتفاع المحتوى بعد render، لكنه **لا يتدخل** — مجرد warn في console.
- `tablePagination.ts` يقسّم الجداول بناءً على عدد الصفوف، **ليس** بناءً على الارتفاع الفعلي → صفوف ذات محتوى طويل قد تُقطع.
- الفواتير >50 صف قد تُسبب تأخير html2canvas يصل إلى 8 ثوانٍ على mobile.

### 4.2 الأداء و Bundle Size

| المكتبة | الحجم (تقريباً) | ملاحظات |
|---|---|---|
| `jspdf` | ~350KB | مستخدم في كلا المحركين |
| `html2canvas` | ~200KB | محمّل dynamically في `HtmlPdfEngine` فقط |
| خطوط Cairo + Amiri (woff2) | ~180KB كلٌّ | مخزّنة في IndexedDB بعد أول تحميل |

✅ Lazy-loading مفعّل عبر `import()` في `pickEngine`.

### 4.3 Cache Staleness

- `PdfRenderService` يحتفظ بـ TTL=60s لكل (tenantId, docType).
- `usePdfProfile` يستدعي `invalidatePdfRenderCache()` بعد كل save → غالباً آمن.
- **خطر**: تحديث الـ profile من tab آخر لا يُلغي الـ cache في tab الحالي حتى انتهاء الـ TTL.

### 4.4 تكرار الكود (Architectural Debt)

- 4 ملفات `print*HtmlPdf.ts` بنفس البنية تقريباً (template lookup → engine call → blob).
- 4 قوالب `*HtmlTemplate.ts` تكرر header/footer/branding section يدوياً.
- مقترح: استخراج `TemplateComposer` بـ slot-based composition.

### 4.5 ميزات ناقصة حرجة

- ❌ **`AssetUploader`** غير منفّذ: لا يمكن رفع شعار/علامة مائية كصورة.
- ❌ **Audit Timeline UI**: البيانات تُكتب لكن لا يوجد عرض لها في `ExportCenterPage`.
- ❌ **Visual regression tests**: لا يوجد pipeline لمقارنة مخرجات PDF تلقائياً.
- ❌ **Branch/User scope inheritance**: `ProfileMerger` يدعم مستويين فقط (global+scoped) — لا يوجد tenant→branch→user explicit.

### 4.6 الأمن

- ✅ RLS على جميع جداول `tenant_pdf_*` مع فحص `tenant_id`.
- ✅ Storage bucket `pdf-branding` خاص، يتطلب signed URLs.
- ⚠️ Edge case: `ref_count` على `tenant_pdf_assets` يُزاد يدوياً من repository — لا يوجد trigger يضمن التزامن إذا تم insert/update مباشر.

---

## 5. خارطة الطريق التقنية (v2 PDF Engine)

### Wave A — إكمال الميزات المفقودة (أولوية عالية)

1. **AssetUploader Component** (`src/components/settings/ExportCenter/AssetUploader.tsx`)
   - رفع إلى bucket `pdf-branding` مع تنظيم `{tenant_id}/{asset_kind}/{uuid}.{ext}`.
   - تحديث `tenant_pdf_assets` + ربط `assetId` في `PdfBranding.logoAssetId` و `PdfWatermark.imageAssetId`.
   - معاينة فورية في `LivePreviewPanel`.

2. **توسيع `RenderProfileMapper`**
   - تحويل `assetId` إلى signed URL عبر `useSignedStorageUrl`.
   - تمرير الـ URL إلى القوالب (`logoUrl`, `watermarkImageUrl`).
   - استبدال نص العلامة المائية بصورة عند وجود `imageAssetId`.

3. **Audit Timeline UI** (`AuditTimelinePanel.tsx`)
   - استهلاك `tenant_pdf_profile_audit` مع pagination.
   - عرض الـ diff بصرياً (قبل/بعد) بالعربية.
   - زر "استعادة هذه النسخة" يكتب الإصدار القديم كنسخة جديدة.

### Wave B — إعادة هيكلة (أولوية متوسطة)

4. **Template Composition Layer**
   - `TemplateComposer` بـ slots: `header`, `body`, `footer`, `watermark`, `pageNumber`.
   - تقليل التكرار في `print*HtmlPdf.ts` من 4 ملفات → 1 + registry.

5. **Engine Strategy Registry**
   - فصل `pickEngine` عن `routePdfRequest` كـ pluggable strategies.
   - دعم محرّك ثالث (مثل pdfmake) لاحقاً دون لمس routing.

6. **Profile Inheritance الصريح**
   - تمديد `tenant_pdf_profiles.scope_type` إلى enum: `global | branch | user`.
   - `ProfileMerger.mergeChain([global, branch, user])`.

### Wave C — الجودة والاختبار (أولوية عالية مع الإطلاق)

7. **Visual Regression Pipeline**
   - تحويل PDF إلى PNG عبر `pdftoppm` في CI.
   - مقارنة pixel-diff مع baseline لكل docType + page size + locale.
   - تشغيل على كل PR يلمس `src/lib/pdf/**` أو `src/domain/pdf/**`.

8. **Streaming/Chunked Rendering**
   - للفواتير >100 صف: render صفحة-بصفحة بدل DOM واحد ضخم.
   - يقلّل ذروة الذاكرة من ~400MB → ~80MB على mobile.

9. **Real-time Cache Invalidation**
   - Supabase Realtime على `tenant_pdf_profiles` → يُلغي `PdfRenderService` cache فوراً عبر التبويبات.

### Wave D — تحسينات تجربة المستخدم

10. **Profile Templates Marketplace**
    - مجموعة من القوالب الجاهزة (Classic, Modern, Minimal, Corporate).
    - استيراد/تصدير profile كـ JSON.

11. **A11y & Print Preview**
    - تحسين `LivePreviewPanel` بـ `aria-live` على الأخطاء (موجود) + zoom controls.
    - معاينة الـ paged media الحقيقية عبر `@page` rules.

---

## 6. ملحقات

### 6.1 Feature Flags النشطة

| Flag | الافتراضي | الغرض |
|---|---|---|
| `PDF_ENGINE_V2` | true | تفعيل المسار الجديد عبر `PdfRenderService` |
| `PDF_PROFILES_ENABLED` | true | تفعيل قراءة `tenant_pdf_profiles` |
| `PDF_CANARY_TENANTS` | [] | قائمة tenants لاختبار التغييرات قبل التعميم |

### 6.2 نقاط الدخول العامة

```ts
// من أي مكان في الـ UI:
import { routePdfRequest } from "@/lib/pdf/routing/routePdfRequest";

await routePdfRequest({
  tenantId,
  docType: "invoice" | "quotation" | "purchase_order" | "statement",
  payload,           // البيانات الكاملة للمستند
  // الإعدادات تُحلّ تلقائياً من PdfRenderService
});
```

### 6.3 الذاكرات (Memories) المرتبطة

- `mem://technical-decisions/arabic-pdf-standard` — معيار محرّك العربية
- `mem://pdf/font-preference` — تفضيل خط Cairo + fallback chain
- `mem://technical-decisions/data-sanitization-policy` — تنظيف علامات Bidi

---

**ملاحظة للمطوّرين**: عند إضافة حقل جديد إلى أي value-object في `src/domain/pdf/`، يجب تحديث:
1. الـ Zod schema المقابل في `pdfConfigSchema.ts`
2. `RenderProfileMapper` لتمريره إلى الـ engine
3. `LivePreviewPanel` لعرضه بصرياً
4. هذه الوثيقة (القسم 3.1)
