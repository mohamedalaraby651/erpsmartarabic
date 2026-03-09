

## الخطة: استبدال Cairo بـ Amiri كخط افتراضي

### المشكلة
خط Cairo لا يحتوي على glyphs لنطاق Presentation Forms B (U+FE70-U+FEFF) الذي يعتمد عليه محرك إعادة التشكيل. خط **Amiri** هو الأقرب شكلاً ويدعم هذا النطاق بالكامل.

### التغييرات

**1. `src/lib/arabicFont.ts`**
- تغيير الترتيب: Amiri يصبح أول خط في `AVAILABLE_FONTS`
- تغيير `ARABIC_FONT_NAME` الافتراضي من `'Cairo'` إلى `'Amiri'`
- تحديث `getFontConfig` ليرجع Amiri كـ fallback
- تحديث وصف Cairo ليوضح أنه غير مناسب لتصدير PDF

**2. `src/lib/pdfGenerator.ts`**
- تغيير الـ fallback من `'cairo'` إلى `'amiri'` في `setupArabicFont` و `generatePDF` و `generateDocumentPDF`

**3. حذف `public/fonts/Cairo-Regular.ttf`**
- الملف تالف أصلاً ولم يعد مطلوباً كافتراضي

### النتيجة
جميع الحروف العربية ستظهر كاملة في PDF لأن Amiri يحتوي على كل الـ glyphs المطلوبة.

