# خطة: إنشاء `docs/pdf-engine-reference.md`

## الهدف
توثيق هندسي مرجعي حي (بالعربية) يغطّي كامل البنية الحالية لتوليد PDF والتصدير، ليكون الأساس الرسمي لأي تطوير لاحق على "v2 PDF Engine".

## النطاق المكتشف
بنية ناضجة موجودة فعلاً تحت `src/lib/pdf/` (engine, templates, fonts, arabic, layout, routing, services, config, utils) + `src/domain/pdf/` (DDD layer جديد) + `src/components/settings/ExportCenter/` + `src/hooks/usePdfProfile.ts`. التدقيق سيكون قراءة فقط (لا تعديل كود).

## خطوات التنفيذ

1. **مسح شامل (قراءة فقط)** لكل المجلدات أدناه لاستخراج المسؤوليات والروابط:
   - `src/lib/pdf/**` (engines, templates, routing, services, fonts, arabic, layout, config, utils)
   - `src/domain/pdf/**` (entities, value-objects, services, rendering)
   - `src/components/settings/ExportCenter/**`
   - `src/hooks/usePdfProfile.ts`, `src/lib/repositories/pdfProfilesRepository.ts`
   - استدعاءات `routePdfRequest` / `print*HtmlPdf` عبر الشيفرة (UI triggers)
   - migrations الخاصة بـ `tenant_pdf_*`

2. **كتابة الوثيقة** `docs/pdf-engine-reference.md` بالعربية، بالأقسام التالية:

   - **1. البنية الحالية وخريطة الملفات**
     - شجرة المجلدات مع وصف مسؤولية كل ملف
     - مخطط تدفق ASCII: UI → `routePdfRequest` → `PdfRenderService` (resolve profile) → `pickEngine` → `HtmlPdfEngine` / `JsPdfEngine` → `print*HtmlPdf` → Template → Output
     - دور `DocumentRenderProfile` و `RenderProfileMapper` كجسر بين الـ domain و التهيئة الفعلية
     - طبقة التخزين (`tenant_pdf_profiles`, `tenant_pdf_assets`, `tenant_pdf_profile_audit`, bucket `pdf-branding`)

   - **2. دعم العربية و RTL**
     - تقييم `arabic/bidi.ts`, `arabicCss.ts`, `typographyRules.ts`
     - سياسة الخطوط (`fontRegistry`, `fontCache`, `fontPreference` — Cairo افتراضياً، fallback إلى Amiri)
     - معالجة سياسة sanitize للعلامات الاتجاهية (مرتبطة بـ Data Sanitization memory)
     - حدود معروفة في الـ JsPdf engine مقابل HTML engine

   - **3. قابلية التخصيص**
     - مصفوفة: المعامل | hardcoded | قابل للتخصيص عبر Profile | المصدر
     - تغطية: page size, orientation, margins, typography (heading/body/mono, sizes, line-height), branding (logo, company info), watermark (5 positions + tiled), header/footer, theme colors
     - شرح `ProfileMerger` (global + scoped) و `ProfileDiff` (auditing) و `ProfileVersion`

   - **4. المشاكل والـ Edge Cases**
     - overflow في الجداول الطويلة (`overflowGuard`, `tablePagination`) وحدودها
     - bundle size: تأثير html2canvas/jspdf، خطوط Cairo/Amiri المضمنة
     - TTL cache (60s) في `PdfRenderService` ومخاطر staleness
     - تكرار منطق templates عبر 4 ملفات `print*HtmlPdf`
     - غياب رفع الأصول الفعلي (logo image) — حالياً نص فقط
     - عدم وجود اختبارات بصرية (visual regression) لمخرجات PDF

   - **5. خارطة الطريق التقنية لـ v2**
     - استخراج Template Composition Layer مشترك (header/body/footer slots) لإلغاء التكرار
     - `AssetUploader` + ربط `assetId` بـ `RenderProfileMapper` لاستبدال نص العلامة المائية بصورة
     - Audit Timeline UI يستهلك `tenant_pdf_profile_audit`
     - Visual regression عبر pdf→image diff في CI
     - Streaming/chunked rendering للفواتير الكبيرة
     - فصل engine selection عن routing عبر strategy registry
     - دعم profile inheritance (tenant → branch → user) بشكل صريح

3. **مراجعة ذاتية**: تأكد أن كل ملف مذكور موجود فعلاً، وأن المخططات تعكس `routePdfRequest.ts` و `PdfRenderService.ts` الحاليين.

## المخرج الوحيد
ملف واحد: `docs/pdf-engine-reference.md` — لا تعديل على أي كود إنتاجي.

## غير مشمول
- أي تعديل على `src/**` أو migrations
- تنفيذ خطوات v2 (تُذكر كتوصيات فقط)
