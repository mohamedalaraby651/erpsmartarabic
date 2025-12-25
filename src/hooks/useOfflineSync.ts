import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { getSyncQueueCount, initOfflineDB } from '@/lib/offlineStorage';
import { fullSync, SyncResult } from '@/lib/syncManager';
import { toast } from 'sonner';

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

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
  }, [isOnline]);

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
