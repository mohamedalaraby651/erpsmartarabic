

# خطة نقل تحسينات العملاء إلى قسم الموردين

---

## الوضع الحالي

| الميزة | العملاء | الموردين |
|--------|---------|----------|
| Repository Layer | `customerRepository` + `customerRelationsRepo` + `customerSearchRepo` | لا يوجد — استعلامات مباشرة في الصفحات |
| Custom Hooks | 10 hooks متخصصة | لا يوجد — كل المنطق في الصفحة |
| Server-side RPCs | `get_customer_financial_summary`, `get_customer_chart_data`, `get_customer_aging`, `get_customer_statement` | لا يوجد |
| Component Structure | 11 مجلد فرعي منظم | 12 ملف مسطح |
| Bulk Selection | مفعّل مع Select All + floating bar | غير موجود |
| Prev/Next Navigation | `useCustomerNavigation` | غير موجود |
| Hero Header + KPIs | بطاقة متكاملة مع KPIs تفاعلية | header بسيط بدون KPIs |
| Financial Summary | RPC server-side | حساب client-side من purchase_orders |
| Charts | 4 رسوم بيانية تعتمد على RPC | رسم بياني واحد يعتمد على بيانات خام |
| Smart Alerts | 8 أنواع تنبيهات | تنبيه واحد بسيط (رصيد مرتفع) |
| Error Boundaries | مفعّل | غير موجود |
| Saved Views | محفوظة في قاعدة البيانات | غير موجود |
| Statement | RPC `get_customer_statement` مع running balance | حساب يدوي في الصفحة |
| Pagination | Server-side paginated tabs | لا يوجد pagination في التفاصيل |
| Permission Checks | `verifyPermissionOnServer` | تحقق client-side فقط |
| Infinite Scroll (List) | `useInfiniteCustomers` | `ServerPagination` (مقبول) |
| Import Validation | Zod schema | بدون validation |
| Sanitized Search | `sanitizeSearch` utility | بدون sanitization |

---

## خطة التنفيذ

### المرحلة 1: البنية التحتية — Repository + Hooks + RPCs

**1.1 — إنشاء Supplier Repository**
- إنشاء `src/lib/repositories/supplierRepository.ts`
- نقل جميع استعلامات Supabase من `SuppliersPage.tsx` و `SupplierDetailsPage.tsx`
- تطبيق `sanitizeSearch` على البحث
- دعم الفلاتر: search, governorate, category, status

**1.2 — إنشاء Supplier Relations Repo**
- إنشاء `src/lib/repositories/supplierRelationsRepo.ts`
- وظائف: `findPurchaseOrders`, `findPayments`, `findProducts`, `findActivities`, `findAttachments`
- دعم pagination لكل وظيفة

**1.3 — إنشاء RPCs للموردين**
- `get_supplier_financial_summary`: إجمالي المشتريات، المدفوعات، الرصيد، عدد الطلبات، متوسط قيمة الطلب، DSO
- `get_supplier_chart_data`: بيانات شهرية مُجمّعة + أعلى المنتجات المشتراة
- `get_supplier_statement`: كشف حساب مع running balance (مثل `get_customer_statement`)

**1.4 — إنشاء Hooks متخصصة**
- `src/hooks/suppliers/useSupplierDetail.ts` — hook رئيسي لصفحة التفاصيل
- `src/hooks/suppliers/useSupplierList.ts` — منطق القائمة
- `src/hooks/suppliers/useSupplierFilters.ts` — إدارة الفلاتر
- `src/hooks/suppliers/useSupplierMutations.ts` — عمليات CRUD مع audit logging
- `src/hooks/suppliers/useBulkSupplierSelection.ts` — تحديد جماعي
- `src/hooks/suppliers/useSupplierNavigation.ts` — تنقل سابق/تالي
- `src/hooks/suppliers/index.ts` — barrel export

---

### المرحلة 2: تنظيم المكونات في مجلدات

**2.1 — إعادة هيكلة `src/components/suppliers/`**

```text
suppliers/
├── hero/
│   ├── SupplierHeroHeader.tsx      (جديد — بطاقة متكاملة مع KPIs)
│   ├── SupplierHeroIdentity.tsx    (جديد)
│   └── SupplierHeroActions.tsx     (جديد)
├── charts/
│   ├── SupplierPurchasesChart.tsx  (تعديل — يستخدم RPC)
│   ├── SupplierAgingChart.tsx      (جديد)
│   └── SupplierCashFlowChart.tsx   (جديد)
├── tabs/
│   ├── SupplierInfoTab.tsx         (نقل)
│   ├── SupplierFinancialSummary.tsx(تعديل — يستخدم RPC)
│   ├── SupplierPaymentsTab.tsx     (تعديل — pagination)
│   ├── SupplierProductsTab.tsx     (نقل)
│   ├── SupplierRatingTab.tsx       (نقل)
│   └── SupplierActivityTab.tsx     (نقل)
├── list/
│   ├── SupplierListRow.tsx         (جديد — مع checkbox)
│   ├── SupplierStatsBar.tsx        (جديد — smart filter chips)
│   ├── SupplierSavedViews.tsx      (جديد)
│   └── SupplierMobileView.tsx      (جديد)
├── dialogs/
│   ├── SupplierFormDialog.tsx      (نقل)
│   ├── SupplierPaymentDialog.tsx   (نقل)
│   └── SupplierImportDialog.tsx    (نقل)
└── alerts/
    └── SupplierAlertsBanner.tsx    (جديد)
```

---

### المرحلة 3: ترقية صفحة القائمة `SuppliersPage.tsx`

- استخدام hooks بدل الاستعلامات المباشرة
- إضافة Smart Filter Chips (نشط، مدين، حسب التصنيف)
- إضافة Bulk Selection مع Select All checkbox + floating action bar
- إضافة `storeSupplierNavIds` عند النقر على مورد
- إضافة Saved Views (تستخدم جدول `user_saved_views` مع section = 'suppliers')
- إضافة `sanitizeSearch` للبحث
- لف الصفحة بـ `ErrorBoundary`
- إضافة فحص صلاحيات server-side بدل client-side

---

### المرحلة 4: ترقية صفحة التفاصيل `SupplierDetailsPage.tsx`

- استخدام `useSupplierDetail` hook
- استبدال `SupplierProfileHeader` بـ `SupplierHeroHeader` مع KPIs تفاعلية
- الملخص المالي يعتمد على RPC بدل حساب client-side
- إضافة رسوم بيانية: Aging + CashFlow (من RPC)
- تعديل `SupplierPurchasesChart` لاستخدام `chartData` من RPC
- إضافة Prev/Next navigation
- إضافة Smart Alerts (رصيد مرتفع، تجاوز ائتمان، طلبات متأخرة، عدم نشاط)
- إضافة server-side permission check لعمليات التعديل
- كشف الحساب يستخدم RPC `get_supplier_statement`
- Tabs مع lazy loading
- لف كل tab بـ `ChartErrorBoundary`
- Pagination لقوائم الطلبات والمدفوعات

---

### المرحلة 5: الأمان وسلامة البيانات

- إضافة `verifyPermissionOnServer('suppliers', 'edit')` لعمليات التعديل
- إضافة `verifyPermissionOnServer('suppliers', 'delete')` (موجود في `supplierService.ts`)
- إضافة Zod validation للاستيراد
- تطبيق `sanitizeSearch` على جميع الاستعلامات
- إضافة `toast.warning` عند فشل audit logging

---

## ملخص الملفات

| الملف | النوع |
|-------|-------|
| `src/lib/repositories/supplierRepository.ts` | إنشاء |
| `src/lib/repositories/supplierRelationsRepo.ts` | إنشاء |
| `src/hooks/suppliers/useSupplierDetail.ts` | إنشاء |
| `src/hooks/suppliers/useSupplierList.ts` | إنشاء |
| `src/hooks/suppliers/useSupplierFilters.ts` | إنشاء |
| `src/hooks/suppliers/useSupplierMutations.ts` | إنشاء |
| `src/hooks/suppliers/useBulkSupplierSelection.ts` | إنشاء |
| `src/hooks/suppliers/useSupplierNavigation.ts` | إنشاء |
| `src/hooks/suppliers/index.ts` | إنشاء |
| Migration: 3 RPCs | إنشاء |
| `src/components/suppliers/hero/*` | إنشاء (3 ملفات) |
| `src/components/suppliers/charts/*` | إنشاء + تعديل (3 ملفات) |
| `src/components/suppliers/list/*` | إنشاء (4 ملفات) |
| `src/components/suppliers/alerts/*` | إنشاء |
| `src/pages/suppliers/SuppliersPage.tsx` | إعادة كتابة |
| `src/pages/suppliers/SupplierDetailsPage.tsx` | إعادة كتابة |
| Existing components | نقل إلى مجلدات فرعية |

---

## التبعيات

```text
Phase 1 (Repos + RPCs + Hooks) → مستقل، يُنفذ أولاً
Phase 2 (Component Structure) → مستقل
Phase 3 (List Page) → يعتمد على Phase 1 + 2
Phase 4 (Detail Page) → يعتمد على Phase 1 + 2
Phase 5 (Security) → يُنفذ مع Phase 3 + 4
```

