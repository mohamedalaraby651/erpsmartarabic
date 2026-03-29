import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ClipboardList, Printer, Eye, Calendar, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EntityLink } from "@/components/shared/EntityLink";
import PurchaseOrderFormDialog from "@/components/purchase-orders/PurchaseOrderFormDialog";
import { PurchaseOrderPrintView } from "@/components/print/PurchaseOrderPrintView";
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
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  suppliers: { name: string } | null;
};

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  cancelled: 'ملغي',
  completed: 'مكتمل',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
  completed: 'bg-info/10 text-info',
};

const PurchaseOrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [prefillSupplierId, setPrefillSupplierId] = useState<string | undefined>(undefined);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  // Handle action parameter from URL (FAB/QuickActions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle prefill from navigation state (e.g. from SupplierDetailsPage)
  useEffect(() => {
    const state = location.state as { prefillSupplierId?: string } | null;
    if (state?.prefillSupplierId) {
      setPrefillSupplierId(state.prefillSupplierId);
      setSelectedOrder(null);
      setDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const hasPermission = await verifyPermissionOnServer('purchase_orders', 'delete');
      if (!hasPermission) throw new Error('UNAUTHORIZED');
      await supabase.from('purchase_order_items').delete().eq('order_id', id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: "تم حذف أمر الشراء بنجاح" });
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        toast({ title: "غير مصرح", description: "ليس لديك صلاحية حذف أوامر الشراء", variant: "destructive" });
      } else {
        toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
      }
    },
  });

  // Filter by search
  const searchFiltered = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { filteredData, filters, setFilter } = useTableFilter(searchFiltered);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  const handleEdit = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedOrder(null);
    setDialogOpen(true);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const statItems = [
    { label: 'إجمالي الأوامر', value: stats.total, icon: ClipboardList, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'قيد الانتظار', value: stats.pending, icon: RefreshCw, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'مكتملة', value: stats.completed, icon: ClipboardList, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'إجمالي القيمة', value: `${stats.totalValue.toLocaleString()}`, icon: ClipboardList, color: 'text-info', bgColor: 'bg-info/10' },
  ];

  // Mobile View
  const renderMobileView = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <MobileStatSkeleton count={4} />
          <MobileListSkeleton count={5} variant="order" />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[140px] shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الأمر أو اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Orders List */}
          {sortedData.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="لا توجد أوامر شراء"
              description="ابدأ بإضافة أمر شراء جديد"
              action={{
                label: "أمر شراء جديد",
                onClick: handleNew,
                icon: Plus,
              }}
            />
          ) : (
            <div className="space-y-3">
              {sortedData.map((order) => (
                <DataCard
                  key={order.id}
                  title={order.order_number}
                  subtitle={order.suppliers?.name || 'بدون مورد'}
                  badge={{
                    text: statusLabels[order.status],
                    variant: order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline',
                  }}
                  icon={<ClipboardList className="h-5 w-5" />}
                  fields={[
                    { label: 'الإجمالي', value: `${Number(order.total_amount).toLocaleString()} ج.م` },
                    { label: 'التاريخ', value: new Date(order.created_at).toLocaleDateString('ar-EG'), icon: <Calendar className="h-4 w-4" /> },
                  ]}
                  onClick={() => navigate(`/purchase-orders/${order.id}`)}
                  onView={() => navigate(`/purchase-orders/${order.id}`)}
                  onEdit={canEdit ? () => handleEdit(order) : undefined}
                  onDelete={canDelete ? () => deleteMutation.mutate(order.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>
    );
  };

  // Desktop View
  const renderTableView = () => {
    if (isLoading) {
      return <TableSkeleton rows={5} columns={7} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد أوامر شراء"
          description="ابدأ بإضافة أمر شراء جديد"
          action={{
            label: "أمر شراء جديد",
            onClick: handleNew,
            icon: Plus,
          }}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableHeader
                label="رقم الأمر"
                sortKey="order_number"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
              <DataTableHeader label="المورد" />
              <DataTableHeader
                label="الإجمالي"
                sortKey="total_amount"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
              <DataTableHeader
                label="الحالة"
                filterKey="status"
                filterType="select"
                filterOptions={[
                  { value: 'draft', label: 'مسودة' },
                  { value: 'pending', label: 'قيد الانتظار' },
                  { value: 'approved', label: 'معتمد' },
                  { value: 'completed', label: 'مكتمل' },
                  { value: 'cancelled', label: 'ملغي' },
                ]}
                filterValue={filters.status as string}
                onFilter={setFilter}
              />
              <DataTableHeader label="تاريخ التوريد" />
              <DataTableHeader
                label="تاريخ الإنشاء"
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
              <DataTableHeader label="إجراءات" className="text-left" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((order) => (
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                <TableCell>
                  <EntityLink type="purchase-order" id={order.id}>
                    {order.order_number}
                  </EntityLink>
                </TableCell>
                <TableCell>
                  {order.suppliers?.name ? (
                    <EntityLink type="supplier" id={order.supplier_id}>
                      {order.suppliers.name}
                    </EntityLink>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <span className="font-bold">
                    {Number(order.total_amount).toLocaleString()} ج.م
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.expected_date ? new Date(order.expected_date).toLocaleDateString('ar-EG') : '-'}
                </TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setPrintOrderId(order.id); setPrintDialogOpen(true); }}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <DataTableActions
                      onEdit={() => handleEdit(order)}
                      onDelete={() => deleteMutation.mutate(order.id)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      deleteDescription="سيتم حذف أمر الشراء وجميع بنوده نهائياً."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أوامر الشراء</h1>
          <p className="text-muted-foreground">إدارة أوامر الشراء من الموردين</p>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="purchase_orders"
              sectionLabel="أوامر الشراء"
              data={sortedData}
              columns={[
                { key: 'order_number', label: 'رقم الأمر' },
                { key: 'suppliers.name', label: 'المورد' },
                { key: 'total_amount', label: 'الإجمالي' },
                { key: 'status', label: 'الحالة' },
                { key: 'expected_date', label: 'تاريخ التوريد المتوقع' },
                { key: 'created_at', label: 'تاريخ الإنشاء' },
              ]}
            />
          )}
          <Button onClick={handleNew} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {isMobile ? "جديد" : "أمر شراء جديد"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isMobile ? renderMobileView() : (
        <>
          {/* Desktop Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الأمر أو اسم المورد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة أوامر الشراء</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTableView()}
            </CardContent>
          </Card>
        </>
      )}

      <PurchaseOrderFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setPrefillSupplierId(undefined);
        }}
        order={selectedOrder}
        prefillSupplierId={prefillSupplierId}
      />

      {printOrderId && (
        <PurchaseOrderPrintView
          orderId={printOrderId}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
