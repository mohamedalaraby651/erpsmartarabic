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
import { Plus, Search, ShoppingCart, Printer, Eye } from "lucide-react";
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

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  const { data: orders = [], isLoading } = useQuery({
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أوامر البيع</h1>
          <p className="text-muted-foreground">إدارة أوامر البيع للعملاء</p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 ml-2" />
            أمر بيع جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الأوامر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <ShoppingCart className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <ShoppingCart className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">مكتملة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <ShoppingCart className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي القيمة (ج.م)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>قائمة أوامر البيع</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد أوامر بيع</p>
              <Button variant="link" onClick={handleNew}>إضافة أمر بيع جديد</Button>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

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