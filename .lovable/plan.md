

# خطة تنفيذ إصلاحات تدقيق وحدة العملاء

---

## مصفوفة الأولويات

| # | المشكلة | الأثر | الأولوية | الإجراء |
|---|---------|-------|---------|---------|
| 1 | `updateFieldMutation` بدون فحص صلاحيات | ثغرة أمنية — أي مستخدم يغيّر VIP/Status | حرجة | إضافة `verifyPermissionOnServer` |
| 2 | `insertCustomer` يتجاوز Zod validation | بيانات استيراد غير موثقة | حرجة | إضافة `customerWriteSchema.parse` |
| 3 | `storeCustomerNavIds` لا تُستدعى | أزرار السابق/التالي معطلة | عالية | استدعاءها عند النقر على عميل |
| 4 | `sanitizeSearch` مكررة | تناقض محتمل | متوسطة | نقل لملف مشترك |
| 5 | Bulk Selection غير متصل بالواجهة | العمليات الجماعية معطلة | عالية | ربط `useBulkSelection` + checkboxes + floating bar |
| 6 | جلب مزدوج (invoices + invoicesPaginated) | طلبات مضاعفة غير ضرورية | متوسطة | إزالة `findInvoices` من التفاصيل، إنشاء RPC للرسوم |
| 7 | `logBulkOperation` يبلع الأخطاء بصمت | فشل تدقيق غير مرئي | منخفضة | إضافة `toast.warning` |

---

## خطة التنفيذ

### المرحلة 1: إصلاحات أمنية وسلامة بيانات (أولوية قصوى)

**المهمة 1.1 — تأمين `updateFieldMutation`**
- **الملف**: `src/pages/customers/CustomerDetailsPage.tsx` (سطر 252-256)
- **التغيير**: إضافة `verifyPermissionOnServer('customers', 'edit')` قبل `customerRepository.update`
- **النوع**: fix

**المهمة 1.2 — إضافة Zod validation لمسار الاستيراد**
- **الملف**: `src/lib/repositories/customerSearchRepo.ts` (سطر 185-190)
- **التغيير**: استيراد `customerWriteSchema` وتطبيق `.parse(payload)` قبل `supabase.insert`
- **النوع**: fix

**المهمة 1.3 — توحيد `sanitizeSearch`**
- **إنشاء**: `src/lib/utils/sanitize.ts` — نقل الدالة المشتركة
- **تعديل**: `src/lib/repositories/customerRepository.ts` (سطر 19-21) — استيراد من الملف الجديد
- **تعديل**: `src/lib/repositories/customerSearchRepo.ts` (سطر 13-15) — استيراد من الملف الجديد
- **النوع**: refactor

---

### المرحلة 2: إصلاح UX معطل

**المهمة 2.1 — تفعيل التنقل السابق/التالي**
- **الملف**: `src/pages/customers/CustomersPage.tsx`
- **التغيير**: استيراد `storeCustomerNavIds` واستدعاءها في `onNavigate` callback:
  ```
  onNavigate={(id) => {
    storeCustomerNavIds(allCustomers.map(c => c.id));
    navigate(`/customers/${id}`);
  }}
  ```
- تطبيق نفس المنطق في desktop view (سطر 290) و mobile view (سطر 214)
- **النوع**: fix

**المهمة 2.2 — تفعيل Bulk Selection كامل**
- **الملف**: `src/pages/customers/CustomersPage.tsx`
  - استيراد `useBulkSelection` وربطه بـ `allCustomers`
  - تمرير `selectedIds`, `toggleSelect`, `toggleSelectAll`, `isAllSelected` لمكونات القائمة
  - ربط `onBulkDelete`, `onBulkVipUpdate`, `bulkSelectedCount` بـ `CustomerDialogManager` (بدل القيم الثابتة في سطر 331)
  - إضافة floating action bar عند `hasSelection`

- **الملف**: `src/components/customers/list/CustomerListRow.tsx`
  - إضافة props: `isSelected`, `onToggleSelect`
  - إضافة `<Checkbox>` في بداية الصف

- **النوع**: add + fix

---

### المرحلة 3: تحسين الأداء والدقة

**المهمة 3.1 — إزالة الجلب المزدوج للفواتير والمدفوعات**
- **الملف**: `src/hooks/customers/useCustomerDetail.ts`
- **التغيير**: 
  - إزالة `findInvoices(limit:500)` و `findPayments(limit:500)` queries
  - الرسوم البيانية في analytics tab تحتاج RPC مخصص بدلاً من 500 سجل خام
- **النوع**: refactor

**المهمة 3.2 — إنشاء RPC `get_customer_chart_data`**
- **قاعدة البيانات**: إنشاء RPC تعيد بيانات مُجمّعة شهرياً (monthly totals, top products) بدل إرسال 500 سجل للعميل
- **النوع**: add

**المهمة 3.3 — إضافة `toast.warning` عند فشل تسجيل العمليات**
- **الملف**: `src/hooks/customers/useCustomerMutations.ts` (أسطر 72-73, 98)
- **التغيير**: استبدال `logErrorSafely` بـ `toast.warning('تعذّر تسجيل العملية في سجل التدقيق')`
- **النوع**: fix

---

## التبعيات

```text
Phase 1 (Security) → مستقل، يمكن تنفيذه أولاً
Phase 2.1 (Nav)    → مستقل
Phase 2.2 (Bulk)   → يعتمد على Phase 1 (الصلاحيات)
Phase 3.1 (Double) → يعتمد على Phase 3.2 (RPC البديل)
Phase 3.2 (RPC)    → مستقل (migration)
Phase 3.3 (Logging)→ مستقل
```

## التدفق المحسّن النهائي

```text
List → [storeNavIds] → Detail → [verifyPermission] → Tabs
                                                        ├─ Financial: RPC (no limit)
                                                        ├─ Invoices: Paginated only
                                                        ├─ Payments: Paginated only
                                                        ├─ Analytics: get_customer_chart_data RPC
                                                        └─ Actions: [verifyPermission] → mutation
```

## ملخص الملفات المتأثرة

| الملف | نوع التغيير |
|-------|------------|
| `src/lib/utils/sanitize.ts` | **إنشاء** |
| `src/lib/repositories/customerRepository.ts` | refactor (sanitize import) |
| `src/lib/repositories/customerSearchRepo.ts` | fix (Zod) + refactor (sanitize) |
| `src/pages/customers/CustomerDetailsPage.tsx` | fix (permission check) |
| `src/pages/customers/CustomersPage.tsx` | fix (nav IDs) + add (bulk selection) |
| `src/components/customers/list/CustomerListRow.tsx` | add (checkbox + selection props) |
| `src/hooks/customers/useCustomerDetail.ts` | refactor (remove double fetch) |
| `src/hooks/customers/useCustomerMutations.ts` | fix (audit log warning) |
| **Migration SQL** | add (`get_customer_chart_data` RPC) |

