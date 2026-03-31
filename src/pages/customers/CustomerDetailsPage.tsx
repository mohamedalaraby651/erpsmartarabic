import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Edit, MapPin, Paperclip, ShoppingCart, Activity, FileText,
  CreditCard, Bell, MessageSquare, BarChart3, Globe, Clock, Printer,
  Wallet, StickyNote,
} from "lucide-react";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerAddressDialog from "@/components/customers/CustomerAddressDialog";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { useCustomerDetail, useCustomerNavigation } from "@/hooks/customers";
import { CustomerHeroHeader } from "@/components/customers/CustomerHeroHeader";
import { CustomerSmartAlerts } from "@/components/customers/CustomerSmartAlerts";
import { CustomerMobileProfile } from "@/components/customers/mobile/CustomerMobileProfile";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { tabGroups } from "@/lib/customerConstants";
import { customerRepository } from "@/lib/repositories/customerRepository";
import type { CustomerAddress } from "@/lib/customerConstants";

// Lazy-loaded tab components
const CustomerTabBasicInfo = lazy(() => import("@/components/customers/tabs/CustomerTabBasicInfo").then(m => ({ default: m.CustomerTabBasicInfo })));
const CustomerTabNotes = lazy(() => import("@/components/customers/tabs/CustomerTabNotes").then(m => ({ default: m.CustomerTabNotes })));
const CustomerTabInvoices = lazy(() => import("@/components/customers/tabs/CustomerTabInvoices").then(m => ({ default: m.CustomerTabInvoices })));
const CustomerTabPayments = lazy(() => import("@/components/customers/tabs/CustomerTabPayments").then(m => ({ default: m.CustomerTabPayments })));
const CustomerTabQuotations = lazy(() => import("@/components/customers/tabs/CustomerTabQuotations").then(m => ({ default: m.CustomerTabQuotations })));
const CustomerTabOrders = lazy(() => import("@/components/customers/tabs/CustomerTabOrders").then(m => ({ default: m.CustomerTabOrders })));
const CustomerTabActivity = lazy(() => import("@/components/customers/tabs/CustomerTabActivity").then(m => ({ default: m.CustomerTabActivity })));
const CustomerTabAttachments = lazy(() => import("@/components/customers/tabs/CustomerTabAttachments").then(m => ({ default: m.CustomerTabAttachments })));
const StatementOfAccount = lazy(() => import("@/components/customers/StatementOfAccount"));
const CustomerFinancialSummary = lazy(() => import("@/components/customers/CustomerFinancialSummary"));
const CustomerPurchaseChart = lazy(() => import("@/components/customers/CustomerPurchaseChart"));
const AgingDonutChart = lazy(() => import("@/components/customers/charts/AgingDonutChart").then(m => ({ default: m.AgingDonutChart })));
const CashFlowLineChart = lazy(() => import("@/components/customers/charts/CashFlowLineChart").then(m => ({ default: m.CashFlowLineChart })));
const TopProductsChart = lazy(() => import("@/components/customers/charts/TopProductsChart").then(m => ({ default: m.TopProductsChart })));
const CustomerAgingReport = lazy(() => import("@/components/customers/CustomerAgingReport"));
const CommunicationLogTab = lazy(() => import("@/components/customers/CommunicationLogTab"));
const CustomerReminderSection = lazy(() => import("@/components/customers/CustomerReminderDialog"));
const CustomerTabCreditNotes = lazy(() => import("@/components/customers/tabs/CustomerTabCreditNotes").then(m => ({ default: m.CustomerTabCreditNotes })));

import MobileDetailSection from "@/components/mobile/MobileDetailSection";

const tabIcons: Record<string, React.ElementType> = {
  'basic-info': MapPin, notes: StickyNote, attachments: Paperclip, reminders: Bell,
  invoices: FileText, quotations: Globe, orders: ShoppingCart,
  payments: CreditCard, 'credit-notes': FileText, financial: Wallet, statement: Printer, aging: Clock,
  analytics: BarChart3, communications: MessageSquare, activity: Activity,
};

const TabFallback = () => <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent rounded-full" /></div>;

const CustomerDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [mobileTab, setMobileTab] = useState('financial');

  const detail = useCustomerDetail(id);
  const { prevId, nextId, goNext, goPrev } = useCustomerNavigation(id);

  const updateFieldMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => customerRepository.update(id!, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', id] }); },
    onError: () => { toast({ title: "حدث خطأ أثناء التحديث", variant: "destructive" }); },
  });

  const handleToggleActive = () => {
    if (!detail.customer) return;
    updateFieldMutation.mutate({ is_active: !detail.customer.is_active });
  };
  const handleChangeVip = (level: string) => { updateFieldMutation.mutate({ vip_level: level }); };
  const handleWhatsApp = () => {
    if (detail.customer?.phone) {
      window.open(`https://wa.me/${detail.customer.phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  if (detail.isLoading) return <DetailPageSkeleton variant="customer" tabCount={6} />;
  if (!detail.customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">العميل غير موجود</p>
        <Button variant="link" onClick={() => navigate('/customers')}>العودة للعملاء</Button>
      </div>
    );
  }

  const customer = detail.customer;

  return (
    <div className="space-y-6 animate-fade-in">
      <MobileDetailHeader
        title={customer.name}
        backTo="/customers"
        action={<Button variant="outline" size="sm" className="min-h-11 min-w-11" onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4" /></Button>}
      />

      <div className="hidden md:block">
        <CustomerHeroHeader
          customer={customer} customerId={id!}
          invoices={detail.invoices} payments={detail.payments}
          onBack={() => navigate('/customers')} onEdit={() => setEditDialogOpen(true)}
          onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
          onStatement={() => detail.setActiveTab('statement')}
          onWhatsApp={handleWhatsApp}
          onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
          onPrev={goPrev} onNext={goNext} hasPrev={!!prevId} hasNext={!!nextId}
          currentBalance={detail.currentBalance} balanceIsDebit={detail.balanceIsDebit}
          creditLimit={detail.creditLimit} creditUsagePercent={detail.creditUsagePercent}
          totalPurchases={detail.totalPurchases} totalOutstanding={detail.totalOutstanding}
          paymentRatio={detail.paymentRatio} invoiceCount={detail.invoices.length} dso={detail.dso}
          onNewPayment={() => navigate('/payments', { state: { prefillCustomerId: id } })}
          onNewQuotation={() => navigate('/quotations', { state: { prefillCustomerId: id } })}
          onNewOrder={() => navigate('/sales-orders', { state: { prefillCustomerId: id } })}
          onNewCreditNote={() => detail.setActiveTab('credit-notes')}
          onToggleActive={handleToggleActive} onChangeVip={handleChangeVip}
        />
      </div>

      <CustomerSmartAlerts
        currentBalance={detail.currentBalance} creditLimit={detail.creditLimit}
        invoices={detail.invoices} lastPurchaseDate={detail.lastPurchaseDate}
        lastCommunicationAt={customer.last_communication_at}
        onEditCreditLimit={() => setEditDialogOpen(true)}
        onSendReminder={() => isMobile ? setMobileTab('more') : detail.setActiveTab('reminders')}
        onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
        onContact={handleWhatsApp}
      />

      {isMobile ? (
        <div className="space-y-4">
          <CustomerMobileProfile
            customer={customer} customerId={id!}
            onEdit={() => setEditDialogOpen(true)}
            onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
            onStatement={() => setMobileTab('statement')}
            onWhatsApp={handleWhatsApp}
            onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
            onPrev={goPrev} onNext={goNext} hasPrev={!!prevId} hasNext={!!nextId}
            currentBalance={detail.currentBalance} balanceIsDebit={detail.balanceIsDebit}
            totalOutstanding={detail.totalOutstanding} paymentRatio={detail.paymentRatio}
            totalPurchases={detail.totalPurchases}
            onNewPayment={() => navigate('/payments', { state: { prefillCustomerId: id } })}
            onNewQuotation={() => navigate('/quotations', { state: { prefillCustomerId: id } })}
            onNewOrder={() => navigate('/sales-orders', { state: { prefillCustomerId: id } })}
            onNewCreditNote={() => setMobileTab('financials')}
            onToggleActive={handleToggleActive}
          />

          <Tabs value={mobileTab} onValueChange={setMobileTab}>
            <div className="relative">
              <ScrollArea className="w-full">
                <TabsList className="flex w-max h-10 bg-muted/50 p-1">
                  <TabsTrigger value="financial" className="text-xs px-3"><Wallet className="h-3.5 w-3.5 ml-1" />الملخص المالي</TabsTrigger>
                  <TabsTrigger value="financials" className="text-xs px-3"><FileText className="h-3.5 w-3.5 ml-1" />الفواتير{detail.invoices.length > 0 && ` (${detail.invoices.length})`}</TabsTrigger>
                  <TabsTrigger value="payments-tab" className="text-xs px-3"><CreditCard className="h-3.5 w-3.5 ml-1" />المدفوعات{detail.payments.length > 0 && ` (${detail.payments.length})`}</TabsTrigger>
                  <TabsTrigger value="sales" className="text-xs px-3"><ShoppingCart className="h-3.5 w-3.5 ml-1" />المبيعات</TabsTrigger>
                  <TabsTrigger value="statement" className="text-xs px-3"><Printer className="h-3.5 w-3.5 ml-1" />كشف الحساب</TabsTrigger>
                  <TabsTrigger value="analysis" className="text-xs px-3"><BarChart3 className="h-3.5 w-3.5 ml-1" />التحليلات</TabsTrigger>
                  <TabsTrigger value="more" className="text-xs px-3"><MapPin className="h-3.5 w-3.5 ml-1" />المزيد</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent" />
            </div>

            <Suspense fallback={<TabFallback />}>
              <TabsContent value="financial" className="mt-4">
                <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoices.length} totalOutstanding={detail.totalOutstanding} paymentRatio={detail.paymentRatio} avgInvoiceValue={detail.avgInvoiceValue} dso={detail.dso} clv={detail.clv} />
              </TabsContent>
              <TabsContent value="financials" className="mt-4 space-y-4">
                <CustomerTabInvoices invoices={detail.invoices} customerId={id!} totalPaymentsFromLedger={detail.totalPayments} />
                <CustomerTabCreditNotes creditNotes={detail.creditNotes} />
              </TabsContent>
              <TabsContent value="payments-tab" className="mt-4">
                <CustomerTabPayments payments={detail.payments} customerId={id!} />
              </TabsContent>
              <TabsContent value="sales" className="mt-4 space-y-4">
                <CustomerTabQuotations quotations={detail.quotations} />
                <CustomerTabOrders salesOrders={detail.salesOrders} />
              </TabsContent>
              <TabsContent value="statement" className="mt-4 space-y-4">
                <StatementOfAccount customerName={customer.name} invoices={detail.invoices} payments={detail.payments} creditNotes={detail.creditNotes} />
                <CustomerAgingReport invoices={detail.invoices} />
              </TabsContent>
              <TabsContent value="analysis" className="mt-4 space-y-4">
                <CustomerPurchaseChart invoices={detail.invoices} payments={detail.payments} />
                <AgingDonutChart invoices={detail.invoices} />
                <CashFlowLineChart invoices={detail.invoices} payments={detail.payments} />
                <TopProductsChart customerId={id!} />
                <CustomerTabActivity activities={detail.activities} />
              </TabsContent>
              <TabsContent value="more" className="mt-4 space-y-4">
                <CustomerTabBasicInfo customer={customer} addresses={detail.addresses} onAddAddress={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEditAddress={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDeleteAddress={(addrId) => detail.deleteAddressMutation.mutate(addrId)} onWhatsApp={handleWhatsApp} />
                <CustomerTabNotes customerId={id!} />
                <CommunicationLogTab customerId={id!} />
                <CustomerReminderSection customerId={id!} />
                <CustomerTabAttachments customerId={id!} />
              </TabsContent>
            </Suspense>
          </Tabs>
        </div>
      ) : (
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

          <Suspense fallback={<TabFallback />}>
            <TabsContent value="basic-info" className="mt-6">
              <CustomerTabBasicInfo customer={customer} addresses={detail.addresses} onAddAddress={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEditAddress={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDeleteAddress={(aid) => detail.deleteAddressMutation.mutate(aid)} onWhatsApp={handleWhatsApp} />
            </TabsContent>
            <TabsContent value="notes" className="mt-6"><CustomerTabNotes customerId={id!} /></TabsContent>
            <TabsContent value="reminders" className="mt-6"><CustomerReminderSection customerId={id!} /></TabsContent>
            <TabsContent value="invoices" className="mt-6"><CustomerTabInvoices invoices={detail.invoices} customerId={id!} totalPaymentsFromLedger={detail.totalPayments} /></TabsContent>
            <TabsContent value="quotations" className="mt-6"><CustomerTabQuotations quotations={detail.quotations} /></TabsContent>
            <TabsContent value="orders" className="mt-6"><CustomerTabOrders salesOrders={detail.salesOrders} /></TabsContent>
            <TabsContent value="payments" className="mt-6"><CustomerTabPayments payments={detail.payments} customerId={id!} /></TabsContent>
            <TabsContent value="credit-notes" className="mt-6"><CustomerTabCreditNotes creditNotes={detail.creditNotes} /></TabsContent>
            <TabsContent value="financial" className="mt-6">
              <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoices.length} totalOutstanding={detail.totalOutstanding} paymentRatio={detail.paymentRatio} avgInvoiceValue={detail.avgInvoiceValue} dso={detail.dso} clv={detail.clv} />
            </TabsContent>
            <TabsContent value="statement" className="mt-6">
              <StatementOfAccount customerName={customer.name} invoices={detail.invoices} payments={detail.payments} creditNotes={detail.creditNotes} />
            </TabsContent>
            <TabsContent value="aging" className="mt-6"><CustomerAgingReport invoices={detail.invoices} /></TabsContent>
            <TabsContent value="communications" className="mt-6"><CommunicationLogTab customerId={id!} /></TabsContent>
            <TabsContent value="analytics" className="mt-6"><CustomerPurchaseChart invoices={detail.invoices} payments={detail.payments} /></TabsContent>
            <TabsContent value="activity" className="mt-6"><CustomerTabActivity activities={detail.activities} /></TabsContent>
            <TabsContent value="attachments" className="mt-6"><CustomerTabAttachments customerId={id!} /></TabsContent>
          </Suspense>
        </Tabs>
      )}

      <CustomerFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} customer={customer} />
      <CustomerAddressDialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen} customerId={id!} address={selectedAddress} />
    </div>
  );
};

export default CustomerDetailsPage;
