

# خطة اصلاح نهائي للخط العربي Cairo في PDF مع اضافة اعداد تغيير الخط

---

## المشكلة الجذرية (لماذا لا تزال الرموز تظهر)

الروابط الحالية في `arabicFont.ts` تشير الى ملفات **Variable Font**:
```text
Cairo[slnt,wght].ttf   (خط متغير)
```

**مكتبة jsPDF لا تدعم الخطوط المتغيرة (Variable Fonts)**. عند محاولة قراءة الملف، تفشل بصمت وترجع لخط `helvetica` الافتراضي الذي لا يحتوي على حروف Arabic Presentation Forms B (U+FE70-U+FEFF)، فتظهر رموز غريبة.

**هذا هو السبب الحقيقي لفشل كل المحاولات السابقة** -- المشكلة ليست في تسجيل الانماط بل في ان ملف الخط نفسه غير قابل للقراءة بواسطة jsPDF.

---

## الحل

### الخطوة 1: اصلاح `arabicFont.ts` - استخدام Cairo Static TTF

استبدال روابط Variable Font بروابط **Static TTF** من Google Fonts:

```text
قبل (Variable Font - لا تعمل مع jsPDF):
  Cairo%5Bslnt%2Cwght%5D.ttf
  SLXvx02YPrSQgBkQUnusBhJOrYQ.ttf

بعد (Static TTF - تعمل مع jsPDF):
  https://fonts.gstatic.com/s/cairo/v28/SLXGc1nY6HkvalIhTp2mxdt0UXg.ttf (Cairo Regular 400)
  https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/static/Cairo-Regular.ttf
```

اضافة تحقق من حجم الملف (اكبر من 50KB) لضمان انه ملف خط حقيقي وليس صفحة خطا HTML.

كذلك اضافة دعم لخطوط متعددة: Cairo و Amiri و Noto Sans Arabic و Tajawal، كل منها مع روابط Static TTF الخاصة به.

### الخطوة 2: اضافة عمود `pdf_font` الى جدول `company_settings`

اضافة migration لعمود جديد:
```text
ALTER TABLE company_settings ADD COLUMN pdf_font TEXT DEFAULT 'cairo';
```

القيم المتاحة: `cairo`, `amiri`, `noto-sans-arabic`, `tajawal`

### الخطوة 3: تحديث `pdfGenerator.ts` - قراءة اعداد الخط

- قراءة `pdf_font` من `company_settings`
- تمرير اسم الخط المختار الى `loadArabicFont()` و `setupArabicFont()`
- مسح cache الخط عند تغيير نوع الخط

### الخطوة 4: تحديث `InvoiceSettingsSection.tsx` - واجهة اختيار الخط

اضافة قسم جديد في اعدادات الفواتير لاختيار خط PDF:
- عرض 4 خطوط متاحة (Cairo, Amiri, Noto Sans Arabic, Tajawal)
- معاينة حية لكل خط باسمه العربي
- حفظ الاختيار في `company_settings.pdf_font`
- القيمة الافتراضية: Cairo

### الخطوة 5: تحديث `PrintTemplate.tsx` - قراءة الخط من الاعدادات

تحديث طباعة المتصفح لاستخدام الخط المختار من الاعدادات (بدلا من Cairo الثابت).

---

## الملفات المتاثرة

| الملف | التغيير |
|-------|---------|
| `src/lib/arabicFont.ts` | استبدال روابط Variable Font بـ Static TTF + دعم خطوط متعددة + تحقق من حجم الملف |
| `src/lib/pdfGenerator.ts` | قراءة اعداد الخط من company_settings + تمريره لدوال الخط |
| `src/components/settings/InvoiceSettingsSection.tsx` | اضافة واجهة اختيار خط PDF مع معاينة |
| `src/components/print/PrintTemplate.tsx` | استخدام الخط المختار بدلا من Cairo الثابت |
| `supabase/migrations/` | اضافة عمود pdf_font الى company_settings |

---

## الخطوط المتاحة للمستخدم

| الخط | الوصف | مناسب لـ |
|------|-------|---------|
| Cairo | خط حديث وواضح | الاستخدام العام والتقارير |
| Amiri | خط كلاسيكي (نسخي) | المستندات الرسمية |
| Noto Sans Arabic | خط Google الشامل | التوافقية القصوى |
| Tajawal | خط عصري خفيف | العروض التقديمية |

---

## ترتيب التنفيذ

| # | المهمة |
|---|--------|
| 1 | اضافة migration لعمود pdf_font |
| 2 | اصلاح arabicFont.ts (Static TTF + خطوط متعددة) |
| 3 | تحديث pdfGenerator.ts (قراءة اعداد الخط) |
| 4 | تحديث InvoiceSettingsSection.tsx (واجهة الاختيار) |
| 5 | تحديث PrintTemplate.tsx (الخط الديناميكي) |

