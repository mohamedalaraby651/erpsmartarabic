import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Loader2, Trash2, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useNavigationState } from "@/hooks/useNavigationState";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useCustomerFilters } from "@/hooks/customers";
import { useCustomerList } from "@/hooks/customers/useCustomerList";
import { useInfiniteCustomers } from "@/hooks/customers/useInfiniteCustomers";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import { useBulkSelection } from "@/hooks/customers/useBulkSelection";
import { storeCustomerNavIds } from "@/hooks/customers/useCustomerNavigation";
import { useCustomerAlerts, type AlertType } from "@/hooks/useCustomerAlerts";
import { useAlertNotifier } from "@/hooks/useAlertNotifier";
import { useCustomerExport } from "@/hooks/customers/useCustomerExport";
import { PageWrapper } from "@/components/shared/PageWrapper";
import type { Customer } from "@/lib/customerConstants";
import { CustomerAlertsBanner } from "@/components/customers/alerts/CustomerAlertsBanner";
import { CustomerAlertsMobileTrigger } from "@/components/customers/alerts/CustomerAlertsMobileTrigger";

// Sub-components
import { CustomerMobileView } from "@/components/customers/list/CustomerMobileView";
import { CustomerStatsBar } from "@/components/customers/list/CustomerStatsBar";
import { CustomerFiltersBar } from "@/components/customers/filters/CustomerFiltersBar";
import { CustomerListSkeleton } from "@/components/customers/list/CustomerListSkeleton";
import { CustomerDialogManager, type DialogManagerHandle } from "@/components/customers/dialogs/CustomerDialogManager";
import { CustomerPageHeader } from "@/components/customers/list/CustomerPageHeader";
import { CustomerFilterDrawer } from "@/components/customers/filters/CustomerFilterDrawer";
import { CustomerEmptyState } from "@/components/customers/list/CustomerEmptyState";
import { CustomerErrorState } from "@/components/customers/list/CustomerErrorState";
import { CustomerQuickAddDialog } from "@/components/customers/dialogs/CustomerQuickAddDialog";
import { CustomerExportDialog } from "@/components/customers/dialogs/CustomerExportDialog";
import { CustomerSavedViews } from "@/components/customers/list/CustomerSavedViews";
import { CustomerColumnSettings, useVisibleColumns } from "@/components/customers/list/CustomerColumnSettings";
import { egyptGovernorates } from "@/lib/egyptLocations";
import { LiveRegion } from "@/components/shared/LiveRegion";
import { useCustomerLayoutPrefs } from "@/hooks/customers/useCustomerLayoutPrefs";
import { CustomerLayoutCustomizer } from "@/components/customers/list/CustomerLayoutCustomizer";
import { CollapsedSummaryBar } from "@/components/customers/list/CollapsedSummaryBar";
import { CustomerTable } from "@/components/customers/list/CustomerTable";
import { useListShortcuts } from "@/hooks/useListShortcuts";
import { ShortcutsHelp } from "@/components/shared/ShortcutsHelp";

/** Presentation-only shortcut reference for the customers workspace. */
const CUSTOMER_SHORTCUTS = [
  { keys: '/', description: 'الانتقال إلى البحث' },
  { keys: 'N', description: 'عميل جديد' },
  { keys: 'R', description: 'تحديث القائمة' },
  { keys: 'Esc', description: 'إغلاق النوافذ أو إلغاء التحديد' },
  { keys: '؟', description: 'عرض الاختصارات' },
];

const CustomersPage = () => {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const { isMobile } = useResponsiveView();
  const [alertFilterType, setAlertFilterType] = useState<AlertType | null>(null);
  const { alerts, alertsByType, totalAlerts, alertCountByCustomer, errorCustomerIds } = useCustomerAlerts();
  useAlertNotifier(alerts, user?.id);
  const dialogRef = useRef<DialogManagerHandle>(null);

  const filters = useCustomerFilters();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Column visibility
  const { visibleColumns, setVisibleColumns } = useVisibleColumns();

  // Layout preferences (show/hide sections above the list — persisted per device)
  const layout = useCustomerLayoutPrefs();

  useEffect(() => {
    const action = filters.searchParams.get('action');
    if (action === 'new' || action === 'create') {
      dialogRef.current?.openAdd();
      filters.setSearchParams({}, { replace: true });
    }
  }, [filters.searchParams, filters.setSearchParams]);

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  const [sortConfig, setSortConfig] = usePersistentState<{ key: string; direction: 'asc' | 'desc' | null }>('customers_sort', { key: '', direction: null });
  /** Sort picker: selecting a field always starts from ascending order. */
  const requestSort = useCallback((key: string) => {
    setSortConfig({ key, direction: 'asc' as const });
  }, [setSortConfig]);

  /** Column header: asc -> desc -> default. */
  const handleHeaderSort = useCallback((key: string) => {
    setSortConfig((() => {
      const current = sortConfig;
      if (current.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' as const };
        if (current.direction === 'desc') return { key: '', direction: null as null };
      }
      return { key, direction: 'asc' as const };
    })());
  }, [sortConfig, setSortConfig]);

  const [quickFilter, setQuickFilter] = usePersistentState<string | null>('customers_quick_filter', null);

  const resetAllQuickFilters = useCallback(() => {
    filters.setStatusFilter('all');
    filters.setVipFilter('all');
    filters.setTypeFilter('all');
  }, [filters]);

  const handleQuickFilter = useCallback((filterId: string | null) => {
    // Quick filters replace the manual status/VIP/type filters — make that visible
    // instead of resetting the user's own filters silently.
    const hadManualFilters =
      filters.statusFilter !== 'all' || filters.vipFilter !== 'all' || filters.typeFilter !== 'all';
    if (filterId && hadManualFilters) {
      toast.info('الفلتر السريع استبدل فلاتر الحالة والنوع وVIP اليدوية');
    }
    setQuickFilter(filterId);
    resetAllQuickFilters();
    if (filterId === 'active') filters.setStatusFilter('active');
    else if (filterId === 'inactive') filters.setStatusFilter('inactive');
    else if (filterId === 'vip') filters.setVipFilter('non-regular');
    else if (filterId === 'companies') filters.setTypeFilter('company');
    else if (filterId === 'individuals') filters.setTypeFilter('individual');
    else if (filterId === 'debtors') filters.setStatusFilter('debtors');
    else if (filterId === 'farms') filters.setTypeFilter('farm');
  }, [filters, resetAllQuickFilters]);

  const pageSize = isMobile ? 12 : 20;

  const {
    currentPage, allData: allCustomersRaw, hasNextPage, isFetchingNextPage,
    handleLoadMore, desktopSentinelRef, feedPage,
  } = useInfiniteCustomers({
    pageSize,
    isMobile,
    resetDeps: [filters.debouncedSearch, filters.typeFilter, filters.vipFilter, filters.governorateFilter, filters.statusFilter, filters.categoryFilter, filters.noCommDays, filters.inactiveDays, sortConfig.key, sortConfig.direction],
  });

  const list = useCustomerList({
    debouncedSearch: filters.debouncedSearch,
    typeFilter: filters.typeFilter, vipFilter: filters.vipFilter,
    governorateFilter: filters.governorateFilter, statusFilter: filters.statusFilter,
    categoryFilter: filters.categoryFilter,
    noCommDays: filters.noCommDays, inactiveDays: filters.inactiveDays,
    currentPage, pageSize, sortConfig,
  });

  // Feed page data into the infinite scroll accumulator
  useEffect(() => {
    feedPage(list.customers, list.totalCount);
  }, [list.customers, list.totalCount, feedPage]);

  // Filter by alert type when a badge is clicked
  const allCustomers = useMemo(() => {
    if (!alertFilterType) return allCustomersRaw;
    const typeAlerts = alertsByType.get(alertFilterType);
    if (!typeAlerts?.length) return allCustomersRaw;
    const ids = new Set(typeAlerts.map(a => a.customerId));
    return allCustomersRaw.filter(c => ids.has(c.id));
  }, [allCustomersRaw, alertFilterType, alertsByType]);

  const mutations = useCustomerMutations({ filterKey: list.filterKey, currentPage, sortConfig });

  // Bulk selection
  const bulk = useBulkSelection(allCustomers);

  // OPA-CUST-002: never carry a selection across a filter/search/sort change —
  // bulk actions must only ever target rows the user can currently see.
  const clearSelection = bulk.clearSelection;
  useEffect(() => {
    clearSelection();
  }, [
    clearSelection,
    filters.debouncedSearch, filters.typeFilter, filters.vipFilter,
    filters.governorateFilter, filters.statusFilter, filters.categoryFilter,
    filters.noCommDays, filters.inactiveDays,
    sortConfig.key, sortConfig.direction, alertFilterType,
  ]);

  const handleNavigateToCustomer = useCallback((customerId: string) => {
    storeCustomerNavIds(allCustomers.map(c => c.id));
    navigate(`/customers/${customerId}`);
  }, [allCustomers, navigate]);

  const handleEdit = useCallback((customer: Customer) => { dialogRef.current?.openEdit(customer); }, []);
  const handleAdd = useCallback(() => { setQuickAddOpen(true); }, []);
  const handleAddAdvanced = useCallback(() => { dialogRef.current?.openAdd(); }, []);
  const handleDeleteRequest = useCallback((id: string) => { dialogRef.current?.confirmDelete(id); }, []);
  const handleDeleteConfirm = useCallback((id: string) => {
    setDeletingId(id);
    mutations.deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
  }, [mutations.deleteMutation]);
  const handleNewInvoice = useCallback((customerId: string) => { navigate('/invoices', { state: { prefillCustomerId: customerId } }); }, [navigate]);
  const handleWhatsApp = useCallback((phone: string) => { window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); }, []);
  const handleNewPayment = useCallback((customerId: string) => { navigate('/payments', { state: { prefillCustomerId: customerId } }); }, [navigate]);
  const handleRefresh = async () => { await list.refetch(); };

  // Advanced export handler (extracted to hook)
  const { handleExport: handleAdvancedExport } = useCustomerExport({
    filters: {
      debouncedSearch: filters.debouncedSearch,
      typeFilter: filters.typeFilter,
      vipFilter: filters.vipFilter,
      governorateFilter: filters.governorateFilter,
      statusFilter: filters.statusFilter,
      noCommDays: filters.noCommDays ? Number(filters.noCommDays) : undefined,
      inactiveDays: filters.inactiveDays ? Number(filters.inactiveDays) : undefined,
    },
    sortConfig,
  });

  const filteredCount = list.totalCount;
  const totalStatsCount = list.stats.total;

  // Keyboard ownership (OPA-CUST-001 / C2) — presentation only.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const focusSearch = useCallback(() => {
    const input =
      document.querySelector<HTMLInputElement>('#customers-search-region input') ??
      document.querySelector<HTMLInputElement>('[data-customers-search] input');
    input?.focus();
    input?.select();
  }, []);
  const handleEscape = useCallback(() => {
    if (shortcutsOpen) { setShortcutsOpen(false); return; }
    if (filters.filterDrawerOpen) return; // the drawer closes itself first
    if (bulk.hasSelection) bulk.clearSelection();
  }, [shortcutsOpen, filters.filterDrawerOpen, bulk]);
  useListShortcuts({
    onFocusSearch: focusSearch,
    onNew: canEdit ? handleAdd : undefined,
    onRefresh: () => { void list.refetch(); },
    onEscape: handleEscape,
    onToggleHelp: () => setShortcutsOpen(o => !o),
  });

  // Announce sort + filter changes for screen readers
  const sortLabelMap: Record<string, string> = {
    created_at: 'تاريخ الإنشاء',
    name: 'الاسم',
    current_balance: 'الرصيد',
    last_activity_at: 'آخر نشاط',
  };
  const liveMessage = useMemo(() => {
    if (list.isLoading) return '';
    const parts: string[] = [];
    const sortLabel = sortLabelMap[sortConfig.key] || sortLabelMap.created_at;
    // Default (no explicit direction) resolves to descending in the data layer.
    const dirLabel = sortConfig.direction === 'asc' ? 'تصاعدي' : 'تنازلي';
    parts.push(`تم ترتيب القائمة حسب ${sortLabel} ${dirLabel}.`);
    if (filters.activeFiltersCount > 0 || filters.debouncedSearch) {
      parts.push(`تم تطبيق ${filters.activeFiltersCount} فلتر، النتائج: ${filteredCount} عميل.`);
    } else {
      parts.push(`عرض ${filteredCount} عميل.`);
    }
    return parts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig.key, sortConfig.direction, filters.activeFiltersCount, filters.debouncedSearch, filteredCount, list.isLoading]);

  return (
    <PageWrapper title="العملاء">
    <div className="space-y-4 md:space-y-5">
      <LiveRegion message={liveMessage} />
      <CustomerPageHeader
        isMobile={isMobile} canEdit={canEdit}
        exportAllLoading={false} onAdd={handleAdd}
        onDuplicates={() => dialogRef.current?.openDuplicates()}
        onMerge={() => dialogRef.current?.openMerge()}
        onImport={() => dialogRef.current?.openImport()}
        onExportAll={() => setExportDialogOpen(true)}
        totalCount={totalStatsCount}
        filteredCount={filteredCount !== totalStatsCount ? filteredCount : undefined}
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        mobileTitleSlot={isMobile && totalAlerts > 0 ? (
          <CustomerAlertsMobileTrigger
            alertsByType={alertsByType}
            totalAlerts={totalAlerts}
            onFilterByType={setAlertFilterType}
          />
        ) : undefined}
        layoutCustomizerSlot={
          <CustomerLayoutCustomizer
            layout={layout}
            isMobile={isMobile}
            trigger={
              isMobile ? (
                <button
                  type="button"
                  className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
                  aria-label="تخصيص العرض"
                  title="تخصيص ما يظهر فوق القائمة"
                >
                  {layout.prefs.compact ? <span className="text-[10px] font-bold">عرض</span> : <span className="text-[10px] font-bold">طي</span>}
                </button>
              ) : (
                <Button variant="outline" size="sm" aria-label="تخصيص العرض" title="تخصيص ما يظهر فوق القائمة">
                  {layout.prefs.compact ? "إظهار الأدوات" : "تخصيص العرض"}
                </Button>
              )
            }
          />
        }
      />

      {/* Compact mode: thin summary bar that lets the user re-open everything */}
      {layout.prefs.compact && (
        <CollapsedSummaryBar
          filteredCount={filteredCount}
          totalCount={totalStatsCount}
          hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch}
          sortLabel={({
            created_at: 'الأحدث',
            last_activity_at: 'آخر نشاط',
            current_balance: 'الأعلى مديونية',
            vip_level: 'VIP',
          } as Record<string, string>)[sortConfig.key || 'created_at']}
          onExpand={() => layout.setCompact(false)}
        />
      )}

      {(isMobile ? layout.isMobileVisible('stats') : layout.isDesktopVisible('stats')) && (
        <CustomerStatsBar stats={list.stats} isMobile={isMobile} activeFilter={quickFilter} onFilterChange={handleQuickFilter} />
      )}

      {/* Alert Banner - Desktop */}
      {!isMobile && layout.isDesktopVisible('alerts') && (
        <CustomerAlertsBanner
          alertsByType={alertsByType}
          totalAlerts={totalAlerts}
          onFilterByType={setAlertFilterType}
          activeFilterType={alertFilterType}
        />
      )}

      {(isMobile ? layout.isMobileVisible('filters') : layout.isDesktopVisible('filters')) && (
        <div id="customers-search-region" className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-2 -mx-1 px-1">
          <CustomerFiltersBar
            searchQuery={filters.searchQuery} onSearchChange={filters.setSearchQuery}
            typeFilter={filters.typeFilter} onTypeChange={(v) => { filters.setTypeFilter(v); setQuickFilter(null); }}
            vipFilter={filters.vipFilter} onVipChange={(v) => { filters.setVipFilter(v); setQuickFilter(null); }}
            governorateFilter={filters.governorateFilter} onGovernorateChange={(v) => { filters.setGovernorateFilter(v); setQuickFilter(null); }}
            statusFilter={filters.statusFilter} onStatusChange={(v) => { filters.setStatusFilter(v); setQuickFilter(null); }}
            categoryFilter={filters.categoryFilter} onCategoryChange={(v) => { filters.setCategoryFilter(v); setQuickFilter(null); }}
            governorates={egyptGovernorates} activeFiltersCount={filters.activeFiltersCount}
            isMobile={isMobile} onOpenDrawer={filters.openDrawerWithCurrentValues}
            onClearFilter={filters.clearFilter} onClearAll={filters.clearAllFilters}
            noCommDays={filters.noCommDays} inactiveDays={filters.inactiveDays}
          />
        </div>
      )}
      {/* Alert-type filter is applied to the pages already loaded (see STOP CONDITION). */}
      {alertFilterType && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            تصفية حسب نوع التنبيه — تُطبَّق على النتائج المحمّلة حاليًا
          </span>
          <Button
            variant="ghost" size="sm" className="h-8 text-xs"
            onClick={() => setAlertFilterType(null)}
          >
            <X className="h-3.5 w-3.5 ml-1" aria-hidden />
            إلغاء التصفية
          </Button>
        </div>
      )}

      {isMobile && list.isError && allCustomers.length === 0 && (
        <CustomerErrorState
          message={list.error?.message}
          onRetry={() => { void list.refetch(); }}
          isRetrying={list.isFetching}
        />
      )}

      {isMobile ? (
        <div className={list.isError && allCustomers.length === 0 ? "hidden" : "pb-fab-safe"}>
          <CustomerMobileView
            data={allCustomers}
            isLoading={list.isLoading}
            canEdit={canEdit}
            canDelete={canDelete}
            onNavigate={handleNavigateToCustomer}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onRefresh={handleRefresh}
            hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch}
            onClearFilters={filters.clearAllFilters}
            onAdd={canEdit ? handleAdd : undefined}
            onImport={() => dialogRef.current?.openImport()}
            onNewInvoice={handleNewInvoice}
            onNewPayment={handleNewPayment}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            sortKey={sortConfig.key || 'created_at'}
            onSortChange={(key) =>
              setSortConfig(
                sortConfig.key === key && sortConfig.direction === 'asc'
                  ? { key, direction: 'desc' }
                  : { key, direction: 'asc' },
              )
            }
            alertCountByCustomer={alertCountByCustomer}
            errorCustomerIds={errorCustomerIds}
            hasActiveSearch={!!filters.debouncedSearch}
            searchQuery={filters.debouncedSearch}
            activeQuickFilter={quickFilter}
            onQuickFilter={handleQuickFilter}
            selectedIds={bulk.selectedIds}
            onToggleSelect={bulk.toggleSelect}
            showSort={layout.isMobileVisible('sort')}
          />
          {/* FAB removed — global FABMenu (AppLayout) handles "عميل جديد" via pageContext='customers' */}
        </div>
      ) : (
        <div>
          {/* Toolbar: result count + saved views + column controls + sort */}
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {list.totalCount} عميل
              {allCustomers.length !== list.totalCount ? ` — معروض ${allCustomers.length}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="sm" className="h-9 text-xs"
                onClick={() => setShortcutsOpen(true)}
                aria-label="عرض اختصارات لوحة المفاتيح"
              >
                اختصارات
              </Button>
              <CustomerSavedViews
                currentFilters={{
                  type: filters.typeFilter,
                  vip: filters.vipFilter,
                  governorate: filters.governorateFilter,
                  status: filters.statusFilter,
                  noCommDays: filters.noCommDays,
                  inactiveDays: filters.inactiveDays,
                }}
                onApplyView={(viewFilters) => {
                  filters.setTypeFilter(viewFilters.type);
                  filters.setVipFilter(viewFilters.vip);
                  filters.setGovernorateFilter(viewFilters.governorate);
                  filters.setStatusFilter(viewFilters.status);
                  filters.setNoCommDays(viewFilters.noCommDays);
                  filters.setInactiveDays(viewFilters.inactiveDays);
                  setQuickFilter(null);
                }}
              />
              <CustomerColumnSettings visibleColumns={visibleColumns} onChange={setVisibleColumns} />
              <Select value={sortConfig.key || 'created_at'} onValueChange={requestSort}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5 me-1" />
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">تاريخ الإنشاء</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                  <SelectItem value="current_balance">الرصيد</SelectItem>
                  <SelectItem value="last_activity_at">آخر نشاط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {list.isError && allCustomers.length === 0 ? (
            <CustomerErrorState
              message={list.error?.message}
              onRetry={() => { void list.refetch(); }}
              isRetrying={list.isFetching}
            />
          ) : list.isLoading && allCustomers.length === 0 ? (
            <CustomerListSkeleton />
          ) : allCustomers.length === 0 ? (
            <CustomerEmptyState
              hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch}
              onClearFilters={filters.clearAllFilters}
              onAdd={canEdit ? handleAdd : undefined}
              onImport={() => dialogRef.current?.openImport()}
            />
          ) : (
            <div>
              <CustomerTable
                customers={allCustomers}
                visibleColumns={visibleColumns}
                searchQuery={filters.debouncedSearch}
                sortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={handleHeaderSort}
                selectedIds={bulk.selectedIds}
                onToggleSelect={(id, checked) => bulk.toggleSelect(id, checked)}
                isAllSelected={bulk.isAllSelected}
                onToggleSelectAll={(checked) => bulk.toggleSelectAll(checked)}
                onNavigate={handleNavigateToCustomer}
                onEdit={canEdit ? handleEdit : undefined}
                onNewInvoice={handleNewInvoice}
                onNewPayment={handleNewPayment}
                onWhatsApp={handleWhatsApp}
                onRowHover={list.handleRowHover}
                onRowLeave={list.handleRowLeave}
                alertCountByCustomer={alertCountByCustomer}
                errorCustomerIds={errorCustomerIds}
              />

              {/* Infinite scroll sentinel */}
              <div ref={desktopSentinelRef} className="h-10 flex items-center justify-center">
                {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>

              {!hasNextPage && allCustomers.length > 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  تم عرض جميع النتائج ({allCustomers.length})
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar — raised above mobile FAB */}
      {bulk.hasSelection && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-background border border-border shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
          role="toolbar"
          aria-label="إجراءات على العملاء المحددين"
        >
          <span className="text-sm font-medium tabular-nums whitespace-nowrap">
            {bulk.selectedIds.size} محدد من {allCustomers.length} معروض ({list.totalCount} نتيجة)
          </span>
          <Button size="sm" variant="destructive" onClick={() => dialogRef.current?.openBulkDelete()}>
            <Trash2 className="h-3.5 w-3.5 me-1" /> حذف
          </Button>
          <Button size="sm" variant="outline" onClick={() => dialogRef.current?.openBulkVip()}>
            <Crown className="h-3.5 w-3.5 me-1" /> VIP
          </Button>
          <Button size="sm" variant="ghost" onClick={bulk.clearSelection} aria-label="إلغاء التحديد">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Invariant: the bulk bar must never obscure a row or an action — reserve its space. */}
      {bulk.hasSelection && <div aria-hidden className="h-24" />}

      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} shortcuts={CUSTOMER_SHORTCUTS} />



      <CustomerFilterDrawer
        open={filters.filterDrawerOpen} onOpenChange={filters.setFilterDrawerOpen}
        activeFiltersCount={filters.activeFiltersCount}
        onApply={filters.applyDrawerFilters} onReset={filters.resetDrawerFilters}
        tempType={filters.tempType} setTempType={filters.setTempType}
        tempVip={filters.tempVip} setTempVip={filters.setTempVip}
        tempGovernorate={filters.tempGovernorate} setTempGovernorate={filters.setTempGovernorate}
        tempStatus={filters.tempStatus} setTempStatus={filters.setTempStatus}
        tempNoCommDays={filters.tempNoCommDays} setTempNoCommDays={filters.setTempNoCommDays}
        tempInactiveDays={filters.tempInactiveDays} setTempInactiveDays={filters.setTempInactiveDays}
      />

      <CustomerDialogManager
        ref={dialogRef} onDeleteConfirm={handleDeleteConfirm}
        onBulkDelete={() => { mutations.bulkDeleteMutation.mutate([...bulk.selectedIds], { onSuccess: () => bulk.clearSelection() }); }}
        onBulkVipUpdate={(vipLevel) => { mutations.bulkVipMutation.mutate({ ids: [...bulk.selectedIds], vipLevel }, { onSuccess: () => bulk.clearSelection() }); }}
        bulkSelectedCount={bulk.selectedIds.size}
      />
      <CustomerQuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onOpenAdvanced={handleAddAdvanced}
      />

      <CustomerExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleAdvancedExport}
        totalCount={list.stats.total}
        filteredCount={list.totalCount}
      />
    </div>
    </PageWrapper>
  );
};

import { CustomerErrorBoundary } from "@/components/customers/details/CustomerErrorBoundary";

function CustomersPageWrapped() {
  return (
    <CustomerErrorBoundary>
      <CustomersPage />
    </CustomerErrorBoundary>
  );
}

export default CustomersPageWrapped;
