## الهدف
ضمان تلقائي بأن كل تصدير (PDF / Excel / CSV) يحتوي على نص عربي صحيح وعلامات RTL، في كل من المتصفح (سطح المكتب) والموبايل.

## الملفات الجديدة

### 1) `src/components/print/__tests__/UnifiedExportMenu.rtl.test.tsx`
اختبارات وحدة لمكوّن `UnifiedExportMenu` في وضعَي العرض (1280×720 و 390×844 عبر `matchMedia` وضبط `innerWidth`):
- **Excel RTL**: محاكاة `xlsx` (`vi.mock('xlsx')`)، استدعاء "Excel" من القائمة، التحقق من:
  - `wb.Workbook.Views[0].RTL === true`
  - `ws['!views'][0].RTL === true`
  - أسماء الأعمدة وقيم الخلايا تحوي نصاً عربياً (`/[\u0600-\u06FF]/`)
  - اسم الملف ينتهي بـ `.xlsx`
- **CSV BOM + Arabic**: التقاط `Blob` المُمرّر إلى `URL.createObjectURL` عبر spy، قراءته بـ `FileReader`/`blob.text()` والتحقق:
  - يبدأ بـ `\uFEFF` (UTF-8 BOM لازم لإكسل العربي)
  - يحتوي رؤوس الأعمدة العربية وعينة من القيم
  - `type === 'text/csv;charset=utf-8'`
- **PDF Arabic pipeline**: محاكاة `@/lib/pdfGeneratorLazy`؛ التحقق من استدعاء `generatePDF`/`generateDocumentPDF` بالعنوان والأعمدة العربية كما هي بدون تشويه (لا BiDi marks).
- يُعاد تنفيذ نفس الاختبارات داخل `describe.each([['desktop', 1280], ['mobile', 390]])` لضمان التطابق على الموبايل.

### 2) `src/lib/__tests__/exportRtl.test.ts`
اختبارات منخفضة المستوى لخط أنابيب النص (تكميل `arabicFont.test.ts`):
- `sanitizeBidiText` يُزيل `U+200E/200F/202A-202E/2066-2069` من رؤوس CSV/Excel.
- مولّد PDF (`generatePDF`) عند تمرير عنوان عربي يستدعي `addFont('Amiri', ...)` ويرسم نصاً مُعالَجاً بـ `reshapeArabicText` ثم `toVisualOrder` (يُتحقّق منه عبر تجسس على `MockJsPDF.text`).
- يُتحقَّق أن إعداد الاتجاه: `setR2L(true)` أو `internal.pageSize` مع `align: 'right'` مُمرّر إلى `autoTable`.

### 3) `e2e/export-rtl.spec.ts` (Playwright)
سيناريو E2E حقيقي لضمان السلوك في المتصفح والموبايل:
- يعمل بمشروعَي viewport: `Desktop Chrome` (1280×720) و `Mobile (Pixel 5)` 393×851 — موجودان في `playwright.config.ts`.
- يسجل دخول كمستخدم اختبار، ينتقل إلى `/invoices`، يفتح فاتورة، يضغط قائمة "تصدير وطباعة":
  1. **CSV**: يلتقط التنزيل عبر `page.waitForEvent('download')`، يقرأ المحتوى ويتأكّد:
     - يبدأ بـ `\uFEFF`
     - يحوي رؤوساً عربية وأرقاماً
  2. **XLSX**: يحفظ التنزيل، يفكّ ضغط `xl/workbook.xml` بأداة `unzipper` ويتحقّق من وجود `<workbookView rightToLeft="1"`.
  3. **PDF**: يحفظ التنزيل، يستخدم `pdf-parse` لاستخراج النص ويتحقّق من ظهور حروف عربية بنطاق `\u0600-\u06FF` وأن الترتيب البصري سليم (لا أحرف Presentation-Form معكوسة بشكل خاطئ).
- يُكرَّر الاختبار على عدة صفحات: Invoices, Quotations, SalesOrders, Reports.
- بعد كل تصدير، التقاط `screenshot` للقائمة كدليل بصري (يُحفظ كـ artifact).

### 4) `e2e/helpers/exportAssertions.ts`
دوال مساعدة قابلة لإعادة الاستخدام:
- `assertCsvArabic(buffer)`
- `assertXlsxRtl(buffer)`
- `assertPdfArabic(buffer)`

## تعديلات بسيطة
- `package.json` (devDependencies): إضافة `pdf-parse` و `unzipper` لاستخدامهما في E2E فقط.
- `playwright.config.ts`: التأكد أن مشروع الموبايل مفعّل (إن لم يكن، إضافته).

## مخرجات تشغيل الاختبارات
- وحدة: `bunx vitest run src/components/print src/lib/__tests__/exportRtl.test.ts`
- E2E: `bunx playwright test e2e/export-rtl.spec.ts --project="Desktop Chrome" --project="Mobile Chrome"`

## ملاحظات تقنية
- لا حاجة لتعديل `UnifiedExportMenu` نفسه — السلوك الحالي صحيح؛ الاختبارات فقط تحرسه من الانحدار.
- جميع الاختبارات لا تتصل بـ Supabase حقيقي (mocking) عدا E2E الذي يحتاج جلسة معاينة (سيتمّ تخطّيها برشاقة إذا لم تتوفّر بيئة `PREVIEW_URL` و `TEST_USER`).
