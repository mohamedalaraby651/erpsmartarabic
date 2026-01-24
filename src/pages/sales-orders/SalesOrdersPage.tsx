import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Search, ShoppingCart, Printer, Eye, Calendar, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EntityLink } from "@/components/shared/EntityLink";
import SalesOrderFormDialog from "@/components/sales-orders/SalesOrderFormDialog";
import { SalesOrderPrintView } from "@/components/print/SalesOrderPrintView";
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
import type { Database } from "@/integrations/supabase/types";

type SalesOrder = Database['public']['Tables']['sales_orders']['Row'] & {
  customers: { name: string } | null;
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

const SalesOrdersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SalesOrder[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('sales_order_items').delete().eq('order_id', id);
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: "تم حذف أمر البيع بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
    },
  });

  // Filter by search
  const searchFiltered = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { filteredData, filters, setFilter } = useTableFilter(searchFiltered);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  const handleEdit = (order: SalesOrder) => {
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
    { label: 'إجمالي الأوامر', value: stats.total, icon: ShoppingCart, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'قيد الانتظار', value: stats.pending, icon: RefreshCw, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'مكتملة', value: stats.completed, icon: ShoppingCart, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'إجمالي القيمة', value: `${stats.totalValue.toLocaleString()} ج.م`, icon: ShoppingCart, color: 'text-info', bgColor: 'bg-info/10' },
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
          {/* Mobile Stats - Horizontal Scroll */}
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
              placeholder="بحث برقم الأمر أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Orders List */}
          {sortedData.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="لا توجد أوامر بيع"
              description="ابدأ بإضافة أمر بيع جديد"
              action={{
                label: "أمر بيع جديد",
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
                  subtitle={order.customers?.name || 'بدون عميل'}
                  badge={{
                    text: statusLabels[order.status],
                    variant: order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline',
                  }}
                  icon={<ShoppingCart className="h-5 w-5" />}
                  fields={[
                    { label: 'الإجمالي', value: `${Number(order.total_amount).toLocaleString()} ج.م` },
                    { label: 'التاريخ', value: new Date(order.created_at).toLocaleDateString('ar-EG'), icon: <Calendar className="h-4 w-4" /> },
                  ]}
                  onClick={() => navigate(`/sales-orders/${order.id}`)}
                  onView={() => navigate(`/sales-orders/${order.id}`)}
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
          icon={ShoppingCart}
          title="لا توجد أوامر بيع"
          description="ابدأ بإضافة أمر بيع جديد"
          action={{
            label: "أمر بيع جديد",
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
              <DataTableHeader label="العميل" />
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
              <DataTableHeader label="تاريخ التسليم" />
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
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales-orders/${order.id}`)}>
                <TableCell>
                  <EntityLink type="sales-order" id={order.id}>
                    {order.order_number}
                  </EntityLink>
                </TableCell>
                <TableCell>
                  {order.customers?.name ? (
                    <EntityLink type="customer" id={order.customer_id}>
                      {order.customers.name}
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
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('ar-EG') : '-'}
                </TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/sales-orders/${order.id}`)}>
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
                      deleteDescription="سيتم حذف أمر البيع وجميع بنوده نهائياً."
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
          <h1 className="text-2xl font-bold">أوامر البيع</h1>
          <p className="text-muted-foreground">إدارة أوامر البيع للعملاء</p>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="sales_orders"
              sectionLabel="أوامر البيع"
              data={sortedData}
              columns={[
                { key: 'order_number', label: 'رقم الأمر' },
                { key: 'customers.name', label: 'العميل' },
                { key: 'total_amount', label: 'الإجمالي' },
                { key: 'status', label: 'الحالة' },
                { key: 'delivery_date', label: 'تاريخ التسليم' },
                { key: 'created_at', label: 'تاريخ الإنشاء' },
              ]}
            />
          )}
          <Button onClick={handleNew} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {isMobile ? "جديد" : "أمر بيع جديد"}
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
                  placeholder="بحث برقم الأمر أو اسم العميل..."
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
              <CardTitle>قائمة أوامر البيع</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTableView()}
            </CardContent>
          </Card>
        </>
      )}

      <SalesOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrder}
      />

      {printOrderId && (
        <SalesOrderPrintView
          orderId={printOrderId}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default SalesOrdersPage;
