import { useState, useMemo, useCallback } from 'react';

export interface FilterConfig {
  [key: string]: string | string[] | { min?: any; max?: any } | undefined;
}

export function useTableFilter<T extends Record<string, any>>(data: T[]) {
  const [filters, setFilters] = useState<FilterConfig>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<string[]>([]);

  const setFilter = useCallback((key: string, value: any) => {
    setFilters((current) => {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        const { [key]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: value };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters((current) => {
      const { [key]: _, ...rest } = current;
      return rest;
    });
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    // Apply search query
    if (searchQuery && searchFields.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value != null && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue === undefined) return;

      result = result.filter((item) => {
        const itemValue = item[key];

        // Array filter (multiple selection)
        if (Array.isArray(filterValue)) {
          return filterValue.includes(itemValue);
        }

        // Range filter
        if (typeof filterValue === 'object' && filterValue !== null) {
          const { min, max } = filterValue as { min?: any; max?: any };
          if (min !== undefined && itemValue < min) return false;
          if (max !== undefined && itemValue > max) return false;
          return true;
        }

        // Exact match
        if (typeof filterValue === 'string') {
          if (filterValue === '') return true;
          return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
        }

        return true;
      });
    });

    return result;
  }, [data, filters, searchQuery, searchFields]);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).length + (searchQuery ? 1 : 0);
  }, [filters, searchQuery]);

  return {
    filteredData,
    filters,
    setFilter,
    clearFilter,
    clearFilters,
    searchQuery,
    setSearchQuery,
    searchFields,
    setSearchFields,
    activeFilterCount,
  };
}
