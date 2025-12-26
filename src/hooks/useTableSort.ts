import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useTableSort<T extends Record<string, any>>(
  data: T[],
  initialConfig?: SortConfig
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    initialConfig || { key: '', direction: null }
  );

  const requestSort = useCallback((key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        // Cycle through: asc -> desc -> null
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return { key: '', direction: null };
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr, 'ar');
      }
      return bStr.localeCompare(aStr, 'ar');
    });
  }, [data, sortConfig]);

  const clearSort = useCallback(() => {
    setSortConfig({ key: '', direction: null });
  }, []);

  return {
    sortedData,
    sortConfig,
    requestSort,
    clearSort,
  };
}
