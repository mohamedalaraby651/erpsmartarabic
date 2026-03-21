import { useState, useCallback, useMemo } from 'react';

interface UseServerPaginationOptions {
  pageSize?: number;
  totalCount: number;
}

export function useServerPagination({ pageSize = 25, totalCount }: UseServerPaginationOptions) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const range = useMemo(() => ({
    from: (currentPage - 1) * pageSize,
    to: currentPage * pageSize - 1,
  }), [currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const resetPage = useCallback(() => setCurrentPage(1), []);

  return {
    currentPage,
    totalPages,
    pageSize,
    range,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
