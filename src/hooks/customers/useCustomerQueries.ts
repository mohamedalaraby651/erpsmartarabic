import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Customer } from "@/lib/customerConstants";
import type { SortConfig } from "@/hooks/useTableSort";

interface UseCustomerQueriesOptions {
  debouncedSearch: string;
  typeFilter: string;
  vipFilter: string;
  governorateFilter: string;
  statusFilter: string;
  currentPage: number;
  rangeFrom: number;
  rangeTo: number;
  sortConfig: SortConfig;
}

export function useCustomerQueries(options: UseCustomerQueriesOptions) {
  const queryClient = useQueryClient();
  const { debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, currentPage, rangeFrom, rangeTo, sortConfig } = options;
  const filterKey = [debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter];

  // Inline filter helper
  const applyFilters = <T>(q: T & { or: Function; eq: Function }) => {
    let result = q as Record<string, Function>;
    if (debouncedSearch) {
      result = result.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,governorate.ilike.%${debouncedSearch}%`);
    }
    if (typeFilter !== 'all') result = result.eq('customer_type', typeFilter);
    if (vipFilter !== 'all') result = result.eq('vip_level', vipFilter);
    if (governorateFilter !== 'all') result = result.eq('governorate', governorateFilter);
    if (statusFilter !== 'all') result = result.eq('is_active', statusFilter === 'active');
    return result as unknown as T;
  };

  // Count query
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['customers-count', ...filterKey],
    queryFn: async () => {
      const query = applyFilters(supabase.from('customers').select('*', { count: 'exact', head: true }));
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
  });

  // Server-side sorted + paginated data
  const sortColumn = sortConfig.key || 'created_at';
  const sortAsc = sortConfig.direction === 'asc';

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction],
    queryFn: async () => {
      const query = applyFilters(
        supabase.from('customers').select('*')
          .order(sortColumn, { ascending: sortAsc })
          .range(rangeFrom, rangeTo)
      );
      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

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
    staleTime: 30000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (deleteId: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', deleteId);
      if (error) throw error;
    },
    onMutate: async (deleteId: string) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const qk = ['customers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction];
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old: Customer[] | undefined) => old?.filter(c => c.id !== deleteId) || []);
      return { prev, qk };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(context.qk, context.prev);
      toast.error('فشل حذف العميل');
    },
  });

  // Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العملاء المحددين بنجاح');
    },
    onError: () => {
      toast.error('فشل حذف العملاء المحددين');
    },
  });

  // Bulk VIP update
  const bulkVipMutation = useMutation({
    mutationFn: async ({ ids, vipLevel }: { ids: string[]; vipLevel: string }) => {
      const { error } = await supabase.from('customers').update({ vip_level: vipLevel as 'regular' | 'silver' | 'gold' | 'platinum' }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
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
