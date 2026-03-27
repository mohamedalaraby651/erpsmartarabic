import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Upload, Merge, LayoutGrid, LayoutList, Trash2, X, AlertTriangle, Star, Crown } from "lucide-react";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { useTableSort } from "@/hooks/useTableSort";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useCustomerFilters, useCustomerQueries, useBulkSelection } from "@/hooks/customers";
import { useCustomerAlerts } from "@/hooks/useCustomerAlerts";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import CustomerImportDialog from "@/components/customers/CustomerImportDialog";
import { FilterDrawer, FilterSection } from "@/components/filters/FilterDrawer";
import { egyptGovernorates } from "@/lib/egyptLocations";
import CustomerMergeDialog from "@/components/customers/CustomerMergeDialog";
import { vipOptions } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";

// Sub-components
import { CustomerTableView } from "@/components/customers/CustomerTableView";
import { CustomerMobileView } from "@/components/customers/CustomerMobileView";
import { CustomerGridView } from "@/components/customers/CustomerGridView";
import { CustomerStatsBar } from "@/components/customers/CustomerStatsBar";
import { CustomerFiltersBar } from "@/components/customers/CustomerFiltersBar";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { isMobile } = useResponsiveView();
  const { errorAlerts, warningAlerts, totalAlerts } = useCustomerAlerts();

  // Filters (URL-persisted)
  const filters = useCustomerFilters();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkVipOpen, setBulkVipOpen] = useState(false);
  const [bulkVipValue, setBulkVipValue] = useState('regular');

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
      setDialogOpen(true);
      filters.setSearchParams({}, { replace: true });
    }
  }, [filters.searchParams, filters.setSearchParams]);

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  // Sorting (now server-side via sortConfig passed to queries)
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
  const { data: countForPagination } = { data: 0 }; // placeholder, actual count from queries
  const pagination = useServerPagination({ pageSize: 25, totalCount: 0 });

  // Queries (server-side sort + filter)
  const queries = useCustomerQueries({
    debouncedSearch: filters.debouncedSearch,
    typeFilter: filters.typeFilter,
    vipFilter: filters.vipFilter,
    governorateFilter: filters.governorateFilter,
    statusFilter: filters.statusFilter,
    currentPage: pagination.currentPage,
    rangeFrom: pagination.range.from,
    rangeTo: pagination.range.to,
    sortConfig,
  });

  // Update pagination total count
  const paginationWithCount = useServerPagination({ pageSize: 25, totalCount: queries.totalCount });

  // Reset page on filter change
  useEffect(() => {
    paginationWithCount.resetPage();
  }, [filters.debouncedSearch, filters.typeFilter, filters.vipFilter, filters.governorateFilter, filters.statusFilter]);

  // Re-query with correct pagination
  const queriesWithPagination = useCustomerQueries({
    debouncedSearch: filters.debouncedSearch,
    typeFilter: filters.typeFilter,
    vipFilter: filters.vipFilter,
    governorateFilter: filters.governorateFilter,
    statusFilter: filters.statusFilter,
    currentPage: paginationWithCount.currentPage,
    rangeFrom: paginationWithCount.range.from,
    rangeTo: paginationWithCount.range.to,
    sortConfig,
  });

  // Bulk selection
  const bulk = useBulkSelection(queriesWithPagination.customers);

  // Handlers
  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    queriesWithPagination.deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
  }, [queriesWithPagination.deleteMutation]);

  const handleNewInvoice = useCallback((customerId: string) => {
    navigate('/invoices', { state: { prefillCustomerId: customerId } });
  }, [navigate]);

  const handleWhatsApp = useCallback((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  }, []);

  const handleRefresh = async () => { await queriesWithPagination.refetch(); };

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
              <Button variant="outline" size="sm" onClick={() => setMergeDialogOpen(true)}>
                <Merge className="h-4 w-4 ml-2" />دمج
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 ml-2" />استيراد
              </Button>
              <ExportWithTemplateButton
                section="customers" sectionLabel="العملاء" data={queriesWithPagination.customers}
                columns={[
                  { key: 'name', label: 'الاسم' }, { key: 'phone', label: 'الهاتف' },
                  { key: 'email', label: 'البريد الإلكتروني' }, { key: 'customer_type', label: 'النوع' },
                  { key: 'vip_level', label: 'مستوى VIP' }, { key: 'current_balance', label: 'الرصيد' },
                  { key: 'credit_limit', label: 'حد الائتمان' },
                ]}
              />
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
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium">تم تحديد {bulk.selectedIds.size} عميل</span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk VIP */}
              <Button variant="outline" size="sm" onClick={() => setBulkVipOpen(true)}>
                <Crown className="h-4 w-4 ml-1" />تغيير VIP
              </Button>
              {/* Bulk Status */}
              <Button variant="outline" size="sm" onClick={() => {
                queriesWithPagination.bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive: true });
                bulk.clearSelection();
              }}>
                <Star className="h-4 w-4 ml-1" />تفعيل
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                queriesWithPagination.bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive: false });
                bulk.clearSelection();
              }}>
                تعطيل
              </Button>
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 ml-1" />حذف المحدد
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={bulk.clearSelection}>
                <X className="h-4 w-4 ml-1" />إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <CustomerStatsBar stats={queriesWithPagination.stats} isMobile={isMobile} />

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
            data={queriesWithPagination.customers}
            isLoading={queriesWithPagination.isLoading}
            canEdit={canEdit} canDelete={canDelete}
            onNavigate={(id) => navigate(`/customers/${id}`)}
            onEdit={handleEdit} onDelete={handleDelete}
            onRefresh={handleRefresh}
          />
          {queriesWithPagination.totalCount > 25 && (
            <div className="mt-4">
              <ServerPagination
                currentPage={paginationWithCount.currentPage}
                totalPages={paginationWithCount.totalPages}
                totalCount={queriesWithPagination.totalCount}
                pageSize={paginationWithCount.pageSize}
                onPageChange={paginationWithCount.goToPage}
                hasNextPage={paginationWithCount.hasNextPage}
                hasPrevPage={paginationWithCount.hasPrevPage}
              />
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة العملاء ({queriesWithPagination.totalCount})</CardTitle>
              <div className="flex items-center gap-1 border rounded-lg p-0.5">
                <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('table')} title="عرض جدول">
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')} title="عرض بطاقات">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <CustomerGridView
                data={queriesWithPagination.customers}
                isLoading={queriesWithPagination.isLoading}
                canEdit={canEdit}
                onNavigate={(id) => navigate(`/customers/${id}`)}
                onNewInvoice={handleNewInvoice}
                onWhatsApp={handleWhatsApp}
                selectedIds={bulk.selectedIds}
                onToggleSelect={bulk.toggleSelect}
                hasSelection={bulk.hasSelection}
                onAdd={canEdit ? handleAdd : undefined}
              />
            ) : queriesWithPagination.isLoading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : queriesWithPagination.customers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا يوجد عملاء</div>
            ) : (
              <CustomerTableView
                data={queriesWithPagination.customers}
                sortConfig={sortConfig}
                onSort={requestSort}
                onNavigate={(id) => navigate(`/customers/${id}`)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onNewInvoice={handleNewInvoice}
                onWhatsApp={handleWhatsApp}
                onRowHover={queriesWithPagination.handleRowHover}
                onRowLeave={queriesWithPagination.handleRowLeave}
                canEdit={canEdit} canDelete={canDelete}
                deletingId={deletingId}
                selectedIds={bulk.selectedIds}
                onToggleSelect={bulk.toggleSelect}
                onToggleSelectAll={bulk.toggleSelectAll}
                isAllSelected={bulk.isAllSelected}
              />
            )}
            {queriesWithPagination.totalCount > 25 && (
              <div className="mt-4">
                <ServerPagination
                  currentPage={paginationWithCount.currentPage}
                  totalPages={paginationWithCount.totalPages}
                  totalCount={queriesWithPagination.totalCount}
                  pageSize={paginationWithCount.pageSize}
                  onPageChange={paginationWithCount.goToPage}
                  hasNextPage={paginationWithCount.hasNextPage}
                  hasPrevPage={paginationWithCount.hasPrevPage}
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
      </FilterDrawer>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {bulk.selectedIds.size} عميل</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف العملاء المحددين وجميع بياناتهم. هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                queriesWithPagination.bulkDeleteMutation.mutate(Array.from(bulk.selectedIds));
                bulk.clearSelection();
                setBulkDeleteOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف الكل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk VIP Dialog */}
      <AlertDialog open={bulkVipOpen} onOpenChange={setBulkVipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تغيير مستوى VIP لـ {bulk.selectedIds.size} عميل</AlertDialogTitle>
          </AlertDialogHeader>
          <Select value={bulkVipValue} onValueChange={setBulkVipValue}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {vipOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              queriesWithPagination.bulkVipMutation.mutate({ ids: Array.from(bulk.selectedIds), vipLevel: bulkVipValue });
              bulk.clearSelection();
              setBulkVipOpen(false);
            }}>
              تحديث
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} />
      <CustomerImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <CustomerMergeDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen} />
    </div>
  );
};

export default CustomersPage;
