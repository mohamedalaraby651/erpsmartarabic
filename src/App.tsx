import { Suspense } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { emitTelemetry } from "@/lib/runtimeTelemetry";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ReloadPrompt } from "@/components/offline/ReloadPrompt";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { useSeo } from "@/hooks/useSeo";

/** Mounts inside <BrowserRouter> so it can read useLocation().
 *  Drives <title>, description, canonical, Open Graph & Twitter tags per route. */
function RouteSeo(): null {
  useSeo();
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EAGER imports — critical path. Shipped in the main entry chunk so the first
// paint after auth never blocks on a network request. Mobile-first: every byte
// here is one we don't have to fetch over a flaky 3G/4G connection.
//   - Auth         : every unauthenticated user lands here
//   - AppLayout    : the shell rendered for every authenticated route
//   - Dashboard    : default landing for "/"
//   - NotFound     : tiny + must render even if a chunk fetch fails
// ─────────────────────────────────────────────────────────────────────────────
import Auth from "./pages/Auth";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// ─────────────────────────────────────────────────────────────────────────────
// LAZY imports — split into route-group chunks by `vite.config.ts > manualChunks`.
// Each lazy() call still defines a route boundary for React Suspense, but Rollup
// concatenates them into ~7 logical bundles (sales / inventory / finance /
// workspace / admin / platform / settings) instead of 80+ tiny ones.
// ─────────────────────────────────────────────────────────────────────────────

// Public / landing
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));

// Sales & customers group
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const CustomerDetailsPage = lazy(() => import("./pages/customers/CustomerDetailsPage"));
const QuotationsPage = lazy(() => import("./pages/quotations/QuotationsPage"));
const QuotationDetailsPage = lazy(() => import("./pages/quotations/QuotationDetailsPage"));
const SalesOrdersPage = lazy(() => import("./pages/sales-orders/SalesOrdersPage"));
const SalesOrderDetailsPage = lazy(() => import("./pages/sales-orders/SalesOrderDetailsPage"));
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage"));
const InvoiceDetailsPage = lazy(() => import("./pages/invoices/InvoiceDetailsPage"));
const PaymentsPage = lazy(() => import("./pages/payments/PaymentsPage"));
const CreditNotesPage = lazy(() => import("./pages/credit-notes/CreditNotesPage"));
const CreditNoteDetailsPage = lazy(() => import("./pages/credit-notes/CreditNoteDetailsPage"));
const CollectionDashboard = lazy(() => import("./pages/collections/CollectionDashboard"));
const PriceListsPage = lazy(() => import("./pages/pricing/PriceListsPage"));

// Inventory & purchasing group
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const ProductDetailsPage = lazy(() => import("./pages/products/ProductDetailsPage"));
const CategoriesPage = lazy(() => import("./pages/categories/CategoriesPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const SupplierDetailsPage = lazy(() => import("./pages/suppliers/SupplierDetailsPage"));
const SupplierPaymentsPage = lazy(() => import("./pages/suppliers/SupplierPaymentsPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/purchase-orders/PurchaseOrdersPage"));
const PurchaseOrderDetailsPage = lazy(() => import("./pages/purchase-orders/PurchaseOrderDetailsPage"));
const AttachmentsPage = lazy(() => import("./pages/attachments/AttachmentsPage"));

// Logistics group (Goods Receipts, Delivery Notes, Purchase Invoices)
const GoodsReceiptsPage = lazy(() => import("./pages/goods-receipts/GoodsReceiptsPage"));
const DeliveryNotesPage = lazy(() => import("./pages/delivery-notes/DeliveryNotesPage"));
const PurchaseInvoicesPage = lazy(() => import("./pages/purchase-invoices/PurchaseInvoicesPage"));
const PurchaseInvoiceApprovalsPage = lazy(() => import("./pages/purchase-invoices/PurchaseInvoiceApprovalsPage"));
const LogisticsDocumentDetailsPage = lazy(() => import("./pages/logistics/LogisticsDocumentDetailsPage"));

// Sales cycle (Quotes → Orders → Invoices → Deliveries)
const QuotesPage = lazy(() => import("./pages/quotes/QuotesPage"));
const QuoteNewPage = lazy(() => import("./pages/quotes/QuoteNewPage"));
const SalesPipelinePage = lazy(() => import("./pages/quotes/SalesPipelinePage"));

// Finance & accounting group (heavy: pulls in jspdf, recharts via reports)
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const KPIDashboard = lazy(() => import("./pages/reports/KPIDashboard"));
const SalesReportsPage = lazy(() => import("./pages/reports/SalesReportsPage"));
const ReturnsReportPage = lazy(() => import("./pages/reports/ReturnsReportPage"));
const TreasuryPage = lazy(() => import("./pages/treasury/TreasuryPage"));
const CashRegisterDetailsPage = lazy(() => import("./pages/treasury/CashRegisterDetailsPage"));
const ExpensesPage = lazy(() => import("./pages/expenses/ExpensesPage"));
const ExpenseCategoriesPage = lazy(() => import("./pages/expenses/ExpenseCategoriesPage"));
const ChartOfAccountsPage = lazy(() => import("./pages/accounting/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("./pages/accounting/JournalEntriesPage"));
const PostingLogPage = lazy(() => import("./pages/accounting/PostingLogPage"));

// Workspace group (HR + day-to-day tooling)
const EmployeesPage = lazy(() => import("./pages/employees/EmployeesPage"));
const EmployeeDetailsPage = lazy(() => import("./pages/employees/EmployeeDetailsPage"));
const AttendancePage = lazy(() => import("./pages/attendance/AttendancePage"));
const TasksPage = lazy(() => import("./pages/tasks/TasksPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const SearchPage = lazy(() => import("./pages/search/SearchPage"));
const ApprovalsPage = lazy(() => import("./pages/approvals/ApprovalsPage"));
const SyncStatusPage = lazy(() => import("./pages/sync/SyncStatusPage"));
const InstallPage = lazy(() => import("./pages/install/InstallPage"));

// Settings group (small, infrequent)
const UnifiedSettingsPage = lazy(() => import("./pages/settings/UnifiedSettingsPage"));
const CustomerAlertSettingsPage = lazy(() => import("./pages/settings/CustomerAlertSettings"));

// Admin group (rarely visited by regular users — perfect for code-splitting)
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const PermissionsPage = lazy(() => import("./pages/admin/PermissionsPage"));
const CustomizationsPage = lazy(() => import("./pages/admin/CustomizationsPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ActivityLogPage = lazy(() => import("./pages/admin/ActivityLogPage"));
const AuditTrailPage = lazy(() => import("./pages/admin/AuditTrailPage"));
const RoleLimitsPage = lazy(() => import("./pages/admin/RoleLimitsPage"));
const BackupPage = lazy(() => import("./pages/admin/BackupPage"));
const ExportTemplatesPage = lazy(() => import("./pages/admin/ExportTemplatesPage"));
const ApprovalChainsPage = lazy(() => import("./pages/admin/ApprovalChainsPage"));
const MetricsPage = lazy(() => import("./pages/admin/MetricsPage"));
const SodRulesPage = lazy(() => import("./pages/admin/SodRulesPage"));
const TenantsPage = lazy(() => import("./pages/admin/TenantsPage"));
const DomainEventsPage = lazy(() => import("./pages/admin/DomainEventsPage"));

// PWA 2025 handler routes (only triggered by OS share/file/protocol intents)
const ShareTargetPage = lazy(() => import("./pages/share/ShareTargetPage"));
const OpenFilePage = lazy(() => import("./pages/file/OpenFilePage"));
const ProtocolHandlerPage = lazy(() => import("./pages/protocol/ProtocolHandlerPage"));

// Platform Owner (super-admin) routes — only ever loaded by < 5 users globally
const PlatformLayout = lazy(() => import("./components/platform/PlatformLayout"));
const PlatformAuth = lazy(() => import("./pages/platform/PlatformAuth"));
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const TenantsManagementPage = lazy(() => import("./pages/platform/TenantsManagementPage"));
const TenantDetailsPage = lazy(() => import("./pages/platform/TenantDetailsPage"));
const PlatformAdminsPage = lazy(() => import("./pages/platform/PlatformAdminsPage"));
const PlatformBillingPage = lazy(() => import("./pages/platform/PlatformBillingPage"));
const PlatformReportsPage = lazy(() => import("./pages/platform/PlatformReportsPage"));
const PlatformSettingsPage = lazy(() => import("./pages/platform/PlatformSettingsPage"));

/**
 * Global telemetry sink for every failed query / mutation.
 * Silent failures previously only surfaced as red Sonner toasts (or nothing
 * at all if the caller didn't display the error). Now they all flow into
 * runtimeTelemetry — visible in DevTools, ringbuffer, and Edge logs.
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    const msg = (error as Error)?.message || String(error);
    // Skip auth/permission errors — they're expected and noisy.
    const status = (error as { status?: number })?.status;
    const code = (error as { code?: string })?.code;
    if (status === 401 || status === 403 || code === '42501' || code === 'PGRST301') return;
    emitTelemetry('query_error', msg, {
      errorName: (error as Error)?.name,
      metadata: {
        queryKey: Array.isArray(query.queryKey) ? query.queryKey.slice(0, 3) : String(query.queryKey),
        status,
        code,
      },
    });
  },
});

const mutationCache = new MutationCache({
  onError: (error, _vars, _ctx, mutation) => {
    const msg = (error as Error)?.message || String(error);
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) return;
    emitTelemetry('mutation_error', msg, {
      errorName: (error as Error)?.name,
      metadata: {
        mutationKey: mutation.options.mutationKey ?? null,
        status,
      },
    });
  },
});

const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Default = `standard` preset from src/lib/queryConfig.ts.
      // Hooks needing different freshness should pass an override
      // (e.g. queryPresets.realtime for notifications).
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        // Don't retry permission/auth errors — they won't succeed.
        const code = (error as { code?: string; status?: number })?.code;
        const status = (error as { status?: number })?.status;
        if (code === '42501' || code === 'PGRST301' || status === 401 || status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
    mutations: {
      retry: false,
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
            <RouteSeo />
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
                  <Route path="credit-notes/:id" element={<CreditNoteDetailsPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="suppliers/:id" element={<SupplierDetailsPage />} />
                  <Route path="supplier-payments" element={<SupplierPaymentsPage />} />
                  <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />
                  {/* Logistics: Goods Receipts, Delivery Notes, Purchase Invoices */}
                  <Route path="goods-receipts" element={<GoodsReceiptsPage />} />
                  <Route path="goods-receipts/:id" element={<LogisticsDocumentDetailsPage />} />
                  <Route path="delivery-notes" element={<DeliveryNotesPage />} />
                  <Route path="delivery-notes/:id" element={<LogisticsDocumentDetailsPage />} />
                  <Route path="purchase-invoices" element={<PurchaseInvoicesPage />} />
                  <Route path="purchase-invoices/approvals" element={<PurchaseInvoiceApprovalsPage />} />
                  <Route path="purchase-invoices/:id" element={<LogisticsDocumentDetailsPage />} />
                  <Route path="quotes" element={<QuotesPage />} />
                  <Route path="quotes/new" element={<QuoteNewPage />} />
                  <Route path="sales-pipeline" element={<SalesPipelinePage />} />
                  <Route path="quotations" element={<QuotationsPage />} />
                  <Route path="quotations/:id" element={<QuotationDetailsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="reports/sales" element={<SalesReportsPage />} />
                  <Route path="reports/returns" element={<ReturnsReportPage />} />
                  <Route path="settings" element={<UnifiedSettingsPage />} />
                  <Route path="settings/alerts" element={<CustomerAlertSettingsPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="admin/roles" element={<RolesPage />} />
                  <Route path="admin/permissions" element={<PermissionsPage />} />
                  <Route path="admin/customizations" element={<CustomizationsPage />} />
                  <Route path="admin/users" element={<UsersPage />} />
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                  <Route path="admin/activity-log" element={<ActivityLogPage />} />
                  <Route path="admin/audit-trail" element={<AuditTrailPage />} />
                  <Route path="admin/role-limits" element={<RoleLimitsPage />} />
                  <Route path="admin/backup" element={<BackupPage />} />
                  <Route path="admin/export-templates" element={<ExportTemplatesPage />} />
                  <Route path="admin/approval-chains" element={<ApprovalChainsPage />} />
                  <Route path="admin/metrics" element={<MetricsPage />} />
                  <Route path="admin/sod-rules" element={<SodRulesPage />} />
                  <Route path="admin/tenants" element={<TenantsPage />} />
                  <Route path="admin/domain-events" element={<DomainEventsPage />} />
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
                  <Route path="accounting/posting-log" element={<PostingLogPage />} />
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
