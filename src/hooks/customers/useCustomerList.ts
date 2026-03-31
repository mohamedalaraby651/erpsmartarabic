/**
 * Customer List Hook — Read-only queries + prefetch (CQRS: Query side)
 */

import { useCallback, useRef } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { customerSearchRepo } from "@/lib/repositories/customerSearchRepo";
import type { Customer } from "@/lib/customerConstants";
import type { SortConfig } from "@/hooks/useTableSort";

interface UseCustomerListOptions {
  debouncedSearch: string;
  typeFilter: string;
  vipFilter: string;
  governorateFilter: string;
  statusFilter: string;
  noCommDays?: string;
  inactiveDays?: string;
  currentPage: number;
  pageSize: number;
  sortConfig: SortConfig;
}

export function useCustomerList(options: UseCustomerListOptions) {
  const queryClient = useQueryClient();
  const {
    debouncedSearch, typeFilter, vipFilter, governorateFilter,
    statusFilter, noCommDays, inactiveDays, currentPage, pageSize, sortConfig,
  } = options;

  const filterKey = [debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, noCommDays, inactiveDays];

  // Main list query
  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['customers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction],
    placeholderData: keepPreviousData,
    queryFn: () => customerRepository.findAll(
      {
        search: debouncedSearch,
        type: typeFilter,
        vip: vipFilter,
        governorate: governorateFilter,
        status: statusFilter,
        noCommDays,
        inactiveDays,
      },
      { key: sortConfig.key || 'created_at', direction: sortConfig.direction },
      { page: currentPage, pageSize }
    ),
  });

  const customers = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: async () => {
      const d = await customerRepository.getStats();
      return {
        total: d.total || 0,
        individuals: d.individuals || 0,
        companies: d.companies || 0,
        vip: d.vip || 0,
        totalBalance: d.total_balance || 0,
        active: d.active || 0,
        inactive: d.inactive || 0,
        debtors: d.debtors || 0,
      };
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Prefetch on hover
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowHover = useCallback((customerId: string) => {
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['customer', customerId],
        queryFn: () => customerSearchRepo.prefetchCustomer(customerId),
        staleTime: 60000,
      });
      queryClient.prefetchQuery({
        queryKey: ['customer-addresses', customerId],
        queryFn: () => customerSearchRepo.prefetchAddresses(customerId),
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
    customers,
    totalCount,
    isLoading,
    refetch,
    stats: stats || { total: 0, individuals: 0, companies: 0, vip: 0, totalBalance: 0, active: 0, inactive: 0, debtors: 0 },
    handleRowHover,
    handleRowLeave,
    filterKey,
  };
}
