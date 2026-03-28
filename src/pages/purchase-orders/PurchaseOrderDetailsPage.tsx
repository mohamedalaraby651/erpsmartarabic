import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, ClipboardList, Printer, Edit, Package, Activity, Paperclip,
  Truck, Calendar, DollarSign, CreditCard, MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import PurchaseOrderFormDialog from "@/components/purchase-orders/PurchaseOrderFormDialog";
import { PurchaseOrderPrintView } from "@/components/print/PurchaseOrderPrintView";
import SupplierPaymentDialog from "@/components/suppliers/SupplierPaymentDialog";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { MobileDetailItems, type DetailItemData } from "@/components/mobile/MobileDetailItems";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];

const statusLabels: Record<string, string> = { draft: 'مسودة', pending: 'قيد الانتظار', approved: 'معتمد', cancelled: 'ملغي', completed: 'مكتمل' };
const statusColors: Record<string, string> = { draft: 'bg-muted text-muted-foreground', pending: 'bg-warning/10 text-warning border-warning/20', approved: 'bg-success/10 text-success border-success/20', cancelled: 'bg-destructive/10 text-destructive border-destructive/20', completed: 'bg-info/10 text-info border-info/20' };

const paymentMethodLabels: Record<string, string> = { cash: "نقدي", bank_transfer: "تحويل بنكي", credit: "آجل", installment: "تقسيط", advance_payment: "دفعة مقدمة" };

const PurchaseOrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('purchase_orders').select('*, suppliers(*)').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as (PurchaseOrder & { suppliers: Supplier | null }) | null;
    },
    enabled: !!id,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['purchase-order-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('purchase_order_items').select('*, products(id, name, sku), product_variants(id, name)').eq('order_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['purchase-order-payments', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('supplier_payments').select('*').eq('purchase_order_id', id).order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['purchase-order-activities', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('activity_logs').select('*').eq('entity_type', 'purchase_order').eq('entity_id', id).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <DetailPageSkeleton variant="order" tabCount={4} />;
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على أمر الشراء</p>
        <Button onClick={() => navigate('/purchase-orders')}><ArrowRight className="h-4 w-4 ml-2" />العودة لأوامر الشراء</Button>
      </div>
    );
  }

  const totalAmount = Number(order.total_amount || 0);
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingAmount = totalAmount - paidAmount;

  const mobileStats = [
    { icon: DollarSign, value: totalAmount.toLocaleString(), label: 'إجمالي الأمر', color: 'text-primary' },
    { icon: CreditCard, value: paidAmount.toLocaleString(), label: 'المدفوع', color: 'text-success' },
    { icon: DollarSign, value: remainingAmount.toLocaleString(), label: 'المتبقي', color: 'text-warning' },
    { icon: Package, value: orderItems.length, label: 'عدد البنود', color: 'text-info' },
  ];

  const itemCards: DetailItemData[] = (orderItems as Array<{id: string; quantity: number; unit_price: number; total_price: number; products: {id: string; name: string} | null; product_variants: {id: string; name: string} | null}>).map(item => ({
    id: item.id, title: item.products?.name || 'منتج محذوف', subtitle: item.product_variants?.name,
    value: `${Number(item.total_price).toLocaleString()} ج.م`,
    details: [{ label: 'الكمية', value: String(item.quantity) }, { label: 'السعر', value: `${Number(item.unit_price).toLocaleString()}` }],
  }));

  const paymentCards: DetailItemData[] = (payments as Array<{id: string; payment_number: string; payment_date: string; amount: number; payment_method: string; reference_number: string | null}>).map(p => ({
    id: p.id, title: p.payment_number, value: `${Number(p.amount).toLocaleString()} ج.م`,
    details: [{ label: 'التاريخ', value: new Date(p.payment_date).toLocaleDateString('ar-EG') }, { label: 'الطريقة', value: paymentMethodLabels[p.payment_method] || p.payment_method }],
  }));

  const mobileActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="min-h-11 min-w-11"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setPrintDialogOpen(true)}><Printer className="h-4 w-4 ml-2" />طباعة</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 ml-2" />تعديل</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}><CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <MobileDetailHeader title={order.order_number} backTo="/purchase-orders" action={mobileActions} />
      {!isMobile && <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="mb-2"><ArrowRight className="h-4 w-4 ml-2" />العودة لأوامر الشراء</Button>}

      {/* Hero */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-2xl bg-primary/10"><ClipboardList className="h-8 w-8 md:h-10 md:w-10 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold font-mono">{order.order_number}</h1>
                  <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                </div>
                {order.suppliers && <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4" /><EntityLink type="supplier" id={order.suppliers.id}>{order.suppliers.name}</EntityLink></div>}
                <div className="flex items-center gap-3 md:gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                  {order.expected_date && <span className="flex items-center gap-1"><Package className="h-4 w-4" />التوريد: {new Date(order.expected_date).toLocaleDateString('ar-EG')}</span>}
                </div>
              </div>
            </div>
            {!isMobile && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}><Printer className="h-4 w-4 ml-2" />طباعة</Button>
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 ml-2" />تعديل</Button>
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)}><CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {isMobile ? <MobileStatsScroll stats={mobileStats} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalAmount.toLocaleString()}</p><p className="text-sm text-muted-foreground">إجمالي الأمر</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><CreditCard className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{paidAmount.toLocaleString()}</p><p className="text-sm text-muted-foreground">المدفوع</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><DollarSign className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{remainingAmount.toLocaleString()}</p><p className="text-sm text-muted-foreground">المتبقي</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Package className="h-5 w-5 text-info" /></div><div><p className="text-2xl font-bold">{orderItems.length}</p><p className="text-sm text-muted-foreground">عدد البنود</p></div></div></CardContent></Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="items" className="mt-6">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="items" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Package className="h-3.5 w-3.5" />بنود الأمر ({orderItems.length})</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><CreditCard className="h-3.5 w-3.5" />المدفوعات ({payments.length})</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Activity className="h-3.5 w-3.5" />سجل النشاط</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Paperclip className="h-3.5 w-3.5" />المرفقات</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader><CardTitle>بنود الأمر</CardTitle><CardDescription>تفاصيل المنتجات في هذا الأمر</CardDescription></CardHeader>
            <CardContent>
              {isMobile ? (
                <>
                  <MobileDetailItems items={itemCards} emptyIcon={<Package className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد بنود في هذا الأمر" />
                  {orderItems.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                      <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(order.subtotal).toLocaleString()} ج.م</span></div>
                      {Number(order.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(order.tax_amount).toLocaleString()} ج.م</span></div>}
                      <div className="flex justify-between font-bold text-base pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {orderItems.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>سعر الوحدة</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(orderItems as Array<{id: string; quantity: number; unit_price: number; total_price: number; products: {id: string; name: string} | null; product_variants: {id: string; name: string} | null}>).map(item => (
                          <TableRow key={item.id}>
                            <TableCell><div className="flex flex-col"><EntityLink type="product" id={item.products?.id}>{item.products?.name || 'منتج محذوف'}</EntityLink>{item.product_variants && <span className="text-xs text-muted-foreground">{item.product_variants.name}</span>}</div></TableCell>
                            <TableCell>{item.quantity}</TableCell><TableCell>{Number(item.unit_price).toLocaleString()} ج.م</TableCell>
                            <TableCell className="font-bold">{Number(item.total_price).toLocaleString()} ج.م</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <div className="text-center py-8"><Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد بنود في هذا الأمر</p></div>}
                  {orderItems.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(order.subtotal).toLocaleString()} ج.م</span></div>
                      {Number(order.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(order.tax_amount).toLocaleString()} ج.م</span></div>}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>سجل المدفوعات</CardTitle><CardDescription>المدفوعات المسجلة على هذا الأمر</CardDescription></div>
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}><CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة</Button>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <MobileDetailItems items={paymentCards} emptyIcon={<CreditCard className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد مدفوعات مسجلة" />
              ) : payments.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>رقم الدفعة</TableHead><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>طريقة الدفع</TableHead><TableHead>رقم المرجع</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(payments as Array<{id: string; payment_number: string; payment_date: string; amount: number; payment_method: string; reference_number: string | null}>).map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.payment_number}</TableCell>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString('ar-EG')}</TableCell>
                        <TableCell className="font-bold text-success">{Number(p.amount).toLocaleString()} ج.م</TableCell>
                        <TableCell>{paymentMethodLabels[p.payment_method]}</TableCell>
                        <TableCell>{p.reference_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8"><CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد مدفوعات مسجلة</p><Button onClick={() => setPaymentDialogOpen(true)} variant="outline" size="sm" className="mt-4">تسجيل أول دفعة</Button></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader><CardTitle>سجل النشاط</CardTitle><CardDescription>آخر الأحداث على هذا الأمر</CardDescription></CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {(activities as Array<{id: string; action: string; created_at: string}>).map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-full bg-primary/10"><Activity className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1"><p className="text-sm font-medium">{a.action}</p><p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('ar-EG')}</p></div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8"><Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا يوجد سجل نشاط</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />المستندات والمرفقات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FileUpload entityType="purchase_order" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'purchase_order', id] })} />
              <AttachmentsList entityType="purchase_order" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PurchaseOrderFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} order={order} />
      {order.suppliers && <SupplierPaymentDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} supplier={order.suppliers} />}
      {id && <PurchaseOrderPrintView orderId={id} open={printDialogOpen} onOpenChange={setPrintDialogOpen} />}
    </div>
  );
};

export default PurchaseOrderDetailsPage;
