/**
 * Supplier List Hook — Read-only queries (CQRS: Query side)
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supplierRepository } from "@/lib/repositories/supplierRepository";
import type { SortConfig } from "@/hooks/useTableSort";

interface UseSupplierListOptions {
  debouncedSearch: string;
  governorateFilter: string;
  categoryFilter: string;
  statusFilter: string;
  currentPage: number;
  pageSize: number;
  sortConfig: SortConfig;
}

export function useSupplierList(options: UseSupplierListOptions) {
  const {
    debouncedSearch, governorateFilter, categoryFilter,
    statusFilter, currentPage, pageSize, sortConfig,
  } = options;

  const filterKey = [debouncedSearch, governorateFilter, categoryFilter, statusFilter];

  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['suppliers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction],
    placeholderData: keepPreviousData,
    queryFn: () => supplierRepository.findAll(
      {
        search: debouncedSearch,
        governorate: governorateFilter,
        category: categoryFilter,
        status: statusFilter,
      },
      { key: sortConfig.key || 'name', direction: sortConfig.direction },
      { page: currentPage, pageSize }
    ),
  });

  const suppliers = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;

  return {
    suppliers,
    totalCount,
    isLoading,
    refetch,
    filterKey,
  };
}
