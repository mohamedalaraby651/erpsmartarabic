import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CustomerAlert {
  type: 'credit_exceeded' | 'overdue_payment' | 'inactive';
  severity: 'warning' | 'error' | 'info';
  customerId: string;
  customerName: string;
  message: string;
}

export function useCustomerAlerts(enabled = true) {
  const { data: customers } = useQuery({
    queryKey: ['customer-alerts-data'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, current_balance, credit_limit, last_transaction_date, is_active')
        .eq('is_active', true);
      return data || [];
    },
    staleTime: 300000,
    enabled,
  });

  const { data: overdueInvoices } = useQuery({
    queryKey: ['overdue-invoices-alerts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, customer_id, invoice_number, total_amount, paid_amount, due_date, customers(name)')
        .neq('payment_status', 'paid')
        .not('due_date', 'is', null)
        .lt('due_date', new Date().toISOString());
      return data || [];
    },
    staleTime: 300000,
    enabled,
  });

  const alerts = useMemo<CustomerAlert[]>(() => {
    const result: CustomerAlert[] = [];

    // Credit limit exceeded
    customers?.forEach(c => {
      const balance = Number(c.current_balance || 0);
      const limit = Number(c.credit_limit || 0);
      if (limit > 0 && balance >= limit) {
        result.push({
          type: 'credit_exceeded',
          severity: 'error',
          customerId: c.id,
          customerName: c.name,
          message: `العميل "${c.name}" تجاوز حد الائتمان (${balance.toLocaleString()} / ${limit.toLocaleString()} ج.م)`,
        });
      }
    });

    // Overdue invoices
    overdueInvoices?.forEach(inv => {
      const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date!).getTime()) / 86400000);
      const customerName = (inv as { customers?: { name: string } | null }).customers?.name || 'عميل';
      result.push({
        type: 'overdue_payment',
        severity: daysOverdue > 30 ? 'error' : 'warning',
        customerId: inv.customer_id,
        customerName,
        message: `فاتورة ${inv.invoice_number} متأخرة ${daysOverdue} يوم - ${customerName}`,
      });
    });

    // Inactive customers (90+ days)
    const ninetyDaysAgo = Date.now() - 90 * 86400000;
    customers?.forEach(c => {
      if (c.last_transaction_date) {
        const lastDate = new Date(c.last_transaction_date).getTime();
        if (lastDate < ninetyDaysAgo) {
          const days = Math.floor((Date.now() - lastDate) / 86400000);
          result.push({
            type: 'inactive',
            severity: 'info',
            customerId: c.id,
            customerName: c.name,
            message: `العميل "${c.name}" غير نشط منذ ${days} يوم`,
          });
        }
      }
    });

    return result;
  }, [customers, overdueInvoices]);

  const errorAlerts = alerts.filter(a => a.severity === 'error');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return { alerts, errorAlerts, warningAlerts, infoAlerts, totalAlerts: alerts.length };
}
