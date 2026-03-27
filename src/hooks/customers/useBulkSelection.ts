import { useState, useCallback, useMemo } from "react";

export function useBulkSelection<T extends { id: string }>(data: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [data]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(
    () => data.length > 0 && selectedIds.size === data.length,
    [data.length, selectedIds.size]
  );

  const hasSelection = selectedIds.size > 0;

  return {
    selectedIds, setSelectedIds,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, hasSelection,
  };
}
