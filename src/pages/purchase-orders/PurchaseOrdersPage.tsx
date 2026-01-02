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
import { Plus, Search, ClipboardList, Printer, Eye } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  const { data: orders = [], isLoading } = useQuery({
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
      await supabase.from('purchase_order_items').delete().eq('order_id', id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: "تم حذف أمر الشراء بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أوامر الشراء</h1>
          <p className="text-muted-foreground">إدارة أوامر الشراء من الموردين</p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 ml-2" />
            أمر شراء جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
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
                <ClipboardList className="h-5 w-5 text-warning" />
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
                <ClipboardList className="h-5 w-5 text-success" />
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
                <ClipboardList className="h-5 w-5 text-info" />
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
              placeholder="بحث برقم الأمر أو اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قائمة أوامر الشراء</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد أوامر شراء</p>
              <Button variant="link" onClick={handleNew}>إضافة أمر شراء جديد</Button>
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
          )}
        </CardContent>
      </Card>

      <PurchaseOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrder}
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