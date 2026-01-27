import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb
vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve({
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
  })),
}));

describe('offlineStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const { openDB } = await import('idb');
      const mockPut = vi.fn(() => Promise.resolve());
      const mockClear = vi.fn(() => Promise.resolve());
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(() => ({
          store: {
            clear: mockClear,
            put: mockPut,
          },
          done: Promise.resolve(),
        })),
        getAll: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getAllFromIndex: vi.fn(),
        count: vi.fn(),
      } as any);

      const { cacheData, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const testData = [{ id: '1', name: 'Test' }];
      await cacheData('customers', testData);

      expect(mockClear).toHaveBeenCalled();
    });

    it('should handle empty data array', async () => {
      const { cacheData } = await import('@/lib/offlineStorage');
      await expect(cacheData('customers', [])).resolves.not.toThrow();
    });
  });

  describe('getCachedData', () => {
    it('should return cached data from store', async () => {
      const mockData = [{ id: '1', name: 'Test Customer' }];
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(() => Promise.resolve(mockData)),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getAllFromIndex: vi.fn(),
        count: vi.fn(),
      } as any);

      const { getCachedData, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getCachedData('customers');
      expect(result).toEqual(mockData);
    });

    it('should return empty array when no data cached', async () => {
      const { getCachedData } = await import('@/lib/offlineStorage');
      const result = await getCachedData('products');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCachedItem', () => {
    it('should return single cached item by id', async () => {
      const mockItem = { id: 'test-id', name: 'Test' };
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(),
        get: vi.fn(() => Promise.resolve(mockItem)),
        put: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getAllFromIndex: vi.fn(),
        count: vi.fn(),
      } as any);

      const { getCachedItem, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getCachedItem('customers', 'test-id');
      expect(result).toEqual(mockItem);
    });

    it('should return undefined for non-existent item', async () => {
      const { getCachedItem } = await import('@/lib/offlineStorage');
      const result = await getCachedItem('customers', 'non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('addToSyncQueue', () => {
    it('should add item to sync queue', async () => {
      const mockPut = vi.fn(() => Promise.resolve());
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(),
        get: vi.fn(),
        put: mockPut,
        delete: vi.fn(),
        clear: vi.fn(),
        getAllFromIndex: vi.fn(),
        count: vi.fn(),
      } as any);

      const { addToSyncQueue, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await addToSyncQueue('customers', 'insert', { id: '1', name: 'New Customer' });
      expect(typeof result).toBe('string');
      expect(mockPut).toHaveBeenCalled();
    });

    it('should generate unique id for each queue item', async () => {
      const { addToSyncQueue } = await import('@/lib/offlineStorage');
      
      const id1 = await addToSyncQueue('customers', 'insert', { id: '1' });
      const id2 = await addToSyncQueue('customers', 'insert', { id: '2' });
      
      expect(id1).not.toBe(id2);
    });

    it('should support different operation types', async () => {
      const { addToSyncQueue } = await import('@/lib/offlineStorage');
      
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
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getAllFromIndex: vi.fn(() => Promise.resolve(mockItems)),
        count: vi.fn(),
      } as any);

      const { getPendingSyncItems, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const result = await getPendingSyncItems();
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no pending items', async () => {
      const { getPendingSyncItems } = await import('@/lib/offlineStorage');
      const result = await getPendingSyncItems();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('removeSyncItem', () => {
    it('should remove item from sync queue', async () => {
      const mockDelete = vi.fn(() => Promise.resolve());
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: mockDelete,
        clear: vi.fn(),
        getAllFromIndex: vi.fn(),
        count: vi.fn(),
      } as any);

      const { removeSyncItem, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      await removeSyncItem('test-id');
      expect(mockDelete).toHaveBeenCalledWith('sync_queue', 'test-id');
    });
  });

  describe('clearSyncQueue', () => {
    it('should clear all items from sync queue', async () => {
      const mockClear = vi.fn(() => Promise.resolve());
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clear: mockClear,
        getAllFromIndex: vi.fn(),
        count: vi.fn(),
      } as any);

      const { clearSyncQueue, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      await clearSyncQueue();
      expect(mockClear).toHaveBeenCalledWith('sync_queue');
    });
  });

  describe('getSyncQueueCount', () => {
    it('should return count of pending sync items', async () => {
      const { openDB } = await import('idb');
      
      vi.mocked(openDB).mockResolvedValue({
        transaction: vi.fn(),
        getAll: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getAllFromIndex: vi.fn(),
        count: vi.fn(() => Promise.resolve(5)),
      } as any);

      const { getSyncQueueCount, initOfflineDB } = await import('@/lib/offlineStorage');
      await initOfflineDB();
      
      const count = await getSyncQueueCount();
      expect(count).toBe(5);
    });

    it('should return 0 when queue is empty', async () => {
      const { getSyncQueueCount } = await import('@/lib/offlineStorage');
      const count = await getSyncQueueCount();
      expect(count).toBe(0);
    });
  });
});
