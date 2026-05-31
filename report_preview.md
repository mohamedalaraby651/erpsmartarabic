# UX States Audit Report

Generated automatically. Severity: High (Missing Loading/Error), Medium (Missing Empty/Smart Distinction), Low (Missing Arabic CTA/Retry).

## Root
- **src/pages/Auth.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/Dashboard.tsx**
  - Missing: Empty state
  - Severity: Medium
- **src/pages/ForbiddenPage.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High
- **src/pages/ForgotPasswordPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/NotFound.tsx**
  - Missing: Loading state, Empty state, Retry button in error state
  - Severity: High
- **src/pages/ResetPasswordPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/RouteErrorPage.tsx**
  - Missing: Loading state, Empty state
  - Severity: High

## Accounting
- **src/pages/accounting/ChartOfAccountsPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High
- **src/pages/accounting/JournalEntriesPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High
- **src/pages/accounting/PostingLogPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High

## Admin
- **src/pages/admin/ActivityLogPage.tsx**
  - Missing: Error state
  - Severity: High
- **src/pages/admin/AdminDashboard.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/ApprovalChainsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/AuditTrailPage.tsx**
  - Missing: Error state
  - Severity: High
- **src/pages/admin/BackupPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/CustomizationsPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/admin/DispatcherBatchDetailPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/ExportTemplatesPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/MetricsPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High
- **src/pages/admin/PermissionsPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/admin/RoleLimitsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/RolesPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/admin/SodRulesPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/admin/TenantsPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low
- **src/pages/admin/UserManagementPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low
- **src/pages/admin/UsersPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium

## Approvals
- **src/pages/approvals/ApprovalsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low

## Attachments
- **src/pages/attachments/AttachmentsPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low

## Attendance

## Categories

## Collections
- **src/pages/collections/CollectionDashboard.tsx**
  - Missing: Loading state, Error state, Smart empty/filter distinction
  - Severity: High

## Credit-notes
- **src/pages/credit-notes/CreditNoteDetailsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/credit-notes/components/CreditNoteStats.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High
- **src/pages/credit-notes/components/CreditNoteTable.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High

## Customers
- **src/pages/customers/CustomerDetailsPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low

## Delivery-notes
- **src/pages/delivery-notes/DeliveryNotesPage.tsx**
  - Missing: Error state
  - Severity: High

## Dev
- **src/pages/dev/PdfJobsPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low
- **src/pages/dev/PdfSandboxPage.tsx**
  - Missing: Loading state, Empty state, Retry button in error state
  - Severity: High
- **src/pages/dev/PdfTelemetryPage.tsx**
  - Missing: Loading state, Retry button in error state, Smart empty/filter distinction
  - Severity: High

## Employees
- **src/pages/employees/EmployeeDetailsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/employees/EmployeesPage.tsx**
  - Missing: Error state
  - Severity: High

## Expenses
- **src/pages/expenses/ExpenseCategoriesPage.tsx**
  - Missing: Smart empty/filter distinction
  - Severity: Low

## File
- **src/pages/file/OpenFilePage.tsx**
  - Missing: Loading state, Retry button in error state, Smart empty/filter distinction
  - Severity: High

## Goods-receipts
- **src/pages/goods-receipts/GoodsReceiptsPage.tsx**
  - Missing: Error state
  - Severity: High

## Install
- **src/pages/install/InstallPage.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High

## Inventory
- **src/pages/inventory/InventoryPage.tsx**
  - Missing: Empty state
  - Severity: Medium

## Invoices
- **src/pages/invoices/InvoiceDetailsPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High

## Landing
- **src/pages/landing/LandingPage.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High

## Logistics
- **src/pages/logistics/LogisticsDocumentDetailsPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High

## Notifications
- **src/pages/notifications/NotificationsPage.tsx**
  - Missing: Smart empty/filter distinction
  - Severity: Low

## Payments

## Platform
- **src/pages/platform/PlatformAdminsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/platform/PlatformAuth.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/platform/PlatformBillingPage.tsx**
  - Missing: Loading state, Empty state, Retry button in error state
  - Severity: High
- **src/pages/platform/PlatformDashboard.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/platform/PlatformReportsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/platform/PlatformSettingsPage.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High
- **src/pages/platform/TenantDetailsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low
- **src/pages/platform/TenantsManagementPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low

## Pricing
- **src/pages/pricing/PriceListsPage.tsx**
  - Missing: Smart empty/filter distinction
  - Severity: Low

## Products
- **src/pages/products/ProductDetailsPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High

## Protocol
- **src/pages/protocol/ProtocolHandlerPage.tsx**
  - Missing: Loading state, Empty state, Retry button in error state
  - Severity: High

## Purchase-invoices
- **src/pages/purchase-invoices/PurchaseInvoiceApprovalsPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High
- **src/pages/purchase-invoices/PurchaseInvoicesPage.tsx**
  - Missing: Error state
  - Severity: High

## Purchase-orders
- **src/pages/purchase-orders/PurchaseOrderDetailsPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High
- **src/pages/purchase-orders/PurchaseOrdersPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High
- **src/pages/purchase-orders/components/PurchaseOrderMobileList.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High
- **src/pages/purchase-orders/components/PurchaseOrderStats.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High
- **src/pages/purchase-orders/components/PurchaseOrderTable.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High

## Quotations
- **src/pages/quotations/QuotationDetailsPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium

## Quotes
- **src/pages/quotes/QuoteNewPage.tsx**
  - Missing: Loading state, Retry button in error state, Smart empty/filter distinction
  - Severity: High
- **src/pages/quotes/QuotesPage.tsx**
  - Missing: Error state
  - Severity: High
- **src/pages/quotes/SalesPipelinePage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High

## Reports
- **src/pages/reports/KPIDashboard.tsx**
  - Missing: Loading state, Empty state, Error state
  - Severity: High
- **src/pages/reports/ReportsPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High
- **src/pages/reports/ReturnsReportPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low
- **src/pages/reports/SalesReportsPage.tsx**
  - Missing: Retry button in error state, Smart empty/filter distinction
  - Severity: Low

## Sales-orders
- **src/pages/sales-orders/SalesOrderDetailsPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High
- **src/pages/sales-orders/SalesOrdersPage.tsx**
  - Missing: Error state
  - Severity: High

## Search
- **src/pages/search/SearchPage.tsx**
  - Missing: Retry button in error state
  - Severity: Low

## Settings
- **src/pages/settings/CustomerAlertSettings.tsx**
  - Missing: Loading state, Empty state, Retry button in error state
  - Severity: High
- **src/pages/settings/UnifiedSettingsPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium

## Share
- **src/pages/share/ShareTargetPage.tsx**
  - Missing: Empty state, Error state
  - Severity: High

## Suppliers
- **src/pages/suppliers/SupplierDetailsPage.tsx**
  - Missing: Empty state, Retry button in error state
  - Severity: Medium
- **src/pages/suppliers/SupplierPaymentsPage.tsx**
  - Missing: Error state
  - Severity: High

## Sync
- **src/pages/sync/SyncStatusPage.tsx**
  - Missing: Loading state, Empty state
  - Severity: High

## Tasks

## Treasury
- **src/pages/treasury/CashRegisterDetailsPage.tsx**
  - Missing: Error state, Smart empty/filter distinction
  - Severity: High
- **src/pages/treasury/TreasuryPage.tsx**
  - Missing: Error state
  - Severity: High

