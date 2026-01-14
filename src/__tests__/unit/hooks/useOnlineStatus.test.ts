/**
 * Online Status Hook Tests
 * اختبارات خطاف حالة الاتصال
 * 
 * Tests for useOnlineStatus hook which monitors network connectivity
 * @module tests/hooks/useOnlineStatus
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalNavigatorOnLine: boolean;
  let listeners: { [key: string]: EventListener[] };

  beforeEach(() => {
    originalNavigatorOnLine = navigator.onLine;
    listeners = { online: [], offline: [] };

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock window event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'online' || event === 'offline') {
        listeners[event].push(callback as EventListener);
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, callback) => {
      if (event === 'online' || event === 'offline') {
        const index = listeners[event].indexOf(callback as EventListener);
        if (index > -1) {
          listeners[event].splice(index, 1);
        }
      }
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalNavigatorOnLine,
    });
    vi.restoreAllMocks();
  });

  describe('Initialization / التهيئة', () => {
    it('should return correct initial online state', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);
    });

    it('should return correct initial offline state', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Event Listeners / مستمعي الأحداث', () => {
    it('should add event listeners on mount', () => {
      renderHook(() => useOnlineStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Online/Offline Events / أحداث الاتصال/عدم الاتصال', () => {
    it('should update to offline when offline event fires', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        // Simulate offline event
        listeners.offline.forEach(callback => callback(new Event('offline')));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(true);
    });

    it('should update to online when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const { result } = renderHook(() => useOnlineStatus());

      // First go offline
      act(() => {
        listeners.offline.forEach(callback => callback(new Event('offline')));
      });

      // Then come back online
      act(() => {
        listeners.online.forEach(callback => callback(new Event('online')));
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should track wasOffline correctly', () => {
      const { result } = renderHook(() => useOnlineStatus());

      // Initially online, never was offline
      expect(result.current.wasOffline).toBe(false);

      // Go offline
      act(() => {
        listeners.offline.forEach(callback => callback(new Event('offline')));
      });

      expect(result.current.wasOffline).toBe(true);

      // Come back online - wasOffline should reset
      act(() => {
        listeners.online.forEach(callback => callback(new Event('online')));
      });

      expect(result.current.wasOffline).toBe(false);
    });
  });

  describe('Edge Cases / حالات حدية', () => {
    it('should handle multiple offline events', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        listeners.offline.forEach(callback => callback(new Event('offline')));
        listeners.offline.forEach(callback => callback(new Event('offline')));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should handle rapid online/offline toggles', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        listeners.offline.forEach(callback => callback(new Event('offline')));
        listeners.online.forEach(callback => callback(new Event('online')));
        listeners.offline.forEach(callback => callback(new Event('offline')));
        listeners.online.forEach(callback => callback(new Event('online')));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });
});
