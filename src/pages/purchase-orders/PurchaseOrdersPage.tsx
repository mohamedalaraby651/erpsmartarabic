import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Printer, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PurchaseOrderFormDialog from "@/components/purchase-orders/PurchaseOrderFormDialog";
import { PurchaseOrderPrintView } from "@/components/print/PurchaseOrderPrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
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
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const PurchaseOrdersPage = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(search.toLowerCase()) ||
    order.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedOrder(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">أوامر الشراء</h1>
        <div className="flex gap-2">
          <ExportWithTemplateButton
            section="purchase_orders"
            sectionLabel="أوامر الشراء"
            data={orders}
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الأمر</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ التوريد المتوقع</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  لا توجد أوامر شراء
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.suppliers?.name || '-'}</TableCell>
                  <TableCell>{Number(order.total_amount).toLocaleString()} ج.م</TableCell>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(order)}>
                          <Edit className="h-4 w-4 ml-2" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPrintOrderId(order.id); setPrintDialogOpen(true); }}>
                          <Printer className="h-4 w-4 ml-2" />
                          طباعة
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(order.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
