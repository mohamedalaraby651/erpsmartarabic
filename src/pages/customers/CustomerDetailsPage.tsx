import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, Edit, Trash2, Plus, MapPin, Phone, Mail, Building2, User,
  Crown, CreditCard, Paperclip, ShoppingCart, Activity, FileText,
  TrendingUp, TrendingDown, Calendar, Printer, MessageSquare, BarChart3,
  Wallet, Globe, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { generatePDF } from "@/lib/pdfGenerator";
import CustomerAddressDialog from "@/components/customers/CustomerAddressDialog";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerPurchaseChart from "@/components/customers/CustomerPurchaseChart";
import CustomerFinancialSummary from "@/components/customers/CustomerFinancialSummary";
import StatementOfAccount from "@/components/customers/StatementOfAccount";
import CommunicationLogTab from "@/components/customers/CommunicationLogTab";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import CustomerQuickHistory from "@/components/customers/CustomerQuickHistory";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import ImageUpload from "@/components/shared/ImageUpload";
import { EntityLink } from "@/components/shared/EntityLink";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

const vipColors = {
  regular: "bg-muted text-muted-foreground",
  silver: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const vipLabels = {
  regular: "عادي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

const CustomerDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['customer-addresses', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_addresses').select('*').eq('customer_id', id!).order('is_default', { ascending: false });
      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['customer-sales-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_orders').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['customer-quotations', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotations').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['customer-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_logs').select('*').eq('entity_type', 'customer').eq('entity_id', id!).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateImageMutation = useMutation({
    mutationFn: async (imageUrl: string | null) => {
      const { error } = await supabase.from('customers').update({ image_url: imageUrl }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast({ title: "تم تحديث صورة العميل" });
    },
    onError: (error) => {
      logErrorSafely('CustomerDetailsPage', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase.from('customer_addresses').delete().eq('id', addressId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', id] });
      toast({ title: "تم حذف العنوان بنجاح" });
    },
  });

  // Calculate advanced stats
  const totalPurchases = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPayments = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
  const paymentRatio = totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0;
  const avgInvoiceValue = invoices.length > 0 ? totalPurchases / invoices.length : 0;
  const lastPurchaseDate = invoices.length > 0 ? invoices[0].created_at : null;

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const phone = customer.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton variant="customer" tabCount={6} />;
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">العميل غير موجود</p>
        <Button variant="link" onClick={() => navigate('/customers')}>العودة للعملاء</Button>
      </div>
    );
  }

  const creditLimit = Number(customer.credit_limit || 0);
  const currentBalance = Number(customer.current_balance || 0);
  const creditUsagePercent = creditLimit > 0 ? Math.min((currentBalance / creditLimit) * 100, 100) : 0;
  const balanceIsDebit = currentBalance > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/customers')} className="mb-2">
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة للعملاء
      </Button>

      {/* Enhanced Hero Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar with upload overlay */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <CustomerAvatar
                  name={customer.name}
                  imageUrl={customer.image_url}
                  customerType={customer.customer_type}
                  size="xl"
                />
                <div className="absolute -bottom-1 -left-1">
                  <ImageUpload
                    currentImageUrl={customer.image_url}
                    onImageUploaded={(url) => updateImageMutation.mutate(url)}
                    onImageRemoved={() => updateImageMutation.mutate(null)}
                    bucket="customer-images"
                    folder={id!}
                    showAvatar={false}
                  />
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <Badge className={vipColors[customer.vip_level as keyof typeof vipColors]}>
                  <Crown className="h-3 w-3 ml-1" />
                  {vipLabels[customer.vip_level as keyof typeof vipLabels]}
                </Badge>
                <Badge variant={customer.is_active ? "default" : "secondary"}>
                  {customer.is_active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                {customer.customer_type === 'company' ? 'شركة' : customer.customer_type === 'farm' ? 'مزرعة' : 'فرد'}
                {customer.governorate && ` • ${customer.governorate}`}
                {customer.city && ` - ${customer.city}`}
              </p>
              
              {/* Interactive Contact Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {customer.phone && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <a href={`tel:${customer.phone}`}>
                      <Phone className="h-3.5 w-3.5 ml-1.5 text-emerald-600" />
                      {customer.phone}
                    </a>
                  </Button>
                )}
                {customer.phone && (
                  <Button variant="outline" size="sm" className="h-8 text-xs border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950" onClick={handleWhatsApp}>
                    <MessageSquare className="h-3.5 w-3.5 ml-1.5 text-emerald-600" />
                    واتساب
                  </Button>
                )}
                {customer.email && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <a href={`mailto:${customer.email}`}>
                      <Mail className="h-3.5 w-3.5 ml-1.5 text-info" />
                      {customer.email}
                    </a>
                  </Button>
                )}
                {customer.facebook_url && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <a href={customer.facebook_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      فيسبوك
                    </a>
                  </Button>
                )}
                {customer.contact_person && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">
                    <User className="h-3.5 w-3.5" />
                    {customer.contact_person}
                    {customer.contact_person_role && ` (${customer.contact_person_role})`}
                  </span>
                )}
              </div>

              {/* Quick History Strip */}
              <CustomerQuickHistory invoices={invoices} payments={payments} />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 lg:self-start lg:flex-col">
              <Button size="sm" onClick={() => navigate('/invoices', { state: { prefillCustomerId: id } })}>
                <FileText className="h-4 w-4 ml-2" />
                فاتورة جديدة
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const tabsTrigger = document.querySelector('[value="statement"]') as HTMLElement;
                tabsTrigger?.click();
              }}>
                <Printer className="h-4 w-4 ml-2" />
                كشف حساب
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Balance Card with Credit Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${balanceIsDebit ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                <CreditCard className={`h-5 w-5 ${balanceIsDebit ? 'text-destructive' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${balanceIsDebit ? 'text-destructive' : 'text-emerald-600'}`}>
                  {currentBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
              </div>
            </div>
            {creditLimit > 0 && (
              <div className="space-y-1">
                <Progress value={creditUsagePercent} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">
                  {creditUsagePercent.toFixed(0)}% من {creditLimit.toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{totalPurchases.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Ratio with Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${paymentRatio >= 80 ? 'bg-emerald-500/10' : paymentRatio >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                <Wallet className={`h-5 w-5 ${paymentRatio >= 80 ? 'text-emerald-600' : paymentRatio >= 50 ? 'text-warning' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{paymentRatio.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">نسبة السداد</p>
              </div>
            </div>
            <Progress value={paymentRatio} className="h-1.5" />
          </CardContent>
        </Card>

        {/* Invoice Count */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <FileText className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-lg font-bold">{invoices.length}</p>
                <p className="text-xs text-muted-foreground">الفواتير</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Invoice */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <BarChart3 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-lg font-bold">{avgInvoiceValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">متوسط الفاتورة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Purchase */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {lastPurchaseDate ? new Date(lastPurchaseDate).toLocaleDateString('ar-EG') : '-'}
                </p>
                <p className="text-xs text-muted-foreground">آخر شراء</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="addresses" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4" />
            العناوين ({addresses.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            الفواتير ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="quotations" className="gap-2">
            <Globe className="h-4 w-4" />
            عروض الأسعار ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            أوامر البيع ({salesOrders.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            المدفوعات ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <Wallet className="h-4 w-4" />
            الملخص المالي
          </TabsTrigger>
          <TabsTrigger value="statement" className="gap-2">
            <Printer className="h-4 w-4" />
            كشف الحساب
          </TabsTrigger>
          <TabsTrigger value="communications" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            التواصل
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            النشاط
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <Paperclip className="h-4 w-4" />
            المرفقات
          </TabsTrigger>
        </TabsList>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                العناوين
              </CardTitle>
              <Button size="sm" onClick={() => { setSelectedAddress(null); setAddressDialogOpen(true); }}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة عنوان
              </Button>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد عناوين</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div key={address.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && <Badge variant="secondary">افتراضي</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1">{address.address}</p>
                        {(address.city || address.governorate) && (
                          <p className="text-sm text-muted-foreground">
                            {[address.city, address.governorate].filter(Boolean).join(' - ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedAddress(address); setAddressDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteAddressMutation.mutate(address.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>الفواتير</CardTitle>
              <CardDescription>سجل فواتير العميل</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد فواتير</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 15).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <EntityLink type="invoice" id={invoice.id}>{invoice.invoice_number}</EntityLink>
                        <span className="text-muted-foreground mr-4 text-sm">
                          {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.payment_status === 'paid' ? 'مدفوع' : invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                        </Badge>
                        <span className="font-bold">{Number(invoice.total_amount).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>عروض الأسعار</CardTitle>
              <CardDescription>سجل عروض الأسعار للعميل</CardDescription>
            </CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد عروض أسعار</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quotations.slice(0, 15).map((quotation) => (
                    <div key={quotation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <EntityLink type="quotation" id={quotation.id}>{quotation.quotation_number}</EntityLink>
                        <span className="text-muted-foreground mr-4 text-sm">
                          {new Date(quotation.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={quotation.status === 'completed' ? 'default' : 'secondary'}>
                          {quotation.status === 'completed' ? 'مكتمل' : quotation.status === 'pending' ? 'معلق' : quotation.status === 'draft' ? 'مسودة' : quotation.status}
                        </Badge>
                        <span className="font-bold">{Number(quotation.total_amount).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>أوامر البيع</CardTitle>
              <CardDescription>سجل أوامر البيع للعميل</CardDescription>
            </CardHeader>
            <CardContent>
              {salesOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أوامر بيع</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {salesOrders.slice(0, 15).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <EntityLink type="sales-order" id={order.id}>{order.order_number}</EntityLink>
                        <span className="text-muted-foreground mr-4 text-sm">
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : order.status}
                        </Badge>
                        <span className="font-bold">{Number(order.total_amount).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المدفوعات</CardTitle>
              <CardDescription>سجل مدفوعات العميل</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد مدفوعات</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 15).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{payment.payment_number}</span>
                        <span className="text-muted-foreground mr-4 text-sm">
                          {new Date(payment.payment_date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600">{Number(payment.amount).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Summary Tab */}
        <TabsContent value="financial" className="mt-6">
          <CustomerFinancialSummary
            totalPurchases={totalPurchases}
            totalPayments={totalPayments}
            currentBalance={currentBalance}
            creditLimit={creditLimit}
            discountPercentage={Number(customer.discount_percentage || 0)}
            paymentTermsDays={Number(customer.payment_terms_days || 0)}
            invoiceCount={invoices.length}
          />
        </TabsContent>

        {/* Statement of Account Tab */}
        <TabsContent value="statement" className="mt-6">
          <StatementOfAccount customerName={customer.name} invoices={invoices} payments={payments} />
        </TabsContent>

        {/* Communication Log Tab */}
        <TabsContent value="communications" className="mt-6">
          <CommunicationLogTab customerId={id!} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <CustomerPurchaseChart invoices={invoices} payments={payments} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
              <CardDescription>آخر الأحداث المتعلقة بالعميل</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا يوجد سجل نشاط</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity: ActivityLog) => (
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
                entityType="customer"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'customer', id] })}
              />
              <AttachmentsList entityType="customer" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CustomerFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} customer={customer} />
      <CustomerAddressDialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen} customerId={id!} address={selectedAddress} />
    </div>
  );
};

export default CustomerDetailsPage;
