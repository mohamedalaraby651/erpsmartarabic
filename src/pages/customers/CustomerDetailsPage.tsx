import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Edit, MapPin, Paperclip, ShoppingCart, Activity, FileText,
  CreditCard, Bell, MessageSquare, BarChart3, Percent, Globe, Clock, Printer,
  TrendingUp, Target, Calendar, ChevronDown, Wallet,
} from "lucide-react";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerAddressDialog from "@/components/customers/CustomerAddressDialog";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { useCustomerDetail } from "@/hooks/customers";
import { CustomerHeroHeader } from "@/components/customers/CustomerHeroHeader";
import { CustomerStatsGrid } from "@/components/customers/CustomerStatsGrid";
import { CustomerMobileProfile } from "@/components/customers/mobile/CustomerMobileProfile";
import { CustomerMobileStatCard } from "@/components/customers/mobile/CustomerMobileStatCard";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
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
const CustomerTabCreditNotes = lazy(() => import("@/components/customers/tabs/CustomerTabCreditNotes").then(m => ({ default: m.CustomerTabCreditNotes })));

import MobileDetailSection from "@/components/mobile/MobileDetailSection";

const tabIcons: Record<string, React.ElementType> = {
  addresses: MapPin, attachments: Paperclip, reminders: Bell,
  invoices: FileText, quotations: Globe, orders: ShoppingCart,
  payments: CreditCard, 'credit-notes': FileText, financial: Wallet, statement: Printer, aging: Clock,
  analytics: BarChart3, communications: MessageSquare, activity: Activity,
};

const TabFallback = () => <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent rounded-full" /></div>;

const CustomerDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [mobileTab, setMobileTab] = useState('financials');

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
        />
      </div>

      {!isMobile && (
        <CustomerStatsGrid
          currentBalance={detail.currentBalance} balanceIsDebit={detail.balanceIsDebit}
          creditLimit={detail.creditLimit} creditUsagePercent={detail.creditUsagePercent}
          totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments}
          paymentRatio={detail.paymentRatio}
          invoiceCount={detail.invoices.length} avgInvoiceValue={detail.avgInvoiceValue}
          dso={detail.dso} totalOutstanding={detail.totalOutstanding} lastPurchaseDate={detail.lastPurchaseDate}
        />
      )}

      {isMobile ? (
        <div className="space-y-4">
          {/* Mobile Profile Card */}
          <CustomerMobileProfile
            customer={customer}
            customerId={id!}
            onEdit={() => setEditDialogOpen(true)}
            onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
            onStatement={() => setMobileTab('statement')}
            onWhatsApp={handleWhatsApp}
            onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
          />

          {/* Mobile Stats Cards - 2 columns grid */}
          <div className="grid grid-cols-2 gap-3">
            <CustomerMobileStatCard
              icon={CreditCard}
              title="الرصيد الحالي"
              value={`${detail.currentBalance.toLocaleString()} ج.م`}
              color={detail.balanceIsDebit ? 'destructive' : 'emerald'}
              progress={detail.creditLimit > 0 ? detail.creditUsagePercent : undefined}
              progressLabel={detail.creditLimit > 0 ? `${detail.creditUsagePercent.toFixed(0)}% من الحد` : undefined}
            />
            <CustomerMobileStatCard
              icon={Target}
              title="المستحق"
              value={`${detail.totalOutstanding.toLocaleString()} ج.م`}
              color={detail.totalOutstanding > 0 ? 'destructive' : 'emerald'}
            />
            <CustomerMobileStatCard
              icon={Wallet}
              title="نسبة السداد"
              value={`${detail.paymentRatio.toFixed(0)}%`}
              color={detail.paymentRatio >= 80 ? 'emerald' : detail.paymentRatio >= 50 ? 'warning' : 'destructive'}
              progress={detail.paymentRatio}
            />
            <CustomerMobileStatCard
              icon={TrendingUp}
              title="إجمالي المشتريات"
              value={`${detail.totalPurchases.toLocaleString()} ج.م`}
              color="primary"
            />
            <CustomerMobileStatCard
              icon={FileText}
              title="الفواتير"
              value={detail.invoices.length}
              subtitle={`متوسط ${detail.avgInvoiceValue.toLocaleString()} ج.م`}
              color="info"
            />
            <CustomerMobileStatCard
              icon={Wallet}
              title="إجمالي المدفوعات"
              value={`${detail.totalPayments.toLocaleString()} ج.م`}
              color="emerald"
            />
            <CustomerMobileStatCard
              icon={Clock}
              title="متوسط السداد"
              value={detail.dso !== null ? `${detail.dso} يوم` : '-'}
              color="muted"
            />
            <CustomerMobileStatCard
              icon={Calendar}
              title="آخر شراء"
              value={detail.lastPurchaseDate ? new Date(detail.lastPurchaseDate).toLocaleDateString('ar-EG') : '-'}
              color="muted"
            />
          </div>

          {/* Mobile Tab Bar */}
          <Tabs value={mobileTab} onValueChange={setMobileTab}>
            <ScrollArea className="w-full">
              <TabsList className="flex w-max h-10 bg-muted/50 p-1">
                <TabsTrigger value="financials" className="text-xs px-3"><FileText className="h-3.5 w-3.5 ml-1" />الفواتير</TabsTrigger>
                <TabsTrigger value="payments-tab" className="text-xs px-3"><CreditCard className="h-3.5 w-3.5 ml-1" />المدفوعات</TabsTrigger>
                <TabsTrigger value="sales" className="text-xs px-3"><ShoppingCart className="h-3.5 w-3.5 ml-1" />المبيعات</TabsTrigger>
                <TabsTrigger value="statement" className="text-xs px-3"><Printer className="h-3.5 w-3.5 ml-1" />كشف الحساب</TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs px-3"><BarChart3 className="h-3.5 w-3.5 ml-1" />التحليلات</TabsTrigger>
                <TabsTrigger value="more" className="text-xs px-3"><MapPin className="h-3.5 w-3.5 ml-1" />المزيد</TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <Suspense fallback={<TabFallback />}>
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
                <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoices.length} totalOutstanding={detail.totalOutstanding} />
              </TabsContent>
              <TabsContent value="analysis" className="mt-4 space-y-4">
                <CustomerPurchaseChart invoices={detail.invoices} payments={detail.payments} />
                <CommunicationLogTab customerId={id!} />
                <CustomerTabActivity activities={detail.activities} />
              </TabsContent>
              <TabsContent value="more" className="mt-4 space-y-4">
                <CustomerTabAddresses addresses={detail.addresses} onAdd={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEdit={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDelete={(addrId) => detail.deleteAddressMutation.mutate(addrId)} />
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
            <TabsContent value="addresses" className="mt-6">
              <CustomerTabAddresses addresses={detail.addresses} onAdd={() => { setSelectedAddress(null); setAddressDialogOpen(true); }} onEdit={(a) => { setSelectedAddress(a); setAddressDialogOpen(true); }} onDelete={(id) => detail.deleteAddressMutation.mutate(id)} />
            </TabsContent>
            <TabsContent value="reminders" className="mt-6"><CustomerReminderSection customerId={id!} /></TabsContent>
            <TabsContent value="invoices" className="mt-6"><CustomerTabInvoices invoices={detail.invoices} customerId={id!} totalPaymentsFromLedger={detail.totalPayments} /></TabsContent>
            <TabsContent value="quotations" className="mt-6"><CustomerTabQuotations quotations={detail.quotations} /></TabsContent>
            <TabsContent value="orders" className="mt-6"><CustomerTabOrders salesOrders={detail.salesOrders} /></TabsContent>
            <TabsContent value="payments" className="mt-6"><CustomerTabPayments payments={detail.payments} customerId={id!} /></TabsContent>
            <TabsContent value="credit-notes" className="mt-6"><CustomerTabCreditNotes creditNotes={detail.creditNotes} /></TabsContent>
            <TabsContent value="financial" className="mt-6">
              <CustomerFinancialSummary totalPurchases={detail.totalPurchases} totalPayments={detail.totalPayments} currentBalance={detail.currentBalance} creditLimit={detail.creditLimit} discountPercentage={Number(customer.discount_percentage || 0)} paymentTermsDays={Number(customer.payment_terms_days || 0)} invoiceCount={detail.invoices.length} totalOutstanding={detail.totalOutstanding} />
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
