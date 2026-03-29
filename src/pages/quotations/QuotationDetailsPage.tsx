import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useConvertDocument } from "@/hooks/useConvertDocument";
import { WorkflowPipeline } from "@/components/shared/WorkflowPipeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, FileText, Printer, Edit, Package, Activity, Paperclip,
  User, Calendar, DollarSign, ShoppingCart, Receipt, AlertTriangle, Clock, Copy, MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import QuotationFormDialog from "@/components/quotations/QuotationFormDialog";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { MobileDetailItems, type DetailItemData } from "@/components/mobile/MobileDetailItems";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type Quotation = Database['public']['Tables']['quotations']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

const statusLabels: Record<string, string> = { draft: 'مسودة', pending: 'معلق', approved: 'معتمد', rejected: 'مرفوض', cancelled: 'ملغي' };
const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20', rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground',
};

const QuotationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { convert, isConverting } = useConvertDocument();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('quotations').select('*, customers(*)').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as (Quotation & { customers: Customer | null }) | null;
    },
    enabled: !!id,
  });

  const { data: quotationItems = [] } = useQuery({
    queryKey: ['quotation-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('quotation_items').select('*, products(id, name, sku), product_variants(id, name)').eq('quotation_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['quotation-sales-orders', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('sales_orders').select('*').eq('quotation_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['quotation-activities', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('activity_logs').select('*').eq('entity_type', 'quotation').eq('entity_id', id).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCreateSalesOrder = () => { if (id) convert('quotation-to-order', id); };
  const handleCreateInvoice = () => { if (id) convert('quotation-to-invoice', id); };

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!quotation) throw new Error('No quotation to duplicate');
      const timestamp = Date.now().toString().slice(-6);
      const newQuotationNumber = `QT-${new Date().getFullYear()}-${timestamp}`;
      const { data: newQuotation, error: quotationError } = await supabase.from('quotations').insert({
        customer_id: quotation.customer_id, quotation_number: newQuotationNumber, status: 'draft',
        subtotal: quotation.subtotal, discount_amount: quotation.discount_amount, tax_amount: quotation.tax_amount,
        total_amount: quotation.total_amount, valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: quotation.notes,
      }).select().single();
      if (quotationError) throw quotationError;
      if (quotationItems.length > 0) {
        type QI = { product_id: string; variant_id: string | null; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; notes: string | null };
        const newItems = (quotationItems as QI[]).map(item => ({
          quotation_id: newQuotation.id, product_id: item.product_id, variant_id: item.variant_id,
          quantity: item.quantity, unit_price: item.unit_price, discount_percentage: item.discount_percentage,
          total_price: item.total_price, notes: item.notes,
        }));
        const { error: itemsError } = await supabase.from('quotation_items').insert(newItems);
        if (itemsError) throw itemsError;
      }
      return newQuotation;
    },
    onSuccess: (nq) => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast({ title: "تم نسخ عرض السعر بنجاح", description: `تم إنشاء عرض سعر جديد برقم ${nq.quotation_number}` }); navigate(`/quotations/${nq.id}`); },
    onError: (error) => { logErrorSafely('QuotationDetailsPage', error); toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" }); },
  });

  if (isLoading) return <DetailPageSkeleton variant="order" tabCount={4} />;
  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على عرض السعر</p>
        <Button onClick={() => navigate('/quotations')}><ArrowRight className="h-4 w-4 ml-2" />العودة لعروض الأسعار</Button>
      </div>
    );
  }

  const totalAmount = Number(quotation.total_amount || 0);
  const isExpired = quotation.valid_until && new Date(quotation.valid_until) < new Date();
  const daysUntilExpiry = quotation.valid_until ? Math.ceil((new Date(quotation.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const mobileStats = [
    { icon: DollarSign, value: totalAmount.toLocaleString(), label: 'إجمالي العرض', color: 'text-primary' },
    { icon: Package, value: quotationItems.length, label: 'عدد البنود', color: 'text-info' },
    { icon: ShoppingCart, value: salesOrders.length, label: 'أوامر البيع', color: 'text-success' },
    { icon: Clock, value: isExpired ? 'منتهي' : daysUntilExpiry !== null ? `${daysUntilExpiry} يوم` : '-', label: 'الصلاحية', color: isExpired ? 'text-destructive' : 'text-warning' },
  ];

  const itemCards: DetailItemData[] = (quotationItems as Array<{ id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; products: { id: string; name: string } | null; product_variants: { id: string; name: string } | null }>).map(item => ({
    id: item.id,
    title: item.products?.name || 'منتج محذوف',
    subtitle: item.product_variants?.name,
    value: `${Number(item.total_price).toLocaleString()} ج.م`,
    details: [
      { label: 'الكمية', value: String(item.quantity) },
      { label: 'السعر', value: `${Number(item.unit_price).toLocaleString()}` },
      ...(Number(item.discount_percentage || 0) > 0 ? [{ label: 'الخصم', value: `${item.discount_percentage}%` }] : []),
    ],
  }));

  // Mobile actions dropdown
  const mobileActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="min-h-11 min-w-11"><MoreVertical className="h-5 w-5" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setPrintDialogOpen(true)}><Printer className="h-4 w-4 ml-2" />طباعة</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 ml-2" />تعديل</DropdownMenuItem>
        <DropdownMenuItem onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}><Copy className="h-4 w-4 ml-2" />نسخ</DropdownMenuItem>
        {quotation.status === 'approved' && !isExpired && (
          <>
            <DropdownMenuItem onClick={handleCreateSalesOrder} disabled={isConverting}><ShoppingCart className="h-4 w-4 ml-2" />تحويل لأمر بيع</DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateInvoice} disabled={isConverting}><Receipt className="h-4 w-4 ml-2" />تحويل لفاتورة</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <MobileDetailHeader title={quotation.quotation_number} backTo="/quotations" action={mobileActions} />

      {/* Desktop back button */}
      {!isMobile && (
        <Button variant="ghost" onClick={() => navigate('/quotations')} className="mb-2">
          <ArrowRight className="h-4 w-4 ml-2" />العودة لعروض الأسعار
        </Button>
      )}

      {/* Hero Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-2xl bg-primary/10">
                <FileText className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold font-mono">{quotation.quotation_number}</h1>
                  <Badge className={statusColors[quotation.status]}>{statusLabels[quotation.status]}</Badge>
                  {isExpired && <Badge variant="destructive">منتهي الصلاحية</Badge>}
                </div>
                {quotation.customers && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <EntityLink type="customer" id={quotation.customers.id}>{quotation.customers.name}</EntityLink>
                  </div>
                )}
                <div className="flex items-center gap-3 md:gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(quotation.created_at).toLocaleDateString('ar-EG')}</span>
                  {quotation.valid_until && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />صالح حتى: {new Date(quotation.valid_until).toLocaleDateString('ar-EG')}</span>}
                </div>
              </div>
            </div>
            {/* Desktop actions */}
            {!isMobile && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}><Printer className="h-4 w-4 ml-2" />طباعة</Button>
                <WhatsAppShareButton customerPhone={quotation.customers?.phone} documentType="quotation" documentNumber={quotation.quotation_number} customerName={quotation.customers?.name || 'العميل'} totalAmount={totalAmount} validUntil={quotation.valid_until} size="sm" />
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4 ml-2" />تعديل</Button>
                <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}><Copy className="h-4 w-4 ml-2" />نسخ</Button>
                {quotation.status === 'approved' && !isExpired && (
                  <>
                    <Button size="sm" onClick={handleCreateSalesOrder} disabled={isConverting}><ShoppingCart className="h-4 w-4 ml-2" />تحويل لأمر بيع</Button>
                    <Button size="sm" variant="outline" onClick={handleCreateInvoice} disabled={isConverting}><Receipt className="h-4 w-4 ml-2" />تحويل لفاتورة</Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Pipeline */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>مسار الصفقة</span>
        </div>
        <WorkflowPipeline steps={[
          { label: 'عرض سعر', status: 'current', entityType: 'quotation', entityId: id!, entityNumber: quotation.quotation_number },
          { label: 'أمر بيع', status: salesOrders.length > 0 ? 'completed' : 'upcoming', ...(salesOrders.length > 0 ? { entityType: 'sales-order' as const, entityId: salesOrders[0].id, entityNumber: (salesOrders[0] as any).order_number } : {}) },
          { label: 'فاتورة', status: 'upcoming' },
        ]} />
      </Card>

      {/* Alerts */}
      {isExpired && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>عرض سعر منتهي الصلاحية</AlertTitle><AlertDescription>انتهت صلاحية هذا العرض. يمكنك نسخه وإنشاء عرض جديد.</AlertDescription></Alert>}
      {!isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
        <Alert><Clock className="h-4 w-4" /><AlertTitle>قرب انتهاء الصلاحية</AlertTitle><AlertDescription>ستنتهي صلاحية هذا العرض خلال {daysUntilExpiry} {daysUntilExpiry === 1 ? 'يوم' : 'أيام'}.</AlertDescription></Alert>
      )}

      {/* Stats */}
      {isMobile ? (
        <MobileStatsScroll stats={mobileStats} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalAmount.toLocaleString()}</p><p className="text-sm text-muted-foreground">إجمالي العرض</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Package className="h-5 w-5 text-info" /></div><div><p className="text-2xl font-bold">{quotationItems.length}</p><p className="text-sm text-muted-foreground">عدد البنود</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><ShoppingCart className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{salesOrders.length}</p><p className="text-sm text-muted-foreground">أوامر البيع</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isExpired ? 'bg-destructive/10' : 'bg-warning/10'}`}><Clock className={`h-5 w-5 ${isExpired ? 'text-destructive' : 'text-warning'}`} /></div><div><p className="text-sm font-medium">{isExpired ? 'منتهي' : daysUntilExpiry !== null ? `${daysUntilExpiry} يوم` : 'غير محدد'}</p><p className="text-sm text-muted-foreground">الصلاحية</p></div></div></CardContent></Card>
        </div>
      )}

      {/* Mobile: Collapsible Sections */}
      {isMobile && (
        <div className="space-y-3 mt-4">
          <MobileDetailSection title="بنود العرض" priority="medium" icon={<Package className="h-4 w-4" />} badge={quotationItems.length}>
            <MobileDetailItems items={itemCards} emptyIcon={<Package className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد بنود" />
            {quotationItems.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(quotation.subtotal).toLocaleString()} ج.م</span></div>
                {Number(quotation.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(quotation.discount_amount).toLocaleString()} ج.م</span></div>}
                {Number(quotation.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(quotation.tax_amount).toLocaleString()} ج.م</span></div>}
                <div className="flex justify-between font-bold text-base pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
              </div>
            )}
          </MobileDetailSection>
          <MobileDetailSection title="أوامر البيع المرتبطة" priority="medium" icon={<ShoppingCart className="h-4 w-4" />} badge={salesOrders.length}>
            <MobileDetailItems
              items={(salesOrders as Array<{id: string; order_number: string; created_at: string; total_amount: number; status: string}>).map(o => ({
                id: o.id, title: o.order_number, value: `${Number(o.total_amount).toLocaleString()} ج.م`,
                details: [{ label: 'التاريخ', value: new Date(o.created_at).toLocaleDateString('ar-EG') }],
                badge: <Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge>,
              }))}
              emptyIcon={<ShoppingCart className="h-12 w-12 text-muted-foreground/50" />}
              emptyMessage="لا توجد أوامر بيع مرتبطة"
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
              <FileUpload entityType="quotation" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'quotation', id] })} />
              <AttachmentsList entityType="quotation" entityId={id!} />
            </div>
          </MobileDetailSection>
        </div>
      )}

      {/* Desktop: Tabs */}
      {!isMobile && (
      <Tabs defaultValue="items" className="mt-6">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="items" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Package className="h-3.5 w-3.5" />بنود العرض ({quotationItems.length})</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><ShoppingCart className="h-3.5 w-3.5" />أوامر البيع ({salesOrders.length})</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Activity className="h-3.5 w-3.5" />سجل النشاط</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Paperclip className="h-3.5 w-3.5" />المرفقات</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader><CardTitle>بنود العرض</CardTitle><CardDescription>تفاصيل المنتجات في هذا العرض</CardDescription></CardHeader>
            <CardContent>
              {isMobile ? (
                <>
                  <MobileDetailItems items={itemCards} emptyIcon={<Package className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد بنود في هذا العرض" />
                  {quotationItems.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                      <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(quotation.subtotal).toLocaleString()} ج.م</span></div>
                      {Number(quotation.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(quotation.discount_amount).toLocaleString()} ج.م</span></div>}
                      {Number(quotation.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(quotation.tax_amount).toLocaleString()} ج.م</span></div>}
                      <div className="flex justify-between font-bold text-base pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {quotationItems.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>سعر الوحدة</TableHead><TableHead>الخصم</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(quotationItems as Array<{id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; products: {id: string; name: string} | null; product_variants: {id: string; name: string} | null}>).map(item => (
                          <TableRow key={item.id}>
                            <TableCell><div className="flex flex-col"><EntityLink type="product" id={item.products?.id}>{item.products?.name || 'منتج محذوف'}</EntityLink>{item.product_variants && <span className="text-xs text-muted-foreground">{item.product_variants.name}</span>}</div></TableCell>
                            <TableCell>{item.quantity}</TableCell><TableCell>{Number(item.unit_price).toLocaleString()} ج.م</TableCell>
                            <TableCell>{Number(item.discount_percentage || 0)}%</TableCell><TableCell className="font-bold">{Number(item.total_price).toLocaleString()} ج.م</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8"><Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد بنود في هذا العرض</p></div>
                  )}
                  {quotationItems.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(quotation.subtotal).toLocaleString()} ج.م</span></div>
                      {Number(quotation.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(quotation.discount_amount).toLocaleString()} ج.م</span></div>}
                      {Number(quotation.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(quotation.tax_amount).toLocaleString()} ج.م</span></div>}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>أوامر البيع المرتبطة</CardTitle><CardDescription>أوامر البيع المنشأة من هذا العرض</CardDescription></div>
              {quotation.status === 'approved' && !isExpired && <Button size="sm" onClick={handleCreateSalesOrder}><ShoppingCart className="h-4 w-4 ml-2" />تحويل لأمر بيع</Button>}
            </CardHeader>
            <CardContent>
              {salesOrders.length > 0 ? (
                isMobile ? (
                  <MobileDetailItems
                    items={(salesOrders as Array<{id: string; order_number: string; created_at: string; total_amount: number; status: string}>).map(o => ({
                      id: o.id, title: o.order_number, value: `${Number(o.total_amount).toLocaleString()} ج.م`,
                      details: [{ label: 'التاريخ', value: new Date(o.created_at).toLocaleDateString('ar-EG') }],
                      badge: <Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge>,
                    }))}
                  />
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>رقم الأمر</TableHead><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(salesOrders as Array<{id: string; order_number: string; created_at: string; total_amount: number; status: string}>).map(order => (
                        <TableRow key={order.id}>
                          <TableCell><EntityLink type="sales-order" id={order.id}>{order.order_number}</EntityLink></TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString('ar-EG')}</TableCell>
                          <TableCell className="font-bold">{Number(order.total_amount).toLocaleString()} ج.م</TableCell>
                          <TableCell><Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : (
                <div className="text-center py-8"><ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد أوامر بيع مرتبطة</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader><CardTitle>سجل النشاط</CardTitle><CardDescription>آخر الأحداث على هذا العرض</CardDescription></CardHeader>
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
              <FileUpload entityType="quotation" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'quotation', id] })} />
              <AttachmentsList entityType="quotation" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <QuotationFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} quotation={quotation} />
      {id && <QuotationPrintView quotationId={id} open={printDialogOpen} onOpenChange={setPrintDialogOpen} />}
    </div>
  );
};

export default QuotationDetailsPage;
