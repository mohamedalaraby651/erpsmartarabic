import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, LayoutList, AlertTriangle, Users, FileSpreadsheet, ArrowUpDown, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useCustomerFilters, useBulkSelection } from "@/hooks/customers";
import { useCustomerList } from "@/hooks/customers/useCustomerList";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import { useCustomerAlerts } from "@/hooks/useCustomerAlerts";
import { useMemo } from "react";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { exportCustomersToExcel } from "@/lib/services/customerService";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Customer } from "@/lib/customerConstants";

// Sub-components
import { CustomerTableView } from "@/components/customers/CustomerTableView";
import { CustomerMobileView } from "@/components/customers/CustomerMobileView";
import { CustomerGridView } from "@/components/customers/CustomerGridView";
import { CustomerStatsBar } from "@/components/customers/CustomerStatsBar";
import { CustomerFiltersBar } from "@/components/customers/CustomerFiltersBar";
import { CustomerGridSkeleton } from "@/components/customers/CustomerGridSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CustomerBulkActionsBar } from "@/components/customers/CustomerBulkActionsBar";
import { CustomerDialogManager, type DialogManagerHandle } from "@/components/customers/CustomerDialogManager";
import { CustomerPageHeader } from "@/components/customers/CustomerPageHeader";
import { CustomerFilterDrawer } from "@/components/customers/CustomerFilterDrawer";
import { CustomerEmptyState } from "@/components/customers/CustomerEmptyState";
import { egyptGovernorates } from "@/lib/egyptLocations";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { isMobile } = useResponsiveView();
  const { errorAlerts, warningAlerts, totalAlerts } = useCustomerAlerts();
  const dialogRef = useRef<DialogManagerHandle>(null);

  const filters = useCustomerFilters();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportAllLoading, setExportAllLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('customers-view-mode') as 'table' | 'grid') || 'table';
    }
    return 'table';
  });
  useEffect(() => { localStorage.setItem('customers-view-mode', viewMode); }, [viewMode]);

  useEffect(() => {
    const action = filters.searchParams.get('action');
    if (action === 'new' || action === 'create') {
      dialogRef.current?.openAdd();
      filters.setSearchParams({}, { replace: true });
    }
  }, [filters.searchParams, filters.setSearchParams]);

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const requestSort = useCallback((key: string) => {
    setSortConfig(current => {
      if (current.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        if (current.direction === 'desc') return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Mobile infinite scroll state
  const [mobilePages, setMobilePages] = useState<Customer[][]>([]);
  const [mobilePage, setMobilePage] = useState(1);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Quick filter from stats bar
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  // Apply quick filter to actual filters
  const resetAllQuickFilters = useCallback(() => {
    filters.setStatusFilter('all');
    filters.setVipFilter('all');
    filters.setTypeFilter('all');
  }, [filters]);

  const handleQuickFilter = useCallback((filterId: string | null) => {
    setQuickFilter(filterId);
    resetAllQuickFilters();
    if (filterId === 'active') {
      filters.setStatusFilter('active');
    } else if (filterId === 'inactive') {
      filters.setStatusFilter('inactive');
    } else if (filterId === 'vip') {
      filters.setVipFilter('non-regular');
    } else if (filterId === 'companies') {
      filters.setTypeFilter('company');
    } else if (filterId === 'individuals') {
      filters.setTypeFilter('individual');
    } else if (filterId === 'debtors') {
      filters.setStatusFilter('debtors');
    } else if (filterId === 'farms') {
      filters.setTypeFilter('farm');
    }
  }, [filters, resetAllQuickFilters]);

  const list = useCustomerList({
    debouncedSearch: filters.debouncedSearch,
    typeFilter: filters.typeFilter, vipFilter: filters.vipFilter,
    governorateFilter: filters.governorateFilter, statusFilter: filters.statusFilter,
    noCommDays: filters.noCommDays, inactiveDays: filters.inactiveDays,
    currentPage: isMobile ? mobilePage : currentPage, pageSize, sortConfig,
  });

  const mutations = useCustomerMutations({ filterKey: list.filterKey, currentPage: isMobile ? mobilePage : currentPage, sortConfig });

  const totalPages = Math.ceil(list.totalCount / pageSize);
  const hasNextPageDesktop = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  const mobileHasNextPage = mobilePage < totalPages;

  // Accumulate mobile pages
  useEffect(() => {
    if (isMobile && list.customers.length > 0) {
      setMobilePages(prev => {
        const updated = [...prev];
        updated[mobilePage - 1] = list.customers;
        return updated;
      });
      setIsFetchingNextPage(false);
    }
  }, [list.customers, mobilePage, isMobile]);

  const allMobileCustomers = isMobile ? mobilePages.flat() : list.customers;

  const handleLoadMore = useCallback(() => {
    if (mobileHasNextPage && !isFetchingNextPage) {
      setIsFetchingNextPage(true);
      setMobilePage(prev => prev + 1);
    }
  }, [mobileHasNextPage, isFetchingNextPage]);

  useEffect(() => {
    setCurrentPage(1);
    setMobilePage(1);
    setMobilePages([]);
  }, [filters.debouncedSearch, filters.typeFilter, filters.vipFilter, filters.governorateFilter, filters.statusFilter, filters.noCommDays, filters.inactiveDays]);

  const bulk = useBulkSelection(list.customers);

  const handleEdit = useCallback((customer: Customer) => { dialogRef.current?.openEdit(customer); }, []);
  const handleAdd = useCallback(() => { dialogRef.current?.openAdd(); }, []);
  const handleDeleteRequest = useCallback((id: string) => { dialogRef.current?.confirmDelete(id); }, []);
  const handleDeleteConfirm = useCallback((id: string) => {
    setDeletingId(id);
    mutations.deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
  }, [mutations.deleteMutation]);
  const handleNewInvoice = useCallback((customerId: string) => { navigate('/invoices', { state: { prefillCustomerId: customerId } }); }, [navigate]);
  const handleWhatsApp = useCallback((phone: string) => { window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); }, []);
  const handleRefresh = async () => { await list.refetch(); };
  const handleExportAll = useCallback(async () => {
    const hasPermission = await verifyPermissionOnServer('customers', 'view');
    if (!hasPermission) {
      const { toast: sonnerToast } = await import('sonner');
      sonnerToast.error('غير مصرح لك بتصدير بيانات العملاء');
      return;
    }
    setExportAllLoading(true);
    await exportCustomersToExcel();
    setExportAllLoading(false);
  }, []);
  const handleBulkDelete = useCallback(() => { mutations.bulkDeleteMutation.mutate(Array.from(bulk.selectedIds)); bulk.clearSelection(); }, [mutations.bulkDeleteMutation, bulk]);
  const handleBulkVipUpdate = useCallback((vipLevel: string) => { mutations.bulkVipMutation.mutate({ ids: Array.from(bulk.selectedIds), vipLevel }); bulk.clearSelection(); }, [mutations.bulkVipMutation, bulk]);
  const goToPage = useCallback((page: number) => { setCurrentPage(Math.max(1, Math.min(page, totalPages))); }, [totalPages]);

  const paginationBlock = list.totalCount > pageSize && (
    <div className="mt-4">
      <ServerPagination currentPage={currentPage} totalPages={totalPages} totalCount={list.totalCount} pageSize={pageSize} onPageChange={goToPage} hasNextPage={hasNextPageDesktop} hasPrevPage={hasPrevPage} />
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <CustomerPageHeader
        isMobile={isMobile} canEdit={canEdit} customers={list.customers}
        exportAllLoading={exportAllLoading} onAdd={handleAdd}
        onDuplicates={() => dialogRef.current?.openDuplicates()}
        onMerge={() => dialogRef.current?.openMerge()}
        onImport={() => dialogRef.current?.openImport()}
        onExportAll={handleExportAll}
      />

      {bulk.hasSelection && (
        <CustomerBulkActionsBar
          selectedCount={bulk.selectedIds.size} canDelete={canDelete}
          onVipChange={() => dialogRef.current?.openBulkVip()}
          onActivate={() => { mutations.bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive: true }); bulk.clearSelection(); }}
          onDeactivate={() => { mutations.bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive: false }); bulk.clearSelection(); }}
          onDelete={() => dialogRef.current?.openBulkDelete()}
          onClear={bulk.clearSelection}
        />
      )}

      <CustomerStatsBar stats={list.stats} isMobile={isMobile} activeFilter={quickFilter} onFilterChange={handleQuickFilter} />

      {totalAlerts > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-sm">تنبيهات ({totalAlerts})</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {errorAlerts.slice(0, 3).map((alert, i) => (<p key={`e-${i}`} className="text-xs text-destructive">⚠️ {alert.message}</p>))}
              {warningAlerts.slice(0, 3).map((alert, i) => (<p key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400">⏰ {alert.message}</p>))}
            </div>
          </CardContent>
        </Card>
      )}

      <CustomerFiltersBar
        searchQuery={filters.searchQuery} onSearchChange={filters.setSearchQuery}
        typeFilter={filters.typeFilter} onTypeChange={filters.setTypeFilter}
        vipFilter={filters.vipFilter} onVipChange={filters.setVipFilter}
        governorateFilter={filters.governorateFilter} onGovernorateChange={filters.setGovernorateFilter}
        statusFilter={filters.statusFilter} onStatusChange={filters.setStatusFilter}
        governorates={egyptGovernorates} activeFiltersCount={filters.activeFiltersCount}
        isMobile={isMobile} onOpenDrawer={filters.openDrawerWithCurrentValues}
        onClearFilter={filters.clearFilter} onClearAll={filters.clearAllFilters}
        noCommDays={filters.noCommDays} inactiveDays={filters.inactiveDays}
      />

      {isMobile ? (
        <div className="pb-20">
          <CustomerMobileView
            data={allMobileCustomers}
            isLoading={list.isLoading}
            canEdit={canEdit}
            canDelete={canDelete}
            onNavigate={(id) => navigate(`/customers/${id}`)}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onRefresh={handleRefresh}
            hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch}
            onClearFilters={filters.clearAllFilters}
            onAdd={canEdit ? handleAdd : undefined}
            onImport={() => dialogRef.current?.openImport()}
            onNewInvoice={handleNewInvoice}
            hasNextPage={mobileHasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            sortKey={sortConfig.key || 'created_at'}
            onSortChange={requestSort}
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة العملاء ({list.totalCount})</CardTitle>
              <div className="flex items-center gap-2">
                {viewMode === 'grid' && (
                  <Select value={sortConfig.key || 'created_at'} onValueChange={requestSort}>
                    <SelectTrigger className="w-40 h-8 text-xs"><ArrowUpDown className="h-3.5 w-3.5 ml-1" /><SelectValue placeholder="ترتيب حسب" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">تاريخ الإنشاء</SelectItem>
                      <SelectItem value="name">الاسم</SelectItem>
                      <SelectItem value="current_balance">الرصيد</SelectItem>
                      <SelectItem value="last_activity_at">آخر نشاط</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-1 border rounded-lg p-0.5">
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('table')} title="عرض جدول"><LayoutList className="h-4 w-4" /></Button>
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')} title="عرض بطاقات"><LayoutGrid className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              list.isLoading ? <CustomerGridSkeleton /> : (
                <CustomerGridView data={list.customers} isLoading={list.isLoading} canEdit={canEdit} canDelete={canDelete} onNavigate={(id) => navigate(`/customers/${id}`)} onNewInvoice={handleNewInvoice} onWhatsApp={handleWhatsApp} onEdit={handleEdit} onDelete={handleDeleteRequest} selectedIds={bulk.selectedIds} onToggleSelect={bulk.toggleSelect} onToggleSelectAll={bulk.toggleSelectAll} isAllSelected={bulk.isAllSelected} hasSelection={bulk.hasSelection} onAdd={canEdit ? handleAdd : undefined} deletingId={deletingId} onRowHover={list.handleRowHover} onRowLeave={list.handleRowLeave} hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch} onClearFilters={filters.clearAllFilters} />
              )
            ) : list.isLoading ? <TableSkeleton rows={5} columns={7} /> : list.customers.length === 0 ? (
              <CustomerEmptyState
                hasActiveFilters={filters.activeFiltersCount > 0 || !!filters.debouncedSearch}
                onClearFilters={filters.clearAllFilters}
                onAdd={canEdit ? handleAdd : undefined}
                onImport={() => dialogRef.current?.openImport()}
              />
            ) : (
              <CustomerTableView data={list.customers} sortConfig={sortConfig} onSort={requestSort} onNavigate={(id) => navigate(`/customers/${id}`)} onEdit={handleEdit} onDelete={handleDeleteRequest} onNewInvoice={handleNewInvoice} onWhatsApp={handleWhatsApp} onRowHover={list.handleRowHover} onRowLeave={list.handleRowLeave} canEdit={canEdit} canDelete={canDelete} deletingId={deletingId} selectedIds={bulk.selectedIds} onToggleSelect={bulk.toggleSelect} onToggleSelectAll={bulk.toggleSelectAll} isAllSelected={bulk.isAllSelected} />
            )}
            {paginationBlock}
          </CardContent>
        </Card>
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
        ref={dialogRef} onDeleteConfirm={handleDeleteConfirm} onBulkDelete={handleBulkDelete}
        onBulkVipUpdate={handleBulkVipUpdate} bulkSelectedCount={bulk.selectedIds.size}
      />
    </div>
  );
};

export default CustomersPage;
