# خطة إعادة هيكلة نظام التصدير وتوليد PDF (دعم عربي كامل)

هدف الخطة: تحويل طبقة التصدير الحالية (`pdfGenerator`, `printDocument`, `UnifiedExportMenu`, `arabicFont`) إلى محرّك إنتاجي صلب، قابل للتخصيص بالكامل، خالٍ من مشاكل تقطيع الحروف العربية وعكس الاتجاه، مع إطار تشخيص وأخطاء متكامل.

---

## المرحلة 1: التدقيق والاكتشاف (Audit & Discovery)

### 1.1 جرد نقاط الإنتاج الحالية
- مسح كل استدعاءات `jsPDF` و `html2pdf` و `pdfGenerator.ts` و `bulkInvoicePdfGenerator.ts` و `statementPdfGenerator.ts`.
- توثيق كل صفحة طباعة (`InvoicePrintView`, `QuotationPrintView`, `SalesOrderPrintView`, `PurchaseOrderPrintView`, `PrintTemplate`) ومصدر بياناتها.
- بناء جدول `export-matrix.md` يربط: نوع المستند ↔ مولّد PDF ↔ قالب الطباعة ↔ Repository.

### 1.2 كشف الأخطاء الحالية
- تشغيل سكربت تشخيص `scripts/pdf-audit.ts` يولّد PDF لكل نوع مستند ببيانات وهمية (قصيرة/طويلة/مختلطة عربي-لاتيني-أرقام) ويحفظ المخرجات في `/mnt/documents/pdf-audit/`.
- فحص بصري إلزامي (`pdftoppm -r 150`) للكشف عن: تقطيع الحروف، عكس الأرقام، تداخل الأعمدة، قص النصوص عند حواف الصفحة، فقدان الخط الاحتياطي.
- تشغيل اختبارات `arabicFont.test.ts` و `exportRtl.test.ts` و `e2e/export-rtl.spec.ts` وتسجيل أي إخفاقات.
- تحليل ذاكرة: قياس حجم الـ bundle عند تحميل `jsPDF + Amiri base64` (متوقع >800KB) ووضعه في `docs/baseline-metrics.md`.

### 1.3 مخرجات المرحلة
- تقرير `docs/pdf-audit-2026.md` يحوي: قائمة الأعطال المؤكّدة، لقطات قبل/بعد، تصنيف الخطورة (Critical/Major/Minor).

---

## المرحلة 2: العمارة الأساسية واختيار التقنيات

### 2.1 الاستراتيجية المختارة: محرّك مزدوج (Dual-Engine)
| المحرّك | الاستخدام | السبب |
|---|---|---|
| **jsPDF + Amiri (مدمج حاليًا)** | المستندات الجدولية البسيطة (تقارير، كشوف، فواتير قياسية) | خفيف، يعمل client-side، لا يحتاج شبكة |
| **html2pdf (puppeteer-lite عبر CDN)** | المستندات ذات التنسيق الغني (قوالب مخصصة، توقيعات، شعارات معقدة) | يستفيد من محرّك المتصفح في RTL والـ ligatures طبيعيًا |
| **Edge Function `generate-pdf` (puppeteer headless)** اختياري Phase 5 | التصدير المجمّع الكبير (>50 صفحة) والإرسال بالبريد | يخرج العبء من المتصفح |

### 2.2 طبقة التجريد `PdfEngine`
إنشاء `src/lib/pdf/engine/` بهيكل:
```text
src/lib/pdf/
├── engine/
│   ├── IPdfEngine.ts        # واجهة موحّدة (render, addPage, drawText, drawTable)
│   ├── JsPdfEngine.ts       # تطبيق jsPDF
│   ├── HtmlPdfEngine.ts     # تطبيق html2pdf
│   └── index.ts             # factory: pickEngine(docType, options)
├── templates/
│   ├── BaseTemplate.ts      # header/footer/watermark/pageNumber
│   ├── InvoiceTemplate.ts
│   ├── QuotationTemplate.ts
│   ├── StatementTemplate.ts
│   └── ReportTemplate.ts
├── fonts/
│   ├── fontRegistry.ts      # تحميل ديناميكي للخطوط
│   └── assets/              # Amiri, Cairo, Tajawal (woff2 + base64)
├── arabic/
│   ├── reshaper.ts          # الموجود حاليًا منقول
│   ├── bidi.ts              # خوارزمية UAX#9 مبسّطة
│   └── shaper.test.ts
├── diagnostics/
│   ├── PdfLogger.ts
│   ├── DataValidator.ts     # Zod schemas لكل نوع مستند
│   └── ErrorBoundary.ts
└── config/
    ├── PageConfig.ts        # A4/A3/A5/Letter/Legal + portrait/landscape
    └── ThemeConfig.ts       # ألوان/خطوط/هوامش
```

### 2.3 مبادئ تصميم ثابتة
- **مصدر بيانات واحد**: كل مستند يُغذّى عبر Zod schema قبل التوليد.
- **لا تسريب Supabase**: المولّد يستقبل بيانات جاهزة، يستدعي `settingsRepository` فقط لإعدادات الشركة.
- **Lazy loading إلزامي**: الخطوط والمحرّكات تُحمّل عند الطلب عبر `pdfGeneratorLazy`.

---

## المرحلة 3: محرّك العربية والتخصيص

### 3.1 طبقة الخطوط الديناميكية (`fontRegistry`)
- تسجيل خطوط متعددة: Amiri (افتراضي)، Cairo، Tajawal، Noto Sans Arabic.
- API: `registerFont(name, source)`، `loadFont(name): Promise<ArrayBuffer>`.
- مصادر مدعومة بالترتيب: ملف محلي `/fonts/*.ttf` ← IndexedDB cache ← Google Fonts ← Base64 مضمّن (احتياط نهائي).
- إعداد المستخدم: `companySettings.pdf_font` يحدّد الخط الافتراضي على مستوى المستأجر.

### 3.2 معالجة RTL والـ Shaping
- استبدال خوارزمية `toVisualOrder` الحالية بـ **bidi.js** (مكتبة UAX#9 مرخّصة MIT) لمعالجة دقيقة للنصوص المختلطة.
- الحفاظ على `reshapeArabicText` (يعتمد على `arabic-persian-reshaper`) مع اختبارات ligature إضافية للام-ألف ولام-ألف-همزة.
- منع عكس: الأرقام، رموز العملة، البريد الإلكتروني، أرقام الهواتف، رموز المنتجات (SKU).
- تنقية إلزامية لرموز Bidi غير المرئية (U+200E…U+202E، U+2066…U+2069) في كل نص قبل الرسم.

### 3.3 محرّك القوالب القابل للتخصيص
- **رأس وتذييل**: لكل قالب `header(ctx)` و `footer(ctx)` ترسم الشعار، اسم الشركة، رقم الصفحة (`صفحة X من Y`)، التاريخ.
- **علامة مائية**: نص قطري نصف شفاف (مثال: "مسودة"، "مدفوع") قابلة للتفعيل من `ThemeConfig.watermark`.
- **هوامش وحجم وتوجه**: يُمرّر `PageConfig { size: 'A4'|'A3'|'A5'|'Letter'|'Legal', orientation, margins: {t,r,b,l} }`.
- **حقن البيانات**: قوالب تعتمد على JSON Schema، مع `templateRegistry.render(templateId, data)` يُرجع PDF Blob.
- **تخصيص الشركة**: جدول `pdf_templates` (موجود) يحفظ ألوان وشعار وخط ومحتوى الترويسة لكل مستأجر.

### 3.4 جداول متعددة الصفحات
- استخدام `jspdf-autotable` مع: `didDrawPage` لرسم الرأس/التذييل، `rowPageBreak: 'avoid'` للصفوف الحساسة، `showHead: 'everyPage'`.
- لـ HtmlPdfEngine: استخدام CSS `break-inside: avoid` و `thead { display: table-header-group }`.

---

## المرحلة 4: التشخيص ومعالجة الأخطاء

### 4.1 التحقق من البيانات (Pre-flight)
- لكل نوع مستند Zod schema في `pdf/diagnostics/schemas/`:
  - تحقق من وجود الحقول الإلزامية (رقم المستند، التاريخ، الإجمالي).
  - تحقق من تطابق المجاميع (subtotal + tax − discount = total) ضمن دقة `±0.01`.
  - رفض المصفوفات الفارغة (`items.length >= 1`).
- في حال الفشل: throw `PdfValidationError` مع تفاصيل كل خطأ، يُعرض للمستخدم بـ toast عربي مفهوم.

### 4.2 سياج الأخطاء (Error Boundary)
- لف كل عملية توليد بـ `try/catch/finally` مع:
  - Timeout قابل للضبط (افتراضي 30s، 90s للتصدير المجمّع).
  - Cleanup للذاكرة (`doc = null`، إلغاء URLs المؤقتة عبر `URL.revokeObjectURL`).
  - Retry تلقائي مرة واحدة عند فشل تحميل الخط أو الشعار.
- Fallback مرتّب:
  1. فشل الخط المخصص → الرجوع لـ Amiri المضمّن.
  2. فشل Amiri → الرجوع لخط النظام مع تنبيه.
  3. فشل المحرّك الرئيسي → التبديل التلقائي للمحرّك الثاني.
  4. فشل كامل → فتح نافذة الطباعة الأصلية كحل أخير.

### 4.3 السجلات والمراقبة
- `PdfLogger` يكتب في `activity_logs` (action=`pdf.export`): نوع المستند، المدّة، حجم الناتج، المحرّك المستخدم، الأخطاء.
- قياسات أداء عبر `performance.mark`/`measure` تُرسل لـ `performanceMonitor`.
- تنبيه `Sentry/observability` عند: مدّة >10s، فشل متكرر، حجم ناتج >10MB.

### 4.4 رسائل مستخدم موحّدة (عربية)
- "جاري تحضير الملف…" (loading)
- "فشل تحميل الخط، تم استخدام الخط الاحتياطي" (warning)
- "تعذّر إنشاء الملف. تحقّق من البيانات وحاول مجددًا." (error)
- "الملف كبير جدًا، سيتم تقسيمه إلى عدة ملفات" (info)

---

## المرحلة 5: الاختبار والتحقق والحالات الحدّية

### 5.1 اختبارات وحدة (Vitest)
- توسعة `arabicFont.test.ts` بحالات: لام-ألف، أحرف فارسية، رموز عملات، نصوص مختلطة طويلة (>500 حرف).
- اختبار `DataValidator` لكل schema بحالات صحيحة وفاشلة.
- اختبار `fontRegistry` مع mock للشبكة (نجاح/فشل/timeout).

### 5.2 اختبارات تكامل
- `__tests__/integration/export-print.test.tsx` (موجود) يُوسَّع ليغطي كل قالب جديد.
- اختبار التبديل بين المحرّكين عند الفشل المتعمّد.

### 5.3 اختبارات E2E (Playwright)
- `e2e/export-rtl.spec.ts` (موجود) يضاف له:
  - تصدير فاتورة بـ 200 بندًا (page breaks).
  - تصدير بأحجام ورق وتوجّهات مختلفة.
  - التحقق من `assertPdfArabic` و `assertCsvArabic` و `assertXlsxRtl` لكل قالب.

### 5.4 فحص بصري تلقائي (Visual QA)
- سكربت `scripts/pdf-visual-qa.ts` يولّد كل قوالب PDF، يحوّلها لصور عبر `pdftoppm`، ويقارنها مع لقطات مرجعية في `tests/__snapshots__/pdf/` (تسامح بكسل 2%).
- يُشغَّل في CI ويفشل البناء عند الانحراف.

### 5.5 الحالات الحدّية المُغطّاة
- جداول تمتدّ على 10+ صفحات مع تكرار الرأس.
- بنود بأسماء طويلة جدًا (>200 حرف) → wrapping تلقائي.
- خصومات سالبة، ضرائب صفرية، عملات متعددة.
- شعار شركة مفقود/تالف → استخدام placeholder.
- اتصال إنترنت منقطع → الاعتماد على الأصول المحلية/المخزّنة.
- مستندات بدون أصناف (`items=[]`) → رفض مبكر برسالة واضحة.
- نصوص مختلطة عربي/إنجليزي/أرقام/رموز (IBAN, email, URL).

### 5.6 مقاييس النجاح
- زمن توليد فاتورة قياسية <1.5s على جهاز متوسط.
- صفر تقطيع حروف في 100% من قوالب QA.
- معدّل فشل التصدير <0.5% في الإنتاج (يُقاس عبر `activity_logs`).
- تغطية اختبارات ≥85% لطبقة `src/lib/pdf/`.

---

## ملحق تقني — ترتيب التنفيذ المقترح

1. **أسبوع 1**: المرحلة 1 (تدقيق) + إعداد هيكل `src/lib/pdf/`.
2. **أسبوع 2**: المرحلة 2 + 3.1-3.2 (المحرّك المزدوج + الخطوط + Bidi).
3. **أسبوع 3**: المرحلة 3.3-3.4 (القوالب + الجداول متعدّدة الصفحات).
4. **أسبوع 4**: المرحلة 4 (التشخيص والأخطاء).
5. **أسبوع 5**: المرحلة 5 (الاختبارات + Visual QA + إطلاق تدريجي خلف feature flag `pdf_engine_v2`).

### المخاطر والتخفيف
- **حجم الـ bundle**: يُعالَج بـ dynamic import للخطوط والمحرّكات.
- **اختلاف عرض المتصفحات للـ html2pdf**: تثبيت إصدار وتوحيد CSS reset.
- **توافق مع قوالب قديمة**: المحرّك الجديد خلف flag، الرجوع للقديم لحظيًا عند الحاجة.
