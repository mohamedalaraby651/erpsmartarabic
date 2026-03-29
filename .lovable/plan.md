

# تقرير المقارنة: Sprint 1 المطلوب vs الحالة الفعلية للكود

---

## 1. المسار المرئي: توحيد GridView و TableView

| المتطلب | الحالة | التفاصيل |
|---|---|---|
| Hover Prefetching في GridCard | ❌ مفقود | `handleRowHover` موجود في `useCustomerQueries` ويُستخدم فقط في `CustomerTableView` (سطر 398-399). `CustomerGridView` لا يمرر `onRowHover` ولا يستدعيه. |
| Loading/Deleting States على الكارت | ❌ مفقود | `CustomerGridCard` لا يستقبل `isDeleting` prop. لا يوجد overlay أو spinner أثناء الحذف. `deletingId` يُستخدم فقط في `CustomerTableView`. |
| Sort By dropdown في Grid mode | ❌ مفقود | `sortConfig` و `requestSort` موجودان في `CustomersPage` لكنهما يُمررّان فقط لـ `CustomerTableView`. لا يوجد UI للترتيب عند تفعيل Grid mode. |
| Selection (Checkbox) | ✅ موجود | `CustomerGridCard` يدعم `isSelected`, `onSelect`, `showSelect`. |
| Action buttons (تعديل، حذف، فاتورة، واتساب) | ✅ موجود | أزرار inline buttons على الكارت (hover على desktop، دائمة على mobile). |

---

## 2. مسار البيانات: التصدير والفلترة

| المتطلب | الحالة | التفاصيل |
|---|---|---|
| تصدير Excel/CSV بدل JSON | ❌ مفقود | `handleExportAll` (سطر 163-178) يُصدّر JSON فقط: `new Blob([JSON.stringify(allData)])`. لا يوجد CSV أو XLSX. |
| Global Progress Toast أثناء التصدير | ❌ مفقود | يوجد `exportAllLoading` state يُظهر spinner على الزر فقط. لا يوجد toast أو progress bar عالمي. |
| عداد الفلاتر يشمل noCommDays/inactiveDays | ✅ موجود | `activeFiltersCount` في `useCustomerFilters` (سطر 103-107) يحسب `(noCommDays ? 1 : 0) + (inactiveDays ? 1 : 0)`. |
| فلاتر زمنية (بدون تواصل/نشاط) | ✅ موجود | `noCommDays` و `inactiveDays` مُنفذان بالكامل في الـ filters hook والـ queries hook والـ FilterDrawer. |
| ExportWithTemplateButton (الصفحة الحالية) | ✅ موجود | يصدّر بيانات الصفحة الحالية فقط (`queries.customers`). |

---

## 3. مسار الحماية: Validation الاستباقي

| المتطلب | الحالة | التفاصيل |
|---|---|---|
| Real-time Duplicate Check (اسم/هاتف) | ❌ مفقود | `CustomerFormDialog` لا يحتوي على أي debounced query للتحقق من التكرار أثناء الكتابة. يوجد `DuplicateDetectionDialog` منفصل لكنه يعمل بشكل مستقل عن النموذج. |
| Unsaved Changes — onInteractOutside | ✅ موجود | سطر 253: `onInteractOutside={(e) => { if (isDirty) { e.preventDefault(); ... } }}` |
| Unsaved Changes — onEscapeKeyDown | ✅ موجود | سطر 254: `onEscapeKeyDown={(e) => { if (isDirty) { e.preventDefault(); ... } }}` |
| Unsaved Changes — زر الإغلاق (onOpenChange) | ✅ موجود | `handleOpenChange` (سطر 91-98) يعترض الإغلاق عند `isDirty`. |
| Zod Schema Validation | ✅ موجود | يستخدم `zodResolver(customerSchema)`. |
| Server-side Permission Check | ✅ موجود | `verifyPermissionOnServer` و `verifyFinancialLimit` قبل الحفظ. |

---

## 4. مسار الموبايل: تحسين الوصول

| المتطلب | الحالة | التفاصيل |
|---|---|---|
| Communication Log على الموبايل | ✅ موجود | `MobileDetailSection title="سجل التواصل" priority="low"` (سطر 134). لكنه `priority="low"` → مغلق افتراضياً. |
| Reminders على الموبايل | ✅ موجود | `MobileDetailSection title="التذكيرات" priority="low"` (سطر 137). أيضاً `priority="low"`. |
| رفع أولوية التواصل/التذكيرات | ❌ مطلوب | المطلوب جعلها `priority="medium"` ليكون الوصول أسهل من الميدان. |
| Swipe Actions في MobileView | ⚠️ جزئي | `SwipeableRow` موجود ويدعم `onEdit` و `onDelete`. لا يدعم "سحب لليمين للاتصال". |
| Pull to Refresh | ✅ موجود | `PullToRefresh` مُستخدم في `CustomerMobileView`. |
| VirtualizedList للقوائم الطويلة | ✅ موجود | يُفعّل عند `data.length > 50`. |
| Mobile Wizard للنموذج | ✅ موجود | `FullScreenForm` مع 4 خطوات wizard. |
| Form Draft Auto-save | ✅ موجود | `useFormDraft` يحفظ كل 5 ثوانٍ في localStorage. |

---

## 5. المسار المعماري المتقدم (الأهداف الاستراتيجية)

| المتطلب | الحالة | التفاصيل |
|---|---|---|
| FormProvider + useFormContext | ✅ موجود | الملف الرئيسي يلف بـ `FormProvider`، والمكونات الفرعية تستخدم `useFormContext`. |
| Component Decomposition | ✅ موجود | تم تقسيم النموذج إلى 4 مكونات: BasicInfo, Contact, Location, Financial. |
| keepPreviousData | ✅ موجود | سطر 67 في `useCustomerQueries`: `placeholderData: keepPreviousData`. |
| Optimistic Delete | ✅ موجود | `onMutate` في `deleteMutation` يزيل العميل مباشرة من الـ cache. |
| Batch Validation قبل الحذف الجماعي | ✅ موجود | يستدعي `batch_validate_delete` RPC. |
| Audit Trail | ✅ موجود | `log_bulk_operation` RPC بعد كل عملية جماعية. |
| Keyboard Navigation (Table) | ✅ موجود | Arrow keys + Enter + Space + Delete في `CustomerTableView`. |
| Command Palette (Cmd+K) | ❌ مفقود | لا يوجد global search/command palette. (خارج نطاق هذا السبرينت) |
| Dashboards تفاعلية | ⚠️ جزئي | `CustomerPurchaseChart` موجود كتبويب. لا يوجد dashboard مركزي. |

---

## ملخص الفجوات — المهام المطلوب تنفيذها في Sprint 1

```text
┌─────────────────────────────────────────────────────────┬──────────┐
│ المهمة                                                  │ الأولوية │
├─────────────────────────────────────────────────────────┼──────────┤
│ 1. Hover Prefetch في GridCard                           │ عالية    │
│ 2. Deleting overlay/spinner على GridCard                │ عالية    │
│ 3. Sort dropdown في Grid mode                           │ عالية    │
│ 4. تحويل Export All من JSON إلى CSV/XLSX                │ عالية    │
│ 5. Progress Toast أثناء التصدير                          │ متوسطة   │
│ 6. Real-time Duplicate Check في النموذج                  │ عالية    │
│ 7. رفع أولوية التواصل/التذكيرات على الموبايل             │ منخفضة   │
│ 8. إضافة "سحب لليمين للاتصال" في SwipeableRow           │ متوسطة   │
└─────────────────────────────────────────────────────────┴──────────┘
```

**الخلاصة**: من أصل ~20 متطلباً في Sprint 1، تم تنفيذ ~12 بالفعل (60%). المتبقي 8 مهام محددة وواضحة، أكبرها: تحويل التصدير لـ CSV/XLSX، إضافة Duplicate Check الحقيقي في النموذج، وتوحيد Prefetch/Sort/Delete States بين Grid و Table.

