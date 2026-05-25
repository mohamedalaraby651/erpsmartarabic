# المخطط المعماري الشامل: محرك التصدير و PDF العربي على مستوى المؤسسات

> ملاحظة: المشروع يحتوي بالفعل على بنية تحتية متقدمة (`src/lib/pdf/`) تشمل: `HtmlPdfEngine`, `pickEngine`, `arabicCss`, `fontRegistry`, `fontPreference`, `InvoiceHtmlTemplate`, `telemetryScheduler` مع 120 اختباراً ناجحاً. هذا المخطط يبني فوق ما هو موجود ولا يعيد اختراعه.

---

## المرحلة 1: المعمارية والفصل الهيكلي (Separation of Concerns)

### 1.1 طبقات النظام

```text
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Delivery     │ download / preview / print      │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Rendering    │ HtmlPdfEngine (html2canvas+jsPDF)│
│                       │ + pickEngine (fallback strategy) │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Composition  │ Templates (Invoice/Quote/Report) │
│                       │ + arabicCss + fontRegistry       │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Configuration│ PdfConfigSchema (Zod-validated)  │
│                       │ + fontPreference + companySettings│
├─────────────────────────────────────────────────────────┤
│ Layer 1: Data         │ DataAdapter (DB → Normalized DTO)│
│                       │ + preflightValidator             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 اختيار المحرك ومبرراته

| المحرك | الموقع | السبب |
|--------|--------|--------|
| **html2canvas + jsPDF** (الحالي) | عميل/متصفح | يعمل بدون خادم، يحافظ على CSS، يدعم RTL أصلياً عبر `direction:rtl` |
| **Puppeteer** (مقترح كـ Edge Function اختياري) | خادم Deno | لتقارير ضخمة (>50 صفحة) أو عند الحاجة لـ `@page` CSS الكامل |
| **pdfmake** (مرفوض) | — | لا يدعم تشكيل الحروف العربية المتصلة بشكل موثوق |

**حل تشوه الحروف العربية:** المحرك الحالي يعتمد على المتصفح نفسه لتشكيل النص (HarfBuzz داخل Chromium)، ثم يلتقط الناتج عبر `html2canvas`. هذا يضمن اتصال الحروف الصحيح بشرط تضمين خط يحوي جداول `GSUB/GPOS` (Cairo و Amiri يحققان ذلك).

### 1.3 مخطط التهيئة الموحد (`PdfConfigSchema`)

ملف جديد: `src/lib/pdf/config/pdfConfigSchema.ts`

```ts
{
  page: {
    size: 'A4' | 'A3' | 'A5' | 'Letter' | { width:number; height:number; unit:'mm'|'pt' },
    orientation: 'portrait' | 'landscape',
    margins: { top, right, bottom, left }  // بالـ mm
  },
  typography: {
    fontKey: PdfFontKey,           // ربط مع fontRegistry الموجود
    baseFontSizePx: number,         // افتراضي 12
    lineHeight: number,             // افتراضي 1.6 لاستيعاب التشكيل
    letterSpacing: number
  },
  header: { enabled, height, html?, logoUrl?, showOnFirstPage },
  footer: { enabled, height, html?, pageNumbers: { format:'page x of y'|'x/y', position } },
  watermark: { enabled, text?, imageUrl?, opacity, rotation, tiled },
  branding: { primaryColor, secondaryColor, companyName, taxNumber },
  behavior: { embedFonts:true, compressImages, jpegQuality:0.92 }
}
```

---

## المرحلة 2: الطباعة العربية المتقدمة

### 2.1 خط أنابيب تضمين الخطوط

تم تنفيذه جزئياً في `fontRegistry.ts` و `arabicCss.ts`. الإضافات المطلوبة:

1. **توسيع `AVAILABLE_FONTS`** ليشمل: Cairo (موجود)، Tajawal، Amiri (موجود)، Noto Naskh Arabic، Almarai.
2. **تحميل كسول (Lazy)**: تحميل الخط فقط عند أول استدعاء عبر `fetch` ثم `base64` ثم `@font-face`.
3. **ذاكرة تخزين مؤقت** (`fontCache.ts`): تخزين base64 في `IndexedDB` لتفادي إعادة التحميل (الخط الواحد ~400KB).
4. **التحقق من `unicode-range`** لضمان أن المتصفح يستخدم الخط العربي للحروف العربية فقط.

### 2.2 منع قص التشكيل والحروف النازلة

ملف جديد: `src/lib/pdf/arabic/typographyRules.ts`

```css
.pdf-root {
  line-height: 1.8;              /* أكبر من العادي لاستيعاب الفتحة/الكسرة */
  padding-block: 0.15em;          /* يمنع قص الحروف النازلة كـ ج، ح، ع */
  text-rendering: optimizeLegibility;
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "mark" 1, "mkmk" 1;
  font-variant-numeric: tabular-nums;
}
.pdf-root .with-tashkeel { line-height: 2.0; }
.pdf-root td, .pdf-root th { padding-block: 6px; vertical-align: middle; }
```

### 2.3 توريث الإعدادات

`PdfConfigContext` (React Context) يضخ `typography` في كل قالب، ويُترجم إلى متغيرات CSS:
```css
:root { --pdf-base-fs: 12px; --pdf-lh: 1.8; --pdf-tracking: 0; }
```

---

## المرحلة 3: التشخيص والكشف التلقائي

### 3.1 حدود الأخطاء المعزولة

ملف جديد: `src/lib/pdf/diagnostics/PdfErrorBoundary.ts`

```ts
async function safeRender(fn): Promise<Result<Blob, PdfError>> {
  const startMem = performance.memory?.usedJSHeapSize;
  const t0 = performance.now();
  try {
    const blob = await Promise.race([fn(), timeout(60_000)]);
    telemetry.record({ ok:true, durationMs: performance.now()-t0,
                       memDeltaMb: (perf.memory?.usedJSHeapSize - startMem)/1e6 });
    return { ok:true, value: blob };
  } catch (e) {
    telemetry.record({ ok:false, error: classify(e) });
    return { ok:false, error: classify(e) };
  }
}
```

### 3.2 طبقة التحقق المسبق (Preflight)

ملف جديد: `src/lib/pdf/diagnostics/preflightValidator.ts`

تستخدم Zod للتحقق من:
- **بنية البيانات**: حقول مطلوبة، أنواع، حدود قيم.
- **حدود الطول**: `invoiceNumber.length ≤ 32`، `description.length ≤ 500`، `notes ≤ 2000`.
- **الأرقام المالية**: لا قيم سالبة لـ `quantity`، `unitPrice ≥ 0`، `taxRate ∈ [0,100]`.
- **توفر الأصول**: HEAD request على `logoUrl` و `fontUrl` مع timeout 3 ثوانٍ.
- **تنظيف Bidi**: إزالة `\u200E-\u202E` و `\u2066-\u2069` (موجود في `esc()`).

النتيجة: `{ valid, errors[], warnings[], sanitizedData }`.

### 3.3 نظام القياس عن بُعد

توسيع `telemetryScheduler.ts` الموجود لإرسال:
- متوسط وقت العرض، p95، p99
- استهلاك الذاكرة لكل قالب
- معدل الفشل لكل نوع مستند
- الخطوط الأبطأ تحميلاً

---

## المرحلة 4: الإصلاح التلقائي والحالات الحدية

### 4.1 جداول متعددة الصفحات

ملف جديد: `src/lib/pdf/layout/tablePagination.ts`

```ts
// قبل الالتقاط، احسب ارتفاع كل صف وقسّم لصفحات منطقية
function paginateTable(rows, pageHeight, headerHeight, footerHeight) {
  const pages = [];
  let current = []; let height = 0;
  for (const row of rows) {
    if (height + row.h > pageHeight - headerHeight - footerHeight) {
      pages.push(current); current = []; height = 0;
    }
    current.push(row); height += row.h;
  }
  return pages.map(p => renderPageWithRepeatedHeader(p));
}
```

CSS مكمل:
```css
thead { display: table-header-group; }   /* تكرار الرأس تلقائياً */
tr    { page-break-inside: avoid; }
tfoot { display: table-footer-group; }
```

### 4.2 احتواء الفائض

`src/lib/pdf/layout/overflowGuard.ts`:
- قياس `scrollWidth > clientWidth` لكل خلية.
- تطبيق سلم: `font-size: 12px → 11px → 10px → 9px` حتى يختفي الفائض.
- إن استمر، تفعيل `word-break: break-word` كملاذ أخير.

### 4.3 محرك الاحتياط (Fallback Engine)

موجود جزئياً في `pickEngine.ts`. التوسعة:
```text
Cairo (preferred) ──fail──► Amiri ──fail──► Noto Naskh ──fail──►
   System Arabic (Segoe UI/Tahoma) ──fail──► Render warning watermark
```
كل فشل يُسجَّل في `telemetry` ولا يكسر الإخراج.

---

## المرحلة 5: الاختبار والتحقق الشامل

### 5.1 بروتوكول QA

| الفئة | السيناريو | الأداة |
|------|-----------|--------|
| اختبار وحدة | حساب المجاميع، تنظيف Bidi، اختيار الخط | Vitest (موجود) |
| تكامل | قالب كامل ← Blob ← فك PDF والتحقق من النص | Vitest + pdf-parse |
| ضغط | 5000 صف فاتورة، 100 PDF متوازي | Vitest + benchmark |
| حدية | نصوص مختلطة EN/AR، روابط طويلة، إيموجي | Vitest |
| انحدار بصري | مقارنة بكسلية لصور PNG لكل قالب | Playwright + pixelmatch |

### 5.2 الانحدار البصري

ملف جديد: `tests/visual/pdf.spec.ts` (Playwright):
1. توليد PDF لكل قالب ببيانات ثابتة (`fixtures/`).
2. تحويل لـ PNG عبر `pdf-to-png-converter`.
3. مقارنة مع لقطة مرجعية (`__snapshots__/`) بعتبة 0.1% اختلاف بكسلي.
4. عند الفشل، حفظ صورة الفرق في CI artifacts.

### 5.3 مصفوفة التغطية المستهدفة

- وحدات: ≥90% (حالياً 120 اختبار)
- قوالب: 100% (Invoice، Quote، Receipt، Statement، Report)
- لغات: AR، EN، AR+EN مختلط
- متصفحات: Chromium، WebKit (Safari)، Firefox

---

## ملفات سيتم إنشاؤها (الموجة 15+)

| الملف | الغرض |
|-------|-------|
| `src/lib/pdf/config/pdfConfigSchema.ts` | Zod schema للتهيئة الكاملة |
| `src/lib/pdf/config/PdfConfigContext.tsx` | React Context للتوريث |
| `src/lib/pdf/fonts/fontCache.ts` | تخزين IndexedDB للخطوط |
| `src/lib/pdf/arabic/typographyRules.ts` | قواعد CSS متقدمة للتشكيل |
| `src/lib/pdf/diagnostics/preflightValidator.ts` | التحقق المسبق |
| `src/lib/pdf/diagnostics/PdfErrorBoundary.ts` | عزل الأخطاء + قياس |
| `src/lib/pdf/layout/tablePagination.ts` | تقسيم الجداول الذكي |
| `src/lib/pdf/layout/overflowGuard.ts` | منع الفائض |
| `src/lib/pdf/printInvoiceHtmlPdf.ts` | الواجهة الموحدة `print(data, config)` |
| `src/components/settings/PdfAdvancedSettings.tsx` | UI لتعديل كل خيارات التهيئة |
| `tests/visual/pdf.spec.ts` | Playwright visual regression |
| ملفات اختبار `.test.ts` لكل ما سبق | تغطية ≥90% |

---

## خارطة طريق التنفيذ (موجات مقترحة)

1. **الموجة 15**: `pdfConfigSchema` + `PdfConfigContext` + `printInvoiceHtmlPdf` (الواجهة الموحدة).
2. **الموجة 16**: `preflightValidator` + `PdfErrorBoundary` المتكاملان.
3. **الموجة 17**: `tablePagination` + `overflowGuard` + قالب تقرير متعدد الصفحات.
4. **الموجة 18**: `fontCache` (IndexedDB) + توسيع `AVAILABLE_FONTS` (Tajawal, Noto Naskh, Almarai).
5. **الموجة 19**: `PdfAdvancedSettings` UI متكامل مع `company_settings`.
6. **الموجة 20**: Playwright visual regression + benchmark suite.

كل موجة: تنفيذ + اختبارات + توثيق + التحقق من تشغيل المجموعة الكاملة (يجب أن يبقى عدد الاختبارات في تزايد دون فشل).

---

اعتمد الخطة لأبدأ من الموجة 15 فوراً.
