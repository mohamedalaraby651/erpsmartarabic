import { lazy, Suspense, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Printer, Pencil, ChevronDown, ChevronUp } from "lucide-react";
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
const CustomerTabNotes = lazy(() => import("@/components/customers/tabs/CustomerTabNotes").then((m) => ({ default: m.CustomerTabNotes })));
const CustomerTabAttachments = lazy(() => import("@/components/customers/tabs/CustomerTabAttachments").then((m) => ({ default: m.CustomerTabAttachments })));
const CustomerAgingReport = lazy(() => import("@/components/customers/details/CustomerAgingReport"));
const CustomerReminderSection = lazy(() => import("@/components/customers/dialogs/CustomerReminderDialog"));

export const PROFILE_TABS = ['statement', 'activity', 'purchases', 'payments', 'collection'] as const;
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
  const [bottomOpen, setBottomOpen] = useState({ notes: true, attachments: true });
  const [sideW, setSideW] = useState('lg:w-80');
  const onWidth = useCallback((w: string) => setSideW(w), []);
  const m = profile.metrics;
  const remind = () => openWhatsApp(customer.phone, reminderText(customer.name, m.outstanding));
  const activeTab = (PROFILE_TABS as readonly string[]).includes(tab) ? tab : 'purchases';

  const printPage = () => {
    flushSync(() => setPrinting(true));
    const done = () => { setPrinting(false); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    requestAnimationFrame(() => window.print());
  };

  return (
    <div className="customer-profile-v19 space-y-4" dir="rtl">
      <div className="flex justify-end no-print">
        <Button variant="outline" onClick={printPage}><Printer className="h-4 w-4" />طباعة الصفحة PDF</Button>
      </div>
      <CustomerProfileCard customer={customer} hasOverdue={m.overdueAmount > 0} forceOpen={printing}
        onEdit={onEdit} onPay={() => onPay()} onPromise={() => setPromiseOpen(true)} onNewInvoice={onNewInvoice} onWhatsApp={onWhatsApp} />
      <CustomerSummaryBanner name={customer.name} phone={customer.phone} outstanding={m.outstanding} openCount={m.openCount}
        oldestOverdueDays={m.oldestOverdueDays} lastPayment={profile.lastPayment} />

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <div className="flex items-center justify-between gap-2 no-print">
              <TabsList className="h-auto flex-wrap">
                {PROFILE_TABS.map((t) => <TabsTrigger key={t} value={t}>{TAB_AR[t]}</TabsTrigger>)}
              </TabsList>
              <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" />تعديل</Button>
            </div>
            <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
              <TabsContent value="statement" className="mt-4"><StatementOfAccount customerName={customer.name} customerId={customerId} /></TabsContent>
              <TabsContent value="activity" className="mt-4"><CustomerTabActivity activities={detail.activities} /></TabsContent>
              <TabsContent value="purchases" className="mt-4" forceMount={printing ? true : undefined}>
                <CustomerPurchasesTab profile={profile} customerName={customer.name} customerPhone={customer.phone} onPay={onPay}
                  onPrintStatement={() => onTabChange('statement')} forceOpen={printing} />
              </TabsContent>
              <TabsContent value="payments" className="mt-4">
                <CustomerTabPayments payments={detail.payments} customerId={customerId} paginatedData={detail.paginatedPayments} currentPage={detail.paymentPage} pageSize={detail.paymentPageSize} onPageChange={detail.goToPaymentPage} />
              </TabsContent>
              <TabsContent value="collection" className="mt-4 space-y-4">
                <CustomerAgingReport customerId={customerId} />
                <CustomerReminderSection customerId={customerId} />
              </TabsContent>
            </Suspense>
          </Tabs>

          <Suspense fallback={null}>
            {(['notes', 'attachments'] as const).map((k) => (
              <section key={k} className="rounded-xl border bg-card print-card">
                <button type="button" className="flex w-full items-center justify-between p-3 font-semibold" aria-expanded={bottomOpen[k] || printing}
                  onClick={() => setBottomOpen((s) => ({ ...s, [k]: !s[k] }))}>
                  {k === 'notes' ? 'الملاحظات' : 'المرفقات'}
                  {bottomOpen[k] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {(bottomOpen[k] || printing) && <div className="border-t p-3">{k === 'notes' ? <CustomerTabNotes customerId={customerId} /> : <CustomerTabAttachments customerId={customerId} />}</div>}
              </section>
            ))}
          </Suspense>
        </div>
        <div className={cn("w-full shrink-0", sideW)}>
          <CustomerProfileSidebar profile={profile} customerName={customer.name} creditLimit={Number(customer.credit_limit ?? 0)}
            forceOpen={printing} onWidth={onWidth} onAddPromise={() => setPromiseOpen(true)} onAddContact={() => setContactOpen(true)} onRemind={remind} />
        </div>
      </div>

      <PromiseDialog open={promiseOpen} onOpenChange={setPromiseOpen} defaultAmount={m.outstanding}
        onSubmit={(v) => profile.addPromise.mutateAsync({ customer_id: customerId, ...v })} />
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen}
        onSubmit={(v) => profile.addContact.mutateAsync({ customer_id: customerId, ...v })} />
    </div>
  );
}
