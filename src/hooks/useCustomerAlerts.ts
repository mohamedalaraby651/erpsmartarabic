import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAlertSettings } from './useAlertSettings';

export type AlertType =
  | 'credit_exceeded'
  | 'overdue_payment'
  | 'credit_approaching'
  | 'upcoming_due'
  | 'vip_no_contact'
  | 'sales_decline'
  | 'inactive'
  | 'new_customer';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

export interface CustomerAlert {
  type: AlertType;
  severity: AlertSeverity;
  priority: number; // lower = more important
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  message: string;
  amount?: number;
}

// Priority map (fixed severity ordering)
const PRIORITY: Record<AlertType, number> = {
  credit_exceeded: 1,
  overdue_payment: 2,
  credit_approaching: 3,
  upcoming_due: 4,
  vip_no_contact: 5,
  sales_decline: 6,
  inactive: 7,
  new_customer: 8,
};

export function useCustomerAlerts(enabled = true) {
  const { settings } = useAlertSettings();

  const { data: customers } = useQuery({
    queryKey: ['customer-alerts-data'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, current_balance, credit_limit, last_transaction_date, last_communication_at, last_activity_at, is_active, vip_level, created_at, invoice_count_cached, total_purchases_cached')
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
        .select('id, customer_id, invoice_number, total_amount, paid_amount, due_date, customers(name, phone)')
        .neq('payment_status', 'paid')
        .not('due_date', 'is', null)
        .lt('due_date', new Date().toISOString());
      return data || [];
    },
    staleTime: 300000,
    enabled,
  });

  const { data: upcomingInvoices } = useQuery({
    queryKey: ['upcoming-due-invoices-alerts', settings.upcomingDueDays],
    queryFn: async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + settings.upcomingDueDays * 86400000);
      const { data } = await supabase
        .from('invoices')
        .select('id, customer_id, invoice_number, total_amount, paid_amount, due_date, customers(name, phone)')
        .neq('payment_status', 'paid')
        .not('due_date', 'is', null)
        .gte('due_date', now.toISOString())
        .lte('due_date', futureDate.toISOString());
      return data || [];
    },
    staleTime: 300000,
    enabled: enabled && settings.enableUpcomingDue,
  });

  // Monthly sales comparison for decline detection
  const { data: monthlySales } = useQuery({
    queryKey: ['monthly-sales-alerts'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('customer_id, total_amount, created_at, customers(name, phone)')
        .gte('created_at', sixtyDaysAgo.toISOString());

      if (!recentInvoices) return new Map<string, { recent: number; previous: number; name: string; phone: string | null }>();

      const map = new Map<string, { recent: number; previous: number; name: string; phone: string | null }>();
      recentInvoices.forEach(inv => {
        const entry = map.get(inv.customer_id) || {
          recent: 0, previous: 0,
          name: (inv as any).customers?.name || '',
          phone: (inv as any).customers?.phone || null,
        };
        const created = new Date(inv.created_at).getTime();
        if (created >= thirtyDaysAgo.getTime()) {
          entry.recent += Number(inv.total_amount || 0);
        } else {
          entry.previous += Number(inv.total_amount || 0);
        }
        map.set(inv.customer_id, entry);
      });
      return map;
    },
    staleTime: 300000,
    enabled: enabled && settings.enableSalesDecline,
  });

  const alerts = useMemo<CustomerAlert[]>(() => {
    const result: CustomerAlert[] = [];
    const severityOrder: AlertSeverity[] = ['error', 'warning', 'info', 'success'];
    const minIdx = settings.minSeverity === 'error' ? 0 : settings.minSeverity === 'warning' ? 1 : 3;

    const shouldInclude = (sev: AlertSeverity) => severityOrder.indexOf(sev) <= minIdx;

    // 1. Credit exceeded
    if (settings.enableCreditExceeded) {
      customers?.forEach(c => {
        const balance = Number(c.current_balance || 0);
        const limit = Number(c.credit_limit || 0);
        if (limit > 0 && balance >= limit && shouldInclude('error')) {
          result.push({
            type: 'credit_exceeded', severity: 'error', priority: PRIORITY.credit_exceeded,
            customerId: c.id, customerName: c.name, customerPhone: c.phone,
            amount: balance,
            message: `العميل "${c.name}" تجاوز حد الائتمان (${balance.toLocaleString()} / ${limit.toLocaleString()} ج.م)`,
          });
        }
      });
    }

    // 2. Overdue invoices
    if (settings.enableOverduePayment) {
      overdueInvoices?.forEach(inv => {
        const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date!).getTime()) / 86400000);
        const custData = (inv as any).customers;
        const customerName = custData?.name || 'عميل';
        const sev: AlertSeverity = daysOverdue > settings.overdueDaysThreshold ? 'error' : 'warning';
        if (shouldInclude(sev)) {
          result.push({
            type: 'overdue_payment', severity: sev, priority: PRIORITY.overdue_payment,
            customerId: inv.customer_id, customerName,
            customerPhone: custData?.phone,
            amount: Number(inv.total_amount || 0) - Number(inv.paid_amount || 0),
            message: `فاتورة ${inv.invoice_number} متأخرة ${daysOverdue} يوم — ${customerName}`,
          });
        }
      });
    }

    // 3. Credit approaching
    if (settings.enableCreditApproaching) {
      customers?.forEach(c => {
        const balance = Number(c.current_balance || 0);
        const limit = Number(c.credit_limit || 0);
        const threshold = limit * (settings.creditWarningPercent / 100);
        if (limit > 0 && balance >= threshold && balance < limit && shouldInclude('warning')) {
          const pct = Math.round((balance / limit) * 100);
          result.push({
            type: 'credit_approaching', severity: 'warning', priority: PRIORITY.credit_approaching,
            customerId: c.id, customerName: c.name, customerPhone: c.phone,
            amount: balance,
            message: `العميل "${c.name}" وصل ${pct}% من حد الائتمان (${balance.toLocaleString()} / ${limit.toLocaleString()} ج.م)`,
          });
        }
      });
    }

    // 4. Upcoming due invoices
    if (settings.enableUpcomingDue && shouldInclude('warning')) {
      upcomingInvoices?.forEach(inv => {
        const daysUntil = Math.ceil((new Date(inv.due_date!).getTime() - Date.now()) / 86400000);
        const custData = (inv as any).customers;
        const customerName = custData?.name || 'عميل';
        result.push({
          type: 'upcoming_due', severity: 'warning', priority: PRIORITY.upcoming_due,
          customerId: inv.customer_id, customerName,
          customerPhone: custData?.phone,
          amount: Number(inv.total_amount || 0) - Number(inv.paid_amount || 0),
          message: `فاتورة ${inv.invoice_number} تستحق خلال ${daysUntil} يوم — ${customerName}`,
        });
      });
    }

    // 5. VIP without contact
    if (settings.enableVipNoContact && shouldInclude('warning')) {
      const threshold = Date.now() - settings.vipNoContactDays * 86400000;
      customers?.forEach(c => {
        if (c.vip_level === 'regular') return;
        const lastComm = c.last_communication_at ? new Date(c.last_communication_at).getTime() : 0;
        if (lastComm < threshold) {
          const days = lastComm ? Math.floor((Date.now() - lastComm) / 86400000) : settings.vipNoContactDays;
          result.push({
            type: 'vip_no_contact', severity: 'warning', priority: PRIORITY.vip_no_contact,
            customerId: c.id, customerName: c.name, customerPhone: c.phone,
            message: `عميل VIP "${c.name}" بدون تواصل منذ ${days} يوم`,
          });
        }
      });
    }

    // 6. Sales decline (monthly comparison)
    if (settings.enableSalesDecline && shouldInclude('info') && monthlySales) {
      monthlySales.forEach((data, customerId) => {
        if (data.previous > 0) {
          const declinePercent = ((data.previous - data.recent) / data.previous) * 100;
          if (declinePercent >= settings.salesDeclinePercent) {
            result.push({
              type: 'sales_decline', severity: 'info', priority: PRIORITY.sales_decline,
              customerId, customerName: data.name, customerPhone: data.phone,
              amount: data.recent,
              message: `انخفاض مبيعات "${data.name}" بنسبة ${Math.round(declinePercent)}% هذا الشهر`,
            });
          }
        }
      });
    }

    // 7. Inactive 90+ days
    if (settings.enableInactive && shouldInclude('info')) {
      const inactiveThreshold = Date.now() - settings.inactiveDays * 86400000;
      customers?.forEach(c => {
        if (c.last_transaction_date) {
          const lastDate = new Date(c.last_transaction_date).getTime();
          if (lastDate < inactiveThreshold) {
            const days = Math.floor((Date.now() - lastDate) / 86400000);
            result.push({
              type: 'inactive', severity: 'info', priority: PRIORITY.inactive,
              customerId: c.id, customerName: c.name, customerPhone: c.phone,
              message: `العميل "${c.name}" غير نشط منذ ${days} يوم`,
            });
          }
        }
      });
    }

    // 8. New customers without invoices
    if (settings.enableNewCustomer && shouldInclude('success')) {
      customers?.forEach(c => {
        if (Number(c.invoice_count_cached || 0) === 0) {
          result.push({
            type: 'new_customer', severity: 'success', priority: PRIORITY.new_customer,
            customerId: c.id, customerName: c.name, customerPhone: c.phone,
            message: `عميل جديد "${c.name}" — أنشئ أول فاتورة`,
          });
        }
      });
    }

    // Sort by priority (fixed severity ordering)
    result.sort((a, b) => a.priority - b.priority);
    return result;
  }, [customers, overdueInvoices, upcomingInvoices, monthlySales, settings]);

  // Group by type
  const alertsByType = useMemo(() => {
    const map = new Map<AlertType, CustomerAlert[]>();
    alerts.forEach(a => {
      const list = map.get(a.type) || [];
      list.push(a);
      map.set(a.type, list);
    });
    return map;
  }, [alerts]);

  // Build a set of customer IDs that have alerts (for highlighting)
  const alertedCustomerIds = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach(a => set.add(a.customerId));
    return set;
  }, [alerts]);

  // Count per customer
  const alertCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    alerts.forEach(a => map.set(a.customerId, (map.get(a.customerId) || 0) + 1));
    return map;
  }, [alerts]);

  // Severity-based error customers (for highlight)
  const errorCustomerIds = useMemo(() => {
    const set = new Set<string>();
    alerts.filter(a => a.severity === 'error').forEach(a => set.add(a.customerId));
    return set;
  }, [alerts]);

  const errorAlerts = alerts.filter(a => a.severity === 'error');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');
  const successAlerts = alerts.filter(a => a.severity === 'success');

  return {
    alerts, alertsByType, errorAlerts, warningAlerts, infoAlerts, successAlerts,
    totalAlerts: alerts.length,
    alertedCustomerIds, alertCountByCustomer, errorCustomerIds,
  };
}
