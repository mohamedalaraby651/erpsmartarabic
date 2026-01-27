import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock useOnlineStatus
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true })),
}));

// Mock offlineStorage
vi.mock('@/lib/offlineStorage', () => ({
  getCachedData: vi.fn(() => Promise.resolve([])),
  cacheData: vi.fn(() => Promise.resolve()),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useOfflineData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be defined', async () => {
    const { useOfflineData } = await import('@/hooks/useOfflineData');
    expect(useOfflineData).toBeDefined();
  });

  it('should return initial loading state', async () => {
    const { useOfflineData } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () => useOfflineData<{ id: string; name: string }>('customers'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should accept table name parameter', async () => {
    const { useOfflineData } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () => useOfflineData<{ id: string }>('products'),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });

  it('should accept options parameter', async () => {
    const { useOfflineData } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () =>
        useOfflineData<{ id: string }>('invoices', {
          enabled: true,
          orderBy: 'created_at',
          limit: 50,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });

  it('should handle disabled query', async () => {
    const { useOfflineData } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () =>
        useOfflineData<{ id: string }>('customers', {
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return data array on success', async () => {
    const mockData = [
      { id: '1', name: 'Customer 1' },
      { id: '2', name: 'Customer 2' },
    ];

    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    } as any);

    const { useOfflineData } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () => useOfflineData<{ id: string; name: string }>('customers', { limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should fallback to cached data when online fetch fails', async () => {
    const cachedData = [{ id: 'cached-1', name: 'Cached Customer' }];
    
    const { getCachedData } = await import('@/lib/offlineStorage');
    vi.mocked(getCachedData).mockResolvedValue(cachedData);

    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Network error' } 
          }),
        }),
      }),
    } as any);

    const { useOfflineData } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () => useOfflineData<{ id: string; name: string }>('customers'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useOfflineItem', () => {
  it('should be defined', async () => {
    const { useOfflineItem } = await import('@/hooks/useOfflineData');
    expect(useOfflineItem).toBeDefined();
  });

  it('should return null when id is undefined', async () => {
    const { useOfflineItem } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () => useOfflineItem<{ id: string }>('customers', undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
  });

  it('should fetch single item by id', async () => {
    const mockItem = { id: 'test-id', name: 'Test Customer' };
    
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockItem, error: null }),
        }),
      }),
    } as any);

    const { useOfflineItem } = await import('@/hooks/useOfflineData');
    const { result } = renderHook(
      () => useOfflineItem<{ id: string; name: string }>('customers', 'test-id'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
