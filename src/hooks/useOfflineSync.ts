import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { getSyncQueueCount, initOfflineDB } from '@/lib/offlineStorage';
import { fullSync, SyncResult } from '@/lib/syncManager';
import { loadSettings, shouldRunBackgroundTask } from '@/lib/adaptiveSettings';
import { toast } from 'sonner';

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize DB and check pending count
  useEffect(() => {
    const init = async () => {
      await initOfflineDB();
      await updatePendingCount();
    };
    init();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Background sync interval driven by adaptive settings
  useEffect(() => {
    const setupInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const settings = loadSettings();
      intervalRef.current = setInterval(() => {
        // Skip if offline, already syncing, nothing to sync, or network too slow
        if (!isOnline || syncing) return;
        if (!shouldRunBackgroundTask()) return;
        if (pendingCount === 0) return;
        handleSync();
      }, settings.backgroundSyncIntervalMs);
    };
    setupInterval();

    // Re-setup when settings change
    const onChange = () => setupInterval();
    window.addEventListener('adaptive-settings:changed', onChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('adaptive-settings:changed', onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingCount, syncing]);

  const updatePendingCount = async () => {
    const count = await getSyncQueueCount();
    setPendingCount(count);
  };

  const handleSync = useCallback(async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);

    try {
      const result = await fullSync();
      setLastSyncResult(result);

      if (result.success) {
        toast.success(`تمت المزامنة: ${result.synced} عنصر`);
      } else {
        toast.warning(`المزامنة: ${result.synced} نجح، ${result.failed} فشل`);
      }

      if (result.conflicts > 0) {
        toast.info(`${result.conflicts} تعارض - تم استخدام بيانات السيرفر`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('فشلت المزامنة');
    } finally {
      setSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, syncing]);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncResult,
    handleSync,
    updatePendingCount,
  };
}
