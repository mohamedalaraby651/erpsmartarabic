import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

export function useSupplierFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
  const [governorateFilter, setGovernorateFilter] = useState(searchParams.get('gov') || "all");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('cat') || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Temp filters for mobile drawer
  const [tempGovernorate, setTempGovernorate] = useState("all");
  const [tempCategory, setTempCategory] = useState("all");
  const [tempStatus, setTempStatus] = useState("all");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const syncToUrl = useCallback((overrides: Record<string, string> = {}) => {
    const params: Record<string, string> = {};
    const vals = {
      q: overrides.q ?? searchQuery,
      gov: overrides.gov ?? governorateFilter,
      cat: overrides.cat ?? categoryFilter,
      status: overrides.status ?? statusFilter,
    };
    if (vals.q) params.q = vals.q;
    if (vals.gov !== 'all') params.gov = vals.gov;
    if (vals.cat !== 'all') params.cat = vals.cat;
    if (vals.status !== 'all') params.status = vals.status;
    setSearchParams(params, { replace: true });
  }, [searchQuery, governorateFilter, categoryFilter, statusFilter, setSearchParams]);

  const updateFilter = useCallback((key: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      gov: setGovernorateFilter, cat: setCategoryFilter, status: setStatusFilter,
    };
    setters[key]?.(value);
    syncToUrl({ [key]: value });
  }, [syncToUrl]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setGovernorateFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const openDrawerWithCurrentValues = useCallback(() => {
    setTempGovernorate(governorateFilter);
    setTempCategory(categoryFilter);
    setTempStatus(statusFilter);
    setFilterDrawerOpen(true);
  }, [governorateFilter, categoryFilter, statusFilter]);

  const applyDrawerFilters = useCallback(() => {
    setGovernorateFilter(tempGovernorate);
    setCategoryFilter(tempCategory);
    setStatusFilter(tempStatus);
    syncToUrl({ gov: tempGovernorate, cat: tempCategory, status: tempStatus });
  }, [tempGovernorate, tempCategory, tempStatus, syncToUrl]);

  const resetDrawerFilters = useCallback(() => {
    setTempGovernorate('all');
    setTempCategory('all');
    setTempStatus('all');
  }, []);

  const activeFiltersCount = useMemo(
    () => [governorateFilter, categoryFilter, statusFilter].filter(f => f !== 'all').length,
    [governorateFilter, categoryFilter, statusFilter]
  );

  return {
    searchQuery, setSearchQuery: (v: string) => { setSearchQuery(v); syncToUrl({ q: v }); },
    debouncedSearch,
    governorateFilter, setGovernorateFilter: (v: string) => updateFilter('gov', v),
    categoryFilter, setCategoryFilter: (v: string) => updateFilter('cat', v),
    statusFilter, setStatusFilter: (v: string) => updateFilter('status', v),
    clearAllFilters, activeFiltersCount,
    // Drawer
    filterDrawerOpen, setFilterDrawerOpen,
    tempGovernorate, setTempGovernorate, tempCategory, setTempCategory,
    tempStatus, setTempStatus,
    openDrawerWithCurrentValues, applyDrawerFilters, resetDrawerFilters,
    searchParams, setSearchParams,
  };
}
