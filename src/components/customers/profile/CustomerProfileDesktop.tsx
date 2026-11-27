import { lazy, Suspense, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Printer, Pencil, List, Activity, CreditCard, FileText, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { CustomerNotesSection, CustomerAttachmentsSection } from "./CustomerBottomSections";
import { useCustomerProfileV19 } from "@/hooks/customers/useCustomerProfileV19";
import type { useCustomerDetail } from "@/hooks/customers";
import type { Customer } from "@/lib/customerConstants";
import { CustomerProfileCard } from "./CustomerProfileCard";
import { CustomerSummaryBanner, openWhatsApp, reminderText } from "./CustomerSummaryBanner";
import { CustomerProfileSidebar } from "./CustomerProfileSidebar";
import { CustomerPurchasesTab } from "./CustomerPurchasesTab";
import { PromiseDialog, ContactDialog } from "./ProfileDialogs";
import { cn } from "@/lib/utils";
import "./CustomerProfilePrint.css";

const StatementOfAccount = lazy(() => import("@/components/customers/details/StatementOfAccount"));
const CustomerTabActivity = lazy(() => import("@/components/customers/tabs/CustomerTabActivity").then((m) => ({ default: m.CustomerTabActivity })));
const CustomerTabPayments = lazy(() => import("@/components/customers/tabs/CustomerTabPayments").then((m) => ({ default: m.CustomerTabPayments })));
const CustomerAgingReport = lazy(() => import("@/components/customers/details/CustomerAgingReport"));
const CustomerReminderSection = lazy(() => import("@/components/customers/dialogs/CustomerReminderDialog"));

export const PROFILE_TABS = ['statement', 'activity', 'purchases', 'payments', 'collection'] as const;
const TAB_ICON: Record<string, LucideIcon> = { statement: List, activity: Activity, purchases: FileText, payments: CreditCard, collection: Target };
const TAB_AR: Record<string, string> = { statement: 'كشف حساب', activity: 'سجل النشاط', purchases: 'المشتريات', payments: 'المدفوعات', collection: 'مركز التحصيل' };

interface Props {
  customer: Customer; customerId: string; detail: ReturnType<typeof useCustomerDetail>;
  tab: string; onTabChange: (t: string) => void;
  onEdit: () => void; onPay: (invoiceId?: string) => void; onNewInvoice: () => void; onWhatsApp: () => void;
}

export function CustomerProfileDesktop({ customer, customerId, detail, tab, onTabChange, onEdit, onPay, onNewInvoice, onWhatsApp }: Props) {
  const profile = useCustomerProfileV19(customerId, customer.credit_limit);
  const [printing, setPrinting] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const navigate = useNavigate();
  const [sideW, setSideW] = useState('lg:w-[22rem]');
  const onWidth = useCallback((w: string) => setSideW(w), []);
  const m = profile.metrics;
  const remind = () => openWhatsApp(customer.phone, reminderText(customer.name, m.outstanding));
  const counts: Record<string, number | undefined> = { activity: detail.activities?.length, payments: profile.payments.length, purchases: profile.invoices.length + profile.creditNotes.length + profile.salesOrders.length };
  const activeTab = (PROFILE_TABS as readonly string[]).includes(tab) ? tab : 'purchases';

  const printPage = () => {
    flushSync(() => setPrinting(true));
    const done = () => { setPrinting(false); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    requestAnimationFrame(() => window.print());
  };

  return (
    <div className="customer-profile-v19 space-y-3 rounded-2xl bg-muted/50 p-4 text-[13px]" dir="rtl">
      <div className="flex items-center justify-between gap-3 no-print">
        <nav aria-label="مسار التنقل" className="text-sm text-muted-foreground">
          <button type="button" onClick={() => navigate('/customers')} className="hover:text-foreground">العملاء</button> / <b className="text-foreground">{customer.name}</b>
        </nav>
        <Button variant="outline" onClick={printPage} className="h-9 rounded-lg border-2 border-primary bg-card font-bold text-primary hover:bg-primary/5 hover:text-primary"><Printer className="h-4 w-4" />طباعة الصفحة PDF</Button>
      </div>
      <CustomerSummaryBanner name={customer.name} phone={customer.phone} outstanding={m.outstanding} openCount={m.openCount}
        oldestOverdueDays={m.oldestOverdueDays} lastPayment={profile.lastPayment} />
      <CustomerProfileCard customer={customer} hasOverdue={m.overdueAmount > 0} forceOpen={printing}
        onEdit={onEdit} onPay={() => onPay()} onPromise={() => setPromiseOpen(true)} onNewInvoice={onNewInvoice} onWhatsApp={onWhatsApp} />

      <div className="flex flex-col items-start gap-3 lg:flex-row">
        <div className="w-full min-w-0 flex-1 space-y-3">
          <section className="rounded-xl border border-border bg-card p-3 shadow-xs print-card">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <div className="flex flex-nowrap items-center justify-between gap-2 rounded-xl bg-muted/60 p-1 no-print">
              <TabsList className="h-auto min-w-0 shrink flex-nowrap justify-start gap-1 overflow-x-auto bg-transparent p-0 [scrollbar-width:none]">
                {PROFILE_TABS.map((t) => { const I = TAB_ICON[t]!; const c = counts[t]; return (
                  <TabsTrigger key={t} value={t} className="shrink-0 gap-1 whitespace-nowrap rounded-lg border border-transparent px-2.5 py-1 text-xs font-semibold text-muted-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs">
                    <I className="h-3.5 w-3.5" />{TAB_AR[t]}{c !== undefined && c > 0 ? ` (${c})` : ''}
                  </TabsTrigger>); })}
              </TabsList>
              <Button variant="outline" size="sm" className="ms-auto h-8 shrink-0 rounded-lg bg-card font-bold" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />تعديل</Button>
            </div>
            <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
              <TabsContent value="statement" className="mt-3"><StatementOfAccount customerName={customer.name} customerId={customerId} /></TabsContent>
              <TabsContent value="activity" className="mt-3"><CustomerTabActivity activities={detail.activities} /></TabsContent>
              <TabsContent value="purchases" className="mt-3" forceMount={printing ? true : undefined}>
                <CustomerPurchasesTab profile={profile} customerName={customer.name} customerPhone={customer.phone} onPay={onPay}
                  onPrintStatement={() => onTabChange('statement')} forceOpen={printing} />
              </TabsContent>
              <TabsContent value="payments" className="mt-3">
                <CustomerTabPayments payments={detail.payments} customerId={customerId} paginatedData={detail.paginatedPayments} currentPage={detail.paymentPage} pageSize={detail.paymentPageSize} onPageChange={detail.goToPaymentPage} />
              </TabsContent>
              <TabsContent value="collection" className="mt-3 space-y-3">
                <CustomerAgingReport customerId={customerId} />
                <CustomerReminderSection customerId={customerId} />
              </TabsContent>
            </Suspense>
          </Tabs>
          </section>
          <CustomerNotesSection customerId={customerId} forceOpen={printing} />
          <CustomerAttachmentsSection customerId={customerId} forceOpen={printing} />
        </div>
        <div className={cn("w-full shrink-0 lg:sticky lg:top-4", sideW)}>
          <CustomerProfileSidebar profile={profile} customerName={customer.name} creditLimit={Number(customer.credit_limit ?? 0)}
            forceOpen={printing} onWidth={onWidth} onAddPromise={() => setPromiseOpen(true)} onAddContact={() => setContactOpen(true)} onRemind={remind}
            onViewPayments={() => onTabChange('payments')} onEditPayment={() => onTabChange('payments')} />
        </div>
      </div>

      <PromiseDialog open={promiseOpen} onOpenChange={setPromiseOpen} defaultAmount={m.outstanding}
        onSubmit={(v) => profile.addPromise.mutateAsync({ customer_id: customerId, ...v })} />
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen}
        onSubmit={(v) => profile.addContact.mutateAsync({ customer_id: customerId, ...v })} />
    </div>
  );
}
