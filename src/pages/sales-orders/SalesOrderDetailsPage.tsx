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
  ArrowRight, ShoppingCart, Printer, Edit, Package, Activity, Paperclip,
  User, Calendar, DollarSign, FileText, Receipt, Truck, MapPin, MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConvertDocument } from "@/hooks/useConvertDocument";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import SalesOrderFormDialog from "@/components/sales-orders/SalesOrderFormDialog";
import { SalesOrderPrintView } from "@/components/print/SalesOrderPrintView";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { MobileDetailItems, type DetailItemData } from "@/components/mobile/MobileDetailItems";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

const statusLabels: Record<string, string> = { draft: 'مسودة', pending: 'قيد الانتظار', approved: 'معتمد', cancelled: 'ملغي', completed: 'مكتمل' };
const statusColors: Record<string, string> = { draft: 'bg-muted text-muted-foreground', pending: 'bg-warning/10 text-warning border-warning/20', approved: 'bg-success/10 text-success border-success/20', cancelled: 'bg-destructive/10 text-destructive border-destructive/20', completed: 'bg-info/10 text-info border-info/20' };

const SalesOrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { convert, isConverting } = useConvertDocument();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('sales_orders').select('*, customers(*), quotations(id, quotation_number)').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as (SalesOrder & { customers: Customer | null; quotations: { id: string; quotation_number: string } | null }) | null;
    },
    enabled: !!id,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['sales-order-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('sales_order_items').select('*, products(id, name, sku), product_variants(id, name)').eq('order_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['sales-order-invoices', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('invoices').select('*').eq('order_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['sales-order-activities', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('activity_logs').select('*').eq('entity_type', 'sales_order').eq('entity_id', id).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCreateInvoice = () => { if (id) convert('order-to-invoice', id); };

  if (isLoading) return <DetailPageSkeleton variant="order" tabCount={4} />;
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على أمر البيع</p>
        <Button onClick={() => navigate('/sales-orders')}><ArrowRight className="h-4 w-4 ml-2" />العودة لأوامر البيع</Button>
      </div>
    );
  }

  const totalAmount = Number(order.total_amount || 0);

  const mobileStats = [
    { icon: DollarSign, value: totalAmount.toLocaleString(), label: 'إجمالي الأمر', color: 'text-primary' },
    { icon: Package, value: orderItems.length, label: 'عدد البنود', color: 'text-info' },
    { icon: Receipt, value: invoices.length, label: 'الفواتير', color: 'text-success' },
    { icon: MapPin, value: order.delivery_address ? 'محدد' : 'غير محدد', label: 'عنوان التسليم', color: 'text-warning' },
  ];

  const itemCards: DetailItemData[] = (orderItems as Array<{id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; products: {id: string; name: string} | null; product_variants: {id: string; name: string} | null}>).map(item => ({
    id: item.id, title: item.products?.name || 'منتج محذوف', subtitle: item.product_variants?.name,
    value: `${Number(item.total_price).toLocaleString()} ج.م`,
    details: [{ label: 'الكمية', value: String(item.quantity) }, { label: 'السعر', value: `${Number(item.unit_price).toLocaleString()}` }, ...(Number(item.discount_percentage || 0) > 0 ? [{ label: 'الخصم', value: `${item.discount_percentage}%` }] : [])],
  }));

  const mobileActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="min-h-11 min-w-11"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setPrintDialogOpen(true)}><Printer className="h-4 w-4 ml-2" />طباعة</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 ml-2" />تعديل</DropdownMenuItem>
        {order.status === 'approved' && <DropdownMenuItem onClick={handleCreateInvoice} disabled={isConverting}><Receipt className="h-4 w-4 ml-2" />إنشاء فاتورة</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <MobileDetailHeader title={order.order_number} backTo="/sales-orders" action={mobileActions} />
      {!isMobile && <Button variant="ghost" onClick={() => navigate('/sales-orders')} className="mb-2"><ArrowRight className="h-4 w-4 ml-2" />العودة لأوامر البيع</Button>}

      {/* Hero */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-2xl bg-primary/10"><ShoppingCart className="h-8 w-8 md:h-10 md:w-10 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold font-mono">{order.order_number}</h1>
                  <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                </div>
                {order.customers && <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /><EntityLink type="customer" id={order.customers.id}>{order.customers.name}</EntityLink></div>}
                <div className="flex items-center gap-3 md:gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                  {order.delivery_date && <span className="flex items-center gap-1"><Truck className="h-4 w-4" />التسليم: {new Date(order.delivery_date).toLocaleDateString('ar-EG')}</span>}
                </div>
                {order.quotations && <div className="flex items-center gap-2 mt-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">من عرض سعر:</span><EntityLink type="quotation" id={order.quotations.id}>{order.quotations.quotation_number}</EntityLink></div>}
              </div>
            </div>
            {!isMobile && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}><Printer className="h-4 w-4 ml-2" />طباعة</Button>
                <WhatsAppShareButton customerPhone={order.customers?.phone} documentType="sales_order" documentNumber={order.order_number} customerName={order.customers?.name || 'العميل'} totalAmount={totalAmount} size="sm" />
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 ml-2" />تعديل</Button>
                {order.status === 'approved' && <Button size="sm" onClick={handleCreateInvoice} disabled={isConverting}><Receipt className="h-4 w-4 ml-2" />إنشاء فاتورة</Button>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {isMobile ? <MobileStatsScroll stats={mobileStats} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalAmount.toLocaleString()}</p><p className="text-sm text-muted-foreground">إجمالي الأمر</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Package className="h-5 w-5 text-info" /></div><div><p className="text-2xl font-bold">{orderItems.length}</p><p className="text-sm text-muted-foreground">عدد البنود</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><Receipt className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{invoices.length}</p><p className="text-sm text-muted-foreground">الفواتير</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><MapPin className="h-5 w-5 text-warning" /></div><div><p className="text-sm font-medium truncate max-w-[150px]">{order.delivery_address || 'غير محدد'}</p><p className="text-sm text-muted-foreground">عنوان التسليم</p></div></div></CardContent></Card>
        </div>
      )}

      {/* Mobile: Collapsible Sections */}
      {isMobile && (
        <div className="space-y-3 mt-4">
          <MobileDetailSection title="بنود الأمر" priority="medium" icon={<Package className="h-4 w-4" />} badge={orderItems.length}>
            <MobileDetailItems items={itemCards} emptyIcon={<Package className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد بنود" />
            {orderItems.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(order.subtotal).toLocaleString()} ج.م</span></div>
                {Number(order.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(order.discount_amount).toLocaleString()} ج.م</span></div>}
                {Number(order.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(order.tax_amount).toLocaleString()} ج.م</span></div>}
                <div className="flex justify-between font-bold text-base pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
              </div>
            )}
          </MobileDetailSection>
          <MobileDetailSection title="الفواتير المرتبطة" priority="medium" icon={<Receipt className="h-4 w-4" />} badge={invoices.length}>
            <MobileDetailItems
              items={(invoices as Array<{id: string; invoice_number: string; created_at: string; total_amount: number; payment_status: string}>).map(inv => ({
                id: inv.id, title: inv.invoice_number, value: `${Number(inv.total_amount).toLocaleString()} ج.م`,
                details: [{ label: 'التاريخ', value: new Date(inv.created_at).toLocaleDateString('ar-EG') }],
                badge: <Badge variant={inv.payment_status === 'paid' ? 'default' : 'secondary'}>{inv.payment_status === 'paid' ? 'مدفوع' : inv.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}</Badge>,
              }))}
              emptyIcon={<Receipt className="h-12 w-12 text-muted-foreground/50" />}
              emptyMessage="لا توجد فواتير مرتبطة"
            />
          </MobileDetailSection>
          <MobileDetailSection title="سجل النشاط" priority="low" icon={<Activity className="h-4 w-4" />} badge={activities.length}>
            {activities.length > 0 ? (
              <div className="space-y-2">
                {(activities as Array<{id: string; action: string; created_at: string}>).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="p-1.5 rounded-full bg-primary/10 shrink-0"><Activity className="h-3 w-3 text-primary" /></div>
                    <div className="min-w-0"><p className="text-xs font-medium">{a.action}</p><p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString('ar-EG')}</p></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">لا يوجد نشاط</p>}
          </MobileDetailSection>
          <MobileDetailSection title="المرفقات" priority="low" icon={<Paperclip className="h-4 w-4" />}>
            <div className="space-y-3">
              <FileUpload entityType="sales_order" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'sales_order', id] })} />
              <AttachmentsList entityType="sales_order" entityId={id!} />
            </div>
          </MobileDetailSection>
        </div>
      )}

      {/* Desktop: Tabs */}
      {!isMobile && (
      <Tabs defaultValue="items" className="mt-6">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="items" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Package className="h-3.5 w-3.5" />بنود الأمر ({orderItems.length})</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Receipt className="h-3.5 w-3.5" />الفواتير ({invoices.length})</TabsTrigger>
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
                      {Number(order.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(order.discount_amount).toLocaleString()} ج.م</span></div>}
                      {Number(order.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(order.tax_amount).toLocaleString()} ج.م</span></div>}
                      <div className="flex justify-between font-bold text-base pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {orderItems.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>سعر الوحدة</TableHead><TableHead>الخصم</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(orderItems as Array<{id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; products: {id: string; name: string} | null; product_variants: {id: string; name: string} | null}>).map(item => (
                          <TableRow key={item.id}>
                            <TableCell><div className="flex flex-col"><EntityLink type="product" id={item.products?.id}>{item.products?.name || 'منتج محذوف'}</EntityLink>{item.product_variants && <span className="text-xs text-muted-foreground">{item.product_variants.name}</span>}</div></TableCell>
                            <TableCell>{item.quantity}</TableCell><TableCell>{Number(item.unit_price).toLocaleString()} ج.م</TableCell>
                            <TableCell>{Number(item.discount_percentage || 0)}%</TableCell><TableCell className="font-bold">{Number(item.total_price).toLocaleString()} ج.م</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <div className="text-center py-8"><Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد بنود في هذا الأمر</p></div>}
                  {orderItems.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(order.subtotal).toLocaleString()} ج.م</span></div>
                      {Number(order.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(order.discount_amount).toLocaleString()} ج.م</span></div>}
                      {Number(order.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(order.tax_amount).toLocaleString()} ج.م</span></div>}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>الفواتير المرتبطة</CardTitle><CardDescription>الفواتير المنشأة من هذا الأمر</CardDescription></div>
              {order.status === 'approved' && <Button size="sm" onClick={handleCreateInvoice}><Receipt className="h-4 w-4 ml-2" />إنشاء فاتورة</Button>}
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                isMobile ? (
                  <MobileDetailItems
                    items={(invoices as Array<{id: string; invoice_number: string; created_at: string; total_amount: number; payment_status: string}>).map(inv => ({
                      id: inv.id, title: inv.invoice_number, value: `${Number(inv.total_amount).toLocaleString()} ج.م`,
                      details: [{ label: 'التاريخ', value: new Date(inv.created_at).toLocaleDateString('ar-EG') }],
                      badge: <Badge variant={inv.payment_status === 'paid' ? 'default' : 'secondary'}>{inv.payment_status === 'paid' ? 'مدفوع' : inv.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}</Badge>,
                    }))}
                  />
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>رقم الفاتورة</TableHead><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>حالة الدفع</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(invoices as Array<{id: string; invoice_number: string; created_at: string; total_amount: number; payment_status: string}>).map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell><EntityLink type="invoice" id={inv.id}>{inv.invoice_number}</EntityLink></TableCell>
                          <TableCell>{new Date(inv.created_at).toLocaleDateString('ar-EG')}</TableCell>
                          <TableCell className="font-bold">{Number(inv.total_amount).toLocaleString()} ج.م</TableCell>
                          <TableCell><Badge variant={inv.payment_status === 'paid' ? 'default' : 'secondary'}>{inv.payment_status === 'paid' ? 'مدفوع' : inv.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : (
                <div className="text-center py-8"><Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد فواتير مرتبطة</p>{order.status === 'approved' && <Button onClick={handleCreateInvoice} variant="outline" size="sm" className="mt-4">إنشاء أول فاتورة</Button>}</div>
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
              <FileUpload entityType="sales_order" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'sales_order', id] })} />
              <AttachmentsList entityType="sales_order" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <SalesOrderFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} order={order} />
      {id && <SalesOrderPrintView orderId={id} open={printDialogOpen} onOpenChange={setPrintDialogOpen} />}
    </div>
  );
};

export default SalesOrderDetailsPage;
