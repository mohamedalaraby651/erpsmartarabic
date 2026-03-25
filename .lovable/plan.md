# خطة تطوير الملف الشخصي للعميل - بروفايل محسّن متكامل

---

## ملخص التطوير

تحسين شامل لعرض بيانات العميل مع نظام صور متقدم يشمل اقتصاص وأيقونات تلقائية حسب النوع، وإعادة تصميم قسم الهيدر ليعرض البيانات المالية والاتصال وتاريخ التعامل بشكل أفضل وأكثر تفاعلية.

---

## التغييرات المطلوبة

### 1. مكون ImageUpload محسّن مع اقتصاص الصورة

**الملف:** `src/components/shared/ImageUpload.tsx`

- اضافة مكتبة `react-image-crop` لاقتصاص الصورة قبل الرفع
- عرض نافذة اقتصاص (Crop Modal) بعد اختيار الصورة وقبل الرفع
- دعم نسبة 1:1 للصور الشخصية
- دعم `capture="environment"` على الموبايل للتصوير المباشر من الكاميرا
- تحسين زر الرفع ليكون overlay مباشر على الصورة بدل أسفلها

### 2. مكون CustomerAvatar الذكي (جديد)

**الملف:** `src/components/customers/CustomerAvatar.tsx` (جديد)

- يعرض صورة العميل اذا وجدت
- بدون صورة: يولّد أفاتار ملون بالأحرف الأولى مع تدرجات مختلفة حسب نوع العميل:
  - فرد: تدرج أزرق
  - شركة: تدرج أخضر
  - مزرعة: تدرج بني/أخضر
- أيقونة صغيرة overlay (User / Building2 / Leaf) تظهر في الزاوية حسب النوع
- أحجام متعددة (sm, md, lg, xl)

### 3. إعادة تصميم هيدر صفحة تفاصيل العميل

**الملف:** `src/pages/customers/CustomerDetailsPage.tsx` (تعديل الأسطر 258-440)

**الهيكل الجديد للهيدر:**

```text
┌─────────────────────────────────────────────────────────┐
│  ┌──────┐  الاسم + VIP Badge + حالة                     │
│  │Avatar│  نوع العميل | التصنيف | المحافظة               │
│  │ كبير │                                                │
│  │+رفع  │  [📞 هاتف] [💬 واتساب] [✉ بريد] [🌐 فيسبوك]  │
│  └──────┘                                                │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │الرصيد   │ │المشتريات│ │نسبة     │ │آخر شراء │       │
│  │الحالي   │ │الإجمالي │ │السداد % │ │         │       │
│  │مع شريط  │ │         │ │مع شريط  │ │         │       │
│  │ائتمان   │ │         │ │تقدم     │ │         │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                          │
│  آخر 3 فواتير: INV-001 (مدفوع) | INV-002 (جزئي) | ...  │
│  ─────────────────────────── أزرار: تعديل | فاتورة جديدة│
└─────────────────────────────────────────────────────────┘
```

التغييرات المحددة:

- **الصورة**: استبدال Avatar + ImageUpload المنفصلين بـ `CustomerAvatar` مدمج مع زر رفع overlay
- **أزرار الاتصال**: تحويل النصوص الحالية لأزرار تفاعلية ملونة (هاتف أخضر، واتساب أخضر، بريد أزرق)
- **البيانات المالية**: نقل 4 بطاقات إحصاء أساسية داخل الهيدر مع شريط تقدم للائتمان ونسبة السداد
- **تاريخ التعامل المختصر**: عرض آخر 3 فواتير كشريط صغير أسفل الهيدر مع حالة كل فاتورة
- **الموبايل**: تصميم متجاوب يعرض الصورة والاسم في المنتصف، والأزرار في صف أفقي قابل للتمرير

### 4. تحسين بطاقات الإحصاءات

**الملف:** `src/pages/customers/CustomerDetailsPage.tsx`

- اضافة `Progress` bar في بطاقة الرصيد (نسبة الاستخدام من حد الائتمان)
- اضافة `Progress` bar في بطاقة نسبة السداد
- تلوين الرصيد (أخضر اذا دائن، أحمر اذا مدين)
- اضافة مؤشر اتجاه (سهم أعلى/أسفل) مقارنة بالشهر السابق

### 5. شريط تاريخ التعامل المختصر (جديد)

**الملف:** `src/components/customers/CustomerQuickHistory.tsx` (جديد)

- يعرض آخر 3 فواتير وآخر دفعة وتاريخ أول تعامل
- كل عنصر قابل للنقر (EntityLink)
- تصميم أفقي مدمج في الهيدر

---

## الملفات المتأثرة


| #   | الملف                                               | نوع التغيير                   |
| --- | --------------------------------------------------- | ----------------------------- |
| 1   | `src/components/shared/ImageUpload.tsx`             | تعديل - اضافة اقتصاص + كاميرا |
| 2   | `src/components/customers/CustomerAvatar.tsx`       | **جديد** - أفاتار ذكي         |
| 3   | `src/components/customers/CustomerQuickHistory.tsx` | **جديد** - تاريخ تعامل مختصر  |
| 4   | `src/pages/customers/CustomerDetailsPage.tsx`       | تعديل - هيدر محسن + إحصاءات   |
| 5   | `package.json`                                      | اضافة `react-image-crop`      |


---

## التفاصيل التقنية

- **react-image-crop**: مكتبة خفيفة (~8KB gzipped) لاقتصاص الصور في المتصفح قبل الرفع
- **Canvas API**: لتحويل الصورة المقتصة الى Blob قبل رفعها لـ Storage
- **تدرجات الألوان**: CSS gradients ثابتة حسب `customer_type` بدون حساب ديناميكي
- **الموبايل**: `capture="user"` في input file للتصوير المباشر، مع fallback لاختيار ملف
- **الأداء**: لا استعلامات اضافية - كل البيانات متاحة بالفعل في الصفحة

....

خطة تطوير قسم العملاء - المرحلة المتقدمة

الوضع الحالي بعد الفحص

ما تم إنجازه

Server-side pagination + debounce (يعمل)

&nbsp;

إزالة as any من CustomersPage و CustomerDetailsPage (تم)

&nbsp;

StatementOfAccount مع running balance (يعمل)

&nbsp;

CustomerImportDialog من Excel (يعمل)

&nbsp;

CommunicationLogTab (الكود جاهز لكن الجدول غير موجود في قاعدة البيانات)

&nbsp;

CustomerPurchaseChart + CustomerFinancialSummary (يعمل)

&nbsp;

المشاكل المتبقية

جدول customer_communications غير موجود - المهاجرة فشلت سابقا ويجب إعادتها

&nbsp;

11 موضع as any في CustomerFormDialog.tsx (الأعمدة موجودة فعلا في types.ts لذا يمكن إزالتها)

&nbsp;

لا يوجد فلاتر موبايل - الفلاتر تختفي على الموبايل

&nbsp;

لا يوجد دمج عملاء مكررين

&nbsp;

لا يوجد بحث متقدم بالمحافظة والرصيد والحالة

&nbsp;

خطة التنفيذ

1. إنشاء جدول customer_communications + RLS

إعادة تشغيل المهاجرة:

&nbsp;

جدول customer_communications مع أعمدة: id, customer_id, type, subject, note, communication_date, created_by, created_at

&nbsp;

RLS: authenticated users يقرأون ويضيفون

&nbsp;

2. إصلاح Type Safety في CustomerFormDialog

إزالة كل as any واستبدالها بالأنواع الصحيحة من Database['public']['Tables']['customers']['Row'] - جميع الأعمدة (governorate, city, discount_percentage, contact_person, إلخ) موجودة فعلا في types.ts

&nbsp;

3. فلاتر متقدمة + FilterDrawer للموبايل

إضافة فلتر بالمحافظة (من قائمة egyptGovernorates)

&nbsp;

فلتر بالحالة (نشط/غير نشط)

&nbsp;

فلتر بنطاق الرصيد (من/إلى)

&nbsp;

على الموبايل: استخدام FilterDrawer (موجود بالفعل) بدل إخفاء الفلاتر

&nbsp;

إضافة FilterChips لعرض الفلاتر النشطة

&nbsp;

4. دمج العملاء المكررين

مكون CustomerMergeDialog جديد

&nbsp;

كشف تلقائي بالأسماء المتشابهة (Levenshtein أو بحث بسيط)

&nbsp;

واجهة لاختيار السجل الرئيسي والسجل المكرر

&nbsp;

نقل الفواتير والمدفوعات والعناوين للسجل الرئيسي عبر edge function آمنة

&nbsp;

حذف السجل المكرر بعد النقل

&nbsp;

5. تحسينات واجهة المستخدم

إضافة Swipe actions على بطاقات العملاء في الموبايل (تعديل، واتساب، حذف)

&nbsp;

ServerPagination للموبايل أيضا

&nbsp;

تحسين الانتقالات بين الصفحات

&nbsp;

الملفات المتأثرة

#

&nbsp;

الملف

&nbsp;

التغيير

&nbsp;

1

&nbsp;

Migration SQL

&nbsp;

إنشاء جدول customer_communications + RLS

&nbsp;

2

&nbsp;

src/components/customers/CustomerFormDialog.tsx

&nbsp;

إزالة as any

&nbsp;

3

&nbsp;

src/pages/customers/CustomersPage.tsx

&nbsp;

فلاتر متقدمة + FilterDrawer + swipe

&nbsp;

4

&nbsp;

src/components/customers/CustomerMergeDialog.tsx

&nbsp;

جديد

&nbsp;

5

&nbsp;

supabase/functions/merge-customers/index.ts

&nbsp;

جديد - edge function للدمج

&nbsp;

ترتيب التنفيذ

#

&nbsp;

المهمة

&nbsp;

السبب

&nbsp;

1

&nbsp;

إنشاء جدول customer_communications

&nbsp;

فك حجب ميزة التواصل

&nbsp;

2

&nbsp;

إصلاح as any في CustomerFormDialog

&nbsp;

جودة الكود

&nbsp;

3

&nbsp;

فلاتر متقدمة + FilterDrawer موبايل

&nbsp;

سهولة الاستخدام

&nbsp;

4

&nbsp;

دمج العملاء المكررين

&nbsp;

جودة البيانات