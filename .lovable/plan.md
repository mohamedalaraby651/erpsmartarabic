
# خطة الهجرة الشاملة لمحرك PDF v2 — أربع مراحل

> **الأساس الموجود**: 169/169 اختبار ناجح، `src/lib/pdf/` يحتوي على `engine/`, `templates/`, `arabic/`, `config/`, `diagnostics/`, `fonts/`, `layout/`. المحرك القديم `src/lib/pdfGenerator.ts` (626 سطر) لا يزال يخدم 100% من الإنتاج عبر `pdfGeneratorLazy.ts` ومستهلَك في 13+ ملف UI. الخطة تبني فوق هذا الأساس ولا تكرّره.

---

## المرحلة 1 — التحقق المسبق وصندوق رمل العزل

### 1.1 صفحة `PdfSandboxPage` (مسار `/dev/pdf-sandbox`)
- صفحة React محمية بـ `import.meta.env.DEV` فقط، تُستثنى من البناء الإنتاجي.
- تستورد `bidi`, `typographyRules`, `arabicCss`, `printInvoiceHtmlPdf`.
- بطاقات اختبار جاهزة لـ:
  - نص عربي خالص بالتشكيل: «بِسْمِ اللهِ الرَّحْمنِ الرَّحِيمِ».
  - مختلط EN/AR: «Invoice #INV-2026-001 — فاتورة لشركة ABC International Ltd.».
  - عملات وأرقام: `1,500.50 ر.س`, `EGP 12,345.67`, `-450.00 د.ك`.
  - أسماء مؤسسية طويلة (>80 حرفاً) + سطر عنوان طويل.
  - حالات حدّية: حروف نازلة (ج/ح/ع)، لام-ألف، URL طويل، إيموجي.
- لكل بطاقة: عرض النص بعد `sanitizeBidiText` + `reshapeArabicText`، زر «صدّر PDF» يستدعي `printInvoiceHtmlPdf` مع `output:'blob'` ويعرضه في `<iframe>` للمعاينة الفورية.

### 1.2 ربط `preflightValidator` + `DataValidator` بـ React Query
- إنشاء hook موحّد `useExportPdf({ docType, data })` يلتف حول `useMutation`.
- داخل `mutationFn`:
  1. `preflightInvoice(data)` → في حال `valid:false` يرمي `PreflightError` يحمل `errors[]`.
  2. التحقق من `tenant_id`, `tax_registration_number`, `customer.name`.
  3. عند النجاح يستدعي `printInvoiceHtmlPdf` تحت `safeRender`.
- `onError` يعرض `Alert` ديناميكي (مكوّن `PdfPreflightAlert`) يسرد الحقول الناقصة بالعربية بدلاً من توليد ملف معطوب.
- يُستهلك في `UnifiedExportMenu`, `InvoiceQuickActions`, `BulkPrintConfirmDialog`.

---

## المرحلة 2 — الإطلاق التجريبي (Canary) والقياس عن بُعد

### 2.1 توسيع `featureFlags.ts` بـ Canary 10%
- إضافة `getPdfV2Rollout(): { enabled, percentage }` يقرأ:
  1. `localStorage.pdf_engine_v2 === '1'` → 100% للمستخدم.
  2. `VITE_PDF_ENGINE_V2_PERCENT` (0-100) → بناء على `hash(tenant_id + docType) % 100`.
  3. افتراضي 0% (آمن).
- إنشاء `routePdfRequest(docType, data, opts)`:
  ```text
  ┌─ shouldUseV2(docType, tenantId) ──► printInvoiceHtmlPdf
  │     ├─ success → telemetry.record({ engine:'v2', ok:true })
  │     └─ catch   → telemetry.record({ engine:'v2', ok:false, error })
  │                  └─► fallback: pdfGeneratorLazy.generatePDF(...)
  └─ else ──► pdfGeneratorLazy.generatePDF(...)
  ```
- التحديث في `UnifiedExportMenu.tsx` فقط — سطر واحد بدل استدعاء `generatePDF` المباشر.

### 2.2 مغسلة القياس (`telemetrySink` + `telemetryScheduler`)
- توسيع البنية الحالية بحقول:
  - `latencyMs` (هدف <1800ms لـ 1-3 صفحات).
  - `engine: 'v1' | 'v2'`, `docType`, `ok`, `errorCode`.
  - `memDeltaMb` من `performance.memory`.
  - `fontCacheHit: 'memory' | 'disk' | 'network'` (يضاف داخل `fontRegistry`).
- `telemetryScheduler` يجمع كل 60 ثانية ويُرسل عبر edge function `log-event` (موجود).
- لوحة `/dev/pdf-telemetry` (DEV-only) تعرض p50/p95/p99، نسبة النجاح لكل محرك، أبطأ القوالب.

---

## المرحلة 3 — هجرة القوالب الكاملة وحذف القديم

### 3.1 قوالب جديدة ترث `BaseTemplate`
- إنشاء `templates/QuotationHtmlTemplate.ts`, `PurchaseOrderHtmlTemplate.ts`, `LedgerHtmlTemplate.ts`, `StatementHtmlTemplate.ts`.
- كل قالب: `render(data, config): { html, css }` + ملف اختبار `.test.ts`.
- تسجيلها في `templateRegistry` عبر `overrideTemplate(docType, { engine: htmlPdfEngine, ... })`.
- الالتزام بـ ≤500 سطر/قالب — استخراج الترويسة/التذييل إلى `templates/partials/`.

### 3.2 خوارزمية ترقيم الصفحات بدون تصادم
```text
الإدخال: rows[], pageHeight, headerH, footerH
1) قياس ارتفاع كل صف عبر offscreen render (overflowGuard.measureRow)
2) availableH = pageHeight - headerH - footerH - safetyPadding(8mm)
3) paginateRows(rows, availableH) → chunks[]
4) لكل chunk: renderPaginatedTable مع:
     - <thead> مكرر تلقائياً (display:table-header-group)
     - tr { page-break-inside: avoid }
     - tfoot للمجاميع
5) overflowGuard.shrinkFont على الخلايا التي scrollWidth>clientWidth
     سلم: 12→11→10→9 ثم word-break كملاذ أخير
6) إدراج <div class="page-break"></div> بين chunks
```
الناتج: لا تداخل مع الترويسة/التذييل، رأس الجدول يظهر في كل صفحة.

### 3.3 خطة الحذف الآمنة لـ `pdfGenerator.ts`
| الخطوة | الإجراء | معيار التحقق |
|--------|---------|--------------|
| 1 | كل استدعاءات `generatePDF` تمرّ عبر `routePdfRequest` | grep لا يجد استدعاءات مباشرة خارج `pdfGeneratorLazy` |
| 2 | رفع Canary إلى 100% لمدة 7 أيام مع `error_rate < 0.5%` | تقرير `telemetry` |
| 3 | تحويل `pdfGeneratorLazy` إلى shim يستدعي v2 مباشرة | الاختبارات تمر |
| 4 | حذف `pdfGenerator.ts` + `bulkInvoicePdfGenerator.ts` + `statementPdfGenerator.ts` | بناء يمر، 0 imports |
| 5 | حذف `pdfGeneratorLazy.ts` وتحديث المستوردين | شجرة الحزمة أصغر بـ ~800KB |

---

## المرحلة 4 — الأداء وتقسيم الكود والـ Edge

### 4.1 التحميل الكسول لمكتبات العرض
- `htmlPdfEngine` يستخدم `loadHtml2Pdf()` (موجود) — التأكد من `import()` ديناميكي فقط.
- إضافة `loadJsPdf()` في `engine/JsPdfEngine.ts` بنفس النمط:
  ```ts
  let _jsPdf: Promise<typeof import('jspdf')> | null = null;
  export const loadJsPdf = () => (_jsPdf ??= import('jspdf'));
  ```
- التحقق عبر `vite build --report` أن `jspdf` و `html2canvas` لا يدخلان `index.js` الرئيسي.
- ضبط `vite.config.ts` بـ `manualChunks: { pdf: ['jspdf','html2canvas','jspdf-autotable'] }`.

### 4.2 Edge Function للتصدير الثقيل
- دالة `supabase/functions/render-pdf/index.ts`:
  - تستقبل `{ docType, data, deliver: 'download' | 'email', recipientEmail? }`.
  - تتحقق من JWT + `tenant_id` + الصلاحيات (`has_role`).
  - تستخدم Puppeteer عبر `npm:@sparticuz/chromium` لتقارير >50 صفحة.
  - تخزن الملف في Supabase Storage (`pdf-exports/{tenant}/{uuid}.pdf`) وتُرجع URL موقّع.
  - عند `deliver:'email'` تستدعي Resend (يحتاج `RESEND_API_KEY` — سيُطلب).
- جدولة ليلية عبر `pg_cron` لتقارير الأرصدة الكبيرة:
  ```sql
  select cron.schedule('nightly-balance-sheets', '0 2 * * *', $$
    select net.http_post(url:='.../functions/v1/render-pdf', ...)
  $$);
  ```
- جدول `pdf_export_jobs` (status, doc_type, file_url, created_by, tenant_id) مع RLS بحسب `tenant_id`.

---

## التفاصيل التقنية والملفات المنشأة/المعدّلة

**ملفات جديدة (24):**
- `src/pages/dev/PdfSandboxPage.tsx` + `PdfSandboxPage.test.tsx`
- `src/pages/dev/PdfTelemetryPage.tsx`
- `src/hooks/useExportPdf.ts` + اختبار
- `src/components/print/PdfPreflightAlert.tsx`
- `src/lib/pdf/routing/routePdfRequest.ts` + اختبار
- `src/lib/pdf/routing/canaryRollout.ts` + اختبار
- `src/lib/pdf/templates/QuotationHtmlTemplate.ts` + اختبار
- `src/lib/pdf/templates/PurchaseOrderHtmlTemplate.ts` + اختبار
- `src/lib/pdf/templates/LedgerHtmlTemplate.ts` + اختبار
- `src/lib/pdf/templates/StatementHtmlTemplate.ts` + اختبار
- `src/lib/pdf/templates/partials/Header.ts`, `Footer.ts`, `LineItems.ts`
- `supabase/functions/render-pdf/index.ts` + `index_test.ts`
- migration: جدول `pdf_export_jobs` + RLS

**ملفات معدّلة:**
- `src/lib/pdf/featureFlags.ts` (إضافة Canary)
- `src/lib/pdf/engine/JsPdfEngine.ts` (تحميل كسول)
- `src/lib/pdf/fonts/fontRegistry.ts` (تسجيل `fontCacheHit`)
- `src/lib/pdf/diagnostics/telemetrySink.ts` (حقول جديدة)
- `vite.config.ts` (`manualChunks`)
- `src/components/print/UnifiedExportMenu.tsx` + 12 موقع استدعاء آخر
- حذف نهائي: `pdfGenerator.ts`, `pdfGeneratorLazy.ts`, `bulkInvoicePdfGenerator.ts`, `statementPdfGenerator.ts`

**معايير القبول:**
- جميع الاختبارات ≥ 200/200 ناجحة.
- p95 لتوليد فاتورة 1-3 صفحات < 1800ms.
- نسبة الفشل في v2 < 0.5% على عيّنة 7 أيام Canary.
- لا استيراد متبقٍ لـ `pdfGenerator` (grep فارغ).
- حجم `index.js` الرئيسي ينخفض ≥ 600KB بعد إخراج jsPDF/html2canvas.
- جميع القوالب RTL متوافقة (اختبار Playwright `e2e/export-rtl.spec.ts` يمر).

**ترتيب التنفيذ المقترح (موجات):**
1. **الموجة 20**: المرحلة 1 كاملة (Sandbox + useExportPdf + Alert).
2. **الموجة 21**: المرحلة 2 (Canary + Telemetry).
3. **الموجات 22-24**: المرحلة 3 (قالب لكل موجة).
4. **الموجة 25**: حذف القديم + `manualChunks`.
5. **الموجة 26**: المرحلة 4 (Edge Function + Cron).

اعتمد الخطة لأبدأ الموجة 20 فوراً.
