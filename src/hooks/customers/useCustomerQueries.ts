import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canDeleteCustomer } from "@/lib/services/customerService";
import { logErrorSafely } from "@/lib/errorHandler";
import type { Customer } from "@/lib/customerConstants";
import type { SortConfig } from "@/hooks/useTableSort";

/** Escape special chars for Postgres .ilike */
function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

interface UseCustomerQueriesOptions {
  debouncedSearch: string;
  typeFilter: string;
  vipFilter: string;
  governorateFilter: string;
  statusFilter: string;
  currentPage: number;
  pageSize: number;
  sortConfig: SortConfig;
}

function applyFilters(
  query: any,
  { debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter }: Pick<UseCustomerQueriesOptions, 'debouncedSearch' | 'typeFilter' | 'vipFilter' | 'governorateFilter' | 'statusFilter'>
) {
  if (debouncedSearch) {
    const s = sanitizeSearch(debouncedSearch);
    query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,governorate.ilike.%${s}%`);
  }
  if (typeFilter !== 'all') query = query.eq('customer_type', typeFilter);
  if (vipFilter !== 'all') query = query.eq('vip_level', vipFilter);
  if (governorateFilter !== 'all') query = query.eq('governorate', governorateFilter);
  if (statusFilter !== 'all') query = query.eq('is_active', statusFilter === 'active');
  return query;
}

export function useCustomerQueries(options: UseCustomerQueriesOptions) {
  const queryClient = useQueryClient();
  const { debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, currentPage, pageSize, sortConfig } = options;
  const filterKey = [debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter];

  const sortColumn = sortConfig.key || 'created_at';
  const sortAsc = sortConfig.direction === 'asc';
  const rangeFrom = (currentPage - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  // Single merged query: data + count
  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['customers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order(sortColumn, { ascending: sortAsc })
        .range(rangeFrom, rangeTo);

      query = applyFilters(query, { debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter });

      const { data, count, error } = await query;
      if (error) throw error;
      return { customers: (data || []) as Customer[], totalCount: count || 0 };
    },
  });

  const customers = queryResult?.customers || [];
  const totalCount = queryResult?.totalCount || 0;

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_stats');
      if (error) throw error;
      const d = data as Record<string, number>;
      return {
        total: d.total || 0,
        individuals: d.individuals || 0,
        companies: d.companies || 0,
        vip: d.vip || 0,
        totalBalance: d.total_balance || 0,
      };
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Delete mutation with server-side permission check
  const deleteMutation = useMutation({
    mutationFn: async (deleteId: string) => {
      // Server-side permission verification
      const hasPermission = await canDeleteCustomer();
      if (!hasPermission) {
        throw new Error('ليس لديك صلاحية حذف العملاء');
      }
      const { error } = await supabase.from('customers').delete().eq('id', deleteId);
      if (error) throw error;
    },
    onMutate: async (deleteId: string) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const qk = ['customers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction];
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old: { customers: Customer[]; totalCount: number } | undefined) => {
        if (!old) return old;
        return {
          customers: old.customers.filter(c => c.id !== deleteId),
          totalCount: old.totalCount - 1,
        };
      });
      return { prev, qk };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(context.qk, context.prev);
      toast.error(err instanceof Error ? err.message : 'فشل حذف العميل');
    },
  });

  // Bulk delete with server-side permission check + batch validation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const hasPermission = await canDeleteCustomer();
      if (!hasPermission) throw new Error('ليس لديك صلاحية حذف العملاء');

      // Batch validate: check for open invoices
      const { data: blocked, error: valError } = await supabase.rpc('batch_validate_delete', { p_ids: ids });
      if (valError) throw valError;
      if (blocked && blocked.length > 0) {
        const names = (blocked as Array<{ customer_name: string; open_invoice_count: number }>)
          .map(b => `${b.customer_name} (${b.open_invoice_count} فاتورة)`)
          .join('، ');
        throw new Error(`لا يمكن حذف العملاء التالية لوجود فواتير مفتوحة: ${names}`);
      }

      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;

      // Audit trail — awaited with error handling
      try {
        await supabase.rpc('log_bulk_operation', {
          _action: 'bulk_delete',
          _entity_type: 'customers',
          _entity_ids: ids,
          _details: JSON.stringify({ count: ids.length }),
        });
      } catch (logErr) {
        logErrorSafely('bulkDelete:audit', logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العملاء المحددين بنجاح');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'فشل حذف العملاء المحددين');
    },
  });

  // Bulk VIP update
  const bulkVipMutation = useMutation({
    mutationFn: async ({ ids, vipLevel }: { ids: string[]; vipLevel: string }) => {
      const { error } = await supabase.from('customers').update({ vip_level: vipLevel as 'regular' | 'silver' | 'gold' | 'platinum' }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: async (_data, { ids, vipLevel }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      try {
        await supabase.rpc('log_bulk_operation', {
          _action: 'bulk_vip_update',
          _entity_type: 'customers',
          _entity_ids: ids,
          _details: JSON.stringify({ vip_level: vipLevel }),
        });
      } catch (logErr) { logErrorSafely('bulkVip:audit', logErr); }
      toast.success('تم تحديث مستوى VIP بنجاح');
    },
    onError: () => toast.error('فشل تحديث مستوى VIP'),
  });

  // Bulk status update
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const { error } = await supabase.from('customers').update({ is_active: isActive }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: async (_data, { ids, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      try {
        await supabase.rpc('log_bulk_operation', {
          _action: 'bulk_status_update',
          _entity_type: 'customers',
          _entity_ids: ids,
          _details: JSON.stringify({ is_active: isActive }),
        });
      } catch (logErr) { logErrorSafely('bulkStatus:audit', logErr); }
      toast.success('تم تحديث حالة العملاء بنجاح');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  // Prefetch
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowHover = useCallback((customerId: string) => {
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
          const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
          return data;
        },
        staleTime: 60000,
      });
      queryClient.prefetchQuery({
        queryKey: ['customer-addresses', customerId],
        queryFn: async () => {
          const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', customerId).order('is_default', { ascending: false });
          return data;
        },
        staleTime: 60000,
      });
    }, 200);
  }, [queryClient]);

  const handleRowLeave = useCallback(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  }, []);

  return {
    totalCount, customers, isLoading, refetch,
    stats: stats || { total: 0, individuals: 0, companies: 0, vip: 0, totalBalance: 0 },
    deleteMutation, bulkDeleteMutation, bulkVipMutation, bulkStatusMutation,
    handleRowHover, handleRowLeave,
  };
}
