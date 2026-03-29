
# خطة إعادة هيكلة وحدة العملاء — Sprint 1: Enterprise Polish

## الحالة: ✅ مكتمل بالكامل

---

## ملخص التغييرات المنفذة

### Phase 1 — تقسيم God Component ✅
- **CustomerDialogManager.tsx**: استخراج 7 dialog states + 5 AlertDialogs باستخدام `forwardRef` + `useImperativeHandle`
- **CustomerBulkActionsBar.tsx**: مكون مستقل بـ `React.memo` لشريط الإجراءات الجماعية
- **CustomersPage.tsx**: تقليص من ~610 سطر إلى ~470 سطر

### Phase 2 — Repository Pattern + CQRS ✅
- **customerRepository.ts**: طبقة Data Access موحدة — كل استدعاءات Supabase مركزة هنا
- **useCustomerList.ts**: CQRS Query side — list + stats + prefetch
- **useCustomerMutations.ts**: CQRS Command side — delete + bulk operations
- **customerService.ts**: توحيد Validation + إضافة `validateBatchDelete` + `exportCustomersToExcel`
- **useDuplicateCheck.ts**: يستخدم Repository بدلاً من Supabase مباشرة

### Phase 3 — UI Parity ✅
- Hover prefetch يعمل في Table + Grid عبر `useCustomerList.handleRowHover`
- Sort dropdown موحد في Grid mode
- Deleting overlay في GridCard

### Phase 4 — Scalability ✅
- Export منقول إلى `customerService.exportCustomersToExcel()` مع progress toast
- Repository pattern يسهل الانتقال المستقبلي لـ Edge Functions

---

## الملفات الجديدة
```
src/lib/repositories/customerRepository.ts
src/hooks/customers/useCustomerList.ts
src/hooks/customers/useCustomerMutations.ts
src/components/customers/CustomerDialogManager.tsx
src/components/customers/CustomerBulkActionsBar.tsx
```

## الملفات المحدثة
```
src/pages/customers/CustomersPage.tsx (610 → ~470 سطر)
src/lib/services/customerService.ts (إضافة validateBatchDelete + exportCustomersToExcel)
src/hooks/customers/useDuplicateCheck.ts (يستخدم repository)
src/hooks/customers/index.ts (exports محدثة)
```

## الملفات المحذوفة
```
src/hooks/customers/useCustomerQueries.ts (مستبدل بـ useCustomerList + useCustomerMutations)
```
