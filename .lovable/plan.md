

## التشخيص

المشكلة الجذرية واضحة من الكود الحالي:

**ملف الخط `Cairo-Variable.ttf` هو خط متغير (Variable Font)**، و`jsPDF` لا يدعم الخطوط المتغيرة بشكل كامل. هذا يعني أن جدول الـ `cmap` (الذي يربط Unicode بأشكال الحروف) لا يُقرأ بشكل صحيح لبعض الحروف، مما يسبب ظهور حروف ناقصة أو فارغة في PDF المحمّل.

هذا ما يفسر:
- المعاينة سليمة (المتصفح يدعم Variable Fonts بالكامل)
- PDF المحمّل فيه حروف مفقودة (jsPDF يفشل في قراءة بعض glyphs من الخط المتغير)

الملاحظة في الذاكرة التقنية نفسها تؤكد ذلك:
> "يتم تسجيل الخطوط كنسخ Static TTF (لأن jsPDF لا يدعم الخطوط المتغيرة)"

لكن الكود الفعلي لا يزال يستخدم `Cairo-Variable.ttf`:
```
urls: ['/fonts/Cairo-Variable.ttf']
```

---

## خطة الإصلاح

### 1. استبدال Cairo Variable بـ Cairo Static TTF
**ملف:** `public/fonts/` + `src/lib/arabicFont.ts`

- تحميل `Cairo-Regular.ttf` (نسخة ثابتة) من Google Fonts CDN
- تحديث مصادر خط Cairo في `AVAILABLE_FONTS` لتستخدم النسخة الثابتة أولاً مع fallback للـ CDN
- إبقاء الخطوط الأخرى (Amiri, Noto, Tajawal) كما هي (هي أصلاً static)

التنفيذ:
```
urls: [
  '/fonts/Cairo-Regular.ttf',                    // Static local
  'https://fonts.gstatic.com/s/cairo/v28/...',   // CDN fallback
]
```

### 2. تحسين التحقق من صحة الخط
**ملف:** `src/lib/arabicFont.ts`

- إضافة تحقق من أن الخط ليس Variable (فحص magic bytes لجدول `fvar`)
- تسجيل تحذير واضح في console إذا تم تحميل خط متغير عن طريق الخطأ
- عند فشل تحميل الخط: إظهار toast للمستخدم بدل إنتاج PDF بحروف ناقصة

### 3. تنظيف الإشارة القديمة
**ملف:** `public/fonts/`

- حذف `Cairo-Variable.ttf` بعد إضافة النسخة الثابتة (لمنع الاستخدام الخاطئ مستقبلاً)

---

## الملفات المتأثرة
- `src/lib/arabicFont.ts` (تحديث URLs + تحقق)
- `public/fonts/Cairo-Regular.ttf` (إضافة ملف جديد)
- `public/fonts/Cairo-Variable.ttf` (حذف)
- `src/lib/pdfGenerator.ts` (إضافة toast عند فشل الخط)

## معيار القبول
- كل الحروف العربية تظهر كاملة في PDF المحمّل (بدون نقص)
- نفس النص في المعاينة = نفس النص في PDF

