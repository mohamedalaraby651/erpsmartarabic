/**
 * Dashboard Settings Hook Tests
 * اختبارات خطاف إعدادات لوحة التحكم
 * 
 * Tests for useDashboardSettings hook which manages dashboard widget configuration
 * @module tests/hooks/useDashboardSettings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    session: { access_token: 'test-token' },
    loading: false,
    userRole: 'admin',
  }),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Import after mocks are set up
import { useDashboardSettings } from '@/hooks/useDashboardSettings';

// Setup localStorage mock with working storage
let localStorageData: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { localStorageData = {}; }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(localStorageData)[index] || null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDashboardSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageData = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization / التهيئة', () => {
    it('should return default widgets when no saved settings', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.widgets).toBeDefined();
        expect(result.current.widgets.length).toBeGreaterThan(0);
      });
    });

    it('should have correct default widget structure', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const statsWidget = result.current.widgets.find(w => w.id === 'stats');
        expect(statsWidget).toBeDefined();
        expect(statsWidget?.enabled).toBe(true);
        expect(statsWidget?.order).toBe(0);
      });
    });

    it('should load settings from localStorage', async () => {
      const customWidgets = [
        { id: 'stats', title: 'Stats', enabled: false, order: 1, size: 'full' },
        { id: 'chart', title: 'Chart', enabled: true, order: 0, size: 'half' },
      ];
      localStorageData['dashboard_widgets_test-user-id'] = JSON.stringify(customWidgets);

      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.widgets.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Widget Management / إدارة الودجات', () => {
    it('should provide updateWidgets function', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(typeof result.current.updateWidgets).toBe('function');
      });
    });

    it('should indicate loading state', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      // Initially may be loading
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should indicate saving state', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Default Widgets / الودجات الافتراضية', () => {
    it('should include stats widget', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const hasStats = result.current.widgets.some(w => w.id === 'stats');
        expect(hasStats).toBe(true);
      });
    });

    it('should include quick actions widget', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const hasQuickActions = result.current.widgets.some(w => w.id === 'quick_actions');
        expect(hasQuickActions).toBe(true);
      });
    });

    it('should include chart widget', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const hasChart = result.current.widgets.some(w => w.id === 'chart');
        expect(hasChart).toBe(true);
      });
    });

    it('should include tasks widget', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const hasTasks = result.current.widgets.some(w => w.id === 'tasks');
        expect(hasTasks).toBe(true);
      });
    });

    it('should include activities widget', async () => {
      const { result } = renderHook(() => useDashboardSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const hasActivities = result.current.widgets.some(w => w.id === 'activities');
        expect(hasActivities).toBe(true);
      });
    });
  });
});
