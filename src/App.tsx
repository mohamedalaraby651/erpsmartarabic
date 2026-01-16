import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ReloadPrompt } from "@/components/offline/ReloadPrompt";

// Lazy load pages for better performance
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
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const SupplierDetailsPage = lazy(() => import("./pages/suppliers/SupplierDetailsPage"));
const SupplierPaymentsPage = lazy(() => import("./pages/suppliers/SupplierPaymentsPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/purchase-orders/PurchaseOrdersPage"));
const PurchaseOrderDetailsPage = lazy(() => import("./pages/purchase-orders/PurchaseOrderDetailsPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
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
const EmployeesPage = lazy(() => import("./pages/employees/EmployeesPage"));
const EmployeeDetailsPage = lazy(() => import("./pages/employees/EmployeeDetailsPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const SyncStatusPage = lazy(() => import("./pages/sync/SyncStatusPage"));
const SystemSettingsPage = lazy(() => import("./pages/admin/SystemSettingsPage"));
const AttachmentsPage = lazy(() => import("./pages/attachments/AttachmentsPage"));
const InstallPage = lazy(() => import("./pages/install/InstallPage"));

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
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ReloadPrompt />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
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
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="suppliers/:id" element={<SupplierDetailsPage />} />
                <Route path="supplier-payments" element={<SupplierPaymentsPage />} />
                <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="quotations/:id" element={<QuotationDetailsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
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
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/:id" element={<EmployeeDetailsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="sync" element={<SyncStatusPage />} />
                <Route path="admin/system-settings" element={<SystemSettingsPage />} />
                <Route path="attachments" element={<AttachmentsPage />} />
                <Route path="install" element={<InstallPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
