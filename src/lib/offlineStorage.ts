import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  customers: {
    key: string;
    value: any;
    indexes: { 'by-name': string };
  };
  products: {
    key: string;
    value: any;
    indexes: { 'by-name': string };
  };
  invoices: {
    key: string;
    value: any;
    indexes: { 'by-number': string };
  };
  quotations: {
    key: string;
    value: any;
    indexes: { 'by-number': string };
  };
  suppliers: {
    key: string;
    value: any;
    indexes: { 'by-name': string };
  };
  sales_orders: {
    key: string;
    value: any;
    indexes: { 'by-number': string };
  };
  purchase_orders: {
    key: string;
    value: any;
    indexes: { 'by-number': string };
  };
  payments: {
    key: string;
    value: any;
    indexes: { 'by-date': string };
  };
  expenses: {
    key: string;
    value: any;
    indexes: { 'by-date': string };
  };
  tasks: {
    key: string;
    value: any;
    indexes: { 'by-due_date': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retryCount?: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

// Database version - increment when schema changes
const DB_VERSION = 2;

export async function initOfflineDB() {
  if (db) return db;
  
  db = await openDB<OfflineDB>('erp-offline-db', DB_VERSION, {
    upgrade(database, oldVersion) {
      // Version 1: Initial stores
      if (oldVersion < 1) {
        // Customers store
        const customersStore = database.createObjectStore('customers', { keyPath: 'id' });
        customersStore.createIndex('by-name', 'name');
        
        // Products store
        const productsStore = database.createObjectStore('products', { keyPath: 'id' });
        productsStore.createIndex('by-name', 'name');
        
        // Invoices store
        const invoicesStore = database.createObjectStore('invoices', { keyPath: 'id' });
        invoicesStore.createIndex('by-number', 'invoice_number');
        
        // Quotations store
        const quotationsStore = database.createObjectStore('quotations', { keyPath: 'id' });
        quotationsStore.createIndex('by-number', 'quotation_number');
        
        // Suppliers store
        const suppliersStore = database.createObjectStore('suppliers', { keyPath: 'id' });
        suppliersStore.createIndex('by-name', 'name');
        
        // Sync queue store
        const syncStore = database.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp');
      }
      
      // Version 2: Additional stores for expanded offline support
      if (oldVersion < 2) {
        // Sales Orders store
        if (!database.objectStoreNames.contains('sales_orders')) {
          const salesOrdersStore = database.createObjectStore('sales_orders', { keyPath: 'id' });
          salesOrdersStore.createIndex('by-number', 'order_number');
        }
        
        // Purchase Orders store
        if (!database.objectStoreNames.contains('purchase_orders')) {
          const purchaseOrdersStore = database.createObjectStore('purchase_orders', { keyPath: 'id' });
          purchaseOrdersStore.createIndex('by-number', 'order_number');
        }
        
        // Payments store
        if (!database.objectStoreNames.contains('payments')) {
          const paymentsStore = database.createObjectStore('payments', { keyPath: 'id' });
          paymentsStore.createIndex('by-date', 'payment_date');
        }
        
        // Expenses store
        if (!database.objectStoreNames.contains('expenses')) {
          const expensesStore = database.createObjectStore('expenses', { keyPath: 'id' });
          expensesStore.createIndex('by-date', 'expense_date');
        }
        
        // Tasks store
        if (!database.objectStoreNames.contains('tasks')) {
          const tasksStore = database.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('by-due_date', 'due_date');
        }
      }
    },
  });
  
  return db;
}

export async function getOfflineDB() {
  if (!db) {
    await initOfflineDB();
  }
  return db!;
}

type StoreName = 
  | 'customers' 
  | 'products' 
  | 'invoices' 
  | 'quotations' 
  | 'suppliers' 
  | 'sales_orders'
  | 'purchase_orders'
  | 'payments'
  | 'expenses'
  | 'tasks'
  | 'sync_queue';

// Cache data locally
export async function cacheData(
  store: StoreName,
  data: any[]
) {
  const database = await getOfflineDB();
  const tx = database.transaction(store, 'readwrite');
  
  // Clear existing data
  await tx.store.clear();
  
  // Add new data
  for (const item of data) {
    await tx.store.put(item);
  }
  
  await tx.done;
}

// Get cached data
export async function getCachedData(store: StoreName): Promise<any[]> {
  const database = await getOfflineDB();
  return database.getAll(store);
}

// Get single cached item
export async function getCachedItem(store: StoreName, id: string): Promise<any | undefined> {
  const database = await getOfflineDB();
  return database.get(store, id);
}

// Add to sync queue
export async function addToSyncQueue(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: any
) {
  const database = await getOfflineDB();
  const id = `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.put('sync_queue', {
    id,
    table,
    operation,
    data,
    timestamp: Date.now(),
  });
  
  return id;
}

// Get pending sync items
export async function getPendingSyncItems() {
  const database = await getOfflineDB();
  return database.getAllFromIndex('sync_queue', 'by-timestamp');
}

// Remove from sync queue
export async function removeSyncItem(id: string) {
  const database = await getOfflineDB();
  await database.delete('sync_queue', id);
}

// Clear sync queue
export async function clearSyncQueue() {
  const database = await getOfflineDB();
  await database.clear('sync_queue');
}

// Get sync queue count
export async function getSyncQueueCount(): Promise<number> {
  const database = await getOfflineDB();
  return database.count('sync_queue');
}
