import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Edit, MapPin, Paperclip, ShoppingCart, Activity, FileText,
  CreditCard, Bell, MessageSquare, BarChart3, Globe, Clock, Printer,
  Wallet, StickyNote,
} from "lucide-react";
import CustomerFormDialog from "@/components/customers/dialogs/CustomerFormDialog";
import CustomerAddressDialog from "@/components/customers/dialogs/CustomerAddressDialog";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { useCustomerDetail, useCustomerNavigation } from "@/hooks/customers";
import { CustomerHeroHeader } from "@/components/customers/details/CustomerHeroHeader";
import { CustomerSmartAlerts } from "@/components/customers/details/CustomerSmartAlerts";
import { CustomerPinnedNote } from "@/components/customers/details/CustomerPinnedNote";
import { CustomerKPICards } from "@/components/customers/details/CustomerKPICards";
import { CustomerHealthBadge } from "@/components/customers/details/CustomerHealthBadge";
import { CustomerMobileProfile } from "@/components/customers/mobile/CustomerMobileProfile";
import { CustomerIconStrip } from "@/components/customers/mobile/CustomerIconStrip";
import type { MobileSectionId } from "@/components/customers/mobile/CustomerIconStrip";
import { CustomerCompressedHeader } from "@/components/customers/mobile/CustomerCompressedHeader";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { tabGroups } from "@/lib/customerConstants";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { CustomerAddress } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";

// Lazy-loaded tab components
const CustomerTabBasicInfo = lazy(() => import("@/components/customers/tabs/CustomerTabBasicInfo").then(m => ({ default: m.CustomerTabBasicInfo })));
const CustomerTabNotes = lazy(() => import("@/components/customers/tabs/CustomerTabNotes").then(m => ({ default: m.CustomerTabNotes })));
const CustomerTabInvoices = lazy(() => import("@/components/customers/tabs/CustomerTabInvoices").then(m => ({ default: m.CustomerTabInvoices })));
const CustomerTabPayments = lazy(() => import("@/components/customers/tabs/CustomerTabPayments").then(m => ({ default: m.CustomerTabPayments })));
const CustomerTabQuotations = lazy(() => import("@/components/customers/tabs/CustomerTabQuotations").then(m => ({ default: m.CustomerTabQuotations })));
const CustomerTabOrders = lazy(() => import("@/components/customers/tabs/CustomerTabOrders").then(m => ({ default: m.CustomerTabOrders })));
const CustomerTabActivity = lazy(() => import("@/components/customers/tabs/CustomerTabActivity").then(m => ({ default: m.CustomerTabActivity })));
const CustomerTabAttachments = lazy(() => import("@/components/customers/tabs/CustomerTabAttachments").then(m => ({ default: m.CustomerTabAttachments })));
const StatementOfAccount = lazy(() => import("@/components/customers/details/StatementOfAccount"));
const CustomerFinancialSummary = lazy(() => import("@/components/customers/details/CustomerFinancialSummary"));
const CustomerPurchaseChart = lazy(() => import("@/components/customers/details/CustomerPurchaseChart"));
const AgingDonutChart = lazy(() => import("@/components/customers/charts/AgingDonutChart").then(m => ({ default: m.AgingDonutChart })));
const CashFlowLineChart = lazy(() => import("@/components/customers/charts/CashFlowLineChart").then(m => ({ default: m.CashFlowLineChart })));
const TopProductsChart = lazy(() => import("@/components/customers/charts/TopProductsChart").then(m => ({ default: m.TopProductsChart })));
const CustomerAgingReport = lazy(() => import("@/components/customers/details/CustomerAgingReport"));
const CommunicationLogTab = lazy(() => import("@/components/customers/details/CommunicationLogTab"));
const CustomerReminderSection = lazy(() => import("@/components/customers/dialogs/CustomerReminderDialog"));
const CustomerTabCreditNotes = lazy(() => import("@/components/customers/tabs/CustomerTabCreditNotes").then(m => ({ default: m.CustomerTabCreditNotes })));
const CustomerSalesPipeline = lazy(() => import("@/components/customers/details/CustomerSalesPipeline").then(m => ({ default: m.CustomerSalesPipeline })));

import MobileDetailSection from "@/components/mobile/MobileDetailSection";

const tabIcons: Record<string, React.ElementType> = {
  'basic-info': MapPin, notes: StickyNote, attachments: Paperclip, reminders: Bell,
  invoices: FileText, quotations: Globe, orders: ShoppingCart,
  payments: CreditCard, 'credit-notes': FileText, financial: Wallet, statement: Printer, aging: Clock,
  analytics: BarChart3, communications: MessageSquare, activity: Activity,
};

const TabSkeleton = () => (
  <div className="space-y-3 py-4 animate-pulse">
    <div className="h-10 bg-muted rounded-lg w-full" />
    <div className="h-24 bg-muted rounded-lg w-full" />
    <div className="h-16 bg-muted rounded-lg w-full" />
    <div className="h-16 bg-muted rounded-lg w-3/4" />
  </div>
);

/* ─── Mobile Customer View with scroll-based sticky header ─── */
interface MobileCustomerViewProps {
  customer: Customer;
  customerId: string;
  detail: ReturnType<typeof useCustomerDetail>;
  mobileSection: MobileSectionId;
  setMobileSection: (s: MobileSectionId) => void;
  onEdit: () => void;
  onNewInvoice: () => void;
  onNewPayment: () => void;
  onNewQuotation: () => void;
  onNewOrder: () => void;
  onWhatsApp: () => void;
  onImageUpdate: (url: string | null) => void;
  onToggleActive: () => void;
  onQuickPay: (invoiceId: string) => void;
  setSelectedAddress: (a: CustomerAddress | null) => void;
  setAddressDialogOpen: (v: boolean) => void;
}

function MobileCustomerView({
  customer, customerId, detail, mobileSection, setMobileSection,
  onEdit, onNewInvoice, onNewPayment, onNewQuotation, onNewOrder,
  onWhatsApp, onImageUpdate, onToggleActive, onQuickPay,
  setSelectedAddress, setAddressDialogOpen,
}: MobileCustomerViewProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showCompressed, setShowCompressed] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowCompressed(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-48px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const openCall = () => {
    if (customer.phone) window.open(`tel:${customer.phone}`);
  };

  const selectSection = (s: MobileSectionId) => {
    setMobileSection(s);
    if (s !== 'none') {
      requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  return (
    <div className="space-y-3">
      <div ref={heroRef}>
        <CustomerMobileProfile
          customer={customer} customerId={customerId}
          onEdit={onEdit}
          onNewInvoice={onNewInvoice}
          onStatement={() => selectSection('statement')}
          onWhatsApp={onWhatsApp}
          onImageUpdate={onImageUpdate}
          currentBalance={detail.currentBalance} balanceIsDebit={detail.balanceIsDebit}
          creditLimit={detail.creditLimit} creditUsagePercent={detail.creditUsagePercent}
          totalOutstanding={detail.totalOutstanding} paymentRatio={detail.paymentRatio}
          totalPurchases={detail.totalPurchases}
          invoices={detail.invoices} payments={detail.payments}
          onNewPayment={onNewPayment}
          onNewQuotation={onNewQuotation}
          onNewOrder={onNewOrder}
          onNewCreditNote={() => selectSection('invoices')}
          onToggleActive={onToggleActive}
        />
      </div>

      <div className="sticky top-0 z-30 -mx-3 px-3 bg-background pb-1 space-y-1.5">
        <div className={cn(
          "transition-all duration-200 overflow-hidden",
          showCompressed ? "max-h-40 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}>
          <CustomerCompressedHeader
            customer={customer}
            currentBalance={detail.currentBalance}
            balanceIsDebit={detail.balanceIsDebit}
            onNewInvoice={onNewInvoice}
            onNewPayment={onNewPayment}
            onCall={customer.phone ? openCall : undefined}
            onMoreActions={onEdit}
          />
        </div>
        <CustomerIconStrip activeSection={mobileSection} onSectionChange={selectSection} />
      </div>

      <div ref={sectionRef}>
        {mobileSection !== 'none' && (
          <Suspense fallback={<TabSkeleton />}>
            {mobileSection === 'invoices' && (
              <div className="space-y-4">
                <CustomerTabInvoices invoices={detail.invoices} customerId={customerId} totalPaymentsFromLedger={detail.totalPayments} onQuickPay={onQuickPay} paginatedData={detail.paginatedInvoices} currentPage={detail.invoicePage} pageSize={detail.invoicePageSize} onPageChange={detail.goToInvoicePage} />
                <CustomerTabCreditNotes creditNotes={detail.creditNotes} />
              </div>
            )}
            {mobileSection === 'payments' && (
              <CustomerTabPayments payments={detail.payments} customerId={customerId} paginatedData={detail.paginatedPayments} currentPage={detail.paymentPage} pageSize={detail.paymentPageSize} onPageChange={detail.goToPaymentPage} />
            )}
            {mobileSection === 'info' && (
              <CustomerTabBasicInfo customer={customer} addresses={detail.addresses} onAddAddress={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEditAddress={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDeleteAddress={(addrId) => detail.deleteAddressMutation.mutate(addrId)} onWhatsApp={onWhatsApp} />
            )}
            {mobileSection === 'notes' && (
              <CustomerTabNotes customerId={customerId} />
            )}
            {mobileSection === 'analytics' && (
              <div className="space-y-4">
                <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoiceCount} totalOutstanding={detail.totalOutstanding} paymentRatio={detail.paymentRatio} avgInvoiceValue={detail.avgInvoiceValue} dso={detail.dso} clv={detail.clv} />
                <CustomerPurchaseChart monthlyData={detail.chartData?.monthly_data} />
                <AgingDonutChart customerId={customerId} />
                <CashFlowLineChart monthlyData={detail.chartData?.monthly_data} />
                <TopProductsChart topProducts={detail.chartData?.top_products} />
              </div>
            )}
            {mobileSection === 'sales' && (
              <div className="space-y-4">
                <CustomerTabQuotations quotations={detail.quotations} />
                <CustomerTabOrders salesOrders={detail.salesOrders} />
              </div>
            )}
            {mobileSection === 'statement' && (
              <StatementOfAccount customerName={customer.name} customerId={customerId} />
            )}
            {mobileSection === 'aging' && (
              <CustomerAgingReport customerId={customerId} />
            )}
            {mobileSection === 'reminders' && (
              <CustomerReminderSection customerId={customerId} />
            )}
            {mobileSection === 'communications' && (
              <CommunicationLogTab customerId={customerId} />
            )}
            {mobileSection === 'attachments' && (
              <CustomerTabAttachments customerId={customerId} />
            )}
          </Suspense>
        )}
      </div>
    </div>
  );
}

const CustomerDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const initialSection = (searchParams.get('section') as MobileSectionId | null) || 'none';
  const [mobileSection, setMobileSectionState] = useState<MobileSectionId>(initialSection);

  const detail = useCustomerDetail(id);
  const { prevId, nextId, goNext, goPrev } = useCustomerNavigation(id);

  // === URL sync for active tab (desktop) ===
  const urlTab = searchParams.get('tab');
  useEffect(() => {
    if (urlTab && !isMobile) {
      detail.setActiveTab(urlTab);
    }
  }, [urlTab, isMobile, detail]);

  const handleTabChange = (tab: string) => {
    detail.setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Persist mobile section in URL so back-navigation restores it
  const setMobileSection = (s: MobileSectionId) => {
    setMobileSectionState(s);
    const next = new URLSearchParams(searchParams);
    if (s === 'none') next.delete('section');
    else next.set('section', s);
    setSearchParams(next, { replace: true });
  };


  const updateFieldMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const hasPermission = await verifyPermissionOnServer('customers', 'edit');
      if (!hasPermission) throw new Error('ليس لديك صلاحية تعديل العملاء');
      return customerRepository.update(id!, updates);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', id] }); },
    onError: (err) => { toast({ title: err instanceof Error ? err.message : "حدث خطأ أثناء التحديث", variant: "destructive" }); },
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

  const handleQuickPay = (invoiceId: string) => {
    navigate('/payments', { state: { prefillCustomerId: id, prefillInvoiceId: invoiceId } });
  };

  return (
    <PageWrapper title={customer.name}>
    <div className="space-y-6">
      <MobileDetailHeader
        title={customer.name}
        backTo="/customers"
      />

      <div className="hidden md:block">
        <CustomerHeroHeader
          customer={customer} customerId={id!}
          invoices={detail.invoices} payments={detail.payments}
          onBack={() => navigate('/customers')} onEdit={() => setEditDialogOpen(true)}
          onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
          onStatement={() => handleTabChange('statement')}
          onWhatsApp={handleWhatsApp}
          onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
          onPrev={goPrev} onNext={goNext} hasPrev={!!prevId} hasNext={!!nextId}
          currentBalance={detail.currentBalance} balanceIsDebit={detail.balanceIsDebit}
          creditLimit={detail.creditLimit} creditUsagePercent={detail.creditUsagePercent}
           totalPurchases={detail.totalPurchases} totalOutstanding={detail.totalOutstanding}
           paymentRatio={detail.paymentRatio} invoiceCount={detail.invoiceCount} dso={detail.dso}
          onNewPayment={() => navigate('/payments', { state: { prefillCustomerId: id } })}
          onNewQuotation={() => navigate('/quotations', { state: { prefillCustomerId: id } })}
          onNewOrder={() => navigate('/sales-orders', { state: { prefillCustomerId: id } })}
          onNewCreditNote={() => handleTabChange('credit-notes')}
          onToggleActive={handleToggleActive} onChangeVip={handleChangeVip}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <CustomerSmartAlerts
          currentBalance={detail.currentBalance} creditLimit={detail.creditLimit}
          invoices={detail.invoices} lastPurchaseDate={detail.lastPurchaseDate}
          lastCommunicationAt={customer.last_communication_at}
          onEditCreditLimit={() => setEditDialogOpen(true)}
          onSendReminder={() => isMobile ? setMobileSection('reminders') : handleTabChange('reminders')}
          onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
          onContact={handleWhatsApp}
        />
        <CustomerHealthBadge customerId={id!} />
      </div>

      <CustomerPinnedNote customerId={id!} onViewAllNotes={() => isMobile ? setMobileSection('notes') : handleTabChange('notes')} />

      {isMobile ? (
        <MobileCustomerView
          customer={customer}
          customerId={id!}
          detail={detail}
          mobileSection={mobileSection}
          setMobileSection={setMobileSection}
          onEdit={() => setEditDialogOpen(true)}
          onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
          onNewPayment={() => navigate('/payments', { state: { prefillCustomerId: id } })}
          onNewQuotation={() => navigate('/quotations', { state: { prefillCustomerId: id } })}
          onNewOrder={() => navigate('/sales-orders', { state: { prefillCustomerId: id } })}
          onWhatsApp={handleWhatsApp}
          onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
          onToggleActive={handleToggleActive}
          onQuickPay={handleQuickPay}
          setSelectedAddress={setSelectedAddress}
          setAddressDialogOpen={setAddressDialogOpen}
        />
      ) : (
        <Tabs value={detail.activeTab} onValueChange={handleTabChange} className="w-full">
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

          <Suspense fallback={<TabSkeleton />}>
            <TabsContent value="basic-info" className="mt-6">
              <CustomerTabBasicInfo customer={customer} addresses={detail.addresses} onAddAddress={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEditAddress={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDeleteAddress={(aid) => detail.deleteAddressMutation.mutate(aid)} onWhatsApp={handleWhatsApp} />
            </TabsContent>
            <TabsContent value="notes" className="mt-6"><CustomerTabNotes customerId={id!} /></TabsContent>
            <TabsContent value="reminders" className="mt-6"><CustomerReminderSection customerId={id!} /></TabsContent>
            <TabsContent value="invoices" className="mt-6"><CustomerTabInvoices invoices={detail.invoices} customerId={id!} totalPaymentsFromLedger={detail.totalPayments} onQuickPay={handleQuickPay} paginatedData={detail.paginatedInvoices} currentPage={detail.invoicePage} pageSize={detail.invoicePageSize} onPageChange={detail.goToInvoicePage} /></TabsContent>
            <TabsContent value="quotations" className="mt-6"><CustomerTabQuotations quotations={detail.quotations} /></TabsContent>
            <TabsContent value="orders" className="mt-6"><CustomerTabOrders salesOrders={detail.salesOrders} /></TabsContent>
            <TabsContent value="payments" className="mt-6"><CustomerTabPayments payments={detail.payments} customerId={id!} paginatedData={detail.paginatedPayments} currentPage={detail.paymentPage} pageSize={detail.paymentPageSize} onPageChange={detail.goToPaymentPage} /></TabsContent>
            <TabsContent value="credit-notes" className="mt-6"><CustomerTabCreditNotes creditNotes={detail.creditNotes} /></TabsContent>
            <TabsContent value="financial" className="mt-6 space-y-4">
              <Suspense fallback={<TabSkeleton />}>
                <CustomerSalesPipeline quotations={detail.quotations} salesOrders={detail.salesOrders} invoices={detail.invoices} />
              </Suspense>
              <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoiceCount} totalOutstanding={detail.totalOutstanding} paymentRatio={detail.paymentRatio} avgInvoiceValue={detail.avgInvoiceValue} dso={detail.dso} clv={detail.clv} />
            </TabsContent>
            <TabsContent value="statement" className="mt-6">
              <StatementOfAccount customerName={customer.name} customerId={id!} />
            </TabsContent>
            <TabsContent value="aging" className="mt-6"><CustomerAgingReport customerId={id!} /></TabsContent>
            <TabsContent value="communications" className="mt-6"><CommunicationLogTab customerId={id!} /></TabsContent>
            <TabsContent value="analytics" className="mt-6 space-y-4">
              <ChartErrorBoundary title="المشتريات والمدفوعات">
                <CustomerPurchaseChart monthlyData={detail.chartData?.monthly_data} />
              </ChartErrorBoundary>
              <ChartErrorBoundary title="أعمار الديون">
                <AgingDonutChart customerId={id!} />
              </ChartErrorBoundary>
              <ChartErrorBoundary title="التدفق المالي">
                <CashFlowLineChart monthlyData={detail.chartData?.monthly_data} />
              </ChartErrorBoundary>
              <ChartErrorBoundary title="المنتجات">
                <TopProductsChart topProducts={detail.chartData?.top_products} />
              </ChartErrorBoundary>
            </TabsContent>
            <TabsContent value="activity" className="mt-6"><CustomerTabActivity activities={detail.activities} /></TabsContent>
            <TabsContent value="attachments" className="mt-6"><CustomerTabAttachments customerId={id!} /></TabsContent>
          </Suspense>
        </Tabs>
      )}

      <CustomerFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} customer={customer} />
      <CustomerAddressDialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen} customerId={id!} address={selectedAddress} />
    </div>
    </PageWrapper>
  );
};

import { CustomerErrorBoundary } from "@/components/customers/details/CustomerErrorBoundary";

function CustomerDetailsPageWrapped() {
  return (
    <CustomerErrorBoundary>
      <CustomerDetailsPage />
    </CustomerErrorBoundary>
  );
}

export default CustomerDetailsPageWrapped;
