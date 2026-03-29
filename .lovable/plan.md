

# خطة التنفيذ — المهام المتبقية والتحسينات الإضافية

## تحليل الحالة الحالية

بعد مراجعة الكود، المهام التالية **تم تنفيذها بالفعل** ولا تحتاج تغيير:
- ✅ تحذير البيانات غير المحفوظة (isDirty + AlertDialog + onInteractOutside)
- ✅ Price list badge في HeroHeader
- ✅ توضيح "من هذه الصفحة فقط" في bulk selection
- ✅ keepPreviousData في useCustomerQueries
- ✅ GridView action menu (تعديل + حذف)
- ✅ DB indexes migration
- ✅ Credit notes في كشف الحساب + pagination
- ✅ إصلاح DSO (due_date)
- ✅ Sanitize search + Batch validate delete + Audit logging fix
- ✅ Lazy-loaded tabs + lazy queries

## المهام المتبقية — 5 مهام

### 1. إضافة `onEscapeKeyDown` prevention في CustomerFormDialog
**المشكلة**: `onInteractOutside` موجود لكن Escape key يغلق النموذج بدون تحذير عند وجود بيانات غير محفوظة.
**الملف**: `src/components/customers/CustomerFormDialog.tsx`
**التنفيذ**:
- إضافة `onEscapeKeyDown={(e) => { if (isDirty) { e.preventDefault(); setUnsavedWarningOpen(true); } }}` على `DialogContent`
- هذا يضمن أن ESC + Click outside + زر X كلها محمية

### 2. تصدير كل العملاء (Export All)
**المشكلة**: زر التصدير الحالي يصدر فقط بيانات الصفحة (25 سجل).
**الملف**: `src/pages/customers/CustomersPage.tsx`
**التنفيذ**:
- إضافة state `exportAllLoading` + async function `handleExportAll`
- الدالة تجلب كل العملاء بـ `.select('*').limit(5000)` بدون `.range()`
- إضافة زر "تصدير الكل" بجانب `ExportWithTemplateButton` الحالي
- عرض loading spinner أثناء الجلب

### 3. طي الأقسام على الموبايل (Mobile collapsed sections)
**المشكلة**: جميع أقسام الموبايل تستخدم `priority="low"` أو `"medium"` لكن الفواتير والملخص المالي يجب أن تبقى مفتوحة.
**الملف**: `src/pages/customers/CustomerDetailsPage.tsx`
**التنفيذ**:
- تعيين `priority="medium"` للفواتير والملخص المالي (مفتوحة افتراضياً)
- تعيين `priority="low"` لباقي الأقسام (العناوين، المدفوعات، كشف الحساب، التواصل، التذكيرات، المرفقات) — بعضها بالفعل `"low"`

### 4. تقسيم CustomerFormDialog إلى مكونات فرعية
**المشكلة**: الملف 533 سطر — كل sections inline JSX يُعاد render كاملاً.
**الملفات الجديدة** (في `src/components/customers/form/`):
- `CustomerFormBasicInfo.tsx` — المعلومات الأساسية (الاسم، النوع، التصنيف، VIP)
- `CustomerFormContact.tsx` — معلومات الاتصال + الشخص المسؤول
- `CustomerFormLocation.tsx` — المحافظة والمدينة
- `CustomerFormFinancial.tsx` — حد الائتمان، الخصم، الملاحظات

**النهج**: استخدام `useFormContext` من react-hook-form بدلاً من prop drilling:
- كل مكون فرعي يستدعي `useFormContext<CustomerFormData>()` مباشرة
- `CustomerFormDialog.tsx` يلف المكونات بـ `FormProvider` (موجود في react-hook-form)
- كل مكون ملفوف بـ `React.memo` لمنع re-renders غير ضرورية
- تقليص الملف الأصلي إلى ~200 سطر orchestrator

### 5. فلاتر متقدمة — Phase 5
**الملفات**: `useCustomerFilters.ts` + `CustomersPage.tsx` (FilterDrawer) + `useCustomerQueries.ts`
**التنفيذ**:
- إضافة فلتر "بدون تواصل منذ X يوم" — حقل number input في FilterDrawer
- إضافة فلتر "بدون نشاط منذ X يوم" — حقل number input في FilterDrawer
- في `useCustomerFilters`: إضافة `inactiveDays` و `noCommDays` كـ state + URL sync
- في `useCustomerQueries`: إضافة `.lte('last_communication_at', cutoffDate)` و `.lte('last_activity_at', cutoffDate)` عند تفعيل الفلاتر

---

## ترتيب التنفيذ
1. **أولاً**: المهام 1-3 (إصلاحات سريعة — ESC key + Export All + Mobile collapse)
2. **ثانياً**: المهمة 4 (تقسيم CustomerFormDialog — أكبر مهمة)
3. **ثالثاً**: المهمة 5 (فلاتر متقدمة)

## الملفات المتأثرة
```text
تعديل:
  - CustomerFormDialog.tsx (onEscapeKeyDown + FormProvider refactor)
  - CustomersPage.tsx (Export All button)
  - CustomerDetailsPage.tsx (mobile priority fixes)
  - useCustomerFilters.ts (advanced filter state)
  - useCustomerQueries.ts (advanced filter queries)

جديد:
  - src/components/customers/form/CustomerFormBasicInfo.tsx
  - src/components/customers/form/CustomerFormContact.tsx
  - src/components/customers/form/CustomerFormLocation.tsx
  - src/components/customers/form/CustomerFormFinancial.tsx
```

