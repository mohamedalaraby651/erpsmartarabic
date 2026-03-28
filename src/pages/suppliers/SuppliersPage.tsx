import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { ServerPagination } from "@/components/shared/ServerPagination";

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type PurchaseOrderStats = Pick<Database['public']['Tables']['purchase_orders']['Row'], 'supplier_id' | 'total_amount' | 'status'>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Phone, Mail, Building2, CreditCard, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { egyptGovernorates } from "@/lib/egyptLocations";

const VIRTUALIZATION_THRESHOLD = 50;

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'لوجستية', other: 'أخرى',
};

const getBalanceColor = (balance: number, creditLimit: number) => {
  if (balance <= 0) return 'text-emerald-600';
  if (creditLimit > 0 && balance >= creditLimit * 0.5) return 'text-destructive';
  if (balance > 0) return 'text-amber-600';
  return '';
};

const PAGE_SIZE = 25;

const SuppliersPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [governorateFilter, setGovernorateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Count query
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["suppliers-count", debouncedSearch, governorateFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase.from("suppliers").select("*", { count: 'exact', head: true });
      if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      if (governorateFilter !== 'all') query = query.eq('governorate', governorateFilter);
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: suppliers = [], isLoading, refetch } = useQuery({
    queryKey: ["suppliers", debouncedSearch, governorateFilter, categoryFilter, pagination.currentPage],
    queryFn: async () => {
      let query = supabase.from("suppliers").select("*").order("name")
        .range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,governorate.ilike.%${debouncedSearch}%,contact_person.ilike.%${debouncedSearch}%`);
      }
      if (governorateFilter !== 'all') query = query.eq('governorate', governorateFilter);
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("supplier_id, total_amount, status");
      if (error) throw error;
      return data;
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { deleteSupplier } = await import('@/lib/services/supplierService');
      await deleteSupplier(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("تم حذف المورد بنجاح");
      setDeletingId(null);
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        toast.error("غير مصرح: ليس لديك صلاحية حذف الموردين");
      } else {
        toast.error("خطأ في حذف المورد");
      }
      setDeletingId(null);
    },
  });

  const { filteredData, filters, setFilter } = useTableFilter(suppliers);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const activeSuppliers = suppliers.filter((s) => s.is_active).length;
  const totalBalance = suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0);
  const totalPurchases = (purchaseOrders as PurchaseOrderStats[]).reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const getSupplierStats = useCallback((supplierId: string) => {
    const orders = (purchaseOrders as PurchaseOrderStats[]).filter((o) => o.supplier_id === supplierId);
    return { orderCount: orders.length, totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) };
  }, [purchaseOrders]);

  const handleEdit = useCallback((supplier: Supplier) => { setSelectedSupplier(supplier); setDialogOpen(true); }, []);
  const handleAdd = useCallback(() => { setSelectedSupplier(null); setDialogOpen(true); }, []);
  const handleDelete = useCallback((id: string) => { setDeletingId(id); deleteSupplierMutation.mutate(id); }, [deleteSupplierMutation]);
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const statItems = useMemo(() => [
    { label: 'إجمالي الموردين', value: suppliers.length, icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'النشطين', value: activeSuppliers, icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'إجمالي المشتريات', value: `${totalPurchases.toLocaleString()}`, icon: CreditCard, color: 'text-info', bgColor: 'bg-info/10' },
    { label: 'الأرصدة المستحقة', value: `${totalBalance.toLocaleString()} ج.م`, icon: CreditCard, color: totalBalance > 0 ? 'text-destructive' : 'text-success', bgColor: totalBalance > 0 ? 'bg-destructive/10' : 'bg-success/10' },
  ], [suppliers.length, activeSuppliers, totalPurchases, totalBalance]);

  const shouldVirtualize = sortedData.length > VIRTUALIZATION_THRESHOLD;

  const renderMobileSupplierItem = useCallback((supplier: Supplier) => {
    const supplierStats = getSupplierStats(supplier.id);
    return (
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
        onClick={() => navigate(`/suppliers/${supplier.id}`)}
        onView={() => navigate(`/suppliers/${supplier.id}`)}
        onEdit={canEdit ? () => handleEdit(supplier) : undefined}
        onDelete={canDelete ? () => handleDelete(supplier.id) : undefined}
      />
    );
  }, [navigate, canEdit, canDelete, handleEdit, handleDelete, getSupplierStats]);

  const renderMobileView = () => {
    if (isLoading) return <div className="space-y-4"><MobileStatSkeleton count={4} /><MobileListSkeleton count={5} /></div>;
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[140px] shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div>
                    <div><p className="text-lg font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
          </div>
          {sortedData.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد موردين" description="ابدأ بإضافة مورد جديد" action={{ label: "مورد جديد", onClick: handleAdd, icon: Plus }} />
          ) : shouldVirtualize ? (
            <VirtualizedMobileList data={sortedData as Supplier[]} renderItem={renderMobileSupplierItem} getItemKey={(s: Supplier) => s.id} itemHeight={150} />
          ) : (
            <div className="space-y-3">{(sortedData as Supplier[]).map((s) => <div key={s.id}>{renderMobileSupplierItem(s)}</div>)}</div>
          )}
        </div>
      </PullToRefresh>
    );
  };

  const renderTableView = () => {
    if (isLoading) return <TableSkeleton rows={5} columns={10} />;
    if (sortedData.length === 0) return <EmptyState icon={Users} title="لا يوجد موردين" description="ابدأ بإضافة مورد جديد" action={{ label: "مورد جديد", onClick: handleAdd, icon: Plus }} />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><DataTableHeader label="اسم المورد" sortKey="name" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
            <TableHead>جهة الاتصال</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المحافظة</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>عدد الطلبات</TableHead>
            <TableHead><DataTableHeader label="إجمالي المشتريات" sortKey="totalPurchases" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
            <TableHead><DataTableHeader label="الرصيد" sortKey="current_balance" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sortedData as Supplier[]).map((supplier) => {
            const stats = getSupplierStats(supplier.id);
            const balanceColor = getBalanceColor(supplier.current_balance || 0, supplier.credit_limit || 0);
            return (
              <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contact_person || "-"}</TableCell>
                <TableCell>{supplier.phone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{supplier.phone}</div> : "-"}</TableCell>
                <TableCell>{supplier.governorate || "-"}</TableCell>
                <TableCell>{supplier.category ? <Badge variant="outline">{categoryLabels[supplier.category] || supplier.category}</Badge> : "-"}</TableCell>
                <TableCell>{stats.orderCount}</TableCell>
                <TableCell>{stats.totalAmount.toLocaleString()} ج.م</TableCell>
                <TableCell className={`font-semibold ${balanceColor}`}>{(supplier.current_balance || 0).toLocaleString()} ج.م</TableCell>
                <TableCell><Badge variant={supplier.is_active ? "default" : "secondary"}>{supplier.is_active ? "نشط" : "غير نشط"}</Badge></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DataTableActions onEdit={() => handleEdit(supplier)} onDelete={() => handleDelete(supplier.id)} canView={false} canEdit={canEdit} canDelete={canDelete} isDeleting={deletingId === supplier.id} deleteDescription="سيتم حذف المورد. هذا الإجراء لا يمكن التراجع عنه." />
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
            <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
              <Plus className="h-4 w-4 ml-2" />{isMobile ? "جديد" : "مورد جديد"}
            </Button>
          )}
        </div>
      </div>

      {isMobile ? renderMobileView() : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div></CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الهاتف أو المحافظة..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
            </div>
            <Select value={(filters.is_active as string) || 'all'} onValueChange={(v) => setFilter('is_active', v === 'all' ? undefined : v === 'true')}>
              <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="true">نشط</SelectItem>
                <SelectItem value="false">غير نشط</SelectItem>
              </SelectContent>
            </Select>
            <Select value={governorateFilter} onValueChange={setGovernorateFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="المحافظة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحافظات</SelectItem>
                {egyptGovernorates.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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

          <Card>
            <CardHeader><CardTitle>قائمة الموردين ({sortedData.length})</CardTitle></CardHeader>
            <CardContent>{renderTableView()}</CardContent>
          </Card>
        </>
      )}

      <ServerPagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={pagination.goToPage}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
      />
      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={selectedSupplier} />
    </div>
  );
};

export default SuppliersPage;