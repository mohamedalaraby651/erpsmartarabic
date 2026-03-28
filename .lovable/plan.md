

# خطة الإصلاح الشاملة — 13 مشكلة في 7 ملفات

## المشاكل والإصلاحات

### المرحلة 1: إصلاحات حرجة (تكسر الوظائف)

#### 1. الفواتير والمدفوعات لا تُحمّل في ملف العميل
**الملف**: `src/hooks/customers/useCustomerDetail.ts`
**المشكلة**: `invoices` و `payments` مربوطة بشرط `activeTab` — لا تُحمّل إلا عند الضغط على tab معين. الإحصائيات (totalPurchases, paymentRatio, DSO, CLV) تظهر **صفر دائماً**.
**الإصلاح**: إزالة شرط `activeTab` من `invoices` و `payments` queries (سطر 46 و 57) — جعلها `enabled: !!id` فقط.

#### 2. دفعات المورد لا تُسجّل في الجدول
**الملف**: `src/components/suppliers/SupplierPaymentDialog.tsx`
**المشكلة**: الكود يحدّث `current_balance` فقط بدون INSERT في `supplier_payments`. لا يوجد سجل تاريخي.
**الإصلاح**: إضافة `INSERT INTO supplier_payments` بكل الحقول (payment_number, supplier_id, amount, payment_method, payment_date, reference_number, notes, created_by) **قبل** تحديث الرصيد. وإضافة `invalidateQueries` لـ `supplier-payments`.

#### 3. prefillCustomerId / prefillSupplierId لا يُستقبل
**الملفات**: `src/pages/invoices/InvoicesPage.tsx` + `src/pages/purchase-orders/PurchaseOrdersPage.tsx` + `src/components/invoices/InvoiceFormDialog.tsx`
**المشكلة**: الأزرار ترسل `navigate('/invoices', { state: { prefillCustomerId } })` لكن لا يوجد كود يستقبل `location.state`.
**الإصلاح**:
- في `InvoicesPage`: إضافة `useLocation()` + قراءة `location.state?.prefillCustomerId` + فتح الـ dialog تلقائياً مع تمرير `prefillCustomerId` كـ prop
- في `InvoiceFormDialog`: استقبال prop `prefillCustomerId?` + تعبئة `customer_id` في `defaultValues` عند الفتح
- في `PurchaseOrdersPage`: نفس المنطق لـ `prefillSupplierId`
- تمرير الـ prop المناسب لـ `PurchaseOrderFormDialog`

#### 4. Dashboard Trend محسوب خطأ
**الملف**: `src/pages/Dashboard.tsx` سطر 115-116
**المشكلة**: 
```
const currentPeriodInvoices = prevInvoicesRes.count;    // ← اسم مضلل: هذا فعلاً current period
const previousPeriodInvoices = prevQuotationsRes.count; // ← خطأ! يستخدم quotations بدل invoices
```
المتغير `prevInvoicesRes` هو فعلاً آخر 30 يوم (الاستعلام الخامس)، و `prevQuotationsRes` هو 30-60 يوم (الاستعلام السادس). الأسماء مضللة لكن الاستعلامات صحيحة — المشكلة فقط في **أسماء المتغيرات**.

**التصحيح**: 
```typescript
// الاستعلام [4] = invoices آخر 30 يوم = current
// الاستعلام [5] = invoices 30-60 يوم = previous
const