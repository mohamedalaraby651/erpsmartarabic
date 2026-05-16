/**
 * Subscribes to mutations that affect dashboard KPIs and invalidates
 * the relevant React Query caches so the home dashboard updates live.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardRealtime(tenantId: string | undefined | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const invalidateOverview = () => {
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] });
    };
    const invalidateInvoices = () => {
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recent-invoices'] });
    };

    const channel = supabase
      .channel(`dashboard-rt-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `tenant_id=eq.${tenantId}` },
        invalidateInvoices,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `tenant_id=eq.${tenantId}` },
        invalidateOverview,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_registers',
          filter: `tenant_id=eq.${tenantId}`,
        },
        invalidateOverview,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ['dashboard-tasks'] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);
}
