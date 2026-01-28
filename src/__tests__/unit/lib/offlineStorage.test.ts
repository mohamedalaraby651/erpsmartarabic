import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock DB object
const createMockDB = () => ({
  transaction: vi.fn(() => ({
    store: {
      clear: vi.fn(() => Promise.resolve()),
      put: vi.fn(() => Promise.resolve()),
    },
    done: Promise.resolve(),
  })),
  getAll: vi.fn(() => Promise.resolve([])),
  get: vi.fn(() => Promise.resolve(undefined)),
  put: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
  getAllFromIndex: vi.fn(() => Promise.resolve([])),
  count: vi.fn(() => Promise.resolve(0)),
});

let mockDB = createMockDB();

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}));

describe('offlineStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock DB before each test
    mockDB = createMockDB();
    // Reset module cache to get fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initOfflineDB', () => {
    it('should initialize the database', async () => {
      const { initOfflineDB } = await import('@/lib/offlineStorage');
      const db = await initOfflineDB();
      expect(db).toBeDefined();
    });

    it('should return existing db if already initialized', async () => {
      const { initOfflineDB } = await import('@/lib/offlineStorage');
      const db1 = await initOfflineDB();
      const db2 = await initOfflineDB();
      expect(db1).toBe(db2);
    });
  });

  describe('getOfflineDB', () => {
    it('should return database instance', async () => {
      const { getOfflineDB } = await import('@/lib/offlineStorage');
      const db = await getOfflineDB();
      expect(db).toBeDefined();
    });

    it('should initialize if not already initialized', async () => {
      const { openDB } = await import('idb');
      const { getOfflineDB } = await import('@/lib/offlineStorage');
      
      await getOfflineDB();
      expect(openDB).toHaveBeenCalled();
    });
  });

  describe('cacheData', () => {
    it('should cache data to the specified store', async () => {
      const mockClear = vi.fn(() => Promise.resolve());
      const mockPut = vi.fn(() => Promise.resolve());
      
      mockDB.transaction = vi.fn(() => ({
        store: {
          clear: mockClear,
          put: mockPut,
        },
        done: Promise.resolve(),
      }));

      const { cacheData, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const testData = [{ id: '1', name: 'Test' }];
      await cacheData('customers', testData);

      expect(mockDB.transaction).toHaveBeenCalled();
    });

    it('should handle empty data array', async () => {
      const { cacheData, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      await expect(cacheData('customers', [])).resolves.not.toThrow();
    });
  });

  describe('getCachedData', () => {
    it('should return cached data from store', async () => {
      const mockData = [{ id: '1', name: 'Test Customer' }];
      mockDB.getAll = vi.fn(() => Promise.resolve(mockData));

      const { getCachedData, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getCachedData('customers');
      expect(result).toEqual(mockData);
    });

    it('should return empty array when no data cached', async () => {
      mockDB.getAll = vi.fn(() => Promise.resolve([]));
      
      const { getCachedData, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getCachedData('products');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCachedItem', () => {
    it('should return single cached item by id', async () => {
      const mockItem = { id: 'test-id', name: 'Test' };
      mockDB.get = vi.fn(() => Promise.resolve(mockItem));

      const { getCachedItem, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getCachedItem('customers', 'test-id');
      expect(result).toEqual(mockItem);
    });

    it('should return undefined for non-existent item', async () => {
      mockDB.get = vi.fn(() => Promise.resolve(undefined));
      
      const { getCachedItem, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getCachedItem('customers', 'non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('addToSyncQueue', () => {
    it('should add item to sync queue', async () => {
      mockDB.put = vi.fn(() => Promise.resolve());

      const { addToSyncQueue, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await addToSyncQueue('customers', 'insert', { id: '1', name: 'New Customer' });
      expect(typeof result).toBe('string');
      expect(mockDB.put).toHaveBeenCalled();
    });

    it('should generate unique id for each queue item', async () => {
      const { addToSyncQueue, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const id1 = await addToSyncQueue('customers', 'insert', { id: '1' });
      const id2 = await addToSyncQueue('customers', 'insert', { id: '2' });
      
      expect(id1).not.toBe(id2);
    });

    it('should support different operation types', async () => {
      const { addToSyncQueue, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      await expect(addToSyncQueue('customers', 'insert', { id: '1' })).resolves.toBeDefined();
      await expect(addToSyncQueue('customers', 'update', { id: '1' })).resolves.toBeDefined();
      await expect(addToSyncQueue('customers', 'delete', { id: '1' })).resolves.toBeDefined();
    });
  });

  describe('getPendingSyncItems', () => {
    it('should return pending sync items ordered by timestamp', async () => {
      const mockItems = [
        { id: '1', table: 'customers', operation: 'insert', timestamp: 1000 },
        { id: '2', table: 'customers', operation: 'update', timestamp: 2000 },
      ];
      mockDB.getAllFromIndex = vi.fn(() => Promise.resolve(mockItems));

      const { getPendingSyncItems, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getPendingSyncItems();
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no pending items', async () => {
      mockDB.getAllFromIndex = vi.fn(() => Promise.resolve([]));
      
      const { getPendingSyncItems, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getPendingSyncItems();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('removeSyncItem', () => {
    it('should remove item from sync queue', async () => {
      mockDB.delete = vi.fn(() => Promise.resolve());

      const { removeSyncItem, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      await removeSyncItem('test-id');
      expect(mockDB.delete).toHaveBeenCalledWith('sync_queue', 'test-id');
    });
  });

  describe('clearSyncQueue', () => {
    it('should clear all items from sync queue', async () => {
      mockDB.clear = vi.fn(() => Promise.resolve());

      const { clearSyncQueue, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      await clearSyncQueue();
      expect(mockDB.clear).toHaveBeenCalledWith('sync_queue');
    });
  });

  describe('getSyncQueueCount', () => {
    it('should return count of pending sync items', async () => {
      mockDB.count = vi.fn(() => Promise.resolve(5));

      const { getSyncQueueCount, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const count = await getSyncQueueCount();
      expect(count).toBe(5);
    });

    it('should return 0 when queue is empty', async () => {
      mockDB.count = vi.fn(() => Promise.resolve(0));
      
      const { getSyncQueueCount, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const count = await getSyncQueueCount();
      expect(count).toBe(0);
    });
  });
});
