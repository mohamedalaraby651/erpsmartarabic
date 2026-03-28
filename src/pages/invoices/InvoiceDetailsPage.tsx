import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight, Receipt, Printer, Edit, CreditCard, Package, Clock, Activity,
  Paperclip, AlertTriangle, CheckCircle, User, Calendar, DollarSign, FileText,
  Shield, Copy, MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileDetailItems, type DetailItemData } from "@/components/mobile/MobileDetailItems";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import InvoiceApprovalDialog from "@/components/invoices/InvoiceApprovalDialog";
import { useAuth } from "@/hooks/useAuth";
import { useDuplicateInvoice } from "@/hooks/useDuplicateInvoice";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

const paymentStatusLabels: Record<string, string> = {
  pending: "غير مدفوع", partial: "جزئي", paid: "مدفوع", overdue: "متأخر",
};
const paymentStatusColors: Record<string, string> = {
  pending: "bg-destructive/10 text-destructive border-destructive/20",
  partial: "bg-warning/10 text-warning border-warning/20",
  paid: "bg-success/10 text-success border-success/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};
const approvalStatusLabels: Record<string, string> = {
  draft: "مسودة", pending: "في انتظار الموافقة", approved: "معتمدة", rejected: "مرفوضة",
};
const approvalStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted",
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};
const paymentMethodLabels: Record<string, string> = {
  cash: "نقدي", bank_transfer: "تحويل بنكي", credit: "آجل", installment: "تقسيط", advance_payment: "دفعة مقدمة",
};

const InvoiceDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const { duplicate, isDuplicating } = useDuplicateInvoice();
  const isMobile = useIsMobile();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const canApprove = userRole === 'admin' || userRole === 'accountant';

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as (Invoice & { customers: Customer | null }) | null;
    },
    enabled: !!id,
  });

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ['invoice-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*, products(id, name, sku), product_variants(id, name)')
        .eq('invoice_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  interface PaymentRow {
    id: string; payment_number: string; payment_date: string;
    amount: number; payment_method: string; reference_number: string | null;
  }

  const { data: payments = [] } = useQuery({
    queryKey: ['invoice-payments', id],
    queryFn: async (): Promise<PaymentRow[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('payments').select('*').eq('invoice_id', id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
    enabled: !!id,
  });

  interface ActivityRow { id: string; action: string; created_at: string; }

  const { data: activities = [] } = useQuery({
    queryKey: ['invoice-activities', id],
    queryFn: async (): Promise<ActivityRow[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('activity_logs').select('*')
        .eq('entity_type', 'invoice').eq('entity_id', id)
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data as ActivityRow[];
    },
    enabled: !!id,
  });

  if (loadingInvoice) return <DetailPageSkeleton variant="invoice" tabCount={4} />;

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على الفاتورة</p>
        <Button onClick={() => navigate('/invoices')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للفواتير
        </Button>
      </div>
    );
  }

  const totalAmount = Number(invoice.total_amount || 0);
  const paidAmount = Number(invoice.paid_amount || 0);
  const remainingAmount = totalAmount - paidAmount;
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.payment_status !== 'paid';

  // ─── Mobile-specific data transforms ────
  const mobileItemCards: DetailItemData[] = (invoiceItems as Array<{
    id: string; quantity: number; unit_price: number; discount_percentage: number | null;
    total_price: number; products: { id: string; name: string } | null;
    product_variants: { id: string; name: string } | null;
  }>).map((item) => ({
    id: item.id,
    title: item.products?.name || 'منتج محذوف',
    subtitle: item.product_variants?.name,
    value: `${Number(item.total_price).toLocaleString()} ج.م`,
    details: [
      { label: 'الكمية', value: String(item.quantity) },
      { label: 'السعر', value: `${Number(item.unit_price).toLocaleString()} ج.م` },
      ...(Number(item.discount_percentage) > 0 ? [{ label: 'خصم', value: `${item.discount_percentage}%` }] : []),
    ],
  }));

  const mobilePaymentCards: DetailItemData[] = payments.map((p) => ({
    id: p.id,
    title: p.payment_number,
    subtitle: new Date(p.payment_date).toLocaleDateString('ar-EG'),
    value: `${Number(p.amount).toLocaleString()} ج.م`,
    details: [
      { label: 'الطريقة', value: paymentMethodLabels[p.payment_method] || p.payment_method },
      ...(p.reference_number ? [{ label: 'مرجع', value: p.reference_number }] : []),
    ],
  }));

  const mobileStats = [
    { icon: DollarSign, value: `${totalAmount.toLocaleString()}`, label: 'الإجمالي', color: 'text-primary' },
    { icon: CheckCircle, value: `${paidAmount.toLocaleString()}`, label: 'المدفوع', color: 'text-success' },
    { icon: Clock, value: `${remainingAmount.toLocaleString()}`, label: 'المتبقي', color: remainingAmount > 0 ? 'text-destructive' : 'text-success' },
    { icon: Package, value: invoiceItems.length, label: 'البنود', color: 'text-info' },
  ];

  // ─── Mobile Actions Dropdown ────
  const MobileActionsDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setPrintDialogOpen(true)}>
          <Printer className="h-4 w-4 ml-2" />طباعة
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => duplicate(invoice.id)} disabled={isDuplicating}>
          <Copy className="h-4 w-4 ml-2" />نسخ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 ml-2" />تعديل
        </DropdownMenuItem>
        {canApprove && (invoice.approval_status === 'draft' || invoice.approval_status === 'pending' || !invoice.approval_status) && (
          <DropdownMenuItem onClick={() => setApprovalDialogOpen(true)}>
            <Shield className="h-4 w-4 ml-2" />مراجعة الاعتماد
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with back button */}
      <MobileDetailHeader
        title={invoice.invoice_number}
        backTo="/invoices"
        action={<MobileActionsDropdown />}
      />

      {/* Desktop Back Button */}
      {!isMobile && (
        <Button variant="ghost" onClick={() => navigate('/invoices')} className="mb-2">
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للفواتير
        </Button>
      )}

      {/* Hero Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
            {/* Invoice Info */}
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-2xl bg-primary/10">
                <Receipt className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-lg md:text-2xl font-bold font-mono">{invoice.invoice_number}</h1>
                  <Badge className={paymentStatusColors[invoice.payment_status]}>
                    {paymentStatusLabels[invoice.payment_status]}
                  </Badge>
                  {!isMobile && (
                    <Badge className={approvalStatusColors[invoice.approval_status || 'draft']}>
                      <Shield className="h-3 w-3 ml-1" />
                      {approvalStatusLabels[invoice.approval_status || 'draft']}
                    </Badge>
                  )}
                </div>
                {invoice.customers && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <User className="h-4 w-4" />
                    <EntityLink type="customer" id={invoice.customers.id}>
                      {invoice.customers.name}
                    </EntityLink>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs md:text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                    {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  {invoice.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 md:h-4 md:w-4" />
                      {new Date(invoice.due_date).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Actions */}
            {!isMobile && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}>
                  <Printer className="h-4 w-4 ml-2" />طباعة
                </Button>
                <WhatsAppShareButton
                  customerPhone={invoice.customers?.phone}
                  documentType="invoice"
                  documentNumber={invoice.invoice_number}
                  customerName={invoice.customers?.name || 'العميل'}
                  totalAmount={totalAmount}
                  dueDate={invoice.due_date}
                  size="sm"
                />
                <Button variant="outline" size="sm" onClick={() => duplicate(invoice.id)} disabled={isDuplicating}>
                  <Copy className="h-4 w-4 ml-2" />نسخ
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 ml-2" />تعديل
                </Button>
                {invoice.payment_status !== 'paid' && (
                  <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                    <CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة
                  </Button>
                )}
                {canApprove && (invoice.approval_status === 'draft' || invoice.approval_status === 'pending' || !invoice.approval_status) && (
                  <Button size="sm" variant="default" onClick={() => setApprovalDialogOpen(true)}>
                    <Shield className="h-4 w-4 ml-2" />مراجعة الاعتماد
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Payment Progress */}
          <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-xl bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-muted-foreground">نسبة السداد</span>
              <span className="text-xs md:text-sm font-medium">{Math.round(paymentProgress)}%</span>
            </div>
            <Progress value={paymentProgress} className="h-2" />
            <div className="flex justify-between mt-2 text-xs md:text-sm">
              <span className="text-success">المدفوع: {paidAmount.toLocaleString()} ج.م</span>
              <span className={remainingAmount > 0 ? "text-destructive" : "text-success"}>
                المتبقي: {remainingAmount.toLocaleString()} ج.م
              </span>
            </div>
          </div>

          {/* Mobile: Primary CTA */}
          {isMobile && invoice.payment_status !== 'paid' && (
            <Button className="w-full mt-3 min-h-11" onClick={() => setPaymentDialogOpen(true)}>
              <CreditCard className="h-4 w-4 ml-2" />
              تسجيل دفعة
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>فاتورة متأخرة</AlertTitle>
          <AlertDescription>تاريخ استحقاق هذه الفاتورة قد مضى.</AlertDescription>
        </Alert>
      )}

      {/* Stats — Mobile: horizontal scroll / Desktop: grid */}
      {isMobile ? (
        <MobileStatsScroll stats={mobileStats} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, value: totalAmount, label: 'إجمالي الفاتورة', bgColor: 'bg-primary/10', textColor: 'text-primary' },
            { icon: CheckCircle, value: paidAmount, label: 'المدفوع', bgColor: 'bg-success/10', textColor: 'text-success' },
            { icon: Clock, value: remainingAmount, label: 'المتبقي', bgColor: 'bg-warning/10', textColor: 'text-warning' },
            { icon: Package, value: invoiceItems.length, label: 'عدد البنود', bgColor: 'bg-info/10', textColor: 'text-info' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mobile: Collapsible Sections */}
      {isMobile && (
        <div className="space-y-3 mt-4">
          <MobileDetailSection title="بنود الفاتورة" priority="medium" icon={<Package className="h-4 w-4" />} badge={invoiceItems.length}>
            <MobileDetailItems items={mobileItemCards} emptyIcon={<Package className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد بنود في هذه الفاتورة" />
            {invoiceItems.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(invoice.subtotal).toLocaleString()} ج.م</span></div>
                {Number(invoice.discount_amount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{Number(invoice.discount_amount).toLocaleString()} ج.م</span></div>}
                {Number(invoice.tax_amount) > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{Number(invoice.tax_amount).toLocaleString()} ج.م</span></div>}
                <div className="flex justify-between font-bold text-base pt-2 border-t"><span>الإجمالي</span><span>{totalAmount.toLocaleString()} ج.م</span></div>
              </div>
            )}
          </MobileDetailSection>
          <MobileDetailSection title="المدفوعات" priority="medium" icon={<CreditCard className="h-4 w-4" />} badge={payments.length}>
            <MobileDetailItems items={mobilePaymentCards} emptyIcon={<CreditCard className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد مدفوعات مسجلة" />
          </MobileDetailSection>
          <MobileDetailSection title="سجل النشاط" priority="low" icon={<Activity className="h-4 w-4" />} badge={activities.length}>
            {activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((a) => (
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
              <FileUpload entityType="invoice" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'invoice', id] })} />
              <AttachmentsList entityType="invoice" entityId={id!} />
            </div>
          </MobileDetailSection>
        </div>
      )}

      {/* Desktop: Tabs */}
      {!isMobile && (
      <Tabs defaultValue="items" className="mt-4 md:mt-6">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max md:w-auto h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="items" className="gap-1.5 text-xs md:text-sm">
              <Package className="h-3.5 w-3.5 md:h-4 md:w-4" />
              البنود ({invoiceItems.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs md:text-sm">
              <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4" />
              المدفوعات ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs md:text-sm">
              <Activity className="h-3.5 w-3.5 md:h-4 md:w-4" />
              النشاط
            </TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 text-xs md:text-sm">
              <Paperclip className="h-3.5 w-3.5 md:h-4 md:w-4" />
              المرفقات
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">بنود الفاتورة</CardTitle>
              <CardDescription>تفاصيل المنتجات في هذه الفاتورة</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              {isMobile ? (
                <MobileDetailItems
                  items={mobileItemCards}
                  emptyIcon={<Package className="h-12 w-12 text-muted-foreground/50" />}
                  emptyMessage="لا توجد بنود في هذه الفاتورة"
                />
              ) : invoiceItems.length > 0 ? (
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
                    {(invoiceItems as Array<{id: string; product_id: string; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number; products: {id: string; name: string} | null; product_variants: {id: string; name: string} | null}>).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <EntityLink type="product" id={item.products?.id}>
                              {item.products?.name || 'منتج محذوف'}
                            </EntityLink>
                            {item.product_variants && (
                              <span className="text-xs text-muted-foreground">{item.product_variants.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{Number(item.unit_price).toLocaleString()} ج.م</TableCell>
                        <TableCell>{Number(item.discount_percentage || 0)}%</TableCell>
                        <TableCell className="font-bold">{Number(item.total_price).toLocaleString()} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد بنود في هذه الفاتورة</p>
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي</span>
                    <span>{Number(invoice.subtotal).toLocaleString()} ج.م</span>
                  </div>
                  {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between text-success">
                      <span>الخصم</span>
                      <span>-{Number(invoice.discount_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {Number(invoice.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>الضريبة</span>
                      <span>{Number(invoice.tax_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
                    <span>الإجمالي</span>
                    <span>{totalAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
              <div>
                <CardTitle className="text-base md:text-lg">سجل المدفوعات</CardTitle>
                <CardDescription>جميع المدفوعات المسجلة</CardDescription>
              </div>
              {!isMobile && invoice.payment_status !== 'paid' && (
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 ml-2" />تسجيل دفعة
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              {isMobile ? (
                <MobileDetailItems
                  items={mobilePaymentCards}
                  emptyIcon={<CreditCard className="h-12 w-12 text-muted-foreground/50" />}
                  emptyMessage="لا توجد مدفوعات مسجلة"
                />
              ) : payments.length > 0 ? (
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
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.payment_number}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</TableCell>
                        <TableCell className="font-bold text-success">{Number(payment.amount).toLocaleString()} ج.م</TableCell>
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
        <TabsContent value="activity" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">سجل النشاط</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-full bg-primary/10 shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
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
        <TabsContent value="attachments" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Paperclip className="h-5 w-5" />المستندات والمرفقات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
              <FileUpload
                entityType="invoice"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'invoice', id] })}
              />
              <AttachmentsList entityType="invoice" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InvoiceFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} invoice={invoice} />
      <PaymentFormDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />
      {id && <InvoicePrintView invoiceId={id} open={printDialogOpen} onOpenChange={setPrintDialogOpen} />}
      <InvoiceApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        invoice={invoice ? {
          id: invoice.id, invoice_number: invoice.invoice_number,
          total_amount: Number(invoice.total_amount),
          approval_status: invoice.approval_status || 'draft',
          customers: invoice.customers,
        } : null}
      />
    </div>
  );
};

export default InvoiceDetailsPage;
