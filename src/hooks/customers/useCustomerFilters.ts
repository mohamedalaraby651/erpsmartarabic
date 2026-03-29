import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

export function useCustomerFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || "all");
  const [vipFilter, setVipFilter] = useState(searchParams.get('vip') || "all");
  const [governorateFilter, setGovernorateFilter] = useState(searchParams.get('gov') || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all");
  const [noCommDays, setNoCommDays] = useState(searchParams.get('noComm') || "");
  const [inactiveDays, setInactiveDays] = useState(searchParams.get('inactive') || "");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Temporary filter state for mobile drawer
  const [tempType, setTempType] = useState("all");
  const [tempVip, setTempVip] = useState("all");
  const [tempGovernorate, setTempGovernorate] = useState("all");
  const [tempStatus, setTempStatus] = useState("all");
  const [tempNoCommDays, setTempNoCommDays] = useState("");
  const [tempInactiveDays, setTempInactiveDays] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sync filters to URL
  const syncToUrl = useCallback((overrides: Record<string, string> = {}) => {
    const params: Record<string, string> = {};
    const vals = {
      q: overrides.q ?? searchQuery,
      type: overrides.type ?? typeFilter,
      vip: overrides.vip ?? vipFilter,
      gov: overrides.gov ?? governorateFilter,
      status: overrides.status ?? statusFilter,
      noComm: overrides.noComm ?? noCommDays,
      inactive: overrides.inactive ?? inactiveDays,
    };
    if (vals.q) params.q = vals.q;
    if (vals.type !== 'all') params.type = vals.type;
    if (vals.vip !== 'all') params.vip = vals.vip;
    if (vals.gov !== 'all') params.gov = vals.gov;
    if (vals.status !== 'all') params.status = vals.status;
    if (vals.noComm) params.noComm = vals.noComm;
    if (vals.inactive) params.inactive = vals.inactive;
    setSearchParams(params, { replace: true });
  }, [searchQuery, typeFilter, vipFilter, governorateFilter, statusFilter, noCommDays, inactiveDays, setSearchParams]);

  const updateFilter = useCallback((key: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      type: setTypeFilter, vip: setVipFilter, gov: setGovernorateFilter, status: setStatusFilter,
      noComm: setNoCommDays, inactive: setInactiveDays,
    };
    setters[key]?.(value);
    syncToUrl({ [key]: value });
  }, [syncToUrl]);

  const clearFilter = useCallback((key: string) => {
    updateFilter(key, 'all');
  }, [updateFilter]);

  const clearAllFilters = useCallback(() => {
    setTypeFilter('all');
    setVipFilter('all');
    setGovernorateFilter('all');
    setStatusFilter('all');
    setNoCommDays('');
    setInactiveDays('');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const openDrawerWithCurrentValues = useCallback(() => {
    setTempType(typeFilter);
    setTempVip(vipFilter);
    setTempGovernorate(governorateFilter);
    setTempStatus(statusFilter);
    setTempNoCommDays(noCommDays);
    setTempInactiveDays(inactiveDays);
    setFilterDrawerOpen(true);
  }, [typeFilter, vipFilter, governorateFilter, statusFilter, noCommDays, inactiveDays]);

  // Fixed: now syncs to URL after applying drawer filters
  const applyDrawerFilters = useCallback(() => {
    setTypeFilter(tempType);
    setVipFilter(tempVip);
    setGovernorateFilter(tempGovernorate);
    setStatusFilter(tempStatus);
    setNoCommDays(tempNoCommDays);
    setInactiveDays(tempInactiveDays);
    syncToUrl({ type: tempType, vip: tempVip, gov: tempGovernorate, status: tempStatus, noComm: tempNoCommDays, inactive: tempInactiveDays });
  }, [tempType, tempVip, tempGovernorate, tempStatus, tempNoCommDays, tempInactiveDays, syncToUrl]);

  const resetDrawerFilters = useCallback(() => {
    setTempType('all');
    setTempVip('all');
    setTempGovernorate('all');
    setTempStatus('all');
    setTempNoCommDays('');
    setTempInactiveDays('');
  }, []);

  const activeFiltersCount = useMemo(
    () => [typeFilter, vipFilter, governorateFilter, statusFilter].filter(f => f !== 'all').length
      + (noCommDays ? 1 : 0) + (inactiveDays ? 1 : 0),
    [typeFilter, vipFilter, governorateFilter, statusFilter, noCommDays, inactiveDays]
  );

  return {
    searchQuery, setSearchQuery, debouncedSearch,
    typeFilter, setTypeFilter: (v: string) => updateFilter('type', v),
    vipFilter, setVipFilter: (v: string) => updateFilter('vip', v),
    governorateFilter, setGovernorateFilter: (v: string) => updateFilter('gov', v),
    statusFilter, setStatusFilter: (v: string) => updateFilter('status', v),
    clearFilter, clearAllFilters, activeFiltersCount,
    // Drawer
    filterDrawerOpen, setFilterDrawerOpen,
    tempType, setTempType, tempVip, setTempVip,
    tempGovernorate, setTempGovernorate, tempStatus, setTempStatus,
    openDrawerWithCurrentValues, applyDrawerFilters, resetDrawerFilters,
    // URL
    searchParams, setSearchParams,
  };
}
