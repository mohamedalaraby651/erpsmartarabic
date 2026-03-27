

# خطة التنفيذ - المرحلة التالية لقسم العملاء

## ما تم إنجازه بالفعل
Lazy Loading, Optimistic Updates, Server-side Stats RPC, Search Preview, Tab Grouping, Timeline, Reminders, CustomerAvatar, SwipeableRow, Enhanced Mobile Cards

## المرحلة التالية - 6 تطويرات

### 1. Quick Actions من قائمة العملاء (#2)
**الملف:** `src/pages/customers/CustomersPage.tsx`
- إضافة أزرار سريعة في `DataTableActions`: فاتورة جديدة، واتساب
- إضافة نفس الأزرار في `SwipeableRow` للموبايل (swipe left → فاتورة جديدة)
- Navigation مع `state: { prefillCustomerId }` لتعبئة العميل ت