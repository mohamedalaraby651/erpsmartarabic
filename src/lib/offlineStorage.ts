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
  };
  suppliers: {
    key: string;
    value: any;
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

export async function initOfflineDB() {
  if (db) return db;
  
  db = await openDB<OfflineDB>('erp-offline-db', 1, {
    upgrade(database) {
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
      database.createObjectStore('quotations', { keyPath: 'id' });
      
      // Suppliers store
      database.createObjectStore('suppliers', { keyPath: 'id' });
      
      // Sync queue store
      const syncStore = database.createObjectStore('sync_queue', { keyPath: 'id' });
      syncStore.createIndex('by-timestamp', 'timestamp');
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

type StoreName = 'customers' | 'products' | 'invoices' | 'quotations' | 'suppliers' | 'sync_queue';

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
