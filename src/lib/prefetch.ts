/**
 * Route Prefetching Utility
 *
 * Preloads page bundles ahead of navigation so the Suspense fallback rarely
 * shows on intra-app jumps. Three trigger surfaces:
 *
 *   1. `prefetchCommonRoutes()` — fires once on app boot (idle callback) for
 *      the most-likely first destinations (dashboard, customers).
 *   2. `createPrefetchHandler(routeName)` — returns a handler suitable for
 *      `onMouseEnter` / `onFocus` / `onTouchStart` on NavLinks; prefetches
 *      exactly once per route per session.
 *   3. `prefetchByPath(path)` — convenience for href-driven flows; resolves
 *      the URL to a route key and triggers prefetch. Used by sidebar +
 *      mobile drawer items.
 *
 * Bundles are grouped via Vite's `manualChunks` (see vite.config.ts), so a
 * single hover usually warms an entire domain (e.g. all sales pages).
 */

type RouteImport = () => Promise<{ default: React.ComponentType<unknown> }>;

// Map of route names to their dynamic imports. Keep keys in sync with
// `pathToRoute` below — they form the only public API surface.
const routeImports: Record<string, RouteImport> = {
  // Sales group ──────────────────────────────────────────────────────────────
  dashboard: () => import('@/pages/Dashboard'),
  customers: () => import('@/pages/customers/CustomersPage'),
  'customer-details': () => import('@/pages/customers/CustomerDetailsPage'),
  invoices: () => import('@/pages/invoices/InvoicesPage'),
  'invoice-details': () => import('@/pages/invoices/InvoiceDetailsPage'),
  quotations: () => import('@/pages/quotations/QuotationsPage'),
  'sales-orders': () => import('@/pages/sales-orders/SalesOrdersPage'),
  'credit-notes': () => import('@/pages/credit-notes/CreditNotesPage'),
  payments: () => import('@/pages/payments/PaymentsPage'),
  collections: () => import('@/pages/collections/CollectionsPage'),
  'price-lists': () => import('@/pages/pricing/PriceListsPage'),

  // Inventory group ──────────────────────────────────────────────────────────
  products: () => import('@/pages/products/ProductsPage'),
  'product-details': () => import('@/pages/products/ProductDetailsPage'),
  categories: () => import('@/pages/categories/CategoriesPage'),
  inventory: () => import('@/pages/inventory/InventoryPage'),
  suppliers: () => import('@/pages/suppliers/SuppliersPage'),
  'purchase-orders': () => import('@/pages/purchase-orders/PurchaseOrdersPage'),

  // Finance group ────────────────────────────────────────────────────────────
  treasury: () => import('@/pages/treasury/TreasuryPage'),
  expenses: () => import('@/pages/expenses/ExpensesPage'),
  reports: () => import('@/pages/reports/ReportsPage'),

  // Workspace group ──────────────────────────────────────────────────────────
  tasks: () => import('@/pages/tasks/TasksPage'),
  notifications: () => import('@/pages/notifications/NotificationsPage'),
  search: () => import('@/pages/search/SearchPage'),
  employees: () => import('@/pages/employees/EmployeesPage'),
  attendance: () => import('@/pages/attendance/AttendancePage'),
  sync: () => import('@/pages/sync/SyncPage'),

  // Settings ─────────────────────────────────────────────────────────────────
  settings: () => import('@/pages/settings/UnifiedSettingsPage'),
};

// Track which routes have already been prefetched this session — avoid
// re-importing the same chunk on every hover.
const prefetchedRoutes = new Set<string>();

// Track which whole *groups* have been warmed. Because vite.config.ts groups
// many pages into one chunk (e.g. `pages-sales`), prefetching ANY route in a
// group implicitly warms the rest. We use this hint to short-circuit hovers.
const prefetchedGroups = new Set<string>();

const routeToGroup: Record<string, string> = {
  // sales
  customers: 'sales', 'customer-details': 'sales', invoices: 'sales',
  'invoice-details': 'sales', quotations: 'sales', 'sales-orders': 'sales',
  'credit-notes': 'sales', payments: 'sales', collections: 'sales',
  'price-lists': 'sales',
  // inventory
  products: 'inventory', 'product-details': 'inventory', categories: 'inventory',
  inventory: 'inventory', suppliers: 'inventory', 'purchase-orders': 'inventory',
  // finance
  treasury: 'finance', expenses: 'finance', reports: 'finance',
  // workspace
  tasks: 'workspace', notifications: 'workspace', search: 'workspace',
  employees: 'workspace', attendance: 'workspace', sync: 'workspace',
  // settings
  settings: 'settings',
};

/**
 * Prefetch a single route. Safe to call repeatedly — caches per-route AND
 * per-group, so hovering 6 sales links only triggers ONE network fetch.
 */
export function prefetchRoute(routeName: string): void {
  if (prefetchedRoutes.has(routeName)) return;
  const group = routeToGroup[routeName];
  if (group && prefetchedGroups.has(group)) {
    // Group chunk is already in cache — mark route as done and bail.
    prefetchedRoutes.add(routeName);
    return;
  }

  const importFn = routeImports[routeName];
  if (!importFn) return;

  prefetchedRoutes.add(routeName);
  if (group) prefetchedGroups.add(group);

  // Use requestIdleCallback for non-blocking prefetch
  const run = () => {
    importFn().catch(() => {
      // Silently fail and clear flags so a future hover can retry.
      prefetchedRoutes.delete(routeName);
      if (group) prefetchedGroups.delete(group);
    });
  };

  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    (window as Window & typeof globalThis).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 50);
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
 */
export function prefetchCommonRoutes(): void {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    (window as Window & typeof globalThis).requestIdleCallback(
      () => prefetchRoutes(['dashboard', 'customers']),
      { timeout: 5000 },
    );
  } else {
    setTimeout(() => prefetchRoutes(['dashboard', 'customers']), 3000);
  }
}

/**
 * Returns an event handler that prefetches a route exactly once per element.
 * Wire into `onMouseEnter`, `onFocus`, and `onTouchStart` for full coverage
 * across desktop pointer, keyboard, and touch users.
 */
export function createPrefetchHandler(routeName: string): () => void {
  let prefetched = false;
  return () => {
    if (prefetched) return;
    prefetched = true;
    prefetchRoute(routeName);
  };
}

/**
 * Get prefetch status
 */
export function isPrefetched(routeName: string): boolean {
  return prefetchedRoutes.has(routeName);
}

/**
 * Map URL pathname → route key. Handles both top-level (`/customers`) and
 * detail (`/customers/:id`) variants.
 */
const pathToRoute: Record<string, string> = {
  '/': 'dashboard',
  '/customers': 'customers',
  '/products': 'products',
  '/invoices': 'invoices',
  '/quotations': 'quotations',
  '/sales-orders': 'sales-orders',
  '/credit-notes': 'credit-notes',
  '/payments': 'payments',
  '/collections': 'collections',
  '/price-lists': 'price-lists',
  '/categories': 'categories',
  '/inventory': 'inventory',
  '/suppliers': 'suppliers',
  '/purchase-orders': 'purchase-orders',
  '/treasury': 'treasury',
  '/expenses': 'expenses',
  '/reports': 'reports',
  '/tasks': 'tasks',
  '/notifications': 'notifications',
  '/search': 'search',
  '/employees': 'employees',
  '/attendance': 'attendance',
  '/sync': 'sync',
  '/settings': 'settings',
};

export function getRouteNameFromPath(pathname: string): string | null {
  // Try exact match first.
  if (pathToRoute[pathname]) return pathToRoute[pathname];
  // Then top-level segment fallback (e.g. /customers/abc-123 → customers).
  const top = '/' + pathname.split('/').filter(Boolean)[0];
  return pathToRoute[top] ?? null;
}

/**
 * Convenience: prefetch by URL path. Used by NavLinks that already know
 * their `href` but not their route key.
 */
export function prefetchByPath(pathname: string): void {
  const name = getRouteNameFromPath(pathname);
  if (name) prefetchRoute(name);
}

/**
 * Prefetch every route in a given group. Use when the user opens a sidebar
 * section — it's a strong signal they're about to click one of its items.
 */
export function prefetchGroup(group: string): void {
  if (prefetchedGroups.has(group)) return;
  const routes = Object.entries(routeToGroup)
    .filter(([, g]) => g === group)
    .map(([r]) => r);
  // Prefetching the first route warms the entire chunk (manualChunks groups
  // them together), so we only need ONE import call per group.
  if (routes.length > 0) prefetchRoute(routes[0]);
  prefetchedGroups.add(group);
}
