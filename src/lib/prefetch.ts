/**
 * Route Prefetching Utility
 * Preloads pages for faster navigation
 */

type RouteImport = () => Promise<{ default: React.ComponentType<any> }>;

// Map of route names to their dynamic imports
const routeImports: Record<string, RouteImport> = {
  dashboard: () => import('@/pages/Dashboard'),
  customers: () => import('@/pages/customers/CustomersPage'),
  'customer-details': () => import('@/pages/customers/CustomerDetailsPage'),
  products: () => import('@/pages/products/ProductsPage'),
  'product-details': () => import('@/pages/products/ProductDetailsPage'),
  invoices: () => import('@/pages/invoices/InvoicesPage'),
  'invoice-details': () => import('@/pages/invoices/InvoiceDetailsPage'),
  quotations: () => import('@/pages/quotations/QuotationsPage'),
  'sales-orders': () => import('@/pages/sales-orders/SalesOrdersPage'),
  suppliers: () => import('@/pages/suppliers/SuppliersPage'),
  inventory: () => import('@/pages/inventory/InventoryPage'),
  settings: () => import('@/pages/settings/UnifiedSettingsPage'),
  search: () => import('@/pages/search/SearchPage'),
  tasks: () => import('@/pages/tasks/TasksPage'),
  treasury: () => import('@/pages/treasury/TreasuryPage'),
  expenses: () => import('@/pages/expenses/ExpensesPage'),
  reports: () => import('@/pages/reports/ReportsPage'),
};

// Track which routes have been prefetched
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a single route
 */
export function prefetchRoute(routeName: string): void {
  if (prefetchedRoutes.has(routeName)) return;
  
  const importFn = routeImports[routeName];
  if (importFn) {
    prefetchedRoutes.add(routeName);
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Silently fail - prefetch is optional
          prefetchedRoutes.delete(routeName);
        });
      });
    } else {
      // Fallback for Safari
      setTimeout(() => {
        importFn().catch(() => {
          prefetchedRoutes.delete(routeName);
        });
      }, 100);
    }
  }
}

/**
 * Prefetch multiple routes
 */
export function prefetchRoutes(routeNames: string[]): void {
  routeNames.forEach(prefetchRoute);
}

/**
 * Prefetch common routes after initial load
 * Call this after the app has fully loaded
 */
export function prefetchCommonRoutes(): void {
  // Wait for the app to be fully interactive
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      prefetchRoutes(['dashboard', 'customers']);
    }, { timeout: 5000 });
  } else {
    setTimeout(() => {
      prefetchRoutes(['dashboard', 'customers']);
    }, 3000);
  }
}

/**
 * Prefetch route on hover/focus
 * Use this with navigation links
 */
export function createPrefetchHandler(routeName: string): () => void {
  let prefetched = false;
  return () => {
    if (!prefetched) {
      prefetched = true;
      prefetchRoute(routeName);
    }
  };
}

/**
 * Get prefetch status
 */
export function isPrefetched(routeName: string): boolean {
  return prefetchedRoutes.has(routeName);
}

/**
 * Map pathname to route name for prefetching
 */
export function getRouteNameFromPath(pathname: string): string | null {
  const pathMap: Record<string, string> = {
    '/': 'dashboard',
    '/customers': 'customers',
    '/products': 'products',
    '/invoices': 'invoices',
    '/quotations': 'quotations',
    '/sales-orders': 'sales-orders',
    '/suppliers': 'suppliers',
    '/inventory': 'inventory',
    '/settings': 'settings',
    '/search': 'search',
    '/tasks': 'tasks',
    '/treasury': 'treasury',
    '/expenses': 'expenses',
    '/reports': 'reports',
  };
  
  return pathMap[pathname] || null;
}
