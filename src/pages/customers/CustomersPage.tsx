import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { CustomerListRow } from "@/components/customers/list/CustomerListRow";
import { CustomerMobileView } from "@/components/customers/list/CustomerMobileView";
import { CustomerStatsBar } from "@/components/customers/list/CustomerStatsBar";
import { CustomerFiltersBar } from "@/components/customers/filters/CustomerFiltersBar";
import { CustomerListSkeleton } from "@/components/customers/list/CustomerListSkeleton";
import { CustomerDialogManager, type DialogManagerHandle } from "@/components/customers/dialogs/CustomerDialogManager";
import { CustomerPageHeader } from "@/components/customers/list/CustomerPageHeader";
import { CustomerFilterDrawer } from "@/components/customers/filters/CustomerFilterDrawer";
import { CustomerEmptyState } from "@/components/customers/list/CustomerEmptyState";
import { CustomerQuickAddDialog } from "@/components/customers/dialogs/CustomerQuickAddDialog";
import { CustomerExportDialog } from "@/components/customers/dialogs/CustomerExportDialog";
import { CustomerSavedViews } from "@/components/customers/list/CustomerSavedViews";
import { CustomerColumnSettings, useVisibleColumns } from "@/components/customers/list/CustomerColumnSettings";
import { egyptGovernorates } from "@/lib/egyptLocations";
import { LiveRegion } from "@/components/shared/LiveRegion";
import { useCustomerLayoutPrefs } from "@/hooks/customers/useCustomerLayoutPrefs";
import { CustomerLayoutCustomizer } from "@/components/customers/list/CustomerLayoutCustomizer";
import { CollapsedSummaryBar } from "@/components/customers/list/CollapsedSummaryBar";

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
  const requestSort = useCallback((key: string) => {
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
    const dirLabel = sortConfig.direction === 'desc' ? 'تنازلي' : 'تصاعدي';
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
        searchQuery={isMobile ? filters.searchQuery : undefined}
        onSearchChange={isMobile ? filters.setSearchQuery : undefined}
        mobileTitleSlot={isMobile && totalAlerts > 0 ? (
          <CustomerAlertsMobileTrigger
            alertsByType={alertsByType}
            totalAlerts={totalAlerts}
            onFilterByType={setAlertFilterType}
          />
        ) : undefined}
      />

      <CustomerStatsBar stats={list.stats} isMobile={isMobile} activeFilter={quickFilter} onFilterChange={handleQuickFilter} />

      {/* Alert Banner - Desktop */}
      {!isMobile && (
        <CustomerAlertsBanner
          alertsByType={alertsByType}
          totalAlerts={totalAlerts}
          onFilterByType={setAlertFilterType}
          activeFilterType={alertFilterType}
        />
      )}

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

      {isMobile ? (
        <div className="pb-fab-safe">
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
            onSortChange={(key) => setSortConfig({ key, direction: 'asc' })}
            alertCountByCustomer={alertCountByCustomer}
            errorCustomerIds={errorCustomerIds}
            hasActiveSearch={!!filters.debouncedSearch}
            activeQuickFilter={quickFilter}
            onQuickFilter={handleQuickFilter}
            selectedIds={bulk.selectedIds}
            onToggleSelect={bulk.toggleSelect}
          />
          {/* FAB removed — global FABMenu (AppLayout) handles "عميل جديد" via pageContext='customers' */}
        </div>
      ) : (
        <div>
          {/* Toolbar: sort + saved views + column settings */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {allCustomers.length > 0 && (
                <Checkbox
                  checked={bulk.isAllSelected}
                  onCheckedChange={(checked) => bulk.toggleSelectAll(!!checked)}
                  aria-label="تحديد الكل"
                  className="h-4 w-4"
                />
              )}
              <span className="text-xs text-muted-foreground">{list.totalCount} عميل</span>
            </div>
            <div className="flex items-center gap-2">
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
              <CustomerColumnSettings onChange={setVisibleColumns} />
              <Select value={sortConfig.key || 'created_at'} onValueChange={requestSort}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
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

          {list.isLoading && allCustomers.length === 0 ? (
            <CustomerListSkeleton />
          ) : allCustomers.length === 0 ? (
            <CustomerEmptyState
              hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch}
              onClearFilters={filters.clearAllFilters}
              onAdd={canEdit ? handleAdd : undefined}
              onImport={() => dialogRef.current?.openImport()}
            />
          ) : (
            <div className="space-y-0.5">
              {allCustomers.map((customer) => (
                <CustomerListRow
                  key={customer.id}
                  customer={customer}
                  visibleColumns={visibleColumns}
                  onNavigate={handleNavigateToCustomer}
                  onEdit={canEdit ? handleEdit : undefined}
                  onNewInvoice={handleNewInvoice}
                  onNewPayment={handleNewPayment}
                  onWhatsApp={handleWhatsApp}
                  onRowHover={list.handleRowHover}
                  onRowLeave={list.handleRowLeave}
                  alertCount={alertCountByCustomer.get(customer.id)}
                  hasErrorAlert={errorCustomerIds.has(customer.id)}
                  isSelected={bulk.selectedIds.has(customer.id)}
                  onToggleSelect={bulk.toggleSelect}
                />
              ))}

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
          <span className="text-sm font-medium tabular-nums">{bulk.selectedIds.size} محدد</span>
          <Button size="sm" variant="destructive" onClick={() => dialogRef.current?.openBulkDelete()}>
            <Trash2 className="h-3.5 w-3.5 ml-1" /> حذف
          </Button>
          <Button size="sm" variant="outline" onClick={() => dialogRef.current?.openBulkVip()}>
            <Crown className="h-3.5 w-3.5 ml-1" /> VIP
          </Button>
          <Button size="sm" variant="ghost" onClick={bulk.clearSelection} aria-label="إلغاء التحديد">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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
