

# خطة شاملة — 3 محاور: Service Layer + إصلاح as any + إعادة هيكلة Dashboard

---

## المحور 1: Service Layer كامل (4 ملفات جديدة)

### 1.1 إنشاء `src/lib/services/invoiceService.ts`
- دالة `deleteInvoice(id)`: تتحقق من الصلاحيات → تحذف `invoice_items` → تحذف الفاتورة → تُبطل cache
- دالة `validateBeforeDelete(invoiceId)`: تتحقق من وجود مدفوعات مرتبطة
- دالة `getInvoiceStats()`: تغلف استعلام الإحصائيات الموجود في `InvoicesPage`

### 1.2 إنشاء `src/lib/services/paymentService.ts`
- دالة `deletePayment(id)`: صلاحيات → حذف → (trigger يعكس الرصيد تلقائياً)
- دالة `getPaymentStats(payments)`: حساب إجماليات النقدي والتحويل

### 1.3 إنشاء `src/lib/services/supplierService.ts`
- دالة `recordSupplierPayment(data)`: INSERT في `supplier_payments` → RPC `atomic_supplier_balance_update`
- دالة `deleteSupplier(id)`: صلاحيات → تحقق من أوامر شراء مفتوحة → حذف

### 1.4 إنشاء `src/lib/services/inventoryService.ts`
- دالة `getLowStockProducts()`: منطق المخزون المنخفض الموحد (يستبدل 3 نسخ مكررة)

### 1.5 تحديث الصفحات لاستخدام Service Layer
- `InvoicesPage.tsx`: استبدال delete mutation المباشر بـ `invoiceService.deleteInvoice()`
- `PaymentsPage.tsx`: استبدال بـ `paymentService.deletePayment()`
- `SuppliersPage.tsx`: استبدال بـ `supplierService.deleteSupplier()`
- `SupplierPaymentDialog.tsx`: استبدال بـ `supplierService.recordSupplierPayment()`

---

## المحور 2: إصلاح as any (107 استخدام في 14 ملف)

### الفئة A: Supabase Join Relations (أكثر شيوعاً — 40+ استخدام)
**النمط**: `(invoice.customers as any)?.name`
**السبب**: Supabase ترجع العلاقات بنوع مركب لكن TypeScript لا يستنتجه
**الإصلاح**: تعريف types صريحة لكل query result

| الملف | التغيير |
|-------|---------|
| `Dashboard.tsx` سطر 446 | تعريف `InvoiceWithCustomer` type محلي |
| `MobileDashboard.tsx` سطر 350 | نفس النمط |
| `SearchPage.tsx` سطور 130, 147 | تعريف types للـ search results |
| `GeographicReport.tsx` سطر 46 | تعريف invoice with customer join type |
| `InventoryFlowReport.tsx` سطر 123 | تعريف movement with product type |

### الفئة B: Dynamic Table Names (BackupTab, OfflineSettings, SyncStatus)
**النمط**: `supabase.from(tableName as any)`
**السبب**: Supabase client يقبل فقط literal table names
**الإصلاح**: استخدام `as never` (المعتمد في المشروع) أو generic helper

| الملف | التغيير |
|-------|---------|
| `BackupPage.tsx` (3 مواقع) | `tableName as never` |
| `BackupTab.tsx` (6 مواقع) | `tableName as never` |
| `OfflineSettings.tsx` | `table as never` |
| `SyncStatusPage.tsx` | `table as never` |

### الفئة C: Filter Boolean Arrays
**النمط**: `.filter(Boolean) as any[]`
**السبب**: TypeScript لا يستنتج نوع العنصر بعد filter
**الإصلاح**: استخدام type guard صريح

| الملف | التغيير |
|-------|---------|
| `PaymentsPage.tsx` سطر 136 | `.filter((f): f is FieldType => Boolean(f))` |
| `InventoryPage.tsx` سطر 251 | نفس النمط |
| `TasksPage.tsx` سطر 154 | نفس النمط |
| `CategoriesPage.tsx` سطر 132 | نفس النمط |

### الفئة D: UsersPage Join Types
**النمط**: `user.profiles as any`, `user.custom_roles as any`
**الإصلاح**: تعريف `UserWithRelations` type يشمل profiles و custom_roles joins

### الفئة E: Badge Variant
**النمط**: `variant={getMovementTypeBadge(...) as any}`
**الإصلاح**: تعريف return type الدالة كـ `BadgeProps['variant']`

### الفئة F: Company Settings / Push Notifications
**النمط**: `data as any`, `subscription as any`
**الإصلاح**: تعريف interfaces صحيحة أو استخدام `satisfies`

---

## المحور 3: إعادة هيكلة Dashboard (575 → ~150 سطر)

### 3.1 استخراج مكونات Widget منفصلة
| مكون جديد | المحتوى |
|-----------|---------|
| `StatsWidget.tsx` | بطاقات الإحصائيات الأربعة (سطور 256-294) |
| `QuickActionsWidget.tsx` | شبكة الإجراءات السريعة (سطور 297-323) |
| `SalesChartWidget.tsx` | رسم المبيعات الشهرية (سطور 326-364) |
| `TasksWidget.tsx` | قائمة المهام (سطور 367-413) |
| `RecentInvoicesWidget.tsx` | آخر الفواتير (سطور 417-473) |
| `InsightsWidget.tsx` | التنبيهات الذكية (سطور 485-515) |

### 3.2 استخراج hook مخصص `useDashboardData.ts`
- ينقل جميع استعلامات Dashboard (stats, monthly sales, tasks, recent invoices) لـ hook واحد
- يُصدّر: `dashboardStats`, `monthlySalesData`, `tasks`, `recentInvoices`, `isLoading`

### 3.3 توحيد استعلام المخزون المنخفض
- إنشاء `useLowStockProducts` hook مشترك بـ queryKey `['low-stock-products']`
- يستبدل 3 نسخ مكررة في: `useBusinessInsights`, `useReportsData`, `LowStockWidget`

### 3.4 `Dashboard.tsx` النهائي (~150 سطر)
- يستورد `useDashboardData` + المكونات المستخرجة
- `renderWidget` يصبح switch بسيط يعيد المكون المناسب
- باقي المنطق (greeting, role filtering) يبقى

---

## ملخص التأثير

```text
المحور          الملفات الجديدة   الملفات المعدلة   النتيجة
─────────────  ──────────────── ──────────────── ───────────────────
Service Layer   4 services       4-5 صفحات        مركزية منطق الأعمال
as any          0                14 ملف            107 → 0 استخدام any
Dashboard       8 (widgets+hook) 4 (dashboard+3)   575 → ~150 سطر
```

**ضمانات**: كل تغيير backwards-compatible — لا يكسر أي وظيفة موجودة. الـ services تغلف نفس المنطق الحالي مع إضافة التحقق. الـ types تستبدل `as any` بدون تغيير السلوك.

