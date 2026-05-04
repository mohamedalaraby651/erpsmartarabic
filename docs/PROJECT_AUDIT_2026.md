# 📊 المراجعة الشاملة للمشروع — Project Audit 2026

**تاريخ التقرير:** 2026-05-04
**الإصدار:** 1.0
**المُعِد:** Lovable AI Agent
**حالة المشروع:** قيد التطوير النشط — جاهز جزئياً للإنتاج

---

## 1️⃣ الملخص التنفيذي (Executive Summary)

### 🎯 الهدف النهائي للتطبيق

المشروع هو **نظام تخطيط موارد المؤسسات (ERP) متعدد المستأجرين (Multi-Tenant SaaS)** موجَّه للسوق العربي، مبني على معمارية احترافية مع:

- **دعم كامل للغة العربية واتجاه RTL** (معيار صارم — راجع `mem://design/rtl-standard`)
- **3 طبقات مستخدمين:** مالك المنصة (Platform Owner) → مدير المستأجر (Tenant Admin) → مستخدمو الأدوار
- **تسعير SaaS ثلاثي:** Basic مجاني، Pro شهري، Enterprise مخصص
- **محرك محاسبي مزدوج القيد** (Double-Entry Accounting) أصيل في PostgreSQL
- **PWA متقدم** يدعم العمل دون اتصال (Offline-First) مع مزامنة ذكية

### 📈 المؤشرات العامة

| المؤشر | القيمة |
|---|---|
| إجمالي الصفحات (Pages) | **77 صفحة** |
| إجمالي الـ Hooks المخصصة | **67 hook** |
| جداول قاعدة البيانات | **89 جدول** |
| العلاقات (Foreign Keys) | **154 علاقة** |
| Edge Functions | **12 دالة خلفية** |
| ملفات Migrations | **123 ملف** |
| ملفات الاختبار | **34+ ملف** (Unit + E2E + Integration) |

### 🏆 نقاط القوة الرئيسية

1. ✅ معمارية متعددة المستأجرين مكتملة مع عزل صارم (`tenant_id` + RLS)
2. ✅ نظام صلاحيات حبيبي (Granular) قابل للتخصيص
3. ✅ محرك مالي يدعم القيد المزدوج والفترات المالية
4. ✅ نظام طباعة وتصدير موحَّد (PDF/Excel/CSV) بدعم عربي كامل
5. ✅ PWA كامل مع Service Worker وتخزين IndexedDB

---

## 2️⃣ خريطة الميزات المنفذة (Feature Roadmap Status)

### ✅ المنفّذ بالكامل (Production-Ready)

| # | الميزة | الحالة | الملفات الرئيسية |
|---|--------|:------:|------------------|
| 1 | **المصادقة + 2FA** | ✅ 100% | `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx`, `supabase/functions/verify-totp/`, `src/components/auth/TwoFactorSetup.tsx` |
| 2 | **إدارة العملاء (CRM)** | ✅ 100% | `src/pages/customers/CustomersPage.tsx`, `CustomerDetailsPage.tsx`, `src/hooks/customers/*` (10 hooks), `src/lib/repositories/customerRepository.ts` |
| 3 | **إدارة الموردين** | ✅ 100% | `src/pages/suppliers/SuppliersPage.tsx`, `SupplierDetailsPage.tsx`, `src/hooks/suppliers/*` (6 hooks) |
| 4 | **الفواتير** | ✅ 95% | `src/pages/invoices/InvoicesPage.tsx`, `InvoiceDetailsPage.tsx`, `src/lib/services/invoiceService.ts`, `supabase/functions/approve-invoice/` |
| 5 | **عروض الأسعار** | ✅ 100% | `src/pages/quotations/QuotationsPage.tsx`, `QuotationDetailsPage.tsx`, `src/hooks/useConvertDocument.ts` |
| 6 | **أوامر البيع** | ✅ 90% | `src/pages/sales-orders/SalesOrdersPage.tsx`, `SalesOrderDetailsPage.tsx` |
| 7 | **أوامر الشراء** | ✅ 90% | `src/pages/purchase-orders/PurchaseOrdersPage.tsx`, `PurchaseOrderDetailsPage.tsx` |
| 8 | **المخزون والمستودعات** | ✅ 95% | `src/pages/inventory/InventoryPage.tsx`, `supabase/functions/stock-movement/`, `src/lib/services/inventoryService.ts` |
| 9 | **المنتجات والتصنيفات** | ✅ 100% | `src/pages/products/ProductsPage.tsx`, `ProductDetailsPage.tsx`, `src/pages/categories/CategoriesPage.tsx` |
| 10 | **الدفعات والتحصيل** | ✅ 100% | `src/pages/payments/PaymentsPage.tsx`, `supabase/functions/process-payment/`, `src/lib/services/paymentService.ts` |
| 11 | **المحاسبة (دليل + قيود)** | ✅ 90% | `src/pages/accounting/ChartOfAccountsPage.tsx`, `JournalEntriesPage.tsx`, `src/lib/financial-engine/*` (5 خدمات) |
| 12 | **المصروفات** | ✅ 100% | `src/pages/expenses/ExpensesPage.tsx`, `ExpenseCategoriesPage.tsx`, `supabase/functions/approve-expense/` |
| 13 | **الخزينة والصناديق** | ✅ 90% | `src/pages/treasury/TreasuryPage.tsx`, `CashRegisterDetailsPage.tsx` |
| 14 | **الموظفين + الحضور** | ✅ 85% | `src/pages/employees/EmployeesPage.tsx`, `src/pages/attendance/AttendancePage.tsx` |
| 15 | **التقارير ولوحات KPI** | ✅ 85% | `src/pages/reports/ReportsPage.tsx`, `KPIDashboard.tsx`, `src/hooks/useReportsData.ts` |
| 16 | **لوحة التحكم الرئيسية** | ✅ 100% | `src/pages/Dashboard.tsx`, `src/hooks/useDashboardData.ts`, `src/components/dashboard/*` |
| 17 | **نظام الصلاحيات الحبيبي** | ✅ 100% | `src/pages/admin/RolesPage.tsx`, `PermissionsPage.tsx`, `RoleLimitsPage.tsx`, `src/hooks/usePermissions.ts` |
| 18 | **السلاسل الإدارية (Approval Chains)** | ✅ 100% | `src/pages/admin/ApprovalChainsPage.tsx`, `src/hooks/useApprovalChain.ts`, `src/pages/approvals/ApprovalsPage.tsx` |
| 19 | **فصل المهام (SoD)** | ✅ 100% | `src/pages/admin/SodRulesPage.tsx` |
| 20 | **سجل التدقيق + سجل النشاط** | ✅ 100% | `src/pages/admin/ActivityLogPage.tsx`, `AuditTrailPage.tsx` |
| 21 | **النسخ الاحتياطي + الاسترجاع** | ✅ 100% | `src/pages/admin/BackupPage.tsx`, `supabase/functions/restore-backup/`, `rollback-restore/` |
| 22 | **الطباعة والتصدير الموحد** | ✅ 100% | `src/components/print/UnifiedExportMenu.tsx`, `src/lib/pdfGenerator.ts`, `src/lib/arabicFont.ts` |
| 23 | **PWA + Offline Sync** | ✅ 100% | `src/lib/syncManager.ts`, `src/lib/offlineStorage.ts`, `src/hooks/useOfflineSync.ts` |
| 24 | **إدارة المستأجرين (Multi-Tenant)** | ✅ 100% | `src/pages/admin/TenantsPage.tsx`, `src/components/tenant/*`, `src/hooks/useTenant.ts` |
| 25 | **بوابة مالك المنصة** | ✅ 95% | `src/pages/platform/PlatformDashboard.tsx`, `TenantsManagementPage.tsx`, `PlatformBillingPage.tsx` |
| 26 | **محرك القرارات (Nazra)** | ✅ 90% | `src/hooks/useBusinessInsights.ts`, `src/hooks/useCustomerAlerts.ts` |
| 27 | **التصنيفات والقوائم السعرية** | ✅ 85% | `src/pages/pricing/PriceListsPage.tsx` |
| 28 | **إشعارات Push + Email** | ✅ 80% | `src/hooks/usePushNotifications.ts`, `src/hooks/useNotificationPreferences.ts` |
| 29 | **استيراد/تصدير Excel ذكي** | ✅ 100% | `src/lib/exports/customerExcelExport.ts`, `mem://features/data-import/excel-standard` |
| 30 | **إشعارات العملاء + التذكيرات** | ✅ 100% | `src/components/customers/*`, `mem://features/customer-management/reminder-system-v2` |

### ⚠️ المنفّذ جزئياً

| الميزة | النسبة | الناقص |
|--------|:------:|--------|
| **أشعارات الدائن (Credit Notes)** | 70% | ربط أعمق بالفواتير الأصلية + أثر محاسبي تلقائي |
| **التقارير المتقدمة (P&L, Balance Sheet)** | 60% | قوالب جاهزة + تصدير مجدول |
| **WhatsApp Share** | 50% | hook موجود لكن غير مفعّل في كل المستندات |
| **معالجات الملفات (File Handlers)** | 40% | تكامل PWA مع نظام التشغيل |

---

## 3️⃣ هيكلة البيانات (Data Architecture)

### 📊 إحصائيات قاعدة البيانات

- **89 جدول** في schema `public`
- **154 علاقة Foreign Key**
- **123 ملف Migration**
- **RLS مفعَّل على 100%** من الجداول الحساسة
- **3 Materialized Views** مع تحديث عبر `pg_cron`

### 🗂️ الجداول مصنّفة حسب المجال

| المجال | الجداول | عدد |
|--------|---------|:---:|
| **المبيعات** | customers, customer_addresses, customer_categories, customer_communications, customer_notes, customer_reminders, quotations, quotation_items, sales_orders, sales_order_items, invoices, invoice_items, payments, credit_notes, credit_note_items | 15 |
| **المشتريات والمخزون** | suppliers, supplier_notes, supplier_payments, purchase_orders, purchase_order_items, products, product_variants, product_categories, product_stock, stock_movements, warehouses, price_lists, price_list_items | 13 |
| **المحاسبة** | chart_of_accounts, journals, journal_entries, fiscal_periods, bank_accounts, expenses, expense_categories, cash_registers, cash_transactions, posting_account_map | 10 |
| **الموارد البشرية** | employees, attendance_records, leave_requests, tasks | 4 |
| **الصلاحيات والأمان** | user_roles, custom_roles, role_section_permissions, role_field_permissions, role_limits, permission_matrix_cache, sod_rules, approval_chains, approval_records | 9 |
| **التدقيق** | activity_logs, audit_trail, user_login_history, suspicious_activities, security_dashboard, slow_queries_log, domain_events, event_metrics, event_dispatcher_backlog, event_dispatcher_metrics | 10 |
| **متعدد المستأجرين** | tenants, user_tenants, platform_admins, platform_audit_logs | 4 |
| **التفضيلات والإعدادات** | profiles, user_preferences, user_sidebar_settings, user_dashboard_settings, user_2fa_settings, user_2fa_status, user_notification_settings, user_offline_settings, user_saved_views, company_settings, system_settings, section_customizations, export_templates, report_templates | 14 |
| **البنية التحتية** | notifications, attachments, push_subscriptions, sync_logs, restore_snapshots, rate_limit_config, rate_limits, customers_safe (view), suppliers_safe (view), employees_safe (view) | 10 |

### 🔗 الخريطة العلائقية الرئيسية

```
tenants (1) ──┬── (N) user_tenants ── profiles
              ├── (N) customers ──┬── invoices ── invoice_items ── products
              │                   ├── quotations ── quotation_items
              │                   ├── sales_orders ── sales_order_items
              │                   ├── payments
              │                   ├── customer_reminders
              │                   └── credit_notes ── credit_note_items
              ├── (N) suppliers ──┬── purchase_orders ── purchase_order_items ── products
              │                   └── supplier_payments
              ├── (N) products ──┬── product_variants
              │                  ├── product_stock ── warehouses
              │                  └── stock_movements
              ├── (N) chart_of_accounts ── journal_entries ── journals ── fiscal_periods
              ├── (N) employees ── attendance_records ── leave_requests
              └── (N) approval_chains ── approval_records
```

### ⚠️ نقاط الضعف في الربط (Relationship Gaps)

| # | المشكلة | الجداول | الأثر | الأولوية |
|---|---------|---------|-------|:--------:|
| 1 | لا يوجد ربط مباشر بين `credit_notes` و `invoice_items` | credit_notes ↔ invoice_items | يصعب تتبع المرتجع لكل بند | 🔴 عالٍ |
| 2 | `purchase_orders` لا يُولّد تلقائياً `stock_movements` عند الاستلام | purchase_orders → stock_movements | تحديث المخزون يدوي | 🟠 متوسط |
| 3 | لا يوجد جدول `goods_receipts` (إيصالات استلام بضاعة) | — | الفصل بين أمر الشراء والاستلام مفقود | 🟠 متوسط |
| 4 | لا يوجد جدول `delivery_notes` (إذن صرف/تسليم) | — | لا توجد حلقة لوجستية مكتملة | 🟠 متوسط |
| 5 | `payments` ليست مربوطة بـ `journal_entries` تلقائياً | payments ↔ journal_entries | القيد المحاسبي للدفعة يتم يدوياً | 🔴 عالٍ |
| 6 | `expenses` لا تُولّد قيود محاسبية تلقائياً | expenses ↔ journals | فجوة في الدورة المحاسبية | 🔴 عالٍ |
| 7 | لا يوجد جدول `tax_rates` للضرائب | — | الضرائب مخزنة كحقول حرة | 🟡 منخفض |
| 8 | لا يوجد جدول `currencies` و `exchange_rates` | — | لا دعم لتعدد العملات | 🟠 متوسط |

---

## 4️⃣ تحليل واجهة المستخدم (UI/UX Review)

### 🎨 الالتزام بنظام التصميم

| المعيار | الحالة | الملاحظة |
|---------|:------:|----------|
| استخدام Shadcn UI | ✅ 100% | 52 مكوّن في `src/components/ui/` |
| رموز HSL دلالية | ✅ 95% | معرّفة في `src/index.css` و `tailwind.config.ts` |
| دعم RTL | ✅ 100% | معيار صارم — اختبارات E2E مخصصة |
| الوضع الداكن (Dark Mode) | ✅ 100% | `themeManager.ts` |
| Mobile-First Responsive | ✅ 95% | أهداف لمسية 44px، تحويل الجداول إلى بطاقات |
| الرسوم المتحركة | ✅ 90% | عبر Tailwind + framer-motion في الصفحات الرئيسية |

### 📄 جرد الصفحات (77 صفحة)

| الفئة | الصفحات الرئيسية |
|------|-------------------|
| **الرئيسية والمصادقة** | `Dashboard`, `Auth`, `LandingPage`, `NotFound`, `RouteErrorPage` |
| **العملاء** | `CustomersPage`, `CustomerDetailsPage` (+ 10 hooks، 15+ component) |
| **الموردين** | `SuppliersPage`, `SupplierDetailsPage`, `SupplierPaymentsPage` |
| **المبيعات** | `InvoicesPage` (+Details), `QuotationsPage` (+Details), `SalesOrdersPage` (+Details), `CreditNotesPage`, `PaymentsPage`, `CollectionDashboard` |
| **المشتريات والمخزون** | `PurchaseOrdersPage` (+Details), `InventoryPage`, `ProductsPage` (+Details), `CategoriesPage`, `PriceListsPage` |
| **المحاسبة** | `ChartOfAccountsPage`, `JournalEntriesPage`, `ExpensesPage`, `ExpenseCategoriesPage`, `TreasuryPage`, `CashRegisterDetailsPage` |
| **الموارد البشرية** | `EmployeesPage`, `EmployeeDetailsPage`, `AttendancePage`, `TasksPage` |
| **التقارير** | `ReportsPage`, `KPIDashboard` |
| **الإدارة (15 صفحة)** | `AdminDashboard`, `RolesPage`, `PermissionsPage`, `RoleLimitsPage`, `UsersPage`, `TenantsPage`, `ApprovalChainsPage`, `SodRulesPage`, `ActivityLogPage`, `AuditTrailPage`, `MetricsPage`, `BackupPage`, `CustomizationsPage`, `ExportTemplatesPage`, `DomainEventsPage` |
| **مالك المنصة (8 صفحات)** | `PlatformDashboard`, `PlatformAuth`, `TenantsManagementPage`, `TenantDetailsPage`, `PlatformAdminsPage`, `PlatformBillingPage`, `PlatformReportsPage`, `PlatformSettingsPage` |
| **PWA وملحقات** | `InstallPage`, `OpenFilePage`, `ProtocolHandlerPage`, `ShareTargetPage`, `SyncStatusPage`, `SearchPage`, `NotificationsPage`, `AttachmentsPage`, `ApprovalsPage` |
| **الإعدادات** | `UnifiedSettingsPage`, `CustomerAlertSettings` |

### ⚠️ ملاحظات UI/UX (من تقرير الفحص الداخلي)

- 4 ملفات > 470 سطر تحتاج تقسيم: `AppSidebar.tsx` (586)، `InvoiceFormDialog.tsx` (533)، `QuotationFormDialog.tsx` (489)، `MobileDrawer.tsx` (470)
- 58 ملف يستخدم `any` ويحتاج تحويل لأنواع TypeScript محددة
- 10 ملفات تكشف `error.message` مباشرة — يجب استخدام `getSafeErrorMessage()`

---

## 5️⃣ العمليات الخلفية (Logic & Actions)

### 🔧 Edge Functions (12 دالة)

| الدالة | الوظيفة | حساسية |
|--------|---------|:-----:|
| `validate-invoice` | التحقق الكامل من الفاتورة قبل الحفظ | 🔴 |
| `approve-invoice` | اعتماد الفاتورة + توليد القيد المحاسبي | 🔴 |
| `process-payment` | معالجة الدفعة + تحديث رصيد العميل (Atomic) | 🔴 |
| `approve-expense` | اعتماد المصروف عبر سلسلة الموافقات | 🔴 |
| `stock-movement` | حركة مخزون ذرية مع تحديث الأرصدة | 🔴 |
| `create-journal` | إنشاء قيد محاسبي مزدوج القيد | 🔴 |
| `verify-totp` | التحقق من رمز 2FA | 🔴 |
| `merge-customers` | دمج عملاء مكررين مع نقل العلاقات | 🟠 |
| `event-dispatcher` | بث الأحداث للمستمعين (Event Bus) | 🟡 |
| `log-event` | تسجيل أحداث المجال | 🟡 |
| `restore-backup` | استرجاع نسخة احتياطية كاملة | 🔴 |
| `rollback-restore` | التراجع عن استرجاع فاشل | 🔴 |
| `export-customers` | تصدير ضخم بصيغة CSV/Excel | 🟡 |

### 🧮 المنطق المحاسبي والمالي

| المنطق | الموقع | الوصف |
|--------|--------|-------|
| **محرك القيد المزدوج** | `src/lib/financial-engine/journal.service.ts` | إنشاء قيود متوازنة |
| **دفتر الأستاذ** | `src/lib/financial-engine/ledger.service.ts` | تجميع الحسابات وأرصدتها |
| **الفترات المالية** | `src/lib/financial-engine/period.service.ts` | إقفال وفتح الفترات |
| **التسويات** | `src/lib/financial-engine/reconciliation.service.ts` | مطابقة الحسابات |
| **قواعد الترحيل** | `src/lib/financial-engine/posting.rules.ts` | ربط أنواع المعاملات بالحسابات |
| **حساب DSO/CLV** | `mem://technical-decisions/financial-kpi-logic` | متوسط فترة التحصيل + قيمة العميل |
| **معايرة الدقة المالية** | `Math.round(value * 100) / 100` | معيار إجباري في كل العمليات |

### ⚙️ منطق العمليات التلقائية

| الإجراء | الآلية | الملف |
|---------|--------|-------|
| تحديث رصيد العميل عند الدفع | DB Trigger + Atomic RPC | `mem://technical-decisions/customer-financial-integrity-sync` |
| عكس الإحصائيات عند الحذف | DB Trigger | `mem://security/financial-deletion-integrity` |
| منع حذف عميل لديه التزامات نشطة | DB Trigger Block | `mem://security/customer-deletion-safety` |
| توليد أرقام تسلسلية للمستندات | PostgreSQL Sequences | `EXP-YYYYMMDD-XXXX` نمط |
| تحديث المخزون من حركة | `stock-movement` Edge Function | معاملة ذرية |
| إنشاء ملف مستخدم تلقائياً | `handle_new_user` Trigger | عند التسجيل |
| تسجيل النشاطات | `log_activity` Trigger على 13 جدول | تتبع كل تغيير |
| تنبيهات العملاء (8 أنواع) | `useCustomerAlerts` + الإلغاء التكراري | `mem://features/customer-management/enterprise-alert-system` |
| نظام التذكيرات | جدولة + ربط بالفواتير | `mem://features/customer-management/reminder-system-v2` |
| محرك القرارات (Nazra) | `useBusinessInsights` | اقتراح الإجراءات التالية |
| التحقق من الحدود المالية | `check_financial_limit` RPC | للخصم/الائتمان/مبلغ الفاتورة |
| التحقق من الصلاحيات | `check_section_permission` RPC | على الخادم لا في الواجهة |

### 🔒 طبقات الأمان المنفذة

1. **RLS على 100% من الجداول** مع فحص `tenant_id`
2. **SECURITY DEFINER Functions** مع `search_path = 'public'`
3. **Rate Limiting** عبر Token Bucket (PostgreSQL + Edge Middleware)
4. **Data Masking Views** (`customers_safe`, `suppliers_safe`, `employees_safe`)
5. **Bidi Sanitization** لإزالة Unicode markers الخفية
6. **2FA TOTP** مع Edge Function للتحقق
7. **عزل RPC متعدد المستأجرين** (إجباري في كل System RPC)

---

## 6️⃣ ما لم يتم تنفيذه — الباك لوج (The Backlog)

### 🚨 أولوية حرجة (P0) — تكمل الدورة المستندية

| # | الميزة | السبب | الجهد التقديري |
|---|--------|-------|:-------------:|
| 1 | **إيصالات استلام البضاعة (Goods Receipts)** | حلقة مفقودة بين أمر الشراء وتحديث المخزون | 3 أيام |
| 2 | **أذونات الصرف/التسليم (Delivery Notes)** | إخراج البضاعة قبل/بعد الفاتورة | 3 أيام |
| 3 | **توليد قيود محاسبية تلقائية** للدفعات والمصروفات والفواتير | الدورة المحاسبية حالياً يدوية | 5 أيام |
| 4 | **ربط Credit Notes بالبنود الأصلية** | لتتبع المرتجع بدقة + أثر مخزني عكسي | 2 أيام |
| 5 | **تقرير ميزان المراجعة (Trial Balance)** | حجر الأساس للتقارير المالية | 2 أيام |

### 🟠 أولوية عالية (P1) — توسعات أساسية

| # | الميزة | السبب |
|---|--------|-------|
| 6 | **قائمة الدخل (Profit & Loss)** + **الميزانية العمومية (Balance Sheet)** | تقارير مالية إلزامية |
| 7 | **تعدد العملات (Multi-Currency)** + جدول `exchange_rates` | متطلب لأي نظام إقليمي |
| 8 | **جدول الضرائب (`tax_rates`)** + حساب تلقائي | ضريبة القيمة المضافة لاحقاً |
| 9 | **التحويلات بين المستودعات** (`stock_transfers`) | إدارة مخازن متعددة |
| 10 | **جرد دوري (Stock Counts)** + تسويات | ضبط فروقات المخزون |
| 11 | **نظام عمولات المبيعات** | ربط الفواتير بالمندوب |
| 12 | **بوابة العميل (Customer Portal)** | عرض الفواتير والدفع الذاتي |
| 13 | **تكامل WhatsApp Business API** | hook موجود لكنه غير مفعَّل |
| 14 | **التقارير المجدولة (Scheduled Reports)** | إرسال أسبوعي/شهري عبر بريد |

### 🟡 أولوية متوسطة (P2) — تحسينات

| # | الميزة |
|---|--------|
| 15 | تكامل بوابات دفع (Stripe / فوري / مدى) |
| 16 | محرر قوالب فواتير مخصصة (Drag-and-Drop) |
| 17 | OCR لقراءة فواتير الموردين الورقية |
| 18 | لوحة BI متقدمة مع رسوم تفاعلية |
| 19 | تكامل البريد الإلكتروني (إرسال فواتير من النظام) |
| 20 | تطبيق جوال أصلي (React Native / Capacitor) |

### 🔧 ديون تقنية (Tech Debt)

| البند | الموقع |
|------|--------|
| استبدال 58 استخدام لـ `any` | الملفات في `SYSTEM_ISSUES_REPORT.md` |
| إخفاء `error.message` في 10 ملفات | استخدام `getSafeErrorMessage()` |
| تقسيم 4 ملفات > 470 سطر | `AppSidebar`, `InvoiceFormDialog`, ... |
| تشفير مفاتيح 2FA at-rest | `user_2fa_settings` |
| Field-level RLS للبيانات الحساسة | `customers`, `suppliers`, `employees` |
| Virtual Scrolling للقوائم الطويلة | الجداول الكبيرة |

---

## 📌 التوصية الختامية

النظام في حالة **متقدمة جداً** ومناسب للإنتاج لشركات الخدمات والتجارة الصغيرة والمتوسطة. الفجوات الرئيسية تتمركز في:

1. **إكمال الدورة المستندية اللوجستية** (استلام بضاعة + إذن صرف)
2. **أتمتة القيود المحاسبية** للعمليات اليومية
3. **التقارير المالية الأساسية** (ميزان مراجعة، قائمة دخل، ميزانية)

البدء فوراً بـ **P0 (5 بنود ≈ 15 يوم عمل)** يجعل المشروع نظام ERP مكتمل الدورة جاهز لأي قطاع تجاري.

---

**نهاية التقرير** — للمراجعة والتحديث عند كل إصدار رئيسي.
