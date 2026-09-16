/**
 * useColumnFilters (OPA-UI-002) — state container for per-column filters.
 *
 * Several values may be active inside one column (OR) and several columns may
 * be active at once (AND). Removing a filter removes only that column.
 */
import { useCallback, useMemo, useState } from 'react';
import { isFilterActive, type ColumnFilter, type ColumnFilters } from '@/components/ui/column-filter';

export function useColumnFilters(initial: ColumnFilters = {}) {
  const [filters, setFilters] = useState<ColumnFilters>(initial);

  const setFilter = useCallback((key: string, filter: ColumnFilter | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!filter || !isFilterActive(filter)) delete next[key];
      else next[key] = filter;
      return next;
    });
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilters({}), []);
  const replaceFilters = useCallback((next: ColumnFilters) => setFilters(next ?? {}), []);

  const activeCount = useMemo(() => Object.keys(filters).length, [filters]);

  return { filters, setFilter, removeFilter, clearFilters, replaceFilters, activeCount };
}
