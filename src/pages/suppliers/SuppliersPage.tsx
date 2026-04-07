import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";
import { TableSkeleton } from "@/components/ui/table-skeleton";

import { SupplierPageHeader } from "@/components/suppliers/list/SupplierPageHeader";
import { SupplierStatsBar } from "@/components/suppliers/list/SupplierStatsBar";
import { SupplierListRow } from "@/components/suppliers/list/SupplierListRow";
import { SupplierMobileView } from "@/components/suppliers/list/SupplierMobileView";
import SupplierSavedViews from "@/components/suppliers/list/SupplierSavedViews";
import { SupplierFiltersBar } from "@/components/suppliers/filters/SupplierFiltersBar";
import { SupplierFilterDrawer } from "@/components/suppliers/filters/SupplierFilterDrawer";

import { useSupplierList, useSupplierFilters, useSupplierMutations, storeSupplierNavIds } from "@/hooks/suppliers";
import { useBulkSelection } from "@/hooks/customers";
import { useTableSort } from "@/hooks/useTableSort";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const PAGE_SIZE = 25;

const SuppliersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  const { sortConfig, requestSort } = useTableSort([]);

  const filters = useSupplierFilters();
  const {
    searchQuery, setSearchQuery, debouncedSearch,
    governorateFilter, setGovernorateFilter,
    categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    searchParams, setSearchParams,
  } = filters;

  const [currentPage, setCurrentPage] = useState(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [tempGov, setTempGov] = useState('all');
  const [tempCat, setTempCat] = useState('all');
  const [tempStatus, setTempStatus] = useState('all');
  const [statsChipFilter, setStatsChipFilter] = useState<string | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, governorateFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Stats chip filter → real filter mapping
  useEffect(() => {
    if (!statsChipFilter) {
      // Only reset if it was previously set by chip
      return;
    }
    if (['active', 'inactive', 'debtors'].includes(statsChipFilter)) {
      setStatusFilter(statsChipFilter);
      setCategoryFilter('all');
    } else if (['raw_materials', 'services', 'equipment'].includes(statsChipFilter)) {
      setCategoryFilter(statsChipFilter);
      setStatusFilter('all');
    }
  }, [statsChipFilter, setStatusFilter, setCategoryFilter]);

  const handleStatsChipChange = useCallback((filterId: string | null) => {
    setStatsChipFilter(filterId);
    if (!filterId) {
      setStatusFilter('all');
      setCategoryFilter('all');
    }
  }, [setStatusFilter, setCategoryFilter]);

  const { suppliers, totalCount, isLoading, refetch, filterKey } = useSupplierList({
    debouncedSearch,
    governorateFilter,
    categoryFilter,
    statusFilter,
    currentPage,
    pageSize: PAGE_SIZE,
    sortConfig,
  });

  const { deleteMutation, bulkDeleteMutation, bulkStatusMutation } = useSupplierMutations({
    filterKey, currentPage, sortConfig,
  });

  const bulk = useBulkSelection(suppliers);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleAdd = useCallback(() => {
    navigate('/suppliers?action=new');
  }, [navigate]);

  const handleEdit = useCallback((supplier: Supplier) => {
    // Will be handled by dialog manager in future
    navigate(`/suppliers/${supplier.id}`);
  }, [navigate]);

  const handleDelete = useCallback((id: string) => { deleteMutation.mutate(id); }, [deleteMutation]);
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const handleRowClick = useCallback((supplier: Supplier) => {
    storeSupplierNavIds(suppliers.map(s => s.id));
    navigate(`/suppliers/${supplier.id}`);
  }, [navigate, suppliers]);

  const handleBulkDelete = useCallback(() => {
    bulkDeleteMutation.mutate(Array.from(bulk.selectedIds), {
      onSuccess: () => bulk.clearSelection(),
    });
  }, [bulkDeleteMutation, bulk]);

  const handleBulkStatus = useCallback((isActive: boolean) => {
    bulkStatusMutation.mutate({ ids: Array.from(bulk.selectedIds), isActive }, {
      onSuccess: () => bulk.clearSelection(),
    });
  }, [bulkStatusMutation, bulk]);

  const handleApplyView = useCallback((viewFilters: Record<string, string>) => {
    if (viewFilters.gov) setGovernorateFilter(viewFilters.gov);
    if (viewFilters.cat) setCategoryFilter(viewFilters.cat);
    if (viewFilters.status) setStatusFilter(viewFilters.status);
  }, [setGovernorateFilter, setCategoryFilter, setStatusFilter]);

  const currentFilters = useMemo(() => ({
    gov: governorateFilter, cat: categoryFilter, status: statusFilter,
  }), [governorateFilter, categoryFilter, statusFilter]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (governorateFilter !== 'all') c++;
    if (categoryFilter !== 'all') c++;
    if (statusFilter !== 'all') c++;
    return c;
  }, [governorateFilter, categoryFilter, statusFilter]);

  // Stats for chips
  const stats = useMemo(() => ({
    total: totalCount,
    active: suppliers.filter(s => s.is_active).length,
    inactive: suppliers.filter(s => !s.is_active).length,
    debtors: suppliers.filter(s => (s.current_balance || 0) > 0).length,
    rawMaterials: suppliers.filter(s => s.category === 'raw_materials').length,
    services: suppliers.filter(s => s.category === 'services').length,
    equipment: suppliers.filter(s => s.category === 'equipment').length,
  }), [suppliers, totalCount]);

  const handleClearFilter = useCallback((key: string) => {
    if (key === 'gov') setGovernorateFilter('all');
    if (key === 'cat') setCategoryFilter('all');
    if (key === 'status') setStatusFilter('all');
  }, [setGovernorateFilter, setCategoryFilter, setStatusFilter]);

  const handleClearAllFilters = useCallback(() => {
    setGovernorateFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setStatsChipFilter(null);
  }, [setGovernorateFilter, setCategoryFilter, setStatusFilter]);

  const handleFilterDrawerApply = useCallback(() => {
    setGovernorateFilter(tempGov);
    setCategoryFilter(tempCat);
    setStatusFilter(tempStatus);
    setFilterDrawerOpen(false);
  }, [tempGov, tempCat, tempStatus, setGovernorateFilter, setCategoryFilter, setStatusFilter]);

  const handleFilterDrawerReset = useCallback(() => {
    setTempGov('all');
    setTempCat('all');
    setTempStatus('all');
  }, []);

  const handleOpenDrawer = useCallback(() => {
    setTempGov(governorateFilter);
    setTempCat(categoryFilter);
    setTempStatus(statusFilter);
    setFilterDrawerOpen(true);
  }, [governorateFilter, categoryFilter, statusFilter]);

  return (
    <PageWrapper title="إدارة الموردين">
      <div className="space-y-4">
        <SupplierPageHeader
          isMobile={isMobile}
          canEdit={canEdit}
          onAdd={handleAdd}
          onImport={() => {}}
          totalCount={totalCount}
          searchQuery={isMobile ? searchQuery : undefined}
          onSearchChange={isMobile ? setSearchQuery : undefined}
        />

        <SupplierStatsBar
          stats={stats}
          isMobile={isMobile}
          activeFilter={statsChipFilter || undefined}
          onFilterChange={handleStatsChipChange}
        />

        {isMobile ? (
          <>
            <SupplierFiltersBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              governorateFilter={governorateFilter}
              onGovernorateChange={setGovernorateFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              activeFiltersCount={activeFiltersCount}
              isMobile={true}
              onOpenDrawer={handleOpenDrawer}
              onClearFilter={handleClearFilter}
              onClearAll={handleClearAllFilters}
            />
            <SupplierMobileView
              suppliers={suppliers}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? (id) => handleDelete(id) : undefined}
              onAdd={handleAdd}
              onRefresh={handleRefresh}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </>
        ) : (
          <>
            <SupplierFiltersBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              governorateFilter={governorateFilter}
              onGovernorateChange={setGovernorateFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              activeFiltersCount={activeFiltersCount}
              isMobile={false}
              onOpenDrawer={handleOpenDrawer}
              onClearFilter={handleClearFilter}
              onClearAll={handleClearAllFilters}
            />

            <SupplierSavedViews onApply={handleApplyView} currentFilters={currentFilters} />

            {/* Bulk Action Bar */}
            {bulk.hasSelection && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium">تم تحديد {bulk.selectedIds.size} مورد</span>
                  <div className="flex gap-2">
                    {canEdit && <Button size="sm" variant="outline" onClick={() => handleBulkStatus(true)}>تفعيل</Button>}
                    {canEdit && <Button size="sm" variant="outline" onClick={() => handleBulkStatus(false)}>إلغاء تفعيل</Button>}
                    {canDelete && <Button size="sm" variant="destructive" onClick={handleBulkDelete}>حذف المحدد</Button>}
                    <Button size="sm" variant="ghost" onClick={bulk.clearSelection}>إلغاء التحديد</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>قائمة الموردين ({totalCount})</CardTitle>
                <ExportWithTemplateButton section="suppliers" sectionLabel="الموردين" data={suppliers} columns={[
                  { key: 'name', label: 'اسم المورد' }, { key: 'contact_person', label: 'جهة الاتصال' },
                  { key: 'phone', label: 'الهاتف' }, { key: 'governorate', label: 'المحافظة' },
                  { key: 'current_balance', label: 'الرصيد' }, { key: 'is_active', label: 'الحالة' },
                ]} />
              </CardHeader>
              <CardContent>
                {isLoading ? <TableSkeleton rows={5} columns={8} /> : (
                  <div className="space-y-0.5">
                    {/* Header row with select all */}
                    <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b">
                      <Checkbox checked={bulk.isAllSelected} onCheckedChange={(checked) => bulk.toggleSelectAll(!!checked)} className="shrink-0" />
                      <span className="flex-1">المورد</span>
                      <span className="hidden lg:block w-24">الهاتف</span>
                      <span className="hidden xl:block w-24">المحافظة</span>
                      <span className="w-24 text-left">الرصيد</span>
                      <span className="w-20"></span>
                    </div>
                    {suppliers.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">لا يوجد موردين</div>
                    ) : (
                      suppliers.map(supplier => (
                        <SupplierListRow
                          key={supplier.id}
                          supplier={supplier}
                          onNavigate={(id) => handleRowClick(supplier)}
                          onEdit={canEdit ? handleEdit : undefined}
                          onNewOrder={(id) => navigate('/purchase-orders', { state: { prefillSupplierId: id } })}
                          onNewPayment={(id) => navigate(`/suppliers/${id}?tab=payments`)}
                          isSelected={bulk.selectedIds.has(supplier.id)}
                          onToggleSelect={bulk.toggleSelect}
                        />
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <ServerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          hasNextPage={currentPage < totalPages}
          hasPrevPage={currentPage > 1}
        />

        <SupplierFilterDrawer
          open={filterDrawerOpen}
          onOpenChange={setFilterDrawerOpen}
          activeFiltersCount={activeFiltersCount}
          onApply={handleFilterDrawerApply}
          onReset={handleFilterDrawerReset}
          tempGovernorate={tempGov}
          setTempGovernorate={setTempGov}
          tempCategory={tempCat}
          setTempCategory={setTempCat}
          tempStatus={tempStatus}
          setTempStatus={setTempStatus}
        />
      </div>
    </PageWrapper>
  );
};

const SuppliersPageWithErrorBoundary = () => (
  <ChartErrorBoundary title="إدارة الموردين"><SuppliersPage /></ChartErrorBoundary>
);

export default SuppliersPageWithErrorBoundary;
