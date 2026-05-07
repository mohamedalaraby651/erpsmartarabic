import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

const STORAGE_KEY = "lov_customers_filters_v1";

interface PersistedFilters {
  q?: string;
  type?: string;
  vip?: string;
  gov?: string;
  status?: string;
  cat?: string;
  noComm?: string;
  inactive?: string;
}

function loadPersisted(): PersistedFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedFilters) : {};
  } catch { return {}; }
}

function savePersisted(data: PersistedFilters) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { /* quota */ }
}

export function useCustomerFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydration: URL takes priority (for deep links/sharing); fall back to localStorage.
  const persistedRef = useRef<PersistedFilters>(loadPersisted());
  const initial = persistedRef.current;
  const urlHas = (k: string) => searchParams.has(k);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || initial.q || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || initial.type || "all");
  const [vipFilter, setVipFilter] = useState(searchParams.get('vip') || initial.vip || "all");
  const [governorateFilter, setGovernorateFilter] = useState(searchParams.get('gov') || initial.gov || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || initial.status || "all");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('cat') || initial.cat || "all");
  const [noCommDays, setNoCommDays] = useState(searchParams.get('noComm') || initial.noComm || "");
  const [inactiveDays, setInactiveDays] = useState(searchParams.get('inactive') || initial.inactive || "");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Temporary filter state for mobile drawer
  const [tempType, setTempType] = useState("all");
  const [tempVip, setTempVip] = useState("all");
  const [tempGovernorate, setTempGovernorate] = useState("all");
  const [tempStatus, setTempStatus] = useState("all");
  const [tempCategory, setTempCategory] = useState("all");
  const [tempNoCommDays, setTempNoCommDays] = useState("");
  const [tempInactiveDays, setTempInactiveDays] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 300);

  // On first mount, if URL is empty but we restored from localStorage, push values back to URL
  // so reload/back keeps a consistent address bar.
  useEffect(() => {
    const hasAnyUrl = ['q','type','vip','gov','status','cat','noComm','inactive'].some(urlHas);
    if (!hasAnyUrl) {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (vipFilter !== 'all') params.vip = vipFilter;
      if (governorateFilter !== 'all') params.gov = governorateFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.cat = categoryFilter;
      if (noCommDays) params.noComm = noCommDays;
      if (inactiveDays) params.inactive = inactiveDays;
      if (Object.keys(params).length > 0) {
        setSearchParams(params, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change to localStorage
  useEffect(() => {
    savePersisted({
      q: searchQuery || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      vip: vipFilter !== 'all' ? vipFilter : undefined,
      gov: governorateFilter !== 'all' ? governorateFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      cat: categoryFilter !== 'all' ? categoryFilter : undefined,
      noComm: noCommDays || undefined,
      inactive: inactiveDays || undefined,
    });
  }, [searchQuery, typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays]);

  // Sync filters to URL
  const syncToUrl = useCallback((overrides: Record<string, string> = {}) => {
    const params: Record<string, string> = {};
    const vals = {
      q: overrides.q ?? searchQuery,
      type: overrides.type ?? typeFilter,
      vip: overrides.vip ?? vipFilter,
      gov: overrides.gov ?? governorateFilter,
      status: overrides.status ?? statusFilter,
      cat: overrides.cat ?? categoryFilter,
      noComm: overrides.noComm ?? noCommDays,
      inactive: overrides.inactive ?? inactiveDays,
    };
    if (vals.q) params.q = vals.q;
    if (vals.type !== 'all') params.type = vals.type;
    if (vals.vip !== 'all') params.vip = vals.vip;
    if (vals.gov !== 'all') params.gov = vals.gov;
    if (vals.status !== 'all') params.status = vals.status;
    if (vals.cat !== 'all') params.cat = vals.cat;
    if (vals.noComm) params.noComm = vals.noComm;
    if (vals.inactive) params.inactive = vals.inactive;
    setSearchParams(params, { replace: true });
  }, [searchQuery, typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays, setSearchParams]);

  const updateFilter = useCallback((key: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      type: setTypeFilter, vip: setVipFilter, gov: setGovernorateFilter, status: setStatusFilter,
      cat: setCategoryFilter, noComm: setNoCommDays, inactive: setInactiveDays,
    };
    setters[key]?.(value);
    syncToUrl({ [key]: value });
  }, [syncToUrl]);

  const clearFilter = useCallback((key: string) => {
    updateFilter(key, 'all');
  }, [updateFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setVipFilter('all');
    setGovernorateFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setNoCommDays('');
    setInactiveDays('');
    setSearchParams({}, { replace: true });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, [setSearchParams]);

  const openDrawerWithCurrentValues = useCallback(() => {
    setTempType(typeFilter);
    setTempVip(vipFilter);
    setTempGovernorate(governorateFilter);
    setTempStatus(statusFilter);
    setTempCategory(categoryFilter);
    setTempNoCommDays(noCommDays);
    setTempInactiveDays(inactiveDays);
    setFilterDrawerOpen(true);
  }, [typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays]);

  // Fixed: now syncs to URL after applying drawer filters
  const applyDrawerFilters = useCallback(() => {
    setTypeFilter(tempType);
    setVipFilter(tempVip);
    setGovernorateFilter(tempGovernorate);
    setStatusFilter(tempStatus);
    setCategoryFilter(tempCategory);
    setNoCommDays(tempNoCommDays);
    setInactiveDays(tempInactiveDays);
    syncToUrl({ type: tempType, vip: tempVip, gov: tempGovernorate, status: tempStatus, cat: tempCategory, noComm: tempNoCommDays, inactive: tempInactiveDays });
  }, [tempType, tempVip, tempGovernorate, tempStatus, tempCategory, tempNoCommDays, tempInactiveDays, syncToUrl]);

  const resetDrawerFilters = useCallback(() => {
    setTempType('all');
    setTempVip('all');
    setTempGovernorate('all');
    setTempStatus('all');
    setTempCategory('all');
    setTempNoCommDays('');
    setTempInactiveDays('');
  }, []);

  const activeFiltersCount = useMemo(
    () => [typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter].filter(f => f !== 'all').length
      + (noCommDays ? 1 : 0) + (inactiveDays ? 1 : 0),
    [typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays]
  );

  return {
    searchQuery, setSearchQuery: (v: string) => { setSearchQuery(v); syncToUrl({ q: v }); },
    debouncedSearch,
    typeFilter, setTypeFilter: (v: string) => updateFilter('type', v),
    vipFilter, setVipFilter: (v: string) => updateFilter('vip', v),
    governorateFilter, setGovernorateFilter: (v: string) => updateFilter('gov', v),
    statusFilter, setStatusFilter: (v: string) => updateFilter('status', v),
    categoryFilter, setCategoryFilter: (v: string) => updateFilter('cat', v),
    noCommDays, setNoCommDays: (v: string) => updateFilter('noComm', v),
    inactiveDays, setInactiveDays: (v: string) => updateFilter('inactive', v),
    clearFilter, clearAllFilters, activeFiltersCount,
    // Drawer
    filterDrawerOpen, setFilterDrawerOpen,
    tempType, setTempType, tempVip, setTempVip,
    tempGovernorate, setTempGovernorate, tempStatus, setTempStatus,
    tempCategory, setTempCategory,
    tempNoCommDays, setTempNoCommDays, tempInactiveDays, setTempInactiveDays,
    openDrawerWithCurrentValues, applyDrawerFilters, resetDrawerFilters,
    // URL
    searchParams, setSearchParams,
  };
}
