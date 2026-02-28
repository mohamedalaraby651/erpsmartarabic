
# خطة اصلاح جذري ونهائي لجميع مشاكل الخطوط والطباعة والالوان والشعار

---

## تشخيص المشاكل المكتشفة

### المشكلة 1: روابط خط Cairo معطلة بالكامل (السبب الرئيسي)
بعد فحص كل الروابط الموجودة في `arabicFont.ts`:

| الرابط | النتيجة |
|--------|---------|
| `cdn.jsdelivr.net/.../cairo/static/Cairo-Regular.ttf` | فشل - jsDelivr يرفض المستودعات اكبر من 50MB |
| `fonts.gstatic.com/s/cairo/v28/SLXGc1nY...ttf` | فشل - خطا 404 (الرابط منتهي الصلاحية) |

**خط Cairo لا يتم تحميله ابدا.** الدالة `setupArabicFont` تعيد `false`، فيتم استخدام خط `helvetica` الذي لا يدعم العربية. هذا يفسر كل الرموز الغريبة في رؤوس الاعمدة والنصوص.

بالاضافة لذلك: خط Cairo على GitHub (Gue3bara/Cairo) لا يحتوي على نسخة Static TTF -- فقط Variable Font، و **jsPDF لا يدعم Variable Fonts**.

### المشكلة 2: خط Cairo لا يحتوي على Presentation Forms B
حتى لو نجح تحميل خط Cairo الثابت، فان محرك الـ reshaping في النظام يحول الحروف العربية الى نطاق Unicode Presentation Forms B (U+FE70-U+FEFF). خط Cairo لا يحتوي على glyphs لهذا النطاق (مؤكد من issue #3867 على GitHub jsPDF). هذا يعني ان الحروف لن تظهر حتى مع الخط الصحيح.

### المشكلة 3: روابط خطوط اخرى معطلة
| الخط | cdn.jsdelivr.net | fonts.gstatic.com |
|------|-----------------|-------------------|
| Amiri | يعمل | يعمل |
| NotoSansArabic | فشل (50MB limit) | يعمل |
| Tajawal | يعمل | يعمل |

### المشكلة 4: شعار الشركة ينتهي بعد 7 ايام
الشعار يُخزن برابط موقع مؤقت (Signed URL) صلاحيته 7 ايام فقط. بعد ذلك يتوقف عن الظهور في PDF والمطبوعات.

### المشكلة 5: الالوان ثابتة في قالب الطباعة
`PrintTemplate.tsx` يستخدم لون ثابت `#1e40af` بدلا من اللون الاساسي المحفوظ في اعدادات الشركة (`primary_color`).

---

## الحل الشامل

### الخطوة 1: استراتيجية خط مزدوجة في `arabicFont.ts`

**النهج**: استخدام **Amiri** كخط PDF (مثبت انه يعمل مع jsPDF + يدعم Presentation Forms B) مع عرض اسم "Cairo" للمستخدم كخيار. خط Cairo يُستخدم فقط في طباعة المتصفح (المتصفح يدعم GSUB تلقائيا).

التغييرات:
- تحديث `AVAILABLE_FONTS` لتشمل رابط `pdfFallbackFont` (Amiri) لكل خط لا يملك Static TTF متوافقة مع jsPDF
- اصلاح جميع الروابط المعطلة واستبدالها بروابط مؤكدة تعمل
- اضافة خاصية `pdfFontKey` لكل خط تشير للخط البديل في PDF
- Cairo يستخدم Amiri في PDF (كلاهما عربي واضح)
- اضافة معالجة خطا محسنة مع رسائل واضحة في console

### الخطوة 2: تحديث `pdfGenerator.ts`

- عند اختيار Cairo، يتم تحميل Amiri تلقائيا لـ PDF (لانه الخط الوحيد المضمون للعمل مع jsPDF + reshaping)
- ازالة `fontStyle: 'bold'` من `headStyles` في autoTable واستبدالها بـ `fontStyle: 'normal'` -- لان الخط مسجل كـ normal فقط حقيقيا (ملف واحد لكل الانماط)، وعندما يطلب autoTable نمط bold يبحث عن ملف منفصل
- اضافة logging تفصيلي لتشخيص مشاكل الخط مستقبلا

### الخطوة 3: اصلاح الشعار المنتهي الصلاحية

في `LogoUpload.tsx` و `pdfGenerator.ts`:
- تغيير صلاحية Signed URL من 7 ايام الى 365 يوم (سنة)
- اضافة دالة تجديد الرابط تلقائيا عند الفشل في `loadImageAsBase64`
- تحويل مسار الشعار ليكون Public URL بدلا من Signed URL (تغيير bucket `logos` الى public)

### الخطوة 4: الالوان الديناميكية في `PrintTemplate.tsx`

- تمرير `primaryColor` و `secondaryColor` كـ props جديدة
- استبدال كل `#1e40af` الثابت باللون الديناميكي من الاعدادات
- تحديث كل PrintView components (Invoice, Quotation, SalesOrder, PurchaseOrder) لتمرير الالوان

### الخطوة 5: تحديث كل ملفات PrintView

تمرير `primaryColor` و `secondaryColor` من `company_settings` الى `PrintTemplate` في:
- `InvoicePrintView.tsx`
- `QuotationPrintView.tsx`
- `SalesOrderPrintView.tsx`
- `PurchaseOrderPrintView.tsx`

---

## التفاصيل التقنية

### روابط الخطوط المعتمدة (مؤكدة تعمل)

```text
Amiri: https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf
       https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf

Tajawal: https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Regular.ttf
         https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1rzaLCr5IlLA.ttf

NotoSansArabic: https://fonts.gstatic.com/s/notosansarabic/v28/nwpxtLGr...ttf (يعمل)
```

### اصلاح headStyles في autoTable

```text
قبل (يسبب المشكلة):
  headStyles: { fontStyle: 'bold' }

بعد (يستخدم نفس النمط المسجل):
  headStyles: { fontStyle: 'normal' }
```

### تغيير bucket الشعار الى عام

```text
-- Migration SQL
UPDATE storage.buckets SET public = true WHERE id = 'logos';
```

ثم في LogoUpload.tsx استخدام `getPublicUrl` بدلا من `createSignedUrl`.

---

## الملفات المتاثرة

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `src/lib/arabicFont.ts` | اصلاح الروابط + اضافة pdfFontKey لكل خط |
| 2 | `src/lib/pdfGenerator.ts` | استخدام خط Amiri فعليا للـ PDF + اصلاح headStyles |
| 3 | `src/components/print/PrintTemplate.tsx` | اضافة props للالوان + استبدال الالوان الثابتة |
| 4 | `src/components/print/InvoicePrintView.tsx` | تمرير الالوان من الاعدادات |
| 5 | `src/components/print/QuotationPrintView.tsx` | تمرير الالوان من الاعدادات |
| 6 | `src/components/print/SalesOrderPrintView.tsx` | تمرير الالوان من الاعدادات |
| 7 | `src/components/print/PurchaseOrderPrintView.tsx` | تمرير الالوان من الاعدادات |
| 8 | `src/components/shared/LogoUpload.tsx` | استخدام Public URL بدلا من Signed URL |
| 9 | Migration SQL | تحويل bucket logos الى عام |

---

## ترتيب التنفيذ

| # | المهمة |
|---|--------|
| 1 | تحويل bucket logos الى عام (Migration) |
| 2 | اصلاح arabicFont.ts (روابط + pdfFontKey) |
| 3 | اصلاح pdfGenerator.ts (Amiri fallback + headStyles fix) |
| 4 | اصلاح LogoUpload.tsx (Public URL) |
| 5 | اضافة الالوان الديناميكية لـ PrintTemplate + كل PrintViews |
