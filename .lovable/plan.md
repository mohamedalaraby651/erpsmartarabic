

# خطة التطوير المرحلة التالية - قسم العملاء

---

## المشاكل المكتشفة والإصلاحات المطلوبة

### مشكلة 1: Edge Function لدمج العملاء لن تعمل
`merge-customers` غير مسجلة في `supabase/config.toml` مما يمنع نشرها بشكل صحيح.
- **الإصلاح:** إضافة `[functions.merge-customers]` مع `verify_jwt = false` في config.toml

### مشكلة 2: روابط الصور تنتهي بعد 24 ساعة
`ImageUpload` يستخدم `createSignedUrl` بصلاحية 24 ساعة فقط. بعدها تختفي صورة العميل.
- **الإصلاح:** تحويل bucket `customer-images` إلى public واستخدام `getPublicUrl` بدلا من signed URLs. أو حفظ المسار النسبي وتوليد signed URL عند العرض.

### مشكلة 3: `any` متبقي في CustomerFormDialog
السطر 126: `const payload: any` لا يزال موجود.
- **الإصلاح:** استبداله بـ `Partial<CustomerInsert>`

---

## خطوات التنفيذ

### الخطوة 1: إصلاح نظام الصور (الأولوية القصوى)
**الملفات:** `src/components/shared/ImageUpload.tsx`، migration SQL

- تحويل `customer-images` bucket إلى public عبر migration
- تعديل `ImageUpload` لاستخدام `getPublicUrl` بدلا من `createSignedUrl`
- حفظ المسار النسبي في `image_url` بدلا من signed URL الكامل
- تعديل `CustomerAvatar` و `CustomerDetailsPage` لبناء URL العرض من المسار المحفوظ

### الخطوة 2: إصلاح config.toml + type safety
**الملفات:** `supabase/config.toml`، `src/components/customers/CustomerFormDialog.tsx`

- إضافة `[functions.merge-customers]` verify_jwt = false
- استبدال `const payload: any` بـ `Partial<CustomerInsert>` مع الأنواع الصحيحة

### الخطوة 3: تحسين عرض العملاء في القائمة
**الملف:** `src/pages/customers/CustomersPage.tsx`

- استخدام `CustomerAvatar` في جدول العملاء (عمود الاسم) بدلا من النص العادي
- استخدام `CustomerAvatar` في بطاقات الموبايل `DataCard`
- إضافة عمود صورة مصغرة في الجدول

### الخطوة 4: تفعيل Swipe Actions على الموبايل
**الملف:** `src/pages/customers/CustomersPage.tsx`

- دمج `SwipeableRow` مع بطاقات العملاء على الموبايل
- إضافة أزرار سحب: تعديل، واتساب، حذف
- تحسين تجربة اللمس

### الخطوة 5: تحسين صفحة تفاصيل العميل
**الملف:** `src/pages/customers/CustomerDetailsPage.tsx`

- تحسين عرض التبويبات على الموبايل (ScrollArea أفقي للتبويبات)
- إضافة ملخص مالي سريع قابل للنقر يفتح التبويب المناسب
- تحسين بطاقات الإحصاء بإضافة مؤشرات اتجاه (سهم أعلى/أسفل)

---

## الملفات المتأثرة

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `src/components/shared/ImageUpload.tsx` | إصلاح نظام URLs - استخدام public URLs |
| 2 | `supabase/config.toml` | إضافة merge-customers function config |
| 3 | `src/components/customers/CustomerFormDialog.tsx` | إزالة `any` المتبقي |
| 4 | `src/pages/customers/CustomersPage.tsx` | CustomerAvatar + SwipeableRow في الموبايل |
| 5 | `src/pages/customers/CustomerDetailsPage.tsx` | تحسين التبويبات + مؤشرات الاتجاه |
| 6 | Migration SQL | تحويل customer-images bucket إلى public |

---

## التفاصيل التقنية

- **Public URL pattern:** `{SUPABASE_URL}/storage/v1/object/public/customer-images/{path}`
- حفظ المسار النسبي فقط في DB (مثل: `{customer_id}/1234.jpg`)
- توليد URL الكامل عند العرض عبر `getPublicUrl`
- لا حاجة لتغيير schema - فقط تغيير ما يُحفظ في `image_url`

