import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useCustomerFilters } from "@/hooks/customers";
import { useCustomerList } from "@/hooks/customers/useCustomerList";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import { useCustomerAlerts } from "@/hooks/useCustomerAlerts";
import { exportCustomersToExcel } from "@/lib/services/customerService";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { PageWrapper } from "@/components/shared/PageWrapper";
import type { Customer } from "@/lib/customerConstants";

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
import { egyptGovernorates } from "@/lib/egyptLocations";
import { Loader2 } from "lucide-react";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { isMobile } = useResponsiveView();
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const { errorAlerts, warningAlerts, totalAlerts } = useCustomerAlerts(!alertsDismissed);
  const dialogRef = useRef<DialogManagerHandle>(null);

  const filters = useCustomerFilters();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportAllLoading, setExportAllLoading] = useState(false);

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

  const allCustomers = useMemo(() => {
    if (isMobile) return mobilePages.flat();
    return desktopPages.flat();
  }, [isMobile, mobilePages, desktopPages]);

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
  const observerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isMobile || !hasNextPage || isFetchingNextPage) return;
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) handleLoadMore(); },
      { threshold: 0.1, rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, handleLoadMore, allCustomers.length]);

  const handleEdit = useCallback((customer: Customer) => { dialogRef.current?.openEdit(customer); }, []);
  const handleAdd = useCallback(() => { dialogRef.current?.openAdd(); }, []);
  const handleDeleteRequest = useCallback((id: string) => { dialogRef.current?.confirmDelete(id); }, []);
  const handleDeleteConfirm = useCallback((id: string) => {
    setDeletingId(id);
    mutations.deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
  }, [mutations.deleteMutation]);
  const handleNewInvoice = useCallback((customerId: string) => { navigate('/invoices', { state: { prefillCustomerId: customerId } }); }, [navigate]);
  const handleWhatsApp = useCallback((phone: string) => { window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); }, []);
  const handleNewPayment = useCallback((customerId: string) => { navigate('/payments', { state: { prefillCustomerId: customerId } }); }, [navigate]);
  const handleRefresh = async () => { await list.refetch(); };

  const handleExportAll = useCallback(async () => {
    const hasPermission = await verifyPermissionOnServer('customers', 'view');
    if (!hasPermission) {
      const { toast: sonnerToast } = await import('sonner');
      sonnerToast.error('غير مصرح لك بتصدير بيانات العملاء');
      return;
    }
    setExportAllLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('export-customers');
      if (!error && data?.url) {
        window.open(data.url, '_blank');
        const { toast: sonnerToast } = await import('sonner');
        sonnerToast.success(`تم تصدير ${data.rowCount} عميل بنجاح`);
      } else {
        await exportCustomersToExcel();
      }
    } catch {
      await exportCustomersToExcel();
    }
    setExportAllLoading(false);
  }, []);

  const filteredCount = list.totalCount;
  const totalStatsCount = list.stats.total;

  return (
    <PageWrapper title="العملاء">
    <div className="space-y-4 md:space-y-5">
      <CustomerPageHeader
        isMobile={isMobile} canEdit={canEdit}
        exportAllLoading={exportAllLoading} onAdd={handleAdd}
        onDuplicates={() => dialogRef.current?.openDuplicates()}
        onMerge={() => dialogRef.current?.openMerge()}
        onImport={() => dialogRef.current?.openImport()}
        onExportAll={handleExportAll}
        totalCount={totalStatsCount}
        filteredCount={filteredCount !== totalStatsCount ? filteredCount : undefined}
        searchQuery={isMobile ? filters.searchQuery : undefined}
        onSearchChange={isMobile ? filters.setSearchQuery : undefined}
      />

      <CustomerStatsBar stats={list.stats} isMobile={isMobile} activeFilter={quickFilter} onFilterChange={handleQuickFilter} />

      {totalAlerts > 0 && !alertsDismissed && (
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-l from-warning/10 to-warning/5 border border-warning/20 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {errorAlerts.slice(0, 2).map((alert, i) => (<span key={`e-${i}`} className="text-xs text-destructive">⚠️ {alert.message}</span>))}
              {warningAlerts.slice(0, 2).map((alert, i) => (<span key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400">⏰ {alert.message}</span>))}
              {totalAlerts > 4 && <span className="text-xs text-muted-foreground">+{totalAlerts - 4} أخرى</span>}
            </div>
          </div>
          <button onClick={() => setAlertsDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1">
            <span className="text-sm">✕</span>
          </button>
        </div>
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
          {/* Sort dropdown */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{list.totalCount} عميل</span>
            <Select value={sortConfig.key || 'created_at'} onValueChange={requestSort}>
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
                  onNavigate={(id) => navigate(`/customers/${id}`)}
                  onEdit={canEdit ? handleEdit : undefined}
                  onNewInvoice={handleNewInvoice}
                  onNewPayment={handleNewPayment}
                  onWhatsApp={handleWhatsApp}
                  onRowHover={list.handleRowHover}
                  onRowLeave={list.handleRowLeave}
                />
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={observerRef} className="h-10 flex items-center justify-center">
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
    </div>
    </PageWrapper>
  );
};

export default CustomersPage;
