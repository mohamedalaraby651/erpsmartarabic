import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Merge, LayoutGrid, LayoutList, AlertTriangle, Users, FileSpreadsheet, ScanSearch, Download, Loader2, ArrowUpDown } from "lucide-react";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useCustomerFilters, useBulkSelection } from "@/hooks/customers";
import { useCustomerList } from "@/hooks/customers/useCustomerList";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import { useCustomerAlerts } from "@/hooks/useCustomerAlerts";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { FilterDrawer, FilterSection } from "@/components/filters/FilterDrawer";
import { egyptGovernorates } from "@/lib/egyptLocations";
import { vipOptions } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import { exportCustomersToExcel } from "@/lib/services/customerService";

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

const CustomersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { isMobile } = useResponsiveView();
  const { errorAlerts, warningAlerts, totalAlerts } = useCustomerAlerts();
  const dialogRef = useRef<DialogManagerHandle>(null);

  // Filters (URL-persisted)
  const filters = useCustomerFilters();

  // Local UI state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportAllLoading, setExportAllLoading] = useState(false);

  // View mode (localStorage-persisted)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('customers-view-mode') as 'table' | 'grid') || 'table';
    }
    return 'table';
  });
  useEffect(() => { localStorage.setItem('customers-view-mode', viewMode); }, [viewMode]);

  // Handle URL action param
  useEffect(() => {
    const action = filters.searchParams.get('action');
    if (action === 'new' || action === 'create') {
      dialogRef.current?.openAdd();
      filters.setSearchParams({}, { replace: true });
    }
  }, [filters.searchParams, filters.setSearchParams]);

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  // Sorting
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Data queries (CQRS: Read side)
  const list = useCustomerList({
    debouncedSearch: filters.debouncedSearch,
    typeFilter: filters.typeFilter,
    vipFilter: filters.vipFilter,
    governorateFilter: filters.governorateFilter,
    statusFilter: filters.statusFilter,
    noCommDays: filters.noCommDays,
    inactiveDays: filters.inactiveDays,
    currentPage,
    pageSize,
    sortConfig,
  });

  // Mutations (CQRS: Write side)
  const mutations = useCustomerMutations({
    filterKey: list.filterKey,
    currentPage,
    sortConfig,
  });

  // Derived pagination
  const totalPages = Math.ceil(list.totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.debouncedSearch, filters.typeFilter, filters.vipFilter, filters.governorateFilter, filters.statusFilter, filters.noCommDays, filters.inactiveDays]);

  // Bulk selection
  const bulk = useBulkSelection(list.customers);

  // Handlers
  const handleEdit = useCallback((customer: Customer) => {
    dialogRef.current?.openEdit(customer);
  }, []);

  const handleAdd = useCallback(() => {
    dialogRef.current?.openAdd();
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    dialogRef.current?.confirmDelete(id);
  }, []);

  const handleDeleteConfirm = useCallback((id: string) => {
    setDeletingId(id);
    mutations.deleteMutation.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  }, [mutations.deleteMutation]);

  const handleNewInvoice = useCallback((customerId: string) => {
    navigate('/invoices', { state: { prefillCustomerId: customerId } });
  }, [navigate]);

  const handleWhatsApp = useCallback((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  }, []);

  const handleRefresh = async () => { await list.refetch(); };

  const handleExportAll = useCallback(async () => {
    setExportAllLoading(true);
    await exportCustomersToExcel();
    setExportAllLoading(false);
  }, []);

  const handleBulkDelete = useCallback(() => {
    mutations.bulkDeleteMutation.mutate(Array.from(bulk.selectedIds));
    bulk.clearSelection();
  }, [mutations.bulkDeleteMutation, bulk]);

  const handleBulkVipUpdate = useCallback((vipLevel: string) => {
    mutations.bulkVipMutation.mutate({ ids: Array.from(bulk.selectedIds), vipLevel });
    bulk.clearSelection();
  }, [mutations.bulkVipMutation, bulk]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">إدارة العملاء</h1>
          <p className="text-sm text-muted-foreground">إدارة بيانات العملاء والتصنيفات</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isMobile && (
            <>
              <Button variant="outline" size="sm" onClick={() => dialogRef.current?.openDuplicates()}>
                <ScanSearch className="h-4 w-4 ml-2" />كشف المكررين
              </Button>
              <Button variant="outline" size="sm" onClick={() => dialogRef.current?.openMerge()}>
                <Merge className="h-4 w-4 ml-2" />دمج
              </Button>
              <Button variant="outline" size="sm" onClick={() => dialogRef.current?.openImport()}>
                <Upload className="h-4 w-4 ml-2" />استيراد
              </Button>
              <ExportWithTemplateButton
                section="customers" sectionLabel="العملاء" data={list.customers}
                columns={[
                  { key: 'name', label: 'الاسم' }, { key: 'phone', label: 'الهاتف' },
                  { key: 'email', label: 'البريد الإلكتروني' }, { key: 'customer_type', label: 'النوع' },
                  { key: 'vip_level', label: 'مستوى VIP' }, { key: 'current_balance', label: 'الرصيد' },
                  { key: 'credit_limit', label: 'حد الائتمان' },
                ]}
              />
              <Button variant="outline" size="sm" disabled={exportAllLoading} onClick={handleExportAll}>
                {exportAllLoading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Download className="h-4 w-4 ml-2" />}
                تصدير الكل (Excel)
              </Button>
            </>
          )}
          {canEdit && (
            <Button onClick={handleAdd} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 ml-2" />إضافة عميل
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulk.hasSelection && (
        <CustomerBulkActionsBar
          selectedCount={bulk.selectedIds.size}
          canDelete={canDelete}
          onVipChange={() => dialogRef.current?.openBulkVip()}
          onActivate={() => {
            mutations.bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive: true });
            bulk.clearSelection();
          }}
          onDeactivate={() => {
            mutations.bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive: false });
            bulk.clearSelection();
          }}
          onDelete={() => dialogRef.current?.openBulkDelete()}
          onClear={bulk.clearSelection}
        />
      )}

      {/* Stats */}
      <CustomerStatsBar stats={list.stats} isMobile={isMobile} />

      {/* Alerts */}
      {totalAlerts > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-sm">تنبيهات ({totalAlerts})</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {errorAlerts.slice(0, 3).map((alert, i) => (
                <p key={`e-${i}`} className="text-xs text-destructive">⚠️ {alert.message}</p>
              ))}
              {warningAlerts.slice(0, 3).map((alert, i) => (
                <p key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400">⏰ {alert.message}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <CustomerFiltersBar
        searchQuery={filters.searchQuery} onSearchChange={filters.setSearchQuery}
        typeFilter={filters.typeFilter} onTypeChange={filters.setTypeFilter}
        vipFilter={filters.vipFilter} onVipChange={filters.setVipFilter}
        governorateFilter={filters.governorateFilter} onGovernorateChange={filters.setGovernorateFilter}
        statusFilter={filters.statusFilter} onStatusChange={filters.setStatusFilter}
        governorates={egyptGovernorates} activeFiltersCount={filters.activeFiltersCount}
        isMobile={isMobile} onOpenDrawer={filters.openDrawerWithCurrentValues}
        onClearFilter={filters.clearFilter} onClearAll={filters.clearAllFilters}
      />

      {/* Content */}
      {isMobile ? (
        <div className="pb-20">
          <CustomerMobileView
            data={list.customers}
            isLoading={list.isLoading}
            canEdit={canEdit} canDelete={canDelete}
            onNavigate={(id) => navigate(`/customers/${id}`)}
            onEdit={handleEdit} onDelete={handleDeleteRequest}
            onRefresh={handleRefresh}
          />
          {list.totalCount > pageSize && (
            <div className="mt-4">
              <ServerPagination
                currentPage={currentPage} totalPages={totalPages}
                totalCount={list.totalCount} pageSize={pageSize}
                onPageChange={goToPage} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage}
              />
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة العملاء ({list.totalCount})</CardTitle>
              <div className="flex items-center gap-2">
                {viewMode === 'grid' && (
                  <Select value={sortConfig.key || 'created_at'} onValueChange={(val) => requestSort(val)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
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
                )}
                <div className="flex items-center gap-1 border rounded-lg p-0.5">
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('table')} title="عرض جدول">
                    <LayoutList className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')} title="عرض بطاقات">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              list.isLoading ? (
                <CustomerGridSkeleton />
              ) : (
                <CustomerGridView
                  data={list.customers}
                  isLoading={list.isLoading}
                  canEdit={canEdit} canDelete={canDelete}
                  onNavigate={(id) => navigate(`/customers/${id}`)}
                  onNewInvoice={handleNewInvoice}
                  onWhatsApp={handleWhatsApp}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  selectedIds={bulk.selectedIds}
                  onToggleSelect={bulk.toggleSelect}
                  hasSelection={bulk.hasSelection}
                  onAdd={canEdit ? handleAdd : undefined}
                  deletingId={deletingId}
                  onRowHover={list.handleRowHover}
                  onRowLeave={list.handleRowLeave}
                />
              )
            ) : list.isLoading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : list.customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا يوجد عملاء</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                  ابدأ بإضافة عملائك لإدارة بياناتهم وتتبع معاملاتهم المالية
                </p>
                <div className="flex items-center justify-center gap-3">
                  {canEdit && (
                    <Button onClick={handleAdd}>
                      <Plus className="h-4 w-4 ml-2" />إضافة عميل جديد
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => dialogRef.current?.openImport()}>
                    <FileSpreadsheet className="h-4 w-4 ml-2" />استيراد من Excel
                  </Button>
                </div>
              </div>
            ) : (
              <CustomerTableView
                data={list.customers}
                sortConfig={sortConfig}
                onSort={requestSort}
                onNavigate={(id) => navigate(`/customers/${id}`)}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                onNewInvoice={handleNewInvoice}
                onWhatsApp={handleWhatsApp}
                onRowHover={list.handleRowHover}
                onRowLeave={list.handleRowLeave}
                canEdit={canEdit} canDelete={canDelete}
                deletingId={deletingId}
                selectedIds={bulk.selectedIds}
                onToggleSelect={bulk.toggleSelect}
                onToggleSelectAll={bulk.toggleSelectAll}
                isAllSelected={bulk.isAllSelected}
              />
            )}
            {list.totalCount > pageSize && (
              <div className="mt-4">
                <ServerPagination
                  currentPage={currentPage} totalPages={totalPages}
                  totalCount={list.totalCount} pageSize={pageSize}
                  onPageChange={goToPage} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        open={filters.filterDrawerOpen}
        onOpenChange={filters.setFilterDrawerOpen}
        title="فلاتر العملاء"
        activeFiltersCount={filters.activeFiltersCount}
        onApply={filters.applyDrawerFilters}
        onReset={filters.resetDrawerFilters}
      >
        <FilterSection title="نوع العميل">
          <Select value={filters.tempType} onValueChange={filters.setTempType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="individual">فرد</SelectItem>
              <SelectItem value="company">شركة</SelectItem>
              <SelectItem value="farm">مزرعة</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="مستوى VIP">
          <Select value={filters.tempVip} onValueChange={filters.setTempVip}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {vipOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="المحافظة">
          <Select value={filters.tempGovernorate} onValueChange={filters.setTempGovernorate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المحافظات</SelectItem>
              {egyptGovernorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="الحالة">
          <Select value={filters.tempStatus} onValueChange={filters.setTempStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="بدون تواصل منذ (أيام)">
          <Input
            type="number" min={0} placeholder="مثال: 30"
            value={filters.tempNoCommDays}
            onChange={(e) => filters.setTempNoCommDays(e.target.value)}
          />
        </FilterSection>
        <FilterSection title="بدون نشاط منذ (أيام)">
          <Input
            type="number" min={0} placeholder="مثال: 60"
            value={filters.tempInactiveDays}
            onChange={(e) => filters.setTempInactiveDays(e.target.value)}
          />
        </FilterSection>
      </FilterDrawer>

      {/* Dialog Manager — handles all dialogs */}
      <CustomerDialogManager
        ref={dialogRef}
        onDeleteConfirm={handleDeleteConfirm}
        onBulkDelete={handleBulkDelete}
        onBulkVipUpdate={handleBulkVipUpdate}
        bulkSelectedCount={bulk.selectedIds.size}
      />
    </div>
  );
};

export default CustomersPage;
