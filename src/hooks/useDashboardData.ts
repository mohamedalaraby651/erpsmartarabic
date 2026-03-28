/**
 * Custom hook for Dashboard data fetching.
 * Centralizes all dashboard queries into one place.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const { data: dashboardStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

      const [customersRes, productsRes, invoicesRes, quotationsRes, currentPeriodRes, previousPeriodRes] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('quotations').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
      ]);

      const currentPeriodInvoices = currentPeriodRes.count || 0;
      const previousPeriodInvoices = previousPeriodRes.count || 0;
      const invoiceTrend = previousPeriodInvoices > 0
        ? ((currentPeriodInvoices - previousPeriodInvoices) / previousPeriodInvoices * 100)
        : null;

      return {
        customersCount: customersRes.count || 0,
        productsCount: productsRes.count || 0,
        invoicesCount: invoicesRes.count || 0,
        quotationsCount: quotationsRes.count || 0,
        invoiceTrend,
      };
    },
    staleTime: 300000,
    gcTime: 600000,
  });

  const { data: monthlySalesData } = useQuery({
    queryKey: ['dashboard-monthly-sales'],
    queryFn: async (): Promise<MonthlySalesPoint[]> => {
      const months: { name: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        months.push({ name: monthNames[start.getMonth()], start: start.toISOString(), end: end.toISOString() });
      }
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .gte('created_at', months[0].start)
        .lte('created_at', months[months.length - 1].end);

      return months.map(m => {
        const sales = data?.filter(inv => inv.created_at >= m.start && inv.created_at <= m.end)
          .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
        return { name: m.name, sales };
      });
    },
    staleTime: 300000,
  });

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
    isStatsLoading,
    monthlySalesData,
    tasks,
    recentInvoices,
  };
}
