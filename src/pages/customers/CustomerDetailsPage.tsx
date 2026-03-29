import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Edit, MapPin, Paperclip, ShoppingCart, Activity, FileText,
  CreditCard, Bell, MessageSquare, BarChart3, Wallet, Globe, Clock, Printer,
} from "lucide-react";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerAddressDialog from "@/components/customers/CustomerAddressDialog";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { useCustomerDetail } from "@/hooks/customers";
import { CustomerHeroHeader } from "@/components/customers/CustomerHeroHeader";
import { CustomerStatsGrid } from "@/components/customers/CustomerStatsGrid";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { tabGroups } from "@/lib/customerConstants";
import type { CustomerAddress } from "@/lib/customerConstants";

// Lazy-loaded tab components
const CustomerTabAddresses = lazy(() => import("@/components/customers/tabs/CustomerTabAddresses").then(m => ({ default: m.CustomerTabAddresses })));
const CustomerTabInvoices = lazy(() => import("@/components/customers/tabs/CustomerTabInvoices").then(m => ({ default: m.CustomerTabInvoices })));
const CustomerTabPayments = lazy(() => import("@/components/customers/tabs/CustomerTabPayments").then(m => ({ default: m.CustomerTabPayments })));
const CustomerTabQuotations = lazy(() => import("@/components/customers/tabs/CustomerTabQuotations").then(m => ({ default: m.CustomerTabQuotations })));
const CustomerTabOrders = lazy(() => import("@/components/customers/tabs/CustomerTabOrders").then(m => ({ default: m.CustomerTabOrders })));
const CustomerTabActivity = lazy(() => import("@/components/customers/tabs/CustomerTabActivity").then(m => ({ default: m.CustomerTabActivity })));
const CustomerTabAttachments = lazy(() => import("@/components/customers/tabs/CustomerTabAttachments").then(m => ({ default: m.CustomerTabAttachments })));
const StatementOfAccount = lazy(() => import("@/components/customers/StatementOfAccount"));
const CustomerFinancialSummary = lazy(() => import("@/components/customers/CustomerFinancialSummary"));
const CustomerPurchaseChart = lazy(() => import("@/components/customers/CustomerPurchaseChart"));
const CustomerAgingReport = lazy(() => import("@/components/customers/CustomerAgingReport"));
const CommunicationLogTab = lazy(() => import("@/components/customers/CommunicationLogTab"));
const CustomerReminderSection = lazy(() => import("@/components/customers/CustomerReminderDialog"));

// Lazy-loaded mobile sections
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { Badge } from "@/components/ui/badge";

const tabIcons: Record<string, React.ElementType> = {
  addresses: MapPin, attachments: Paperclip, reminders: Bell,
  invoices: FileText, quotations: Globe, orders: ShoppingCart,
  payments: CreditCard, financial: Wallet, statement: Printer, aging: Clock,
  analytics: BarChart3, communications: MessageSquare, activity: Activity,
};

const TabFallback = () => <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent rounded-full" /></div>;

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
        action={<Button variant="outline" size="sm" className="min-h-11 min-w-11" onClick={() => setEditDialogOpen(true)}><Edit className="h-4 w-4" /></Button>}
      />

      <CustomerHeroHeader
        customer={customer} customerId={id!}
        invoices={detail.invoices} payments={detail.payments}
        onBack={() => navigate('/customers')} onEdit={() => setEditDialogOpen(true)}
        onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
        onStatement={() => detail.setActiveTab('statement')}
        onWhatsApp={handleWhatsApp}
        onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
      />

      {isMobile ? <MobileStatsScroll stats={mobileStats} /> : (
        <CustomerStatsGrid
          currentBalance={detail.currentBalance} balanceIsDebit={detail.balanceIsDebit}
          creditLimit={detail.creditLimit} creditUsagePercent={detail.creditUsagePercent}
          totalPurchases={detail.totalPurchases} paymentRatio={detail.paymentRatio}
          invoiceCount={detail.invoices.length} avgInvoiceValue={detail.avgInvoiceValue}
          dso={detail.dso} clv={detail.clv} lastPurchaseDate={detail.lastPurchaseDate}
        />
      )}

      {isMobile ? (
        <div className="space-y-3">
          <MobileDetailSection title="الفواتير" priority="medium" icon={<FileText className="h-4 w-4" />} badge={detail.invoices.length}>
            <Suspense fallback={<TabFallback />}><CustomerTabInvoices invoices={detail.invoices} customerId={id!} /></Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="المدفوعات" priority="low" icon={<CreditCard className="h-4 w-4" />} badge={detail.payments.length}>
            <Suspense fallback={<TabFallback />}><CustomerTabPayments payments={detail.payments} /></Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="الملخص المالي" priority="low" icon={<Wallet className="h-4 w-4" />}>
            <Suspense fallback={<TabFallback />}>
              <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoices.length} />
            </Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="العناوين" priority="low" icon={<MapPin className="h-4 w-4" />} badge={detail.addresses.length}>
            <Suspense fallback={<TabFallback />}>
              <CustomerTabAddresses addresses={detail.addresses} onAdd={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEdit={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDelete={(id) => detail.deleteAddressMutation.mutate(id)} />
            </Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="كشف الحساب" priority="low" icon={<FileText className="h-4 w-4" />}>
            <Suspense fallback={<TabFallback />}><StatementOfAccount customerName={customer.name} invoices={detail.invoices} payments={detail.payments} creditNotes={detail.creditNotes} /></Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="سجل التواصل" priority="low" icon={<MessageSquare className="h-4 w-4" />}>
            <Suspense fallback={<TabFallback />}><CommunicationLogTab customerId={id!} /></Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="التذكيرات" priority="low" icon={<Bell className="h-4 w-4" />}>
            <Suspense fallback={<TabFallback />}><CustomerReminderSection customerId={id!} /></Suspense>
          </MobileDetailSection>
          <MobileDetailSection title="المرفقات" priority="low" icon={<Paperclip className="h-4 w-4" />}>
            <Suspense fallback={<TabFallback />}><CustomerTabAttachments customerId={id!} /></Suspense>
          </MobileDetailSection>
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
            <TabsContent value="addresses" className="mt-6">
              <CustomerTabAddresses addresses={detail.addresses} onAdd={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEdit={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDelete={(id) => detail.deleteAddressMutation.mutate(id)} />
            </TabsContent>
            <TabsContent value="reminders" className="mt-6"><CustomerReminderSection customerId={id!} /></TabsContent>
            <TabsContent value="invoices" className="mt-6"><CustomerTabInvoices invoices={detail.invoices} customerId={id!} /></TabsContent>
            <TabsContent value="quotations" className="mt-6"><CustomerTabQuotations quotations={detail.quotations} /></TabsContent>
            <TabsContent value="orders" className="mt-6"><CustomerTabOrders salesOrders={detail.salesOrders} /></TabsContent>
            <TabsContent value="payments" className="mt-6"><CustomerTabPayments payments={detail.payments} /></TabsContent>
            <TabsContent value="financial" className="mt-6">
              <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoices.length} />
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
