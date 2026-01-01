import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  ShoppingCart,
  Printer,
  Edit,
  Package,
  Activity,
  Paperclip,
  User,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  Truck,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import SalesOrderFormDialog from "@/components/sales-orders/SalesOrderFormDialog";
import { SalesOrderPrintView } from "@/components/print/SalesOrderPrintView";
import type { Database } from "@/integrations/supabase/types";

type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  cancelled: 'ملغي',
  completed: 'مكتمل',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  completed: 'bg-info/10 text-info border-info/20',
};

const SalesOrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Fetch order with customer
  const { data: order, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(*), quotations(id, quotation_number)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as (SalesOrder & { 
        customers: Customer | null;
        quotations: { id: string; quotation_number: string } | null;
      }) | null;
    },
    enabled: !!id,
  });

  // Fetch order items
  const { data: orderItems = [] } = useQuery({
    queryKey: ['sales-order-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('sales_order_items')
        .select('*, products(id, name, sku), product_variants(id, name)')
        .eq('order_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['sales-order-invoices', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch activity logs
  const { data: activities = [] } = useQuery({
    queryKey: ['sales-order-activities', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'sales_order')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCreateInvoice = () => {
    navigate('/invoices', { state: { prefillOrderId: id } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground">جاري التحميل...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على أمر البيع</p>
        <Button onClick={() => navigate('/sales-orders')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة لأوامر البيع
        </Button>
      </div>
    );
  }

  const totalAmount = Number(order.total_amount || 0);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/sales-orders')} className="mb-2">
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة لأوامر البيع
      </Button>

      {/* Hero Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Order Info */}
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-2xl bg-primary/10">
                <ShoppingCart className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
                  <Badge className={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>
                {order.customers && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <EntityLink type="customer" id={order.customers.id}>
                      {order.customers.name}
                    </EntityLink>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  {order.delivery_date && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      التسليم: {new Date(order.delivery_date).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
                {order.quotations && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">من عرض سعر:</span>
                    <EntityLink type="quotation" id={order.quotations.id}>
                      {order.quotations.quotation_number}
                    </EntityLink>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </Button>
              {order.status === 'approved' && (
                <Button size="sm" onClick={handleCreateInvoice}>
                  <Receipt className="h-4 w-4 ml-2" />
                  إنشاء فاتورة
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي الأمر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orderItems.length}</p>
                <p className="text-sm text-muted-foreground">عدد البنود</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Receipt className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-sm text-muted-foreground">الفواتير</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <MapPin className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium truncate max-w-[150px]">
                  {order.delivery_address || 'غير محدد'}
                </p>
                <p className="text-sm text-muted-foreground">عنوان التسليم</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            بنود الأمر ({orderItems.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            الفواتير ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            سجل النشاط
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <Paperclip className="h-4 w-4" />
            المرفقات
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>بنود الأمر</CardTitle>
              <CardDescription>تفاصيل المنتجات في هذا الأمر</CardDescription>
            </CardHeader>
            <CardContent>
              {orderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>سعر الوحدة</TableHead>
                      <TableHead>الخصم</TableHead>
                      <TableHead>الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <EntityLink type="product" id={item.products?.id}>
                              {item.products?.name || 'منتج محذوف'}
                            </EntityLink>
                            {item.product_variants && (
                              <span className="text-xs text-muted-foreground">
                                {item.product_variants.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{Number(item.unit_price).toLocaleString()} ج.م</TableCell>
                        <TableCell>{Number(item.discount_percentage || 0)}%</TableCell>
                        <TableCell className="font-bold">
                          {Number(item.total_price).toLocaleString()} ج.م
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد بنود في هذا الأمر</p>
                </div>
              )}

              {/* Summary */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي</span>
                    <span>{Number(order.subtotal).toLocaleString()} ج.م</span>
                  </div>
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-success">
                      <span>الخصم</span>
                      <span>-{Number(order.discount_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {Number(order.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>الضريبة</span>
                      <span>{Number(order.tax_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>الإجمالي</span>
                    <span>{totalAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الفواتير المرتبطة</CardTitle>
                <CardDescription>الفواتير المنشأة من هذا الأمر</CardDescription>
              </div>
              {order.status === 'approved' && (
                <Button size="sm" onClick={handleCreateInvoice}>
                  <Receipt className="h-4 w-4 ml-2" />
                  إنشاء فاتورة
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>حالة الدفع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <EntityLink type="invoice" id={invoice.id}>
                            {invoice.invoice_number}
                          </EntityLink>
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell className="font-bold">
                          {Number(invoice.total_amount).toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.payment_status === 'paid' ? 'مدفوع' : 
                             invoice.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد فواتير مرتبطة</p>
                  {order.status === 'approved' && (
                    <Button onClick={handleCreateInvoice} variant="outline" size="sm" className="mt-4">
                      إنشاء أول فاتورة
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
              <CardDescription>آخر الأحداث على هذا الأمر</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا يوجد سجل نشاط</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                المستندات والمرفقات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                entityType="sales_order"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'sales_order', id] })}
              />
              <AttachmentsList entityType="sales_order" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SalesOrderFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={order}
      />

      {id && (
        <SalesOrderPrintView
          orderId={id}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default SalesOrderDetailsPage;
