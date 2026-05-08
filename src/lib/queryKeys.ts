/**
 * Centralized React Query key factory.
 *
 * Goal: eliminate string drift across hooks/components, make invalidation
 * predictable, and provide a single place to refactor cache topology.
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.customers.detail(id), ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
 */

type Id = string | number;

const list = <T extends string>(scope: T) =>
  ({
    all: [scope] as const,
    lists: () => [scope, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [scope, 'list', filters ?? {}] as const,
    details: () => [scope, 'detail'] as const,
    detail: (id: Id) => [scope, 'detail', id] as const,
  }) as const;

export const queryKeys = {
  // Tenant
  tenant: {
    current: ['current-tenant'] as const,
    currentId: ['current-tenant-id'] as const,
    list: ['user-tenants'] as const,
  },

  // Auth & permissions
  permissions: {
    customRole: (userId?: string) => ['user-custom-role', userId] as const,
    sectionPermissions: (roleId?: string) =>
      ['section-permissions', roleId] as const,
    fieldPermissions: (roleId?: string) =>
      ['field-permissions', roleId] as const,
    roleLimits: (roleId?: string) => ['role-limits', roleId] as const,
  },

  // Domain entities
  customers: {
    ...list('customers'),
    search: (q: string) => ['customers', 'search', q] as const,
    alerts: (id: Id) => ['customers', 'alerts', id] as const,
    statement: (id: Id) => ['customers', 'statement', id] as const,
    health: (id: Id) => ['customers', 'health', id] as const,
  },
  suppliers: {
    ...list('suppliers'),
    alerts: (id: Id) => ['suppliers', 'alerts', id] as const,
    statement: (id: Id) => ['suppliers', 'statement', id] as const,
  },
  products: list('products'),
  invoices: {
    ...list('invoices'),
    items: (id: Id) => ['invoices', id, 'items'] as const,
    payments: (id: Id) => ['invoices', id, 'payments'] as const,
  },
  quotes: list('quotes'),
  salesOrders: list('sales-orders'),
  purchaseOrders: list('purchase-orders'),
  purchaseInvoices: list('purchase-invoices'),
  goodsReceipts: list('goods-receipts'),
  deliveryNotes: list('delivery-notes'),
  creditNotes: list('credit-notes'),
  payments: list('payments'),
  expenses: list('expenses'),
  employees: list('employees'),
  warehouses: list('warehouses'),
  treasury: list('treasury'),
  journals: list('journals'),

  // Reporting & dashboards
  reports: {
    overview: (range?: string) => ['reports', 'overview', range] as const,
    kpi: (range?: string) => ['reports', 'kpi', range] as const,
    returns: (range?: string) => ['reports', 'returns', range] as const,
    aging: ['reports', 'aging'] as const,
    profitLoss: (range?: string) =>
      ['reports', 'profit-loss', range] as const,
  },

  // Notifications & system
  notifications: {
    list: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
  activityLogs: (filters?: Record<string, unknown>) =>
    ['activity-logs', filters ?? {}] as const,

  // Sidebar / UI counts
  sidebar: {
    counts: ['sidebar-counts'] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
