import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SidebarCounts {
  pendingInvoices: number;
  pendingSalesOrders: number;
  unreadNotifications: number;
  lowStockAlerts: number;
  openTasks: number;
  pendingQuotations: number;
  pendingPurchaseOrders: number;
}

/**
 * Fetches all sidebar badge counts via a single RPC call
 * instead of 7 separate queries.
 */
export function useSidebarCounts(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sidebar-counts', user?.id],
    queryFn: async (): Promise<SidebarCounts> => {
      const { data, error } = await supabase.rpc('get_sidebar_counts');

      if (error) {
        console.error('[useSidebarCounts] RPC error:', error.message);
        return {
          pendingInvoices: 0,
          pendingSalesOrders: 0,
          unreadNotifications: 0,
          lowStockAlerts: 0,
          openTasks: 0,
          pendingQuotations: 0,
          pendingPurchaseOrders: 0,
        };
      }

      const d = data as Record<string, number>;
      return {
        pendingInvoices: d.pending_invoices ?? 0,
        pendingSalesOrders: d.pending_sales_orders ?? 0,
        unreadNotifications: d.unread_notifications ?? 0,
        lowStockAlerts: d.low_stock_alerts ?? 0,
        openTasks: d.open_tasks ?? 0,
        pendingQuotations: d.pending_quotations ?? 0,
        pendingPurchaseOrders: d.pending_purchase_orders ?? 0,
      };
    },
    enabled: !!user?.id && enabled,
    refetchInterval: 120000,
    staleTime: 60000,
  });
}
