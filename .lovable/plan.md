

# خطة استبدال الخط بـ Cairo واصلاح مشكلة الرموز نهائيا

---

## المشكلة الجذرية

خط Amiri مسجل بنمط `'normal'` فقط في `setupArabicFont`. عندما يطلب `autoTable` نمط `'bold'` لرؤوس الاعمدة، يفشل jsPDF في ايجاد `Amiri-Bold` فيرجع لخط `helvetica` الذي لا يدعم حروف Arabic Presentation Forms B، فتظهر رموز غريبة.

---

## الحل

### الخطوة 1: تحديث `src/lib/arabicFont.ts` - استبدال Amiri بـ Cairo
- تغيير `ARABIC_FONT_NAME` من `'Amiri'` الى `'Cairo'`
- تحديث روابط تحميل الخط لاستخدام Cairo TTF من Google Fonts CDN
- Cairo خط حديث وواضح ومصمم للشاشات والطباعة معا

### الخطوة 2: تحديث `src/lib/pdfGenerator.ts` - تسجيل الخط لجميع الانماط
- تسجيل خط Cairo لانماط `'normal'` و `'bold'` و `'italic'` و `'bolditalic'` باستخدام نفس ملف الخط
- هذا يمنع jsPDF من الرجوع لخط helvetica عند طلب اي نمط
- اعادة تسمية ملف VFS من `Amiri-Regular.ttf` الى `Cairo-Regular.ttf`

### الخطوة 3: تحديث `src/components/print/PrintTemplate.tsx` - Cairo للطباعة
- استبدال `Noto Sans Arabic` بـ `Cairo` في `fontFamily` و `@import`
- تحديث Google Fonts URL لتحميل Cairo بجميع الاوزان (400-700)

---

## التفاصيل التقنية

### تسجيل الخط (الاصلاح الجذري لمشكلة الرموز):
```text
// في setupArabicFont:
doc.addFileToVFS('Cairo-Regular.ttf', cachedFont);
doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bold');
doc.addFont('Cairo-Regular.ttf', 'Cairo', 'italic');
doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bolditalic');
```

### روابط خط Cairo:
```text
الرابط الاساسي: cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo[wght].ttf
الرابط الاحتياطي: fonts.gstatic.com (Cairo Regular)
```

---

## الملفات المتاثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/arabicFont.ts` | تغيير اسم الخط + تحديث روابط التحميل لـ Cairo |
| `src/lib/pdfGenerator.ts` | تسجيل Cairo لجميع الانماط (normal/bold/italic/bolditalic) |
| `src/components/print/PrintTemplate.tsx` | استبدال Noto Sans Arabic بـ Cairo في fontFamily و import |

