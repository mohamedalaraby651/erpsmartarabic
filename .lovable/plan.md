

# خطة اصلاح تصدير PDF العربي والطباعة
## Arabic PDF Export & Print Complete Fix Plan

---

## المشاكل المكتشفة

### مشكلة 1: النص العربي مشوه في ملفات PDF (خطيرة)
- دالة `processArabicText` في `pdfGenerator.ts` تعكس الحروف (`text.split('').reverse().join('')`) وهذا يدمر النص العربي بالكامل لان الحروف العربية لها اشكال مختلفة (اول - وسط - اخر - منفصل)
- كلمة "محمد" تصبح "دمحم" بدلا من عرضها بشكل صحيح
- دالة `reverseArabicText` في `arabicFont.ts` تعكس ترتيب الكلمات وهو غير ضروري عند استخدام `setR2L(true)`

### مشكلة 2: تحميل الخط العربي غير موثوق
- يتم تحميل خط Amiri من Google Fonts CDN والرابط قد يتغير او يتعطل
- عند فشل التحميل يتم استخدام خط `helvetica` الذي لا يدعم العربية اطلاقا مع عكس الحروف كحل بديل مكسور

### مشكلة 3: شعار الشركة لا يظهر في PDF
- خيار `includeLogo` موجود في الكود لكن لا يتم فعليا تضمين الشعار في ملف PDF - يتم تجاهله تماما

### مشكلة 4: طباعة المستندات (Print) مشاكل متعددة
- `window.print()` يطبع محتوى الـ Dialog كاملا بما فيه الازرار والعناصر الاضافية
- CSS الخاص بالطباعة يستخدم `position: absolute` مما يسبب مشاكل في الصفحات الطويلة
- الالوان تستخدم متغيرات CSS (`text-primary`, `bg-muted`) قد لا تعمل عند الطباعة خاصة في الوضع الداكن
- لا يوجد خيار تحميل PDF مباشرة من نوافذ المعاينة (فقط طباعة المتصفح)

### مشكلة 5: لا يوجد Arabic Text Shaping
- مكتبة jsPDF لا تدعم Arabic text shaping بشكل مدمج
- الحروف العربية تحتاج لمعالجة خاصة لعرض الاشكال الصحيحة (متصلة/منفصلة)
- يجب استخدام مكتبة مثل `arabic-reshaper` لاعادة تشكيل النص قبل ارساله للـ PDF

---

## الحل المقترح

### الخطوة 1: اصلاح `arabicFont.ts` - معالجة النص العربي
- ازالة دوال عكس النص المكسورة (`reverseArabicText`, `processArabicText`)
- اضافة منطق Arabic text reshaping يدوي (بدون مكتبة خارجية) لربط الحروف العربية بشكل صحيح
- اضافة دالة `reshapeArabicText` تتعامل مع اشكال الحروف الاربعة (isolated, initial, medial, final)
- اضافة معالجة للنصوص المختلطة (عربي + انجليزي + ارقام)

### الخطوة 2: اصلاح `pdfGenerator.ts` - محرك توليد PDF
- ازالة دالة `processArabicText` المكسورة واستبدالها بالمعالج الجديد
- اضافة تضمين شعار الشركة فعليا (تحويل الصورة من URL الى base64 وادراجها)
- تحسين عرض الجداول مع النص العربي المشكل
- اضافة معالجة الاخطاء عند فشل تحميل الخط مع رسالة واضحة للمستخدم

### الخطوة 3: اصلاح `PrintTemplate.tsx` - قالب الطباعة
- تحسين CSS الطباعة لاخفاء عناصر الـ Dialog بالكامل
- استبدال `position: absolute` بنهج اكثر موثوقية
- تثبيت الالوان بقيم ثابتة عند الطباعة بدلا من متغيرات CSS
- اضافة `-webkit-print-color-adjust: exact` و `print-color-adjust: exact`

### الخطوة 4: تحسين مكونات المعاينة (Print Views)
- اضافة زر "تحميل PDF" بجانب زر "طباعة" في جميع نوافذ المعاينة:
  - `InvoicePrintView.tsx`
  - `QuotationPrintView.tsx`
  - `SalesOrderPrintView.tsx`
  - `PurchaseOrderPrintView.tsx`
- ربط زر التحميل بدالة `generateDocumentPDF` الموجودة
- تحسين اخفاء العناصر عند الطباعة

---

## التفاصيل التقنية

### Arabic Text Reshaping:
النهج المستخدم: بناء جدول اشكال الحروف العربية الاربعة يدويا في الكود:
```text
مثال: حرف "ب"
- منفصل: ب (U+0628)
- اول: بـ (U+FE91)
- وسط: ـبـ (U+FE92)
- اخر: ـب (U+FE90)
```
يتم تحليل كل حرف وتحديد موقعه (اول/وسط/اخر/منفصل) واستبداله بالشكل الصحيح من Unicode Presentation Forms B (U+FE70-U+FEFF)

### تضمين الشعار في PDF:
```text
1. جلب الصورة من URL
2. تحويلها الى base64 عبر Canvas
3. ادراجها باستخدام doc.addImage()
4. التعامل مع CORS عبر crossOrigin attribute
```

### تحسين الطباعة CSS:
```text
@media print:
- اخفاء كل شيء خارج .print-template
- استخدام الوان ثابتة (لا CSS variables)
- اجبار طباعة الخلفيات والالوان
- ازالة هوامش Dialog
- تعيين حجم A4 صحيح
```

---

## الملفات المتاثرة

### معدلة (7):
| الملف | التغيير |
|-------|---------|
| `src/lib/arabicFont.ts` | اعادة كتابة كاملة - اضافة Arabic reshaping + ازالة الدوال المكسورة |
| `src/lib/pdfGenerator.ts` | استبدال processArabicText + اضافة تضمين الشعار + تحسين الجداول |
| `src/components/print/PrintTemplate.tsx` | اصلاح CSS الطباعة + الوان ثابتة |
| `src/components/print/InvoicePrintView.tsx` | اضافة زر تحميل PDF |
| `src/components/print/QuotationPrintView.tsx` | اضافة زر تحميل PDF |
| `src/components/print/SalesOrderPrintView.tsx` | اضافة زر تحميل PDF |
| `src/components/print/PurchaseOrderPrintView.tsx` | اضافة زر تحميل PDF |

### ترتيب التنفيذ:
| # | المهمة |
|---|--------|
| 1 | اعادة كتابة `arabicFont.ts` مع Arabic reshaping |
| 2 | اصلاح `pdfGenerator.ts` (معالج نص + شعار) |
| 3 | اصلاح `PrintTemplate.tsx` (CSS طباعة) |
| 4 | تحسين ملفات PrintView الاربعة (زر تحميل PDF) |

