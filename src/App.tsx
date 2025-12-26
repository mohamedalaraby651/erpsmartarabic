import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerDetailsPage from "./pages/customers/CustomerDetailsPage";
import ProductsPage from "./pages/products/ProductsPage";
import ProductDetailsPage from "./pages/products/ProductDetailsPage";
import CategoriesPage from "./pages/categories/CategoriesPage";
import QuotationsPage from "./pages/quotations/QuotationsPage";
import SalesOrdersPage from "./pages/sales-orders/SalesOrdersPage";
import ReportsPage from "./pages/reports/ReportsPage";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import PaymentsPage from "./pages/payments/PaymentsPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import SupplierDetailsPage from "./pages/suppliers/SupplierDetailsPage";
import PurchaseOrdersPage from "./pages/purchase-orders/PurchaseOrdersPage";
import SettingsPage from "./pages/settings/SettingsPage";
import SearchPage from "./pages/search/SearchPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import TasksPage from "./pages/tasks/TasksPage";
import RolesPage from "./pages/admin/RolesPage";
import PermissionsPage from "./pages/admin/PermissionsPage";
import CustomizationsPage from "./pages/admin/CustomizationsPage";
import UsersPage from "./pages/admin/UsersPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="suppliers/:id" element={<SupplierDetailsPage />} />
              <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="admin/roles" element={<RolesPage />} />
              <Route path="admin/permissions" element={<PermissionsPage />} />
              <Route path="admin/customizations" element={<CustomizationsPage />} />
              <Route path="admin/users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
