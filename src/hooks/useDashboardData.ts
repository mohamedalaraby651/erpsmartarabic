/**
 * Custom hook for Dashboard data fetching.
 * Centralizes all dashboard queries into one place.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { markPhase } from '@/lib/bootMarks';

// ============================================
// Types
// ============================================

export interface DashboardStats {
  customersCount: number;
  productsCount: number;
  invoicesCount: number;
  quotationsCount: number;
  invoiceTrend: number | null;
}

export interface FinancialKPIs {
  todayRevenue: number;
  mtdRevenue: number;
  outstandingAR: number;
  overdueAR: number;
  cashBalance: number;
  pendingApprovals: number;
}

export interface MonthlySalesPoint {
  name: string;
  sales: number;
}

type InvoiceWithCustomer = {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  customers: { name: string } | null;
};

// ============================================
// Hook
// ============================================

export function useDashboardData() {
  // Single RPC returns counts + trend + monthly sales (Phase 3)
  const {
    data: overview,
    isLoading: isStatsLoading,
    error: overviewError,
    refetch: refetchOverview,
    isFetching: isOverviewFetching,
  } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      markPhase('first_rpc_start');
      const { data, error } = await supabase.rpc('get_dashboard_overview');
      if (error) throw error;
      markPhase('first_rpc_done');
      return data as {
        customers_count: number;
        products_count: number;
        invoices_count: number;
        quotations_count: number;
        current_period_invoices: number;
        previous_period_invoices: number;
        monthly_sales: { month: string; sales: number }[];
        today_revenue?: number;
        mtd_revenue?: number;
        outstanding_ar?: number;
        overdue_ar?: number;
        cash_balance?: number;
        pending_approvals?: number;
      };
    },
    staleTime: 300000,
    gcTime: 600000,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 4000),
  });

  const dashboardStats: DashboardStats | undefined = overview
    ? {
        customersCount: overview.customers_count || 0,
        productsCount: overview.products_count || 0,
        invoicesCount: overview.invoices_count || 0,
        quotationsCount: overview.quotations_count || 0,
        invoiceTrend:
          overview.previous_period_invoices > 0
            ? ((overview.current_period_invoices - overview.previous_period_invoices) /
                overview.previous_period_invoices) *
              100
            : null,
      }
    : undefined;

  const financialKPIs: FinancialKPIs | undefined = overview
    ? {
        todayRevenue: Number(overview.today_revenue ?? 0),
        mtdRevenue: Number(overview.mtd_revenue ?? 0),
        outstandingAR: Number(overview.outstanding_ar ?? 0),
        overdueAR: Number(overview.overdue_ar ?? 0),
        cashBalance: Number(overview.cash_balance ?? 0),
        pendingApprovals: Number(overview.pending_approvals ?? 0),
      }
    : undefined;

  const monthlyNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthlySalesData: MonthlySalesPoint[] | undefined = overview
    ? (() => {
        const map = new Map(overview.monthly_sales.map(m => [m.month, Number(m.sales)]));
        const out: MonthlySalesPoint[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          out.push({ name: monthlyNames[d.getMonth()], sales: map.get(key) ?? 0 });
        }
        return out;
      })()
    : undefined;

  const { data: tasks } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(5);
      return data || [];
    },
    staleTime: 15000,
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['dashboard-recent-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as InvoiceWithCustomer[];
    },
    staleTime: 15000,
  });

  return {
    dashboardStats,
    financialKPIs,
    isStatsLoading,
    overviewError: overviewError as Error | null,
    isOverviewFetching,
    refetchOverview,
    monthlySalesData,
    tasks,
    recentInvoices,
  };
}
