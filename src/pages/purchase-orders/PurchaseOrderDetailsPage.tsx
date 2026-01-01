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
  ClipboardList,
  Printer,
  Edit,
  Package,
  Activity,
  Paperclip,
  Truck,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import PurchaseOrderFormDialog from "@/components/purchase-orders/PurchaseOrderFormDialog";
import { PurchaseOrderPrintView } from "@/components/print/PurchaseOrderPrintView";
import SupplierPaymentDialog from "@/components/suppliers/SupplierPaymentDialog";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];

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

const PurchaseOrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch order with supplier
  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as (PurchaseOrder & { suppliers: Supplier | null }) | null;
    },
    enabled: !!id,
  });

  // Fetch order items
  const { data: orderItems = [] } = useQuery({
    queryKey: ['purchase-order-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, products(id, name, sku), product_variants(id, name)')
        .eq('order_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related payments
  const { data: payments = [] } = useQuery({
    queryKey: ['purchase-order-payments', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*')
        .eq('purchase_order_id', id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch activity logs
  const { data: activities = [] } = useQuery({
    queryKey: ['purchase-order-activities', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'purchase_order')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const paymentMethodLabels: Record<string, string> = {
    cash: "نقدي",
    bank_transfer: "تحويل بنكي",
    credit: "آجل",
    installment: "تقسيط",
    advance_payment: "دفعة مقدمة",
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
        <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على أمر الشراء</p>
        <Button onClick={() => navigate('/purchase-orders')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة لأوامر الشراء
        </Button>
      </div>
    );
  }

  const totalAmount = Number(order.total_amount || 0);
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="mb-2">
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة لأوامر الشراء
      </Button>

      {/* Hero Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Order Info */}
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-2xl bg-primary/10">
                <ClipboardList className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
                  <Badge className={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>
                {order.suppliers && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <EntityLink type="supplier" id={order.suppliers.id}>
                      {order.suppliers.name}
                    </EntityLink>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  {order.expected_date && (
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      التوريد: {new Date(order.expected_date).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
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
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-4 w-4 ml-2" />
                تسجيل دفعة
              </Button>
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
              <div className="p-2 rounded-lg bg-success/10">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">المدفوع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{remainingAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">المتبقي</p>
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
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            بنود الأمر ({orderItems.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            المدفوعات ({payments.length})
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>سجل المدفوعات</CardTitle>
                <CardDescription>المدفوعات المسجلة على هذا الأمر</CardDescription>
              </div>
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-4 w-4 ml-2" />
                تسجيل دفعة
              </Button>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الدفعة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>رقم المرجع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.payment_number}</TableCell>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell className="font-bold text-success">
                          {Number(payment.amount).toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>{paymentMethodLabels[payment.payment_method]}</TableCell>
                        <TableCell>{payment.reference_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد مدفوعات مسجلة</p>
                  <Button onClick={() => setPaymentDialogOpen(true)} variant="outline" size="sm" className="mt-4">
                    تسجيل أول دفعة
                  </Button>
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
                entityType="purchase_order"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'purchase_order', id] })}
              />
              <AttachmentsList entityType="purchase_order" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PurchaseOrderFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={order}
      />

      {order.suppliers && (
        <SupplierPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          supplier={order.suppliers}
        />
      )}

      {id && (
        <PurchaseOrderPrintView
          orderId={id}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default PurchaseOrderDetailsPage;
