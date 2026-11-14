import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { LoadMoreFooter } from "@/components/ui/data/LoadMoreFooter";
import { WorkspaceTable, type WorkspaceColumn } from "@/components/table/WorkspaceTable";
import { TableViewOptions } from "@/components/table/TableViewOptions";
import { useTableLayout } from "@/hooks/useTableLayout";
import { Amount } from "@/components/shared/amount/Amount";
import { Badge } from "@/components/ui/badge";
import { ListStateRenderer } from "@/components/shared/ListStateRenderer";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";

import { SupplierPageHeader } from "@/components/suppliers/list/SupplierPageHeader";
import { SupplierStatsBar } from "@/components/suppliers/list/SupplierStatsBar";
import { SupplierMobileView } from "@/components/suppliers/list/SupplierMobileView";
import SupplierSavedViews from "@/components/suppliers/list/SupplierSavedViews";
import { SupplierFiltersBar } from "@/components/suppliers/filters/SupplierFiltersBar";
import { SupplierFilterDrawer } from "@/components/suppliers/filters/SupplierFilterDrawer";
import { SupplierQuickAddDialog } from "@/components/suppliers/dialogs/SupplierQuickAddDialog";
import { SupplierExportDialog } from "@/components/suppliers/dialogs/SupplierExportDialog";
import SupplierImportDialog from "@/components/suppliers/SupplierImportDialog";
import { SupplierAlertsBannerList } from "@/components/suppliers/alerts/SupplierAlertsBannerList";

import { useSupplierList, useSupplierFilters, useSupplierMutations, useSupplierAlerts, storeSupplierNavIds } from "@/hooks/suppliers";
import { useBulkSelection } from "@/hooks/customers";
import { useTableSort } from "@/hooks/useTableSort";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { generatePDF } from "@/lib/pdfGeneratorLazy";
// xlsx loaded dynamically inside handlers (perf: tree-shaken from main bundle)
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const PAGE_SIZE = 25;
const COLUMN_KEYS = ['name', 'phone', 'governorate', 'balance', 'status', 'actions'];

const SuppliersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  const { sortConfig, requestSort } = useTableSort([]);
  const layout = useTableLayout('suppliers', COLUMN_KEYS);

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
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
    if (!statsChipFilter) return;
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

  const { suppliers, totalCount, isLoading, isFetching, error, refetch, filterKey } = useSupplierList({
    debouncedSearch,
    governorateFilter,
    categoryFilter,
    statusFilter,
    currentPage: 1,
    pageSize: PAGE_SIZE * currentPage,
    sortConfig,
  });

  const { deleteMutation, bulkDeleteMutation, bulkStatusMutation } = useSupplierMutations({
    filterKey, currentPage, sortConfig,
  });

  const { alertsByType, totalAlerts } = useSupplierAlerts(suppliers);

  const bulk = useBulkSelection(suppliers);


  const handleAdd = useCallback(() => {
    navigate('/suppliers?action=new');
  }, [navigate]);

  const handleEdit = useCallback((supplier: Supplier) => {
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

  const handleExport = useCallback(async (options: { format: string; scope: string; columns: string[] }) => {
    const data = suppliers.map(s => {
      const row: Record<string, unknown> = {};
      for (const col of options.columns) {
        row[col] = (s as Record<string, unknown>)[col];
      }
      return row;
    });

    const LABEL_MAP: Record<string, string> = {
      name: 'اسم المورد', contact_person: 'جهة الاتصال', phone: 'الهاتف', phone2: 'هاتف 2',
      email: 'البريد', governorate: 'المحافظة', city: 'المدينة', category: 'التصنيف',
      current_balance: 'الرصيد', credit_limit: 'حد الائتمان', is_active: 'الحالة',
      rating: 'التقييم', payment_terms_days: 'أيام السداد', discount_percentage: 'نسبة الخصم',
      tax_number: 'الرقم الضريبي', notes: 'ملاحظات', created_at: 'تاريخ الإضافة',
    };

    if (options.format === 'pdf') {
      await generatePDF({
        title: 'قائمة الموردين',
        data,
        columns: options.columns.map(k => ({ key: k, label: LABEL_MAP[k] || k })),
        includeCompanyInfo: true,
        includeLogo: true,
      });
    } else {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data.map(row => {
        const labeled: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          labeled[LABEL_MAP[k] || k] = v;
        }
        return labeled;
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الموردين');
      XLSX.writeFile(wb, `suppliers.${options.format === 'csv' ? 'csv' : 'xlsx'}`);
    }
  }, [suppliers]);

  const columns: WorkspaceColumn<Supplier>[] = [
    { key: 'name', label: 'المورد', render: supplier => <Button variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-start" onClick={() => handleRowClick(supplier)}>{supplier.name}</Button> },
    { key: 'phone', label: 'الهاتف', render: supplier => supplier.phone || '-' },
    { key: 'governorate', label: 'المحافظة', render: supplier => supplier.governorate || '-' },
    { key: 'balance', label: 'الرصيد', render: supplier => <Amount value={supplier.current_balance} /> },
    { key: 'status', label: 'الحالة', render: supplier => <Badge variant={supplier.is_active ? 'default' : 'secondary'}>{supplier.is_active ? 'نشط' : 'غير نشط'}</Badge> },
    { key: 'actions', label: 'إجراءات', render: supplier => <div className="flex gap-1">{canEdit && <Button variant="outline" size="sm" className="min-h-11" onClick={() => handleEdit(supplier)}>تعديل</Button>}<Button variant="ghost" size="sm" className="min-h-11" onClick={() => navigate(`/suppliers/${supplier.id}?tab=payments`)}>السندات</Button></div> },
  ];

  return (
    <PageWrapper title="إدارة الموردين">
      <div className="space-y-4">
        <SupplierPageHeader
          isMobile={isMobile}
          canEdit={canEdit}
          onAdd={() => setQuickAddOpen(true)}
          onImport={() => setImportOpen(true)}
          onExport={() => setExportOpen(true)}
          totalCount={totalCount}
          searchQuery={isMobile ? searchQuery : undefined}
          onSearchChange={isMobile ? setSearchQuery : undefined}
        />

        {/* Alerts Banner */}
        <SupplierAlertsBannerList alertsByType={alertsByType} totalAlerts={totalAlerts} />

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
              error={error}
              onRowClick={handleRowClick}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? (id) => handleDelete(id) : undefined}
              onAdd={handleAdd}
              onRefresh={handleRefresh}
              onRetry={() => refetch()}
              hasFilters={activeFiltersCount > 0}
              onClearFilters={handleClearAllFilters}
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
                <TableViewOptions layout={layout} columns={columns} />
              </CardHeader>
              <CardContent>
                <ListStateRenderer data={suppliers} isLoading={isLoading} error={error} hasFilters={activeFiltersCount > 0 || !!debouncedSearch} onRetry={() => refetch()} onClearFilters={() => { handleClearAllFilters(); setSearchQuery(''); }} empty={{ icon: Plus, title: 'لا يوجد موردين', description: 'ابدأ بإضافة مورد جديد', action: { label: 'مورد جديد', onClick: handleAdd, icon: Plus } }}>
                  <WorkspaceTable rows={suppliers} columns={columns} layout={layout} selection={{ header: <Checkbox checked={bulk.isAllSelected} onCheckedChange={checked => bulk.toggleSelectAll(!!checked)} aria-label="تحديد الموردين المعروضين" />, render: supplier => <Checkbox checked={bulk.selectedIds.has(supplier.id)} onCheckedChange={() => bulk.toggleSelect(supplier.id, !bulk.selectedIds.has(supplier.id))} aria-label={`تحديد ${supplier.name}`} /> }} />
                </ListStateRenderer>
              </CardContent>
            </Card>
          </>
        )}

        <LoadMoreFooter shown={suppliers.length} total={totalCount} hasMore={suppliers.length < totalCount} loading={isFetching} onLoadMore={() => setCurrentPage(page => page + 1)} />

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

        <SupplierQuickAddDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onOpenAdvanced={handleAdd}
        />

        <SupplierExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          onExport={handleExport}
          totalCount={totalCount}
          filteredCount={suppliers.length}
        />

        <SupplierImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </PageWrapper>
  );
};

const SuppliersPageWithErrorBoundary = () => (
  <ChartErrorBoundary title="إدارة الموردين"><SuppliersPage /></ChartErrorBoundary>
);

export default SuppliersPageWithErrorBoundary;
