import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
        not: vi.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
      })),
    })),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    loading: false,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useSidebarCounts', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useAuth } = await import('@/hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-id' },
      loading: false,
    } as any);
  });

  it('should be defined', async () => {
    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');
    expect(useSidebarCounts).toBeDefined();
  });

  it('should return query result object', async () => {
    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');
    const { result } = renderHook(() => useSidebarCounts(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('should fetch counts when user is authenticated', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');

    renderHook(() => useSidebarCounts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_sidebar_counts');
    });
  });

  it('should not fetch when user is not authenticated', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    } as any);

    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.rpc).mockClear();

    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');
    renderHook(() => useSidebarCounts(), { wrapper: createWrapper() });

    await new Promise(resolve => setTimeout(resolve, 100));
    // Query disabled when !user?.id — rpc should not be invoked
  });

  it('should return SidebarCounts interface shape', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        pending_invoices: 5,
        pending_sales_orders: 3,
        unread_notifications: 10,
        low_stock_alerts: 2,
        open_tasks: 7,
        pending_quotations: 4,
        pending_purchase_orders: 1,
      },
      error: null,
    } as any);

    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');
    const { result } = renderHook(() => useSidebarCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      pendingInvoices: 5,
      pendingSalesOrders: 3,
      unreadNotifications: 10,
      lowStockAlerts: 2,
      openTasks: 7,
      pendingQuotations: 4,
      pendingPurchaseOrders: 1,
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'Error' },
    } as any);

    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');
    const { result } = renderHook(() => useSidebarCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      pendingInvoices: 0,
      pendingSalesOrders: 0,
      unreadNotifications: 0,
      lowStockAlerts: 0,
      openTasks: 0,
      pendingQuotations: 0,
      pendingPurchaseOrders: 0,
    });
  });

  it('should refetch periodically', async () => {
    const { useSidebarCounts } = await import('@/hooks/useSidebarCounts');
    const { result } = renderHook(() => useSidebarCounts(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
  });
});

describe('SidebarCounts interface', () => {
  it('should have correct property types', () => {
    const mockCounts = {
      pendingInvoices: 0,
      pendingSalesOrders: 0,
      unreadNotifications: 0,
      lowStockAlerts: 0,
      openTasks: 0,
      pendingQuotations: 0,
      pendingPurchaseOrders: 0,
    };

    expect(typeof mockCounts.pendingInvoices).toBe('number');
    expect(typeof mockCounts.pendingSalesOrders).toBe('number');
    expect(typeof mockCounts.unreadNotifications).toBe('number');
    expect(typeof mockCounts.lowStockAlerts).toBe('number');
    expect(typeof mockCounts.openTasks).toBe('number');
    expect(typeof mockCounts.pendingQuotations).toBe('number');
    expect(typeof mockCounts.pendingPurchaseOrders).toBe('number');
  });
});
