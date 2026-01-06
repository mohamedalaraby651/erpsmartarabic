import { useState, useEffect, useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  order: number;
}

export interface TableConfig {
  columns: ColumnConfig[];
  savedFilters: Array<{
    id: string;
    name: string;
    filters: Record<string, any>;
  }>;
  defaultSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  pageSize: number;
}

const defaultTableConfig: TableConfig = {
  columns: [],
  savedFilters: [],
  pageSize: 10,
};

export function useTableCustomization(tableId: string, defaultColumns: ColumnConfig[]) {
  const { preferences, updateTableSettings } = useUserPreferences();
  
  const [config, setConfig] = useState<TableConfig>(() => {
    const savedConfig = preferences.table_settings?.[tableId];
    if (savedConfig) {
      // Merge saved columns with defaults to handle new columns
      const mergedColumns = defaultColumns.map((defaultCol, index) => {
        const savedCol = savedConfig.columns?.find((c: ColumnConfig) => c.id === defaultCol.id);
        return savedCol || { ...defaultCol, order: index };
      });
      return {
        ...defaultTableConfig,
        ...savedConfig,
        columns: mergedColumns.sort((a, b) => a.order - b.order),
      };
    }
    return {
      ...defaultTableConfig,
      columns: defaultColumns.map((col, index) => ({ ...col, order: index })),
    };
  });

  // Sync with preferences when they change
  useEffect(() => {
    const savedConfig = preferences.table_settings?.[tableId];
    if (savedConfig) {
      const mergedColumns = defaultColumns.map((defaultCol, index) => {
        const savedCol = savedConfig.columns?.find((c: ColumnConfig) => c.id === defaultCol.id);
        return savedCol || { ...defaultCol, order: index };
      });
      setConfig({
        ...defaultTableConfig,
        ...savedConfig,
        columns: mergedColumns.sort((a, b) => a.order - b.order),
      });
    }
  }, [preferences.table_settings, tableId, defaultColumns]);

  const saveConfig = useCallback((newConfig: TableConfig) => {
    setConfig(newConfig);
    updateTableSettings({
      ...preferences.table_settings,
      [tableId]: newConfig,
    });
  }, [tableId, preferences.table_settings, updateTableSettings]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    const newColumns = config.columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    saveConfig({ ...config, columns: newColumns });
  }, [config, saveConfig]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const newColumns = config.columns.map(col =>
      col.id === columnId ? { ...col, width } : col
    );
    saveConfig({ ...config, columns: newColumns });
  }, [config, saveConfig]);

  const reorderColumns = useCallback((newOrder: string[]) => {
    const newColumns = config.columns.map(col => ({
      ...col,
      order: newOrder.indexOf(col.id),
    })).sort((a, b) => a.order - b.order);
    saveConfig({ ...config, columns: newColumns });
  }, [config, saveConfig]);

  const saveFilter = useCallback((name: string, filters: Record<string, any>) => {
    const newFilter = {
      id: crypto.randomUUID(),
      name,
      filters,
    };
    saveConfig({
      ...config,
      savedFilters: [...config.savedFilters, newFilter],
    });
    return newFilter.id;
  }, [config, saveConfig]);

  const deleteFilter = useCallback((filterId: string) => {
    saveConfig({
      ...config,
      savedFilters: config.savedFilters.filter(f => f.id !== filterId),
    });
  }, [config, saveConfig]);

  const setDefaultSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    saveConfig({
      ...config,
      defaultSort: { column, direction },
    });
  }, [config, saveConfig]);

  const setPageSize = useCallback((pageSize: number) => {
    saveConfig({ ...config, pageSize });
  }, [config, saveConfig]);

  const resetToDefaults = useCallback(() => {
    const defaultConfig: TableConfig = {
      columns: defaultColumns.map((col, index) => ({ ...col, order: index })),
      savedFilters: [],
      pageSize: 10,
    };
    saveConfig(defaultConfig);
  }, [defaultColumns, saveConfig]);

  const visibleColumns = config.columns.filter(col => col.visible);

  return {
    config,
    visibleColumns,
    toggleColumnVisibility,
    setColumnWidth,
    reorderColumns,
    saveFilter,
    deleteFilter,
    setDefaultSort,
    setPageSize,
    resetToDefaults,
  };
}
