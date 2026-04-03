

# خطة إكمال تطوير قسم الموردين — المرحلة النهائية

## الفجوات المتبقية بعد المراجعة الشاملة

بعد مقارنة دقيقة بين قسم العملاء والموردين، تم اكتشاف الفجوات التالية التي لم يتم تنفيذها بعد:

---

### 1. لا يوجد Zod Validation في Repository Layer
**العملاء**: `customerWriteSchema` يُطبق في `create()` و `update()` داخل `customerRepository.ts`
**الموردين**: لا يوجد — البيانات تُرسل مباشرة بدون تحقق

**الإصلاح**: إنشاء `supplierWriteSchema` في `src/lib/validations.ts` وتطبيقه في `supplierRepository.ts`

---

### 2. لا يوجد Aging Chart للموردين
**العملاء**: `AgingDonutChart` يعتمد على RPC `get_customer_aging`
**الموردين**: لا يوجد RPC `get_supplier_aging` ولا رسم بياني مقابل

**الإصلاح**: 
- إنشاء RPC `get_supplier_aging` (يحسب أعمار المستحقات من `purchase_orders`)
- إنشاء `SupplierAgingChart.tsx` (نسخة معدلة من AgingDonutChart)
- إضافته في تبويب التحليلات

---

### 3. لا يوجد CashFlow Chart للموردين
**العملاء**: `CashFlowLineChart` يعرض التدفق التراكمي
**الموردين**: لا يوجد

**الإصلاح**: إنشاء `SupplierCashFlowChart.tsx` يعتمد على `chartData.monthly_data` الموجود فعلاً من RPC

---

### 4. SupplierPaymentsTab لا يستخدم Pagination
**العملاء**: المدفوعات مُقسمة بـ server-side pagination
**الموردين**: `SupplierPaymentsTab` يجلب الكل بدون pagination

**الإصلاح**: تعديل `SupplierPaymentsTab` لاستخدام `paginatedPayments` من `useSupplierDetail`

---

### 5. Import Dialog بدون Zod Validation
**العملاء**: يستخدم Zod schema للتحقق من صحة البيانات المستوردة
**الموردين**: بدون validation — البيانات تُرسل مباشرة

**الإصلاح**: إضافة `supplierImportSchema` وتطبيقه في `SupplierImportDialog.tsx`

---

### 6. DSO و paymentRatio غير معروضين في الملخص المالي
**الموردين**: `useSupplierDetail` يحسب `dso` و `paymentRatio` من RPC لكنهما لا يُعرضان في `SupplierFinancialSummary`

**الإصلاح**: إضافة DSO و paymentRatio في `SupplierFinancialSummary.tsx`

---

### 7. الجلب المزدوج: `findPurchaseOrders(500)` لا يزال موجوداً
`useSupplierDetail.ts` يجلب 500 أمر شراء (سطر 80) رغم وجود paginated queries. يُستخدم فقط لحساب `pendingOrders` و `lastOrderDate`.

**الإصلاح**: نقل حساب `pendingOrderCount` و `lastOrderDate` إلى `get_supplier_financial_summary` RPC وإزالة الجلب الكبير

---

## ملخص التنفيذ

| # | المهمة | النوع | الملفات |
|---|--------|-------|---------|
| 1 | إنشاء `supplierWriteSchema` + تطبيقه في Repository | أمان | `validations.ts`, `supplierRepository.ts` |
| 2 | إنشاء RPC `get_supplier_aging` | بيانات | Migration |
| 3 | إنشاء `SupplierAgingChart.tsx` | مكون | `charts/SupplierAgingChart.tsx` |
| 4 | إنشاء `SupplierCashFlowChart.tsx` | مكون | `charts/SupplierCashFlowChart.tsx` |
| 5 | إضافة الرسوم الجديدة في analytics tab | صفحة | `SupplierDetailsPage.tsx` |
| 6 | تحديث `SupplierFinancialSummary` بـ DSO + paymentRatio | مكون | `SupplierFinancialSummary.tsx` |
| 7 | تعديل `SupplierPaymentsTab` لاستخدام pagination | مكون | `SupplierPaymentsTab.tsx` |
| 8 | إضافة Zod validation في Import Dialog | أمان | `SupplierImportDialog.tsx` |
| 9 | تحديث RPC لإضافة `pending_order_count` + `last_order_date` | بيانات | Migration |
| 10 | إزالة `findPurchaseOrders(500)` من `useSupplierDetail` | أداء | `useSupplierDetail.ts` |

---

## التبعيات

```text
Step 1 (Zod) → مستقل
Step 2 (Aging RPC) → مستقل  
Steps 3-4 (Charts) → يعتمد على Step 2
Step 5 (Page update) → يعتمد على Steps 3-4
Steps 6-8 → مستقلة
Steps 9-10 (Remove double fetch) → يعتمدان على بعضهما
```

