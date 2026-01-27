import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true })),
}));

vi.mock('@/lib/offlineStorage', () => ({
  getSyncQueueCount: vi.fn(() => Promise.resolve(0)),
  initOfflineDB: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/syncManager', () => ({
  fullSync: vi.fn(() => Promise.resolve({
    success: true,
    synced: 5,
    failed: 0,
    conflicts: 0,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be defined', async () => {
    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    expect(useOfflineSync).toBeDefined();
  });

  it('should return initial state', async () => {
    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.syncing).toBe(false);
    expect(result.current.lastSyncResult).toBe(null);
    expect(typeof result.current.handleSync).toBe('function');
    expect(typeof result.current.updatePendingCount).toBe('function');
  });

  it('should return isOnline status from useOnlineStatus', async () => {
    const { useOnlineStatus } = await import('@/hooks/useOnlineStatus');
    vi.mocked(useOnlineStatus).mockReturnValue({ isOnline: true, wasOffline: false });

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isOnline).toBe(true);
  });

  it('should initialize DB on mount', async () => {
    const { initOfflineDB } = await import('@/lib/offlineStorage');
    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    
    renderHook(() => useOfflineSync());

    expect(initOfflineDB).toHaveBeenCalled();
  });

  it('should update pending count after initialization', async () => {
    const { getSyncQueueCount } = await import('@/lib/offlineStorage');
    vi.mocked(getSyncQueueCount).mockResolvedValue(5);

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    // Wait for async initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getSyncQueueCount).toHaveBeenCalled();
  });

  it('should call fullSync when handleSync is triggered', async () => {
    const { fullSync } = await import('@/lib/syncManager');
    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(fullSync).toHaveBeenCalled();
  });

  it('should show success toast when sync succeeds', async () => {
    const { toast } = await import('sonner');
    const { fullSync } = await import('@/lib/syncManager');
    vi.mocked(fullSync).mockResolvedValue({
      success: true,
      synced: 10,
      failed: 0,
      conflicts: 0,
    });

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(toast.success).toHaveBeenCalled();
  });

  it('should show warning toast when sync has failures', async () => {
    const { toast } = await import('sonner');
    const { fullSync } = await import('@/lib/syncManager');
    vi.mocked(fullSync).mockResolvedValue({
      success: false,
      synced: 5,
      failed: 2,
      conflicts: 0,
    });

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(toast.warning).toHaveBeenCalled();
  });

  it('should show info toast when there are conflicts', async () => {
    const { toast } = await import('sonner');
    const { fullSync } = await import('@/lib/syncManager');
    vi.mocked(fullSync).mockResolvedValue({
      success: true,
      synced: 5,
      failed: 0,
      conflicts: 2,
    });

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(toast.info).toHaveBeenCalled();
  });

  it('should not sync when offline', async () => {
    const { useOnlineStatus } = await import('@/hooks/useOnlineStatus');
    vi.mocked(useOnlineStatus).mockReturnValue({ isOnline: false, wasOffline: true });

    const { fullSync } = await import('@/lib/syncManager');
    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(fullSync).not.toHaveBeenCalled();
  });

  it('should update lastSyncResult after successful sync', async () => {
    const syncResult = {
      success: true,
      synced: 8,
      failed: 0,
      conflicts: 1,
    };

    const { fullSync } = await import('@/lib/syncManager');
    vi.mocked(fullSync).mockResolvedValue(syncResult);

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(result.current.lastSyncResult).toEqual(syncResult);
  });

  it('should handle sync errors gracefully', async () => {
    const { toast } = await import('sonner');
    const { fullSync } = await import('@/lib/syncManager');
    vi.mocked(fullSync).mockRejectedValue(new Error('Sync failed'));

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.handleSync();
    });

    expect(toast.error).toHaveBeenCalled();
    expect(result.current.syncing).toBe(false);
  });
});
