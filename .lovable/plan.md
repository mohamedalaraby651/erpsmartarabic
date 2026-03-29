

# خطة التنفيذ الشاملة — إعادة هيكلة وحدة العملاء (Sprint 1: Enterprise Polish)

---

## الترتيب: 8 مهام مقسمة على 4 مراحل

---

## Phase 1 — تقسيم God Component + توحيد Actions (3 خطوات)

### الخطوة 1: استخراج CustomerDialogManager
**المشكلة**: `CustomersPage.tsx` يدير 7 dialog states (سطر 48-58) + 5 AlertDialogs (سطر 532-599) = ~120 سطر dialogs
**الملف الجديد**: `src/components/customers/CustomerDialogManager.tsx`
**التنفيذ**:
- نقل كل states: `dialogOpen`, `importDialogOpen`, `mergeDialogOpen`, `deleteConfirmId`, `duplicateDialogOpen`, `bulkDeleteOpen`, `bulkVipOpen`, `bulkVipValue`, `selectedCustomer`
- نقل كل الـ AlertDialogs (single delete, bulk delete, bulk VIP) + الـ 4 dialogs (Form, Import, Merge, Duplicate)
- تصدير interface `DialogManagerHandle` مع methods: `openAdd()`, `openEdit(customer)`, `confirmDelete(id)`, `openBulkDelete()`, `openBulkVip()`, إلخ
- استخدام `useImperativeHandle` + `forwardRef` حتى يستدعي `CustomersPage` الدوال بدون prop drilling

### الخطوة 2: استخراج CustomerBulkActionsBar
**المشكلة**: شريط الـ Bulk Actions (سطر 262-294) inline في الصفحة
**الملف الجديد**: `src/components/customers/CustomerBulkActionsBar.tsx`
**التنفيذ**:
- مكون يستقبل: `selectedCount`, `canDelete`, `onVipChange()`, `onActivate()`, `onDeactivate()`, `onDelete()`, `onClear()`
- يعرض العدد + الأزرار
- `React.memo` لمنع re-render غير ضروري

### الخطوة 3: استخراج CustomerActionMenu مشترك
**المشكلة**: أزرار الإجراءات (تعديل، حذف، فاتورة، واتساب) مكررة بأشكال مختلفة في `CustomerGridCard` (سطر 112-134) و`CustomerTableView` (عبر `DataTableActions`) و`CustomerMobileView` (عبر `DataCard`)
**الملف الجديد**: `src/components/customers/CustomerActionMenu.tsx`
**التنفيذ**:
- مكون واحد يقبل: `customer`, `canEdit`, `canDelete`, `onEdit`, `onDelete`, `onNewInvoice`, `onWhatsApp`, `variant: 'inline' | 'dropdown' | 'card'`
- `variant='card'` → أزرار أيقونات (للـ Grid)
- `variant='dropdown'` → قائمة منسدلة (للـ Table عبر DataTableActions)
- `variant='inline'` → أزرار مباشرة (للـ Mobile)
- يُستخدم في الثلاث views بدلاً من التكرار

**النتيجة**: `CustomersPage` ينخفض من ~610 إلى ~250 سطر

---

## Phase 2 — Repository Pattern + CQRS (3 خطوات)

### الخطوة 4: إنشاء customerRepository.ts
**المشكلة**: `supabase.from('customers')` مُستدعى مباشرة في `useCustomerQueries` + `CustomerFormDialog` + `handleExportAll` + `useDuplicateCheck`
**الملف الجديد**: `src/lib/repositories/customerRepository.ts`
**التنفيذ**:
```text
customerRepository = {
  findAll(filters, sort, pagination) → { data, count }
  findById(id) → Customer
  create(data) → Customer
  update(id, data) → Customer
  delete(id) → void
  getStats() → CustomerStats           // wraps RPC get_customer_stats
  batchValidateDelete(ids) → blocked[] // wraps RPC batch_validate_delete
  logBulkOperation(action, ids, details) // wraps RPC log_bulk_operation
  findDuplicates(name, phone, excludeId?) → matches[]
  exportAll(limit?) → Customer[]
}
```
- كل الـ Supabase imports تتركز هنا فقط
- الـ hooks تستورد من Repository بدلاً من supabase مباشرة
- يسهّل الاختبار والتبديل المستقبلي

### الخطوة 5: تقسيم useCustomerQueries إلى Read/Write
**المشكلة**: Hook واحد (262 سطر) يخلط queries + mutations + prefetch
**الملفات**:
- `src/hooks/customers/useCustomerList.ts` — query الرئيسي + stats + prefetch
- `src/hooks/customers/useCustomerMutations.ts` — delete + bulk delete + bulk VIP + bulk status
- تحديث `src/hooks/customers/index.ts` للتصدير الجديد

**التنفيذ**:
- `useCustomerList` يستدعي `customerRepository.findAll()` + `customerRepository.getStats()`
- `useCustomerMutations` يستدعي `customerRepository.delete()` + `customerRepository.batchValidateDelete()`
- `CustomersPage` يستدعي الاثنين بدلاً من `useCustomerQueries` الموحد
- نقل `handleRowHover`/`handleRowLeave` إلى `useCustomerList`
- الحفاظ على optimistic updates في `useCustomerMutations`

### الخطوة 6: توحيد Validation في customerService
**المشكلة**: التحقق من صلاحية الحذف في 3 أماكن مختلفة
**الملف**: `src/lib/services/customerService.ts`
**التنفيذ**:
- `validateBeforeDelete(id)` يبقى كما هو (للحذف الفردي)
- إضافة `validateBatchDelete(ids)` يستدعي `customerRepository.batchValidateDelete()` — بدلاً من استدعاء RPC مباشرة في mutation
- `canDeleteCustomer()` و `canModifyCustomer()` يبقيان — لكن `CustomerFormDialog` يستدعيهم عبر `customerService` بدلاً من `verifyPermissionOnServer` المباشر
- إضافة `transformForExport(customers)` — تحويل بيانات التصدير (headers عربية + formatting)

---

## Phase 3 — UI Parity بين Grid/Table/Mobile (خطوة واحدة)

### الخطوة 7: توحيد التجربة عبر Views
**تم تنفيذه سابقاً** (جزئياً): hover prefetch + deleting overlay + sort dropdown
**المتبقي**:
- **Keyboard Navigation في Grid**: استخراج `useGridNavigation` hook من `CustomerTableView.handleKeyDown` وتطبيقه في `CustomerGridView`
- **SelectAll في Grid**: إضافة checkbox "تحديد الكل" في toolbar الـ Grid (موجود في Table فقط)
- **Mobile Prefetch**: تمرير `onRowHover` لـ `CustomerMobileView` عبر `DataCard.onMouseEnter`

---

## Phase 4 — Scalability (خطوة واحدة)

### الخطوة 8: تحسين Export + Server-Side Aggregation
**8a — تحسين Export**:
- نقل منطق التصدير من `CustomersPage.handleExportAll` إلى `customerService.exportToExcel()`
- دعم cursor-based pagination للتصدير (+5000): جلب 1000 سجل في كل دفعة مع تحديث progress toast
- Fallback: الاحتفاظ بالتصدير الحالي كـ client-side fallback

**8b — Server-Side Aggregation (مستقبلي)**:
- إنشاء RPC `get_customer_financial_summary(customer_id)` يعيد: total_invoiced, total_paid, dso, aging_buckets
- تقليل حجم البيانات المنقولة في `useCustomerDetail` من جلب كل الفواتير+المدفوعات إلى استدعاء RPC واحد

---

## ملخص الملفات

```text
جديد:
  src/components/customers/CustomerDialogManager.tsx    (~180 سطر)
  src/components/customers/CustomerBulkActionsBar.tsx    (~60 سطر)
  src/components/customers/CustomerActionMenu.tsx        (~80 سطر)
  src/lib/repositories/customerRepository.ts             (~120 سطر)
  src/hooks/customers/useCustomerList.ts                 (~100 سطر)
  src/hooks/customers/useCustomerMutations.ts            (~120 سطر)
  src/hooks/customers/useGridNavigation.ts               (~40 سطر)

تعديل:
  src/pages/customers/CustomersPage.tsx     (610 → ~250 سطر)
  src/components/customers/CustomerGridCard.tsx (يستخدم CustomerActionMenu)
  src/components/customers/CustomerTableView.tsx (يستخدم CustomerActionMenu)
  src/components/customers/CustomerMobileView.tsx (يستخدم CustomerActionMenu)
  src/components/customers/CustomerFormDialog.tsx (يستخدم customerService بدل verifyPermissionOnServer)
  src/lib/services/customerService.ts (إضافة validateBatchDelete + transformForExport)
  src/hooks/customers/index.ts (تحديث exports)
  src/hooks/customers/useDuplicateCheck.ts (يستخدم repository)

حذف:
  src/hooks/customers/useCustomerQueries.ts (يُستبدل بـ useCustomerList + useCustomerMutations)
```

## ترتيب التنفيذ الآمن
1. **Phase 1** أولاً — لأنه refactoring بصري فقط، لا يغيّر data flow
2. **Phase 2** ثانياً — Repository + CQRS = أكبر تغيير، لكن Phase 1 يجعله أسهل
3. **Phase 3** ثالثاً — UI polish بعد استقرار البنية
4. **Phase 4** أخيراً — تحسينات أداء لا تؤثر على الوظائف

