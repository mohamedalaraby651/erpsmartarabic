import { useCallback } from 'react';

/**
 * Hook for managing App Badge API (PWA 2025)
 * Allows setting notification count on app icon
 */
export function useAppBadge() {
  const isSupported = 'setAppBadge' in navigator;

  const setBadge = useCallback(async (count: number) => {
    if (!isSupported) {
      import.meta.env.DEV && console.log('[App Badge] Not supported in this browser');
      return false;
    }

    try {
      if (count > 0) {
        await (navigator as unknown as { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count);
        import.meta.env.DEV && console.log(`[App Badge] Set to ${count}`);
      } else {
        await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
        import.meta.env.DEV && console.log('[App Badge] Cleared');
      }
      return true;
    } catch (error) {
      console.error('[App Badge] Error:', error);
      return false;
    }
  }, [isSupported]);

  const clearBadge = useCallback(async () => {
    if (!isSupported) return false;

    try {
      await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
      import.meta.env.DEV && console.log('[App Badge] Cleared');
      return true;
    } catch (error) {
      console.error('[App Badge] Error clearing:', error);
      return false;
    }
  }, [isSupported]);

  const incrementBadge = useCallback(async (currentCount: number) => {
    return setBadge(currentCount + 1);
  }, [setBadge]);

  return {
    isSupported,
    setBadge,
    clearBadge,
    incrementBadge,
  };
}
