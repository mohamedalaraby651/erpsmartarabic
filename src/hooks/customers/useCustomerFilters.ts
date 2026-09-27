import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnFilters } from '@/hooks/useColumnFilters';
import type { ColumnFilter, ColumnFilters } from '@/components/ui/column-filter';
import {
  URL_KEYS, decodeColumnFiltersParam, encodeColumnFiltersParam, normalizeCustomerWorkspaceState,
  type CustomerWorkspaceStateV1,
} from '@/lib/customers/workspaceState';

/** Legacy query keys owned by this hook (sort/view are owned by the page). */
const OWNED_KEYS = ['q', 'type', 'vip', 'gov', 'status', 'cat', 'noComm', 'inactive'] as const;

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
  cf?: ColumnFilters;
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
  // B0: every external payload passes the workspace contract before use.
  const initial = useMemo(() => {
    const hasUrl = OWNED_KEYS.some((k) => searchParams.has(k)) || searchParams.has(URL_KEYS.columnFilters);
    const src = hasUrl
      ? { ...Object.fromEntries(searchParams.entries()), columnFilters: decodeColumnFiltersParam(searchParams.get(URL_KEYS.columnFilters)) }
      : { ...persistedRef.current, columnFilters: persistedRef.current.cf };
    const s = normalizeCustomerWorkspaceState(src);
    return {
      q: s.search, type: s.filters.type, vip: s.filters.vip, gov: s.filters.governorate, status: s.filters.status,
      cat: s.filters.category, noComm: s.filters.noCommDays, inactive: s.filters.inactiveDays, cf: s.columnFilters,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const urlHas = (k: string) => searchParams.has(k);

  const [searchQuery, setSearchQuery] = useState(initial.q);
  const [typeFilter, setTypeFilter] = useState(initial.type);
  const [vipFilter, setVipFilter] = useState(initial.vip);
  const [governorateFilter, setGovernorateFilter] = useState(initial.gov);
  const [statusFilter, setStatusFilter] = useState(initial.status);
  const [categoryFilter, setCategoryFilter] = useState(initial.cat);
  const [noCommDays, setNoCommDays] = useState(initial.noComm);
  const [inactiveDays, setInactiveDays] = useState(initial.inactive);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const columnFilters = useColumnFilters(initial.cf);
  const {
    filters: activeColumnFilters,
    setFilter: setActiveColumnFilter,
    removeFilter: removeActiveColumnFilter,
    clearFilters: clearActiveColumnFilters,
    replaceFilters: replaceActiveColumnFilters,
    activeCount: activeColumnFilterCount,
  } = columnFilters;

  // Temporary filter state for mobile drawer
  const [tempType, setTempType] = useState("all");
  const [tempVip, setTempVip] = useState("all");
  const [tempGovernorate, setTempGovernorate] = useState("all");
  const [tempStatus, setTempStatus] = useState("all");
  const [tempCategory, setTempCategory] = useState("all");
  const [tempNoCommDays, setTempNoCommDays] = useState("");
  const [tempInactiveDays, setTempInactiveDays] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 300);

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
      cf: Object.keys(activeColumnFilters).length ? activeColumnFilters : undefined,
    });
  }, [searchQuery, typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays, activeColumnFilters]);

  // Column filters are part of the shareable URL (validated, size-capped).
  useEffect(() => {
    const encoded = encodeColumnFiltersParam(activeColumnFilters);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (encoded) next.set(URL_KEYS.columnFilters, encoded); else next.delete(URL_KEYS.columnFilters);
      return next.toString() === prev.toString() ? prev : next;
    }, { replace: true });
  }, [activeColumnFilters, setSearchParams]);

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
    // Merge: keep sort/view/cf and any non-customer params intact.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      OWNED_KEYS.forEach((k) => next.delete(k));
      Object.entries(params).forEach(([k, v]) => next.set(k, v));
      return next.toString() === prev.toString() ? prev : next;
    }, { replace: true });
  }, [searchQuery, typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays, setSearchParams]);

  // Keep typing responsive: the URL follows the same settled value used by the query.
  useEffect(() => {
    syncToUrl({ q: debouncedSearch });
    // Search is the only value intentionally delayed here; other filters sync immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateFilter = useCallback((key: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      type: setTypeFilter, vip: setVipFilter, gov: setGovernorateFilter, status: setStatusFilter,
      cat: setCategoryFilter, noComm: setNoCommDays, inactive: setInactiveDays,
    };
    const columnKeyByLegacyKey: Record<string, string> = {
      type: 'type', vip: 'vip', gov: 'governorate', status: 'status',
    };
    const columnKey = columnKeyByLegacyKey[key];
    if (columnKey) removeActiveColumnFilter(columnKey);
    setters[key]?.(value);
    syncToUrl({ [key]: value });
  }, [removeActiveColumnFilter, syncToUrl]);

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      [...OWNED_KEYS, URL_KEYS.columnFilters, URL_KEYS.view].forEach((k) => next.delete(k));
      return next;
    }, { replace: true });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    clearActiveColumnFilters();
  }, [clearActiveColumnFilters, setSearchParams]);

  const setColumnFilter = useCallback((key: string, filter: ColumnFilter | undefined) => {
    if (key === 'type') setTypeFilter('all');
    if (key === 'vip') setVipFilter('all');
    if (key === 'governorate') setGovernorateFilter('all');
    if (key === 'status') setStatusFilter('all');
    setActiveColumnFilter(key, filter);
    if (['type', 'vip', 'governorate', 'status'].includes(key)) {
      syncToUrl({
        ...(key === 'type' ? { type: 'all' } : {}),
        ...(key === 'vip' ? { vip: 'all' } : {}),
        ...(key === 'governorate' ? { gov: 'all' } : {}),
        ...(key === 'status' ? { status: 'all' } : {}),
      });
    }
  }, [setActiveColumnFilter, syncToUrl]);

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

  /** B1 — apply a whole validated workspace state (saved view / preset) at once. */
  const applyState = useCallback((raw: CustomerWorkspaceStateV1) => {
    const s = normalizeCustomerWorkspaceState(raw);
    setSearchQuery(s.search);
    setTypeFilter(s.filters.type);
    setVipFilter(s.filters.vip);
    setGovernorateFilter(s.filters.governorate);
    setStatusFilter(s.filters.status);
    setCategoryFilter(s.filters.category);
    setNoCommDays(s.filters.noCommDays);
    setInactiveDays(s.filters.inactiveDays);
    replaceActiveColumnFilters(s.columnFilters);
    syncToUrl({
      q: s.search, type: s.filters.type, vip: s.filters.vip, gov: s.filters.governorate, status: s.filters.status,
      cat: s.filters.category, noComm: s.filters.noCommDays, inactive: s.filters.inactiveDays,
    });
  }, [replaceActiveColumnFilters, syncToUrl]);

  const activeFiltersCount = useMemo(
    () => [typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter].filter(f => f !== 'all').length
      + (noCommDays ? 1 : 0) + (inactiveDays ? 1 : 0),
    [typeFilter, vipFilter, governorateFilter, statusFilter, categoryFilter, noCommDays, inactiveDays]
  );

  return {
    searchQuery, setSearchQuery,
    debouncedSearch,
    typeFilter, setTypeFilter: (v: string) => updateFilter('type', v),
    vipFilter, setVipFilter: (v: string) => updateFilter('vip', v),
    governorateFilter, setGovernorateFilter: (v: string) => updateFilter('gov', v),
    statusFilter, setStatusFilter: (v: string) => updateFilter('status', v),
    categoryFilter, setCategoryFilter: (v: string) => updateFilter('cat', v),
    noCommDays, setNoCommDays: (v: string) => updateFilter('noComm', v),
    inactiveDays, setInactiveDays: (v: string) => updateFilter('inactive', v),
    clearFilter, clearAllFilters, applyState,
    /** Query-relevant snapshot (uses the settled search) for saved views / dirty checks. */
    snapshot: {
      search: debouncedSearch,
      filters: {
        type: typeFilter, vip: vipFilter, governorate: governorateFilter, status: statusFilter,
        category: categoryFilter, noCommDays, inactiveDays,
      },
      columnFilters: activeColumnFilters,
    },
    activeFiltersCount: activeFiltersCount + activeColumnFilterCount,
    columnFilters: {
      filters: activeColumnFilters,
      setFilter: setColumnFilter,
      removeFilter: removeActiveColumnFilter,
      clearFilters: clearActiveColumnFilters,
      replaceFilters: replaceActiveColumnFilters,
      activeCount: activeColumnFilterCount,
    },
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
