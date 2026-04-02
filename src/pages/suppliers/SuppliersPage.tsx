import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Users, Phone, Building2, CreditCard, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { egyptGovernorates } from "@/lib/egyptLocations";
import { useSupplierList, useSupplierFilters, useSupplierMutations, storeSupplierNavIds } from "@/hooks/suppliers";
import { useBulkSelection } from "@/hooks/customers";
import { useTableSort } from "@/hooks/useTableSort";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import SupplierImportDialog from "@/components/suppliers/SupplierImportDialog";
import SupplierSavedViews from "@/components/suppliers/list/SupplierSavedViews";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const VIRTUALIZATION_THRESHOLD = 50;
const PAGE_SIZE = 25;

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'لوجستية', other: 'أخرى',
};

const getBalanceColor = (balance: number, creditLimit: number) => {
  if (balance <= 0) return 'text-success';
  if (creditLimit > 0 && balance >= creditLimit * 0.5) return 'text-destructive';
  if (balance > 0) return 'text-warning';
  return '';
};

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, governorateFilter, categoryFilter, statusFilter]);

  // Handle ?action=new
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  const handleAdd = useCallback(() => { setSelectedSupplier(null); setDialogOpen(true); }, []);
  const handleEdit = useCallback((supplier: Supplier) => { setSelectedSupplier(supplier); setDialogOpen(true); }, []);
  const handleDelete = useCallback((id: string) => { deleteMutation.mutate(id); }, [deleteMutation]);
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const handleRowClick = useCallback((supplier: Supplier) => {
    storeSupplierNavIds(suppliers.map(s => s.id));
    navigate(`/suppliers/${supplier.id}`);
  }, [navigate, suppliers]);

  // Bulk actions
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

  // Saved views
  const handleApplyView = useCallback((viewFilters: Record<string, string>) => {
    if (viewFilters.gov) setGovernorateFilter(viewFilters.gov);
    if (viewFilters.cat) setCategoryFilter(viewFilters.cat);
    if (viewFilters.status) setStatusFilter(viewFilters.status);
  }, [setGovernorateFilter, setCategoryFilter, setStatusFilter]);

  const currentFilters = useMemo(() => ({
    gov: governorateFilter, cat: categoryFilter, status: statusFilter,
  }), [governorateFilter, categoryFilter, statusFilter]);

  // Stats
  const activeSuppliers = useMemo(() => suppliers.filter(s => s.is_active).length, [suppliers]);
  const totalBalance = useMemo(() => suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0), [suppliers]);

  const shouldVirtualize = suppliers.length > VIRTUALIZATION_THRESHOLD;

  const renderMobileItem = useCallback((supplier: Supplier) => (
    <DataCard
      title={supplier.name}
      subtitle={supplier.contact_person || 'بدون جهة اتصال'}
      badge={{ text: supplier.is_active ? 'نشط' : 'غير نشط', variant: supplier.is_active ? 'default' : 'secondary' }}
      icon={<Building2 className="h-5 w-5" />}
      fields={[
        { label: 'الهاتف', value: supplier.phone || '-', icon: <Phone className="h-4 w-4" /> },
        { label: 'المحافظة', value: supplier.governorate || '-', icon: <MapPin className="h-4 w-4" /> },
        { label: 'الرصيد', value: `${(supplier.current_balance || 0).toLocaleString()} ج.م` },
      ]}
      onClick={() => handleRowClick(supplier)}
      onView={() => handleRowClick(supplier)}
      onEdit={canEdit ? () => handleEdit(supplier) : undefined}
      onDelete={canDelete ? () => handleDelete(supplier.id) : undefined}
    />
  ), [handleRowClick, canEdit, canDelete, handleEdit, handleDelete]);

  const renderMobileView = () => {
    if (isLoading) return <div className="space-y-4"><MobileStatSkeleton count={3} /><MobileListSkeleton count={5} /></div>;
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الهاتف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
          </div>
          {suppliers.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد موردين" description="ابدأ بإضافة مورد جديد" action={{ label: "مورد جديد", onClick: handleAdd, icon: Plus }} />
          ) : shouldVirtualize ? (
            <VirtualizedMobileList data={suppliers} renderItem={renderMobileItem} getItemKey={(s: Supplier) => s.id} itemHeight={150} />
          ) : (
            <div className="space-y-3">{suppliers.map(s => <div key={s.id}>{renderMobileItem(s)}</div>)}</div>
          )}
        </div>
      </PullToRefresh>
    );
  };

  const renderTableView = () => {
    if (isLoading) return <TableSkeleton rows={5} columns={10} />;
    if (suppliers.length === 0) return <EmptyState icon={Users} title="لا يوجد موردين" description="ابدأ بإضافة مورد جديد" action={{ label: "مورد جديد", onClick: handleAdd, icon: Plus }} />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={bulk.isAllSelected} onCheckedChange={(checked) => bulk.toggleSelectAll(!!checked)} />
            </TableHead>
            <TableHead><DataTableHeader label="اسم المورد" sortKey="name" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
            <TableHead>جهة الاتصال</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المحافظة</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead><DataTableHeader label="الرصيد" sortKey="current_balance" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map(supplier => {
            const balanceColor = getBalanceColor(supplier.current_balance || 0, supplier.credit_limit || 0);
            return (
              <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(supplier)}>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox checked={bulk.selectedIds.has(supplier.id)} onCheckedChange={(checked) => bulk.toggleSelect(supplier.id, !!checked)} />
                </TableCell>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contact_person || "-"}</TableCell>
                <TableCell>{supplier.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{supplier.phone}</div> : "-"}</TableCell>
                <TableCell>{supplier.governorate || "-"}</TableCell>
                <TableCell>{supplier.category ? <Badge variant="outline">{categoryLabels[supplier.category] || supplier.category}</Badge> : "-"}</TableCell>
                <TableCell className={`font-semibold ${balanceColor}`}>{(supplier.current_balance || 0).toLocaleString()} ج.م</TableCell>
                <TableCell><Badge variant={supplier.is_active ? "default" : "secondary"}>{supplier.is_active ? "نشط" : "غير نشط"}</Badge></TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DataTableActions onEdit={() => handleEdit(supplier)} onDelete={() => handleDelete(supplier.id)} canView={false} canEdit={canEdit} canDelete={canDelete} isDeleting={deleteMutation.isPending && deleteMutation.variables === supplier.id} deleteDescription="سيتم حذف المورد. هذا الإجراء لا يمكن التراجع عنه." />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton section="suppliers" sectionLabel="الموردين" data={suppliers} columns={[
              { key: 'name', label: 'اسم المورد' }, { key: 'contact_person', label: 'جهة الاتصال' },
              { key: 'phone', label: 'الهاتف' }, { key: 'governorate', label: 'المحافظة' },
              { key: 'current_balance', label: 'الرصيد' }, { key: 'is_active', label: 'الحالة' },
            ]} />
          )}
          {canEdit && (
            <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 ml-2" />{isMobile ? "استيراد" : "استيراد من Excel"}
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
              <Plus className="h-4 w-4 ml-2" />{isMobile ? "جديد" : "مورد جديد"}
            </Button>
          )}
        </div>
      </div>

      {isMobile ? renderMobileView() : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الهاتف أو المحافظة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
                <SelectItem value="debtors">مدينين</SelectItem>
              </SelectContent>
            </Select>
            <Select value={governorateFilter} onValueChange={setGovernorateFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="المحافظة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحافظات</SelectItem>
                {egyptGovernorates.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="التصنيف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Saved Views */}
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
            <CardHeader><CardTitle>قائمة الموردين ({totalCount})</CardTitle></CardHeader>
            <CardContent>{renderTableView()}</CardContent>
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

      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={selectedSupplier} />
      <SupplierImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
};

// Wrap with error boundary
import { ChartErrorBoundary as ErrorBoundary } from "@/components/shared/ChartErrorBoundary";
const SuppliersPageWithErrorBoundary = () => (
  <ErrorBoundary title="إدارة الموردين"><SuppliersPage /></ErrorBoundary>
);

export default SuppliersPageWithErrorBoundary;
