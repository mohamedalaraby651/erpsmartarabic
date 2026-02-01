/**
 * استراتيجيات المزامنة للتطبيق
 * تحدد كيفية حل التعارضات عند المزامنة بين الجهاز والخادم
 */

export type SyncStrategy = 
  | 'server-first'    // الخادم يفوز دائماً - للبيانات الحساسة
  | 'client-first'    // العميل يفوز دائماً - للبيانات المحلية
  | 'last-write-wins' // آخر تحديث يفوز - للبيانات التعاونية
  | 'merge'           // دمج البيانات - للقوائم

export type TableName = 
  | 'customers'
  | 'products' 
  | 'invoices'
  | 'quotations'
  | 'suppliers'
  | 'sales_orders'
  | 'purchase_orders'
  | 'payments'
  | 'expenses'
  | 'tasks';

// استراتيجيات المزامنة لكل جدول
export const syncStrategies: Record<TableName, SyncStrategy> = {
  // البيانات المالية - الخادم يفوز (أكثر أماناً)
  payments: 'server-first',
  invoices: 'server-first',
  expenses: 'server-first',
  
  // البيانات الأساسية - العميل يفوز (للعمل offline)
  customers: 'client-first',
  products: 'client-first',
  suppliers: 'client-first',
  
  // الطلبات - آخر تحديث يفوز
  sales_orders: 'last-write-wins',
  purchase_orders: 'last-write-wins',
  quotations: 'last-write-wins',
  
  // المهام - دمج
  tasks: 'merge',
};

// أولوية المزامنة (الأقل رقماً = الأعلى أولوية)
export const syncPriority: Record<TableName, number> = {
  payments: 1,
  invoices: 2,
  expenses: 3,
  sales_orders: 4,
  purchase_orders: 5,
  customers: 6,
  products: 7,
  suppliers: 8,
  quotations: 9,
  tasks: 10,
};

// تحديد ما إذا كان يجب مزامنة الجدول تلقائياً
export const autoSyncEnabled: Record<TableName, boolean> = {
  customers: true,
  products: true,
  invoices: true,
  quotations: true,
  suppliers: true,
  sales_orders: true,
  purchase_orders: true,
  payments: true,
  expenses: true,
  tasks: true,
};

// الفترة الزمنية للمزامنة التلقائية (بالدقائق)
export const autoSyncInterval: Record<TableName, number> = {
  payments: 5,     // كل 5 دقائق
  invoices: 5,
  expenses: 10,
  sales_orders: 10,
  purchase_orders: 15,
  customers: 15,
  products: 15,
  suppliers: 30,
  quotations: 30,
  tasks: 5,
};

/**
 * حل التعارض بين البيانات المحلية والخادم
 */
export function resolveConflict<T extends { updated_at?: string }>(
  localData: T,
  serverData: T,
  strategy: SyncStrategy
): { winner: 'local' | 'server'; data: T } {
  switch (strategy) {
    case 'server-first':
      return { winner: 'server', data: serverData };
    
    case 'client-first':
      return { winner: 'local', data: localData };
    
    case 'last-write-wins':
      const localTime = new Date(localData.updated_at || 0).getTime();
      const serverTime = new Date(serverData.updated_at || 0).getTime();
      
      if (localTime >= serverTime) {
        return { winner: 'local', data: localData };
      }
      return { winner: 'server', data: serverData };
    
    case 'merge':
      // دمج بسيط: الخادم كأساس مع تطبيق التغييرات المحلية
      const merged = { ...serverData, ...localData };
      return { winner: 'local', data: merged };
    
    default:
      return { winner: 'server', data: serverData };
  }
}

/**
 * ترتيب العناصر حسب أولوية المزامنة
 */
export function sortByPriority<T extends { table: TableName }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const priorityA = syncPriority[a.table] || 999;
    const priorityB = syncPriority[b.table] || 999;
    return priorityA - priorityB;
  });
}

/**
 * التحقق من إمكانية المزامنة التلقائية
 */
export function canAutoSync(table: TableName): boolean {
  return autoSyncEnabled[table] ?? false;
}

/**
 * الحصول على فترة المزامنة
 */
export function getSyncInterval(table: TableName): number {
  return autoSyncInterval[table] ?? 30;
}
