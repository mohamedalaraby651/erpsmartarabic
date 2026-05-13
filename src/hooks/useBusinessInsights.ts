import { useMemo } from 'react';
import { useCustomerAlerts } from './useCustomerAlerts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessInsight {
  id: string;
  type: 'credit_exceeded' | 'overdue_payment' | 'inactive_customer' | 'low_stock' | 'cash_flow_risk' | 'all_clear';
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: { label: string; href: string };
  count?: number;
}

export function useBusinessInsights() {
  const { errorAlerts, warningAlerts, infoAlerts } = useCustomerAlerts();

  // Low stock products — server-side aggregation (no full table scan on client)
  const { data: lowStockProducts } = useQuery({
    queryKey: ['insights-low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_low_stock_products');
      if (error) return [];
      return data ?? [];
    },
    staleTime: 300000,
  });

  // Unpaid invoices summary — server-side SUM/COUNT instead of fetching every row
  const { data: cashFlowData } = useQuery({
    queryKey: ['insights-cash-flow'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unpaid_invoices_summary');
      if (error || !data || data.length === 0) return { totalUnpaid: 0, count: 0 };
      const row = data[0] as { total_unpaid: number; invoice_count: number };
      return { totalUnpaid: Number(row.total_unpaid) || 0, count: Number(row.invoice_count) || 0 };
    },
    staleTime: 300000,
  });

  const insights = useMemo<BusinessInsight[]>(() => {
    const result: BusinessInsight[] = [];

    // Credit exceeded alerts (highest priority)
    if (errorAlerts.length > 0) {
      result.push({
        id: 'credit-exceeded',
        type: 'credit_exceeded',
        severity: 'error',
        title: 'تجاوز حد الائتمان',
        message: `${errorAlerts.length} عميل تجاوز حد الائتمان المسموح`,
        action: { label: 'عرض العملاء', href: '/customers' },
        count: errorAlerts.length,
      });
    }

    // Overdue payments
    const overdueAlerts = warningAlerts.filter(a => a.type === 'overdue_payment');
    if (overdueAlerts.length > 0) {
      result.push({
        id: 'overdue-payments',
        type: 'overdue_payment',
        severity: 'warning',
        title: 'فواتير متأخرة',
        message: `${overdueAlerts.length} فاتورة متأخرة عن موعد السداد`,
        action: { label: 'عرض الفواتير', href: '/invoices' },
        count: overdueAlerts.length,
      });
    }

    // Low stock
    if (lowStockProducts && lowStockProducts.length > 0) {
      result.push({
        id: 'low-stock',
        type: 'low_stock',
        severity: 'warning',
        title: 'مخزون منخفض',
        message: `${lowStockProducts.length} منتج تحت الحد الأدنى`,
        action: { label: 'عرض المنتجات', href: '/products' },
        count: lowStockProducts.length,
      });
    }

    // Cash flow risk
    if (cashFlowData && cashFlowData.totalUnpaid > 50000) {
      result.push({
        id: 'cash-flow',
        type: 'cash_flow_risk',
        severity: 'warning',
        title: 'مخاطر تدفق نقدي',
        message: `${cashFlowData.totalUnpaid.toLocaleString()} ج.م مستحقات غير محصلة (${cashFlowData.count} فاتورة)`,
        action: { label: 'عرض المدفوعات', href: '/payments' },
      });
    }

    // Inactive customers
    if (infoAlerts.length > 0) {
      result.push({
        id: 'inactive-customers',
        type: 'inactive_customer',
        severity: 'info',
        title: 'عملاء غير نشطين',
        message: `${infoAlerts.length} عميل بدون نشاط منذ 90+ يوم`,
        action: { label: 'عرض العملاء', href: '/customers' },
        count: infoAlerts.length,
      });
    }

    // All clear
    if (result.length === 0) {
      result.push({
        id: 'all-clear',
        type: 'all_clear',
        severity: 'success',
        title: 'كل شيء تحت السيطرة',
        message: 'لا توجد تنبيهات تحتاج انتباهك حالياً',
      });
    }

    return result;
  }, [errorAlerts, warningAlerts, infoAlerts, lowStockProducts, cashFlowData]);

  return {
    insights,
    hasAlerts: insights.length > 0 && insights[0].type !== 'all_clear',
    totalAlerts: insights.filter(i => i.type !== 'all_clear').length,
  };
}
