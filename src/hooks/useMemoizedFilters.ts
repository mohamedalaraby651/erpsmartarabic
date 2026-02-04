import { useMemo, useCallback, useState } from 'react';

export interface FilterState {
  [key: string]: string | number | boolean | undefined;
}

export function useMemoizedFilters<T>(
  data: T[],
  searchFields: (keyof T)[],
  searchQuery: string,
  filters: FilterState = {}
) {
  // Memoize search filtering
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerQuery);
        }
        if (typeof value === 'number') {
          return value.toString().includes(lowerQuery);
        }
        return false;
      })
    );
  }, [data, searchQuery, searchFields]);

  // Memoize additional filter application
  const filteredData = useMemo(() => {
    if (Object.keys(filters).length === 0) return searchFiltered;
    
    return searchFiltered.filter((item) => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (filterValue === undefined || filterValue === '') return true;
        const itemValue = (item as Record<string, unknown>)[key];
        return itemValue === filterValue;
      });
    });
  }, [searchFiltered, filters]);

  return { filteredData, totalCount: data.length, filteredCount: filteredData.length };
}

export function useSearchState(initialValue = '') {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return { searchQuery, handleSearch, clearSearch };
}
