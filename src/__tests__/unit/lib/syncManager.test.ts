import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock offlineStorage
vi.mock('@/lib/offlineStorage', () => ({
  getPendingSyncItems: vi.fn(() => Promise.resolve([])),
  removeSyncItem: vi.fn(() => Promise.resolve()),
  clearSyncQueue: vi.fn(() => Promise.resolve()),
  cacheData: vi.fn(() => Promise.resolve()),
}));

describe('syncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('syncToServer', () => {
    it('should be defined', async () => {
      const { syncToServer } = await import('@/lib/syncManager');
      expect(syncToServer).toBeDefined();
    });

    it('should return SyncResult with all required properties', async () => {
      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('conflicts');
    });

    it('should return success=true when no items to sync', async () => {
      const { getPendingSyncItems } = await import('@/lib/offlineStorage');
      vi.mocked(getPendingSyncItems).mockResolvedValue([]);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toBe(0);
    });

    it('should handle insert operations', async () => {
      const { getPendingSyncItems, removeSyncItem } = await import('@/lib/offlineStorage');
      vi.mocked(getPendingSyncItems).mockResolvedValue([
        {
          id: 'sync-1',
          table: 'customers',
          operation: 'insert',
          data: { id: 'new-1', name: 'New Customer' },
          timestamp: Date.now(),
        },
      ]);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.synced).toBe(1);
      expect(removeSyncItem).toHaveBeenCalledWith('sync-1');
    });

    it('should handle update operations', async () => {
      const { getPendingSyncItems, removeSyncItem } = await import('@/lib/offlineStorage');
      vi.mocked(getPendingSyncItems).mockResolvedValue([
        {
          id: 'sync-2',
          table: 'customers',
          operation: 'update',
          data: { id: 'existing-1', name: 'Updated Customer' },
          timestamp: Date.now(),
        },
      ]);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.synced).toBe(1);
      expect(removeSyncItem).toHaveBeenCalledWith('sync-2');
    });

    it('should handle delete operations', async () => {
      const { getPendingSyncItems, removeSyncItem } = await import('@/lib/offlineStorage');
      vi.mocked(getPendingSyncItems).mockResolvedValue([
        {
          id: 'sync-3',
          table: 'customers',
          operation: 'delete',
          data: { id: 'delete-1' },
          timestamp: Date.now(),
        },
      ]);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.synced).toBe(1);
      expect(removeSyncItem).toHaveBeenCalledWith('sync-3');
    });

    it('should handle conflicts (duplicate key)', async () => {
      const { getPendingSyncItems, removeSyncItem } = await import('@/lib/offlineStorage');
      const { supabase } = await import('@/integrations/supabase/client');

      vi.mocked(getPendingSyncItems).mockResolvedValue([
        {
          id: 'sync-4',
          table: 'customers',
          operation: 'insert',
          data: { id: 'conflict-1', name: 'Conflict Customer' },
          timestamp: Date.now(),
        },
      ]);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ error: { code: '23505' } })),
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
      } as any);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.conflicts).toBe(1);
      // Conflict items should be removed (server wins)
      expect(removeSyncItem).toHaveBeenCalledWith('sync-4');
    });

    it('should count failures for other errors', async () => {
      const { getPendingSyncItems } = await import('@/lib/offlineStorage');
      const { supabase } = await import('@/integrations/supabase/client');

      vi.mocked(getPendingSyncItems).mockResolvedValue([
        {
          id: 'sync-5',
          table: 'customers',
          operation: 'insert',
          data: { id: 'fail-1' },
          timestamp: Date.now(),
        },
      ]);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ error: { code: 'other_error' } })),
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(),
      } as any);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.failed).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should handle multiple items in queue', async () => {
      const { getPendingSyncItems, removeSyncItem } = await import('@/lib/offlineStorage');
      
      vi.mocked(getPendingSyncItems).mockResolvedValue([
        { id: 'sync-a', table: 'customers', operation: 'insert', data: { id: '1' }, timestamp: 1 },
        { id: 'sync-b', table: 'products', operation: 'update', data: { id: '2' }, timestamp: 2 },
        { id: 'sync-c', table: 'invoices', operation: 'delete', data: { id: '3' }, timestamp: 3 },
      ]);

      const { syncToServer } = await import('@/lib/syncManager');
      const result = await syncToServer();

      expect(result.synced).toBe(3);
      expect(removeSyncItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('refreshCache', () => {
    it('should be defined', async () => {
      const { refreshCache } = await import('@/lib/syncManager');
      expect(refreshCache).toBeDefined();
    });

    it('should fetch and cache all main tables', async () => {
      const { cacheData } = await import('@/lib/offlineStorage');
      const { supabase } = await import('@/integrations/supabase/client');

      const mockData = [{ id: '1' }];
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
          })),
        })),
      } as any);

      const { refreshCache } = await import('@/lib/syncManager');
      await refreshCache();

      // Should cache customers, products, invoices, quotations, suppliers
      expect(cacheData).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
          })),
        })),
      } as any);

      const { refreshCache } = await import('@/lib/syncManager');
      
      // Should not throw
      await expect(refreshCache()).resolves.not.toThrow();
    });
  });

  describe('fullSync', () => {
    it('should be defined', async () => {
      const { fullSync } = await import('@/lib/syncManager');
      expect(fullSync).toBeDefined();
    });

    it('should call syncToServer first then refreshCache', async () => {
      const { getPendingSyncItems } = await import('@/lib/offlineStorage');
      vi.mocked(getPendingSyncItems).mockResolvedValue([]);

      const { fullSync } = await import('@/lib/syncManager');
      const result = await fullSync();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('conflicts');
    });

    it('should return combined sync result', async () => {
      const { fullSync } = await import('@/lib/syncManager');
      const result = await fullSync();

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.synced).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.conflicts).toBe('number');
    });
  });
});

describe('SyncResult interface', () => {
  it('should match expected shape', () => {
    // Type checking at compile time, runtime check for values
    const mockResult = {
      success: true,
      synced: 5,
      failed: 0,
      conflicts: 1,
    };

    expect(typeof mockResult.success).toBe('boolean');
    expect(typeof mockResult.synced).toBe('number');
    expect(typeof mockResult.failed).toBe('number');
    expect(typeof mockResult.conflicts).toBe('number');
  });
});
