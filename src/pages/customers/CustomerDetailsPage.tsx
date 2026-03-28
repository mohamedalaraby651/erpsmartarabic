import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Edit, Plus, MapPin, Paperclip, ShoppingCart, Activity, FileText,
  CreditCard, Bell, MessageSquare, BarChart3, Wallet, Globe, Clock, Printer, Trash2,
} from "lucide-react";
import { generatePDF } from "@/lib/pdfGenerator";
import CustomerAddressDialog from "@/components/customers/CustomerAddressDialog";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerPurchaseChart from "@/components/customers/CustomerPurchaseChart";
import CustomerFinancialSummary from "@/components/customers/CustomerFinancialSummary";
import StatementOfAccount from "@/components/customers/StatementOfAccount";
import CommunicationLogTab from "@/components/customers/CommunicationLogTab";
import CustomerReminderSection from "@/components/customers/CustomerReminderDialog";
import CustomerAgingReport from "@/components/customers/CustomerAgingReport";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { useCustomerDetail } from "@/hooks/customers";
import { CustomerHeroHeader } from "@/components/customers/CustomerHeroHeader";
import { CustomerStatsGrid } from "@/components/customers/CustomerStatsGrid";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { tabGroups } from "@/lib/customerConstants";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { useNavigationState } from "@/hooks/useNavigationState";
import type { CustomerAddress } from "@/lib/customerConstants";

// Icon map for tab groups
const tabIcons: Record<string, React.ElementType> = {
  addresses: MapPin, attachments: Paperclip, reminders: Bell,
  invoices: FileText, quotations: Globe, orders: ShoppingCart,
  payments: CreditCard, financial: Wallet, statement: Printer, aging: Clock,
  analytics: BarChart3, communications: MessageSquare, activity: Activity,
};

const CustomerDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);

  const detail = useCustomerDetail(id);

  const handleWhatsApp = () => {
    if (detail.customer?.phone) {
      const phone = detail.customer.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  if (detail.isLoading) {
    return <DetailPageSkeleton variant="customer" tabCount={6} />;
  }

  if (!detail.customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">العميل غير موجود</p>
        <Button variant="link" onClick={() => navigate('/customers')}>العودة للعملاء</Button>
      </div>
    );
  }

  const customer = detail.customer;

  // Mobile stats for horizontal scroll
  const mobileStats = [
    { icon: Wallet, value: `${detail.currentBalance.toLocaleString()}`, label: 'الرصيد', color: detail.balanceIsDebit ? 'text-destructive' : 'text-success' },
    { icon: FileText, value: detail.invoices.length, label: 'الفواتير', color: 'text-primary' },
    { icon: CreditCard, value: `${detail.paymentRatio}%`, label: 'نسبة السداد', color: 'text-info' },
    { icon: BarChart3, value: `${detail.totalPurchases.toLocaleString()}`, label: 'المشتريات', color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <MobileDetailHeader
        title={customer.name}
        backTo="/customers"
        action={
          <Button variant="outline" size="sm" className="min-h-11 min-w-11" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        }
      />

      <CustomerHeroHeader
        customer={customer}
        customerId={id!}
        invoices={detail.invoices}
        payments={detail.payments}
        onBack={() => navigate('/customers')}
        onEdit={() => setEditDialogOpen(true)}
        onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
        onStatement={() => detail.setActiveTab('statement')}
        onWhatsApp={handleWhatsApp}
        onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
      />

      {isMobile ? (
        <MobileStatsScroll stats={mobileStats} />
      ) : (
        <CustomerStatsGrid
          currentBalance={detail.currentBalance}
          balanceIsDebit={detail.balanceIsDebit}
          creditLimit={detail.creditLimit}
          creditUsagePercent={detail.creditUsagePercent}
          totalPurchases={detail.totalPurchases}
          paymentRatio={detail.paymentRatio}
          invoiceCount={detail.invoices.length}
          avgInvoiceValue={detail.avgInvoiceValue}
          dso={detail.dso}
          clv={detail.clv}
          lastPurchaseDate={detail.lastPurchaseDate}
        />
      )}

      {isMobile ? (
        /* Mobile: Stacked MobileDetailSection */
        <div className="space-y-3">
          {/* MEDIUM: Invoices */}
          <MobileDetailSection title="الفواتير" priority="medium" icon={<FileText className="h-4 w-4" />} badge={detail.invoices.length}>
            {detail.invoices.length === 0 ? (
              <div className="text-center py-4"><FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" /><p className="text-sm text-muted-foreground">لا توجد فواتير</p><Button variant="outline" size="sm" className="mt-2 min-h-11" onClick={() => navigate('/invoices', { state: { prefillCustomerId: id } })}>إنشاء أول فاتورة</Button></div>
            ) : (
              <div className="space-y-2">
                {detail.invoices.slice(0, 10).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg active:bg-muted/50" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <div><p className="text-sm font-medium">{invoice.invoice_number}</p><p className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString('ar-EG')}</p></div>
                    <div className="flex items-center gap-2"><Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">{invoice.payment_status === 'paid' ? 'مدفوع' : invoice.payment_status === 'partial' ? 'جزئي' : 'معلق'}</Badge><span className="text-sm font-bold">{Number(invoice.total_amount).toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
            )}
          </MobileDetailSection>

          {/* MEDIUM: Payments */}
          <MobileDetailSection title="المدفوعات" priority="medium" icon={<CreditCard className="h-4 w-4" />} badge={detail.payments.length}>
            {detail.payments.length === 0 ? (
              <div className="text-center py-4"><CreditCard className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" /><p className="text-sm text-muted-foreground">لا توجد مدفوعات</p></div>
            ) : (
              <div className="space-y-2">
                {detail.payments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div><p className="text-sm font-medium">{payment.payment_number}</p><p className="text-xs text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</p></div>
                    <span className="text-sm font-bold text-success">{Number(payment.amount).toLocaleString()} ج.م</span>
                  </div>
                ))}
              </div>
            )}
          </MobileDetailSection>

          {/* MEDIUM: Financial */}
          <MobileDetailSection title="الملخص المالي" priority="medium" icon={<Wallet className="h-4 w-4" />}>
            <CustomerFinancialSummary
              totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments}
              currentBalance={detail.currentBalance} creditLimit={detail.creditLimit}
              discountPercentage={Number(customer.discount_percentage || 0)}
              paymentTermsDays={Number(customer.payment_terms_days || 0)}
              invoiceCount={detail.invoices.length}
            />
          </MobileDetailSection>

          {/* MEDIUM: Addresses */}
          <MobileDetailSection title="العناوين" priority="medium" icon={<MapPin className="h-4 w-4" />} badge={detail.addresses.length}>
            <div className="space-y-2">
              <Button size="sm" className="w-full min-h-11" onClick={() => { setSelectedAddress(null); setAddressDialogOpen(true); }}><Plus className="h-4 w-4 ml-2" />إضافة عنوان</Button>
              {detail.addresses.map((address) => (
                <div key={address.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium">{address.label}</span>{address.is_default && <Badge variant="secondary" className="text-[10px]">افتراضي</Badge>}</div>
                  <p className="text-xs text-muted-foreground">{address.address}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="min-h-11 min-w-11" onClick={() => { setSelectedAddress(address); setAddressDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </MobileDetailSection>

          {/* LOW: Analytics */}
          <MobileDetailSection title="التحليلات" priority="low" icon={<BarChart3 className="h-4 w-4" />}>
            <CustomerPurchaseChart invoices={detail.invoices} payments={detail.payments} />
          </MobileDetailSection>

          {/* LOW: Statement */}
          <MobileDetailSection title="كشف الحساب" priority="low" icon={<FileText className="h-4 w-4" />}>
            <StatementOfAccount customerName={customer.name} invoices={detail.invoices} payments={detail.payments} />
          </MobileDetailSection>

          {/* LOW: Communications */}
          <MobileDetailSection title="سجل التواصل" priority="low" icon={<MessageSquare className="h-4 w-4" />}>
            <CommunicationLogTab customerId={id!} />
          </MobileDetailSection>

          {/* LOW: Reminders */}
          <MobileDetailSection title="التذكيرات" priority="low" icon={<Bell className="h-4 w-4" />}>
            <CustomerReminderSection customerId={id!} />
          </MobileDetailSection>

          {/* LOW: Attachments */}
          <MobileDetailSection title="المرفقات" priority="low" icon={<Paperclip className="h-4 w-4" />}>
            <FileUpload entityType="customer" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'customer', id] })} />
            <AttachmentsList entityType="customer" entityId={id!} />
          </MobileDetailSection>

          {/* LOW: Activity */}
          <MobileDetailSection title="سجل النشاط" priority="low" icon={<Activity className="h-4 w-4" />}>
            {detail.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد سجل نشاط</p>
            ) : (
              <div className="space-y-2">
                {detail.activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <Activity className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div><p className="text-xs font-medium">{activity.action}</p><p className="text-[10px] text-muted-foreground">{new Date(activity.created_at).toLocaleString('ar-EG')}</p></div>
                  </div>
                ))}
              </div>
            )}
          </MobileDetailSection>
        </div>
      ) : (
      /* Desktop: Keep Tabs */
      <Tabs value={detail.activeTab} onValueChange={detail.setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
            {tabGroups.map((group, gi) => (
              <div key={group.id} className="flex items-center">
                {gi > 0 && <div className="w-px h-6 bg-border mx-1" />}
                {group.tabs.map((tab) => {
                  const Icon = tabIcons[tab.value] || Activity;
                  return (
                    <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 whitespace-nowrap text-xs px-2.5">
                      <Icon className="h-3.5 w-3.5" />{tab.label}
                    </TabsTrigger>
                  );
                })}
              </div>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Addresses */}
        <TabsContent value="addresses" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />العناوين</CardTitle>
              <Button size="sm" onClick={() => { setSelectedAddress(null); setAddressDialogOpen(true); }}>
                <Plus className="h-4 w-4 ml-2" />إضافة عنوان
              </Button>
            </CardHeader>
            <CardContent>
              {detail.addresses.length === 0 ? (
                <div className="text-center py-8"><MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد عناوين</p></div>
              ) : (
                <div className="space-y-3">
                  {detail.addresses.map((address) => (
                    <div key={address.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && <Badge variant="secondary">افتراضي</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1">{address.address}</p>
                        {(address.city || address.governorate) && (
                          <p className="text-sm text-muted-foreground">{[address.city, address.governorate].filter(Boolean).join(' - ')}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => { setSelectedAddress(address); setAddressDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => detail.deleteAddressMutation.mutate(address.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <CustomerReminderSection customerId={id!} />
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader><CardTitle>الفواتير</CardTitle><CardDescription>سجل فواتير العميل</CardDescription></CardHeader>
            <CardContent>
              {detail.invoices.length === 0 ? (
                <div className="text-center py-8"><FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد فواتير</p></div>
              ) : (
                <div className="space-y-2">
                  {detail.invoices.slice(0, 15).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <EntityLink type="invoice" id={invoice.id}>{invoice.invoice_number}</EntityLink>
                        <span className="text-muted-foreground mr-4 text-sm">{new Date(invoice.created_at).toLocaleDateString('ar-EG')}</span>
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

        {/* Quotations */}
        <TabsContent value="quotations" className="mt-6">
          <Card>
            <CardHeader><CardTitle>عروض الأسعار</CardTitle><CardDescription>سجل عروض الأسعار للعميل</CardDescription></CardHeader>
            <CardContent>
              {detail.quotations.length === 0 ? (
                <div className="text-center py-8"><Globe className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد عروض أسعار</p></div>
              ) : (
                <div className="space-y-2">
                  {detail.quotations.slice(0, 15).map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <EntityLink type="quotation" id={q.id}>{q.quotation_number}</EntityLink>
                        <span className="text-muted-foreground mr-4 text-sm">{new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={q.status === 'completed' ? 'default' : 'secondary'}>
                          {q.status === 'completed' ? 'مكتمل' : q.status === 'pending' ? 'معلق' : q.status === 'draft' ? 'مسودة' : q.status}
                        </Badge>
                        <span className="font-bold">{Number(q.total_amount).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Orders */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader><CardTitle>أوامر البيع</CardTitle><CardDescription>سجل أوامر البيع للعميل</CardDescription></CardHeader>
            <CardContent>
              {detail.salesOrders.length === 0 ? (
                <div className="text-center py-8"><ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد أوامر بيع</p></div>
              ) : (
                <div className="space-y-2">
                  {detail.salesOrders.slice(0, 15).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <EntityLink type="sales-order" id={order.id}>{order.order_number}</EntityLink>
                        <span className="text-muted-foreground mr-4 text-sm">{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
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

        {/* Payments */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader><CardTitle>المدفوعات</CardTitle><CardDescription>سجل مدفوعات العميل</CardDescription></CardHeader>
            <CardContent>
              {detail.payments.length === 0 ? (
                <div className="text-center py-8"><CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد مدفوعات</p></div>
              ) : (
                <div className="space-y-2">
                  {detail.payments.slice(0, 15).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{payment.payment_number}</span>
                        <span className="text-muted-foreground mr-4 text-sm">{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{Number(payment.amount).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <CustomerFinancialSummary
            totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments}
            currentBalance={detail.currentBalance} creditLimit={detail.creditLimit}
            discountPercentage={Number(customer.discount_percentage || 0)}
            paymentTermsDays={Number(customer.payment_terms_days || 0)}
            invoiceCount={detail.invoices.length}
          />
        </TabsContent>

        <TabsContent value="statement" className="mt-6">
          <StatementOfAccount customerName={customer.name} invoices={detail.invoices} payments={detail.payments} />
        </TabsContent>

        <TabsContent value="aging" className="mt-6">
          <CustomerAgingReport invoices={detail.invoices} />
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <CommunicationLogTab customerId={id!} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <CustomerPurchaseChart invoices={detail.invoices} payments={detail.payments} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader><CardTitle>سجل النشاط</CardTitle><CardDescription>آخر الأحداث المتعلقة بالعميل</CardDescription></CardHeader>
            <CardContent>
              {detail.activities.length === 0 ? (
                <div className="text-center py-8"><Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا يوجد سجل نشاط</p></div>
              ) : (
                <div className="space-y-4">
                  {detail.activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-full bg-primary/10"><Activity className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString('ar-EG')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />المستندات والمرفقات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FileUpload entityType="customer" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'customer', id] })} />
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
