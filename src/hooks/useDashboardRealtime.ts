/**
 * Subscribes to mutations that affect dashboard KPIs and invalidates
 * the relevant React Query caches so the home dashboard updates live.
 *
 * Invalidations are debounced (1.5s) to coalesce bursts of writes
 * (e.g. bulk invoice imports) into a single refetch.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardRealtime(tenantId: string | undefined | null) {
  const qc = useQueryClient();
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const flush = () => {
      const keys = Array.from(pending.current);
      pending.current.clear();
      timer.current = null;
      for (const k of keys) qc.invalidateQueries({ queryKey: [k] });
    };

    const schedule = (...keys: string[]) => {
      for (const k of keys) pending.current.add(k);
      if (timer.current) return;
      timer.current = setTimeout(flush, 1500);
    };

    const channel = supabase
      .channel(`dashboard-rt-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `tenant_id=eq.${tenantId}` },
        () => schedule('dashboard-overview', 'dashboard-recent-invoices'),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `tenant_id=eq.${tenantId}` },
        () => schedule('dashboard-overview'),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_registers', filter: `tenant_id=eq.${tenantId}` },
        () => schedule('dashboard-overview'),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `tenant_id=eq.${tenantId}` },
        () => schedule('dashboard-tasks'),
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      pending.current.clear();
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);
}
