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

export function useSidebarCounts(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sidebar-counts', user?.id],
    queryFn: async (): Promise<SidebarCounts> => {
      const [
        invoicesResult,
        salesOrdersResult,
        notificationsResult,
        stockResult,
        tasksResult,
        quotationsResult,
        purchaseOrdersResult,
      ] = await Promise.all([
        // Pending/Unpaid invoices
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .in('payment_status', ['pending', 'partial']),
        
        // Pending sales orders
        supabase
          .from('sales_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'draft']),
        
        // Unread notifications
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user?.id || '')
          .eq('is_read', false),
        
        // Low stock products
        supabase
          .from('products')
          .select('id, min_stock, product_stock(quantity)', { count: 'exact' })
          .not('min_stock', 'is', null),
        
        // Open tasks
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('is_completed', false),
        
        // Pending quotations
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'draft']),
        
        // Pending purchase orders
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'draft']),
      ]);

      // Calculate low stock count
      let lowStockCount = 0;
      if (stockResult.data) {
        interface ProductWithStock {
          id: string;
          min_stock: number | null;
          product_stock: { quantity: number }[] | null;
        }
        lowStockCount = (stockResult.data as ProductWithStock[]).filter((product) => {
          const totalStock = product.product_stock?.reduce((sum: number, s) => sum + (s.quantity || 0), 0) || 0;
          return totalStock < (product.min_stock || 0);
        }).length;
      }

      return {
        pendingInvoices: invoicesResult.count || 0,
        pendingSalesOrders: salesOrdersResult.count || 0,
        unreadNotifications: notificationsResult.count || 0,
        lowStockAlerts: lowStockCount,
        openTasks: tasksResult.count || 0,
        pendingQuotations: quotationsResult.count || 0,
        pendingPurchaseOrders: purchaseOrdersResult.count || 0,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000, // Cache for 1 minute
  });
}
