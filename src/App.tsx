import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ReloadPrompt } from "@/components/offline/ReloadPrompt";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";

// Lazy load pages for better performance
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AppLayout = lazy(() => import("./components/layout/AppLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const CustomerDetailsPage = lazy(() => import("./pages/customers/CustomerDetailsPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const ProductDetailsPage = lazy(() => import("./pages/products/ProductDetailsPage"));
const CategoriesPage = lazy(() => import("./pages/categories/CategoriesPage"));
const QuotationsPage = lazy(() => import("./pages/quotations/QuotationsPage"));
const QuotationDetailsPage = lazy(() => import("./pages/quotations/QuotationDetailsPage"));
const SalesOrdersPage = lazy(() => import("./pages/sales-orders/SalesOrdersPage"));
const SalesOrderDetailsPage = lazy(() => import("./pages/sales-orders/SalesOrderDetailsPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage"));
const InvoiceDetailsPage = lazy(() => import("./pages/invoices/InvoiceDetailsPage"));
const PaymentsPage = lazy(() => import("./pages/payments/PaymentsPage"));
const CreditNotesPage = lazy(() => import("./pages/credit-notes/CreditNotesPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const SupplierDetailsPage = lazy(() => import("./pages/suppliers/SupplierDetailsPage"));
const SupplierPaymentsPage = lazy(() => import("./pages/suppliers/SupplierPaymentsPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/purchase-orders/PurchaseOrdersPage"));
const PurchaseOrderDetailsPage = lazy(() => import("./pages/purchase-orders/PurchaseOrderDetailsPage"));
const UnifiedSettingsPage = lazy(() => import("./pages/settings/UnifiedSettingsPage"));
const CustomerAlertSettingsPage = lazy(() => import("./pages/settings/CustomerAlertSettings"));
const SearchPage = lazy(() => import("./pages/search/SearchPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const TasksPage = lazy(() => import("./pages/tasks/TasksPage"));
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const PermissionsPage = lazy(() => import("./pages/admin/PermissionsPage"));
const CustomizationsPage = lazy(() => import("./pages/admin/CustomizationsPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ActivityLogPage = lazy(() => import("./pages/admin/ActivityLogPage"));
const RoleLimitsPage = lazy(() => import("./pages/admin/RoleLimitsPage"));
const BackupPage = lazy(() => import("./pages/admin/BackupPage"));
const ExportTemplatesPage = lazy(() => import("./pages/admin/ExportTemplatesPage"));
const ApprovalChainsPage = lazy(() => import("./pages/admin/ApprovalChainsPage"));
const MetricsPage = lazy(() => import("./pages/admin/MetricsPage"));
const SodRulesPage = lazy(() => import("./pages/admin/SodRulesPage"));
const TenantsPage = lazy(() => import("./pages/admin/TenantsPage"));
const ApprovalsPage = lazy(() => import("./pages/approvals/ApprovalsPage"));
const EmployeesPage = lazy(() => import("./pages/employees/EmployeesPage"));
const EmployeeDetailsPage = lazy(() => import("./pages/employees/EmployeeDetailsPage"));
const SyncStatusPage = lazy(() => import("./pages/sync/SyncStatusPage"));
const AttachmentsPage = lazy(() => import("./pages/attachments/AttachmentsPage"));
const InstallPage = lazy(() => import("./pages/install/InstallPage"));
const TreasuryPage = lazy(() => import("./pages/treasury/TreasuryPage"));
const CashRegisterDetailsPage = lazy(() => import("./pages/treasury/CashRegisterDetailsPage"));
const ExpensesPage = lazy(() => import("./pages/expenses/ExpensesPage"));
const ExpenseCategoriesPage = lazy(() => import("./pages/expenses/ExpenseCategoriesPage"));
const AttendancePage = lazy(() => import("./pages/attendance/AttendancePage"));
const CollectionDashboard = lazy(() => import("./pages/collections/CollectionDashboard"));
const PriceListsPage = lazy(() => import("./pages/pricing/PriceListsPage"));
const KPIDashboard = lazy(() => import("./pages/reports/KPIDashboard"));
// Accounting Pages
const ChartOfAccountsPage = lazy(() => import("./pages/accounting/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("./pages/accounting/JournalEntriesPage"));
// PWA 2025 Handler Pages
const ShareTargetPage = lazy(() => import("./pages/share/ShareTargetPage"));
const OpenFilePage = lazy(() => import("./pages/file/OpenFilePage"));
const ProtocolHandlerPage = lazy(() => import("./pages/protocol/ProtocolHandlerPage"));
// Platform Owner Pages
const PlatformLayout = lazy(() => import("./components/platform/PlatformLayout"));
const PlatformAuth = lazy(() => import("./pages/platform/PlatformAuth"));
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const TenantsManagementPage = lazy(() => import("./pages/platform/TenantsManagementPage"));
const TenantDetailsPage = lazy(() => import("./pages/platform/TenantDetailsPage"));
const PlatformAdminsPage = lazy(() => import("./pages/platform/PlatformAdminsPage"));
const PlatformBillingPage = lazy(() => import("./pages/platform/PlatformBillingPage"));
const PlatformReportsPage = lazy(() => import("./pages/platform/PlatformReportsPage"));
const PlatformSettingsPage = lazy(() => import("./pages/platform/PlatformSettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen p-8">
    <div className="w-full max-w-md space-y-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ReloadPrompt />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customers/:id" element={<CustomerDetailsPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="products/:id" element={<ProductDetailsPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="sales-orders" element={<SalesOrdersPage />} />
                  <Route path="sales-orders/:id" element={<SalesOrderDetailsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailsPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="credit-notes" element={<CreditNotesPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="suppliers/:id" element={<SupplierDetailsPage />} />
                  <Route path="supplier-payments" element={<SupplierPaymentsPage />} />
                  <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />
                  <Route path="quotations" element={<QuotationsPage />} />
                  <Route path="quotations/:id" element={<QuotationDetailsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<UnifiedSettingsPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="admin/roles" element={<RolesPage />} />
                  <Route path="admin/permissions" element={<PermissionsPage />} />
                  <Route path="admin/customizations" element={<CustomizationsPage />} />
                  <Route path="admin/users" element={<UsersPage />} />
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                  <Route path="admin/activity-log" element={<ActivityLogPage />} />
                  <Route path="admin/role-limits" element={<RoleLimitsPage />} />
                  <Route path="admin/backup" element={<BackupPage />} />
                  <Route path="admin/export-templates" element={<ExportTemplatesPage />} />
                  <Route path="admin/approval-chains" element={<ApprovalChainsPage />} />
                  <Route path="admin/metrics" element={<MetricsPage />} />
                  <Route path="admin/sod-rules" element={<SodRulesPage />} />
                  <Route path="admin/tenants" element={<TenantsPage />} />
                  <Route path="approvals" element={<ApprovalsPage />} />
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="employees/:id" element={<EmployeeDetailsPage />} />
                  <Route path="profile" element={<UnifiedSettingsPage />} />
                  <Route path="sync" element={<SyncStatusPage />} />
                  <Route path="attachments" element={<AttachmentsPage />} />
                  <Route path="install" element={<InstallPage />} />
                  <Route path="treasury" element={<TreasuryPage />} />
                  <Route path="treasury/:id" element={<CashRegisterDetailsPage />} />
                  <Route path="expenses" element={<ExpensesPage />} />
                  <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="collections" element={<CollectionDashboard />} />
                  <Route path="price-lists" element={<PriceListsPage />} />
                  <Route path="kpis" element={<KPIDashboard />} />
                  {/* Accounting Routes */}
                  <Route path="accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
                  <Route path="accounting/journals" element={<JournalEntriesPage />} />
                  {/* PWA 2025 Handler Routes */}
                  <Route path="share-target" element={<ShareTargetPage />} />
                  <Route path="open-file" element={<OpenFilePage />} />
                  <Route path="protocol" element={<ProtocolHandlerPage />} />
                </Route>
                {/* Platform Owner Routes */}
                <Route path="/platform/auth" element={<PlatformAuth />} />
                <Route path="/platform" element={<PlatformLayout />}>
                  <Route index element={<PlatformDashboard />} />
                  <Route path="tenants" element={<TenantsManagementPage />} />
                  <Route path="tenants/:id" element={<TenantDetailsPage />} />
                  <Route path="admins" element={<PlatformAdminsPage />} />
                  <Route path="billing" element={<PlatformBillingPage />} />
                  <Route path="reports" element={<PlatformReportsPage />} />
                  <Route path="settings" element={<PlatformSettingsPage />} />
                </Route>
                <Route path="/index" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
