import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useCustomerFilters } from "@/hooks/customers";
import { useCustomerList } from "@/hooks/customers/useCustomerList";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import { useCustomerAlerts, type AlertType } from "@/hooks/useCustomerAlerts";
import { exportCustomersToExcel } from "@/lib/services/customerService";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { PageWrapper } from "@/components/shared/PageWrapper";
import type { Customer } from "@/lib/customerConstants";
import { CustomerAlertsBanner } from "@/components/customers/alerts/CustomerAlertsBanner";
import { CustomerAlertsMobileTrigger } from "@/components/customers/alerts/CustomerAlertsMobileTrigger";

// Sub-components
import { CustomerListRow } from "@/components/customers/CustomerListRow";
import { CustomerMobileView } from "@/components/customers/CustomerMobileView";
import { CustomerStatsBar } from "@/components/customers/CustomerStatsBar";
import { CustomerFiltersBar } from "@/components/customers/CustomerFiltersBar";
import { CustomerListSkeleton } from "@/components/customers/CustomerListSkeleton";
import { CustomerDialogManager, type DialogManagerHandle } from "@/components/customers/CustomerDialogManager";
import { CustomerPageHeader } from "@/components/customers/CustomerPageHeader";
import { CustomerFilterDrawer } from "@/components/customers/CustomerFilterDrawer";
import { CustomerEmptyState } from "@/components/customers/CustomerEmptyState";
import { CustomerQuickAddDialog } from "@/components/customers/CustomerQuickAddDialog";
import { CustomerExportDialog, type ExportOptions } from "@/components/customers/CustomerExportDialog";
import { CustomerSavedViews } from "@/components/customers/CustomerSavedViews";
import { CustomerColumnSettings, useVisibleColumns } from "@/components/customers/CustomerColumnSettings";
import { egyptGovernorates } from "@/lib/egyptLocations";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { isMobile } = useResponsiveView();
  const [alertFilterType, setAlertFilterType] = useState<AlertType | null>(null);
  const { alertsByType, totalAlerts, alertCountByCustomer, errorCustomerIds } = useCustomerAlerts();
  const dialogRef = useRef<DialogManagerHandle>(null);

  const filters = useCustomerFilters();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Column visibility
  const { visibleColumns, setVisibleColumns } = useVisibleColumns();

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

  const [quickFilter, setQuickFilter] = useState<string | null>(null);

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

  // Infinite scroll state
  const pageSize = 20;
  const [mobilePages, setMobilePages] = useState<Customer[][]>([]);
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPages, setDesktopPages] = useState<Customer[][]>([]);
  const [desktopPage, setDesktopPage] = useState(1);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const currentPage = isMobile ? mobilePage : desktopPage;

  const list = useCustomerList({
    debouncedSearch: filters.debouncedSearch,
    typeFilter: filters.typeFilter, vipFilter: filters.vipFilter,
    governorateFilter: filters.governorateFilter, statusFilter: filters.statusFilter,
    noCommDays: filters.noCommDays, inactiveDays: filters.inactiveDays,
    currentPage, pageSize, sortConfig,
  });

  const mutations = useCustomerMutations({ filterKey: list.filterKey, currentPage, sortConfig });

  const totalPages = Math.ceil(list.totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;

  // Accumulate pages for infinite scroll
  useEffect(() => {
    if (list.customers.length > 0) {
      if (isMobile) {
        setMobilePages(prev => {
          const updated = [...prev];
          updated[mobilePage - 1] = list.customers;
          return updated;
        });
      } else {
        setDesktopPages(prev => {
          const updated = [...prev];
          updated[desktopPage - 1] = list.customers;
          return updated;
        });
      }
      setIsFetchingNextPage(false);
    }
  }, [list.customers, mobilePage, desktopPage, isMobile]);

  const allCustomersRaw = useMemo(() => {
    if (isMobile) return mobilePages.flat();
    return desktopPages.flat();
  }, [isMobile, mobilePages, desktopPages]);

  // Filter by alert type when a badge is clicked
  const allCustomers = useMemo(() => {
    if (!alertFilterType) return allCustomersRaw;
    const typeAlerts = alertsByType.get(alertFilterType);
    if (!typeAlerts?.length) return allCustomersRaw;
    const ids = new Set(typeAlerts.map(a => a.customerId));
    return allCustomersRaw.filter(c => ids.has(c.id));
  }, [allCustomersRaw, alertFilterType, alertsByType]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setIsFetchingNextPage(true);
      if (isMobile) setMobilePage(prev => prev + 1);
      else setDesktopPage(prev => prev + 1);
    }
  }, [hasNextPage, isFetchingNextPage, isMobile]);

  // Reset pages on filter/sort change
  useEffect(() => {
    setMobilePage(1);
    setDesktopPage(1);
    setMobilePages([]);
    setDesktopPages([]);
  }, [filters.debouncedSearch, filters.typeFilter, filters.vipFilter, filters.governorateFilter, filters.statusFilter, filters.noCommDays, filters.inactiveDays, sortConfig.key, sortConfig.direction]);

  // Desktop infinite scroll observer
  const desktopSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isMobile || !hasNextPage || isFetchingNextPage) return;
    const el = desktopSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) handleLoadMore(); },
      { threshold: 0.1, rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, handleLoadMore, allCustomers.length]);

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

  // Advanced export handler
  const handleAdvancedExport = useCallback(async (options: ExportOptions) => {
    const hasPermission = await verifyPermissionOnServer('customers', 'view');
    if (!hasPermission) {
      const { toast: sonnerToast } = await import('sonner');
      sonnerToast.error('غير مصرح لك بتصدير بيانات العملاء');
      return;
    }

    const { toast: sonnerToast } = await import('sonner');
    const toastId = 'export-advanced';
    sonnerToast.loading('جاري تحضير التصدير...', { id: toastId });

    try {
      const { customerRepository } = await import('@/lib/repositories/customerRepository');

      // Fetch data based on scope
      let data: Customer[];
      if (options.scope === 'filtered' && (filters.debouncedSearch || filters.typeFilter !== 'all' || filters.vipFilter !== 'all' || filters.governorateFilter !== 'all' || filters.statusFilter !== 'all')) {
        const result = await customerRepository.findAll(
          {
            search: filters.debouncedSearch,
            type: filters.typeFilter,
            vip: filters.vipFilter,
            governorate: filters.governorateFilter,
            status: filters.statusFilter,
            noCommDays: filters.noCommDays,
            inactiveDays: filters.inactiveDays,
          },
          { key: sortConfig.key || 'created_at', direction: sortConfig.direction },
          { page: 1, pageSize: 5000 }
        );
        data = result.data || [];
      } else {
        const result = await customerRepository.exportAll((loaded) => {
          sonnerToast.loading(`جاري تحميل ${loaded.toLocaleString()} عميل...`, { id: toastId });
        });
        data = (result.data || []) as Customer[];
      }

      if (!data.length) {
        sonnerToast.error('لا توجد بيانات للتصدير', { id: toastId });
        return;
      }

      // Column header map
      const headerMap: Record<string, string> = {
        name: 'الاسم', customer_type: 'النوع', vip_level: 'مستوى VIP',
        phone: 'الهاتف', phone2: 'هاتف 2', email: 'البريد',
        governorate: 'المحافظة', city: 'المدينة',
        current_balance: 'الرصيد', credit_limit: 'حد الائتمان',
        is_active: 'الحالة', total_purchases_cached: 'إجمالي المشتريات',
        last_activity_at: 'آخر نشاط', created_at: 'تاريخ الإضافة',
        tax_number: 'الرقم الضريبي', notes: 'ملاحظات',
      };

      // Filter to selected columns only
      const selectedCols = options.columns.filter(c => headerMap[c]);
      const exportData = data.map(row => {
        const mapped: Record<string, unknown> = {};
        selectedCols.forEach(key => {
          mapped[headerMap[key]] = (row as Record<string, unknown>)[key];
        });
        return mapped;
      });

      if (options.format === 'csv') {
        // CSV export
        const headers = selectedCols.map(c => headerMap[c]);
        const csvRows = [headers.join(',')];
        exportData.forEach(row => {
          csvRows.push(headers.map(h => {
            const val = row[h];
            const str = val == null ? '' : String(val);
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(','));
        });
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (options.format === 'pdf') {
        // PDF export
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'landscape', putOnlyUsedFonts: true });
        const headers = selectedCols.map(c => headerMap[c]);
        const body = exportData.map(row => headers.map(h => String(row[h] ?? '')));
        autoTable(doc, {
          head: [headers],
          body,
          styles: { font: 'helvetica', fontSize: 8, halign: 'right' },
          headStyles: { fillColor: [59, 130, 246] },
        });
        doc.save(`customers_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        // Excel export (default)
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(exportData);
        const headers = selectedCols.map(c => headerMap[c]);
        ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 15) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
        XLSX.writeFile(wb, `customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }

      sonnerToast.success(`تم تصدير ${data.length} عميل بنجاح`, { id: toastId });
    } catch {
      sonnerToast.error('حدث خطأ أثناء التصدير', { id: toastId });
    }
  }, [filters, sortConfig]);

  const filteredCount = list.totalCount;
  const totalStatsCount = list.stats.total;

  return (
    <PageWrapper title="العملاء">
    <div className="space-y-4 md:space-y-5">
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
        governorates={egyptGovernorates} activeFiltersCount={filters.activeFiltersCount}
        isMobile={isMobile} onOpenDrawer={filters.openDrawerWithCurrentValues}
        onClearFilter={filters.clearFilter} onClearAll={filters.clearAllFilters}
        noCommDays={filters.noCommDays} inactiveDays={filters.inactiveDays}
      />

      {isMobile ? (
        <div className="pb-20">
          {/* Mobile alert trigger */}
          <div className="flex items-center justify-between mb-3">
            <CustomerAlertsMobileTrigger
              alertsByType={alertsByType}
              totalAlerts={totalAlerts}
              onFilterByType={setAlertFilterType}
            />
          </div>
          <CustomerMobileView
            data={allCustomers}
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
            onNewPayment={handleNewPayment}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            sortKey={sortConfig.key || 'created_at'}
            onSortChange={requestSort}
          />
        </div>
      ) : (
        <div>
          {/* Toolbar: sort + saved views + column settings */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{list.totalCount} عميل</span>
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
                  onNavigate={(id) => navigate(`/customers/${id}`)}
                  onEdit={canEdit ? handleEdit : undefined}
                  onNewInvoice={handleNewInvoice}
                  onNewPayment={handleNewPayment}
                  onWhatsApp={handleWhatsApp}
                  onRowHover={list.handleRowHover}
                  onRowLeave={list.handleRowLeave}
                  alertCount={alertCountByCustomer.get(customer.id)}
                  hasErrorAlert={errorCustomerIds.has(customer.id)}
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
        onBulkDelete={() => {}} onBulkVipUpdate={() => {}} bulkSelectedCount={0}
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

export default CustomersPage;
