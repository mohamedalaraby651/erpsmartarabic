import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Edit, MapPin, Paperclip, ShoppingCart, Activity, FileText,
  CreditCard, Bell, MessageSquare, BarChart3, Globe, Clock, Printer,
  Wallet, StickyNote, ChevronLeft,
} from "lucide-react";
import CustomerFormDialog from "@/components/customers/dialogs/CustomerFormDialog";
import CustomerAddressDialog from "@/components/customers/dialogs/CustomerAddressDialog";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { LiveRegion } from "@/components/shared/LiveRegion";
import { useCustomerDetail, useCustomerNavigation, useUpcomingReminders } from "@/hooks/customers";
import CreditNoteFormDialog from "@/components/credit-notes/CreditNoteFormDialog";
import { CustomerHeroHeader } from "@/components/customers/details/CustomerHeroHeader";
import { CustomerSmartAlerts } from "@/components/customers/details/CustomerSmartAlerts";
import { CustomerPinnedNote } from "@/components/customers/details/CustomerPinnedNote";
import { CustomerKPICards } from "@/components/customers/details/CustomerKPICards";
import { CustomerHealthBadge } from "@/components/customers/details/CustomerHealthBadge";
import { CustomerMobileProfile } from "@/components/customers/mobile/CustomerMobileProfile";
import { CustomerIconStrip, PRIMARY_STRIP_IDS, SECONDARY_STRIP_IDS, STRIP_META } from "@/components/customers/mobile/CustomerIconStrip";
import type { MobileSectionId } from "@/components/customers/mobile/CustomerIconStrip";
import { CustomerCompressedHeader } from "@/components/customers/mobile/CustomerCompressedHeader";
import { CustomerQuickSuggestions } from "@/components/customers/mobile/CustomerQuickSuggestions";

import { CustomerSectionsSheet } from "@/components/customers/mobile/CustomerSectionsSheet";
import { CustomerMobileFAB } from "@/components/customers/mobile/CustomerMobileFAB";
import { CustomerSwipeHint } from "@/components/customers/mobile/CustomerSwipeHint";
import { WindowPullToRefresh } from "@/components/mobile/WindowPullToRefresh";
import { useLastVisitedSection } from "@/hooks/customers/useLastVisitedSection";
import { haptics } from "@/lib/haptics";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";
import { LazyOnVisible } from "@/components/shared/LazyOnVisible";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
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
import { MobileListSkeleton } from "@/components/customers/mobile/MobileListSkeleton";

const tabIcons: Record<string, React.ElementType> = {
  'basic-info': MapPin, notes: StickyNote, attachments: Paperclip, reminders: Bell,
  invoices: FileText, quotations: Globe, orders: ShoppingCart,
  payments: CreditCard, 'credit-notes': FileText, financial: Wallet, statement: Printer, aging: Clock,
  analytics: BarChart3, communications: MessageSquare, activity: Activity,
};

const TabSkeleton = () => (
  <div className="space-y-3 py-4 animate-pulse min-h-[280px]">
    <div className="h-10 bg-muted rounded-lg w-full" />
    <div className="h-24 bg-muted rounded-lg w-full" />
    <div className="h-16 bg-muted rounded-lg w-full" />
    <div className="h-16 bg-muted rounded-lg w-3/4" />
  </div>
);

/* ─── Section labels for mobile ─── */
const sectionLabels: Record<string, string> = {
  invoices: 'الفواتير', payments: 'المدفوعات', info: 'البيانات الأساسية',
  notes: 'الملاحظات', analytics: 'التحليلات والمؤشرات', sales: 'العروض والأوامر',
  statement: 'كشف الحساب', aging: 'أعمار الديون', reminders: 'التذكيرات',
  communications: 'سجل التواصل', attachments: 'المرفقات',
};

function SectionHeader({ sectionId, onBack }: { sectionId: MobileSectionId; onBack: () => void }) {
  const label = sectionLabels[sectionId];
  if (!label) return null;
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h3 className="text-sm font-bold text-foreground">{label}</h3>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5"
        aria-label="العودة للنظرة العامة"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        العودة للملخص
      </button>
    </div>
  );
}

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
  onNewCreditNote: () => void;
  onWhatsApp: () => void;
  onImageUpdate: (url: string | null) => void;
  onToggleActive: () => void;
  onChangeVip: (level: string) => void;
  onQuickPay: (invoiceId: string) => void;
  setSelectedAddress: (a: CustomerAddress | null) => void;
  setAddressDialogOpen: (v: boolean) => void;
  upcomingReminders: number;
  navProps: { hasPrev: boolean; hasNext: boolean; onPrev: () => void; onNext: () => void };
  /** عناصر تُحشَر تحت بطاقة الملف مباشرةً (تنبيهات/شارة صحة/ملاحظة مثبّتة) */
  belowProfileSlot?: React.ReactNode;
}

function MobileCustomerView({
  customer, customerId, detail, mobileSection, setMobileSection,
  onEdit, onNewInvoice, onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote,
  onWhatsApp, onImageUpdate, onToggleActive, onChangeVip, onQuickPay,
  setSelectedAddress, setAddressDialogOpen, upcomingReminders, navProps, belowProfileSlot,
}: MobileCustomerViewProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [showCompressed, setShowCompressed] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  /* ─── ARIA live announcements ─── */
  const [liveMessage, setLiveMessage] = useState("");

  // Announce section changes
  useEffect(() => {
    if (mobileSection === 'none') {
      setLiveMessage("العودة إلى النظرة العامة");
    } else {
      const label = sectionLabels[mobileSection] ?? mobileSection;
      setLiveMessage(`تم فتح قسم ${label}`);
    }
  }, [mobileSection]);

  // Announce when invoices finish loading (with count)
  const prevInvoicesLoading = useRef(detail.paginatedInvoicesLoading || detail.invoicesLoading);
  useEffect(() => {
    const wasLoading = prevInvoicesLoading.current;
    const nowLoading = detail.paginatedInvoicesLoading || detail.invoicesLoading;
    prevInvoicesLoading.current = nowLoading;
    if (wasLoading && !nowLoading && mobileSection === 'invoices') {
      const count = detail.paginatedInvoices?.data?.length ?? detail.invoices?.length ?? 0;
      const label = count === 0 ? "لا توجد فواتير" : `تم تحميل ${count} فاتورة`;
      setLiveMessage(label);
    }
  }, [detail.paginatedInvoicesLoading, detail.invoicesLoading, detail.paginatedInvoices, detail.invoices, mobileSection]);

  // Announce when payments finish loading (with count)
  const prevPaymentsLoading = useRef(detail.paginatedPaymentsLoading || detail.paymentsLoading);
  useEffect(() => {
    const wasLoading = prevPaymentsLoading.current;
    const nowLoading = detail.paginatedPaymentsLoading || detail.paymentsLoading;
    prevPaymentsLoading.current = nowLoading;
    if (wasLoading && !nowLoading && mobileSection === 'payments') {
      const count = detail.paginatedPayments?.data?.length ?? detail.payments?.length ?? 0;
      const label = count === 0 ? "لا توجد مدفوعات" : `تم تحميل ${count} عملية دفع`;
      setLiveMessage(label);
    }
  }, [detail.paginatedPaymentsLoading, detail.paymentsLoading, detail.paginatedPayments, detail.payments, mobileSection]);

  // Section badges (overdue invoices, upcoming reminders, aging 60+, communications, sales)
  const sectionBadges = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    const overdueInvoices = detail.invoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      const due = inv.due_date ? new Date(inv.due_date).getTime() : new Date(inv.created_at).getTime();
      return due < now;
    }).length;
    const aging60Plus = detail.invoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      const due = inv.due_date ? new Date(inv.due_date).getTime() : new Date(inv.created_at).getTime();
      return (now - due) > 60 * DAY;
    }).length;
    const stale = (detail.quotations || []).filter((q: { status?: string | null; created_at?: string | null }) => {
      const isPending = !q.status || ['draft', 'sent', 'pending'].includes(q.status);
      const created = q.created_at ? new Date(q.created_at).getTime() : now;
      return isPending && created < (now - 7 * DAY);
    }).length;
    const lastComm = customer.last_communication_at ? new Date(customer.last_communication_at).getTime() : null;
    const commStale = lastComm != null && (now - lastComm) > 30 * DAY ? 1 : 0;
    return {
      invoices: overdueInvoices,
      reminders: upcomingReminders,
      aging: aging60Plus,
      sales: stale,
      communications: commStale,
    } as Partial<Record<MobileSectionId, number>>;
  }, [detail.invoices, detail.quotations, upcomingReminders, customer.last_communication_at]);

  // Measure the actual MobileDetailHeader height for accurate sticky trigger
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const headerEl = document.querySelector<HTMLElement>('[data-mobile-detail-header]');
    const offset = headerEl?.getBoundingClientRect().height ?? 56;
    const observer = new IntersectionObserver(
      ([entry]) => setShowCompressed(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${Math.round(offset)}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Save/restore scroll position per section
  const scrollKey = `customer-scroll-${customerId}-${mobileSection}`;
  useEffect(() => {
    if (mobileSection === 'none') return;
    try {
      const saved = sessionStorage.getItem(scrollKey);
      if (saved) {
        requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved, 10), behavior: 'auto' }));
      }
    } catch { /* ignore */ }
    const onScroll = () => {
      try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch { /* ignore */ }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollKey, mobileSection]);

  const selectSection = (s: MobileSectionId) => {
    setMobileSection(s);
    if (s !== 'none') {
      // Only scroll-into-view if no saved position exists for this section
      try {
        const saved = sessionStorage.getItem(`customer-scroll-${customerId}-${s}`);
        if (!saved) {
          requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      } catch {
        requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  };

  // Swipe between sections — primary strip only (تجنّب الالتفاف عبر أقسام مخفية في "المزيد")
  const primaryOrderedSections = useMemo<MobileSectionId[]>(
    () => [...PRIMARY_STRIP_IDS] as MobileSectionId[],
    [],
  );
  const navigateBySwipe = (dir: 1 | -1) => {
    if (mobileSection === 'none') return;
    const idx = primaryOrderedSections.indexOf(mobileSection);
    if (idx === -1) return; // قسم ثانوي — لا تدوير
    const nextIdx = (idx + dir + primaryOrderedSections.length) % primaryOrderedSections.length;
    haptics.light();
    selectSection(primaryOrderedSections[nextIdx]);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    // استثناء العناصر القابلة للتمرير الأفقي/الجداول/الرسوم
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-h-scroll], [data-no-swipe], table, .recharts-wrapper, [role="dialog"], input, textarea, select')) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    swipeStartX.current = null; swipeStartY.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    // RTL: swipe LEFT (dx<0) → next section
    navigateBySwipe(dx < 0 ? 1 : -1);
  };

  // Dynamic suggestion inputs
  const creditOverflow = (detail.creditLimit ?? 0) > 0
    ? Math.max(0, (detail.currentBalance ?? 0) - (detail.creditLimit ?? 0))
    : 0;
  const daysSinceContact = customer.last_communication_at
    ? Math.floor((Date.now() - new Date(customer.last_communication_at).getTime()) / 86400000)
    : null;
  const staleQuotations = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return (detail.quotations || []).filter((q: { status?: string | null; created_at?: string | null }) => {
      const isPending = !q.status || ['draft', 'sent', 'pending'].includes(q.status);
      const created = q.created_at ? new Date(q.created_at).getTime() : Date.now();
      return isPending && created < cutoff;
    }).length;
  }, [detail.quotations]);

  // Sections shown inside the "More" sheet
  const sheetItems = useMemo(
    () => SECONDARY_STRIP_IDS.map((id) => {
      const meta = STRIP_META.find(m => m.id === id)!;
      return { id: id as MobileSectionId, label: meta.label, icon: meta.icon, badge: sectionBadges[id as MobileSectionId] ?? 0 };
    }),
    [sectionBadges],
  );
  const isSecondaryActive = (SECONDARY_STRIP_IDS as readonly string[]).includes(mobileSection);

  return (
    <div className="space-y-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <LiveRegion message={liveMessage} />
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
          onNewCreditNote={onNewCreditNote}
          onToggleActive={onToggleActive}
          onChangeVip={onChangeVip}
          overdueCount={sectionBadges.invoices ?? 0}
          onOpenReminders={() => selectSection('reminders')}
        />
      </div>

      {/* تنبيهات/شارة صحة/ملاحظة مثبّتة — تحت بطاقة الملف مباشرةً على الموبيل */}
      {belowProfileSlot}

      <div className={cn(
        "sticky top-0 z-30 -mx-3 px-3 bg-background/80 backdrop-blur-sm pb-1 transition-shadow",
        showCompressed && "shadow-[0_1px_0_0_hsl(var(--border))]",
      )}>
        {/* تبديل ناعم بين الهيدر المضغوط وشريط الأقسام */}
        <div className="relative">
          <div className={cn(
            "transition-all duration-200",
            showCompressed ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0",
          )}>
            <CustomerCompressedHeader
              customer={customer}
              currentBalance={detail.currentBalance}
              balanceIsDebit={detail.balanceIsDebit}
              onNewInvoice={onNewInvoice}
              onMoreActions={onEdit}
              sectionLabel={mobileSection !== 'none' ? sectionLabels[mobileSection] : undefined}
              onPrevSection={mobileSection !== 'none' ? () => navigateBySwipe(-1) : undefined}
              onNextSection={mobileSection !== 'none' ? () => navigateBySwipe(1) : undefined}
              onPrevCustomer={navProps.onPrev}
              onNextCustomer={navProps.onNext}
              hasPrevCustomer={navProps.hasPrev}
              hasNextCustomer={navProps.hasNext}
            />
          </div>
          <div className={cn(
            "transition-all duration-200",
            !showCompressed ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0",
          )}>
            <CustomerIconStrip
              activeSection={mobileSection}
              onSectionChange={selectSection}
              badges={sectionBadges}
              extraSlot={
                <CustomerSectionsSheet
                  items={sheetItems}
                  activeSection={mobileSection}
                  onPick={selectSection}
                  isAnyActive={isSecondaryActive}
                />
              }
            />
          </div>
        </div>
      </div>

      <div ref={sectionRef} className="animate-fade-in">
        {mobileSection === 'none' ? (
          <CustomerQuickSuggestions
            customerId={customerId}
            overdueCount={sectionBadges.invoices ?? 0}
            upcomingReminders={upcomingReminders}
            creditOverflow={creditOverflow}
            daysSinceContact={daysSinceContact}
            staleQuotations={staleQuotations}
            hasPhone={!!customer.phone}
            isActive={customer.is_active !== false}
            onPick={(id) => selectSection(id as MobileSectionId)}
            onWhatsApp={onWhatsApp}
          />
        ) : null}
        {mobileSection !== 'none' && (
          <>
            <CustomerSwipeHint signal={mobileSection} />
            <SectionHeader sectionId={mobileSection} onBack={() => selectSection('none')} />
            <Suspense fallback={
              ['invoices','payments','reminders','sales','credit-notes'].includes(mobileSection)
                ? <MobileListSkeleton rows={mobileSection === 'reminders' ? 3 : 5} />
                : <TabSkeleton />
            }>
            {mobileSection === 'invoices' && (
              (!detail.paginatedInvoices && detail.invoices.length === 0 && (detail.paginatedInvoicesLoading || detail.invoicesLoading)) ? (
                <MobileListSkeleton rows={5} ariaLabel="جارٍ تحميل الفواتير" />
              ) : (
                <div className="space-y-4">
                  <CustomerTabInvoices invoices={detail.invoices} customerId={customerId} totalPaymentsFromLedger={detail.totalPayments} onQuickPay={onQuickPay} creditNotes={detail.creditNotes} currentBalance={detail.currentBalance} paginatedData={detail.paginatedInvoices} currentPage={detail.invoicePage} pageSize={detail.invoicePageSize} onPageChange={detail.goToInvoicePage} />
                  <CustomerTabCreditNotes creditNotes={detail.creditNotes} />
                </div>
              )
            )}
            {mobileSection === 'payments' && (
              (!detail.paginatedPayments && detail.payments.length === 0 && (detail.paginatedPaymentsLoading || detail.paymentsLoading)) ? (
                <MobileListSkeleton rows={5} ariaLabel="جارٍ تحميل المدفوعات" />
              ) : (
                <CustomerTabPayments payments={detail.payments} customerId={customerId} paginatedData={detail.paginatedPayments} currentPage={detail.paymentPage} pageSize={detail.paymentPageSize} onPageChange={detail.goToPaymentPage} />
              )
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
                <LazyOnVisible minHeight={280} placeholder={<ChartSkeleton variant="bars" height={240} />}><CustomerPurchaseChart monthlyData={detail.chartData?.monthly_data} /></LazyOnVisible>
                <LazyOnVisible minHeight={300} placeholder={<ChartSkeleton variant="donut" height={260} />}><AgingDonutChart customerId={customerId} /></LazyOnVisible>
                <LazyOnVisible minHeight={280} placeholder={<ChartSkeleton variant="line" height={240} />}><CashFlowLineChart monthlyData={detail.chartData?.monthly_data} /></LazyOnVisible>
                <LazyOnVisible minHeight={280} placeholder={<ChartSkeleton variant="bars" height={240} />}><TopProductsChart topProducts={detail.chartData?.top_products} /></LazyOnVisible>
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
          </>
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
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);
  const { data: upcomingReminders = 0 } = useUpcomingReminders(id);

  // ── Cross-device URL ↔ tab/section mapping ───────────────────────────
  // Single source of truth: `tab` (desktop value). `section` mirrors it for mobile.
  const tabToSection = (tab: string): MobileSectionId => {
    const map: Record<string, MobileSectionId> = {
      'basic-info': 'info', notes: 'notes', attachments: 'attachments',
      reminders: 'reminders', invoices: 'invoices', 'credit-notes': 'invoices',
      quotations: 'sales', orders: 'sales', payments: 'payments',
      financial: 'analytics', statement: 'statement', aging: 'aging',
      analytics: 'analytics', communications: 'communications', activity: 'none',
    };
    return map[tab] ?? 'none';
  };
  const sectionToTab = (s: MobileSectionId): string | null => {
    const map: Partial<Record<MobileSectionId, string>> = {
      info: 'basic-info', notes: 'notes', attachments: 'attachments',
      reminders: 'reminders', invoices: 'invoices', payments: 'payments',
      sales: 'orders', analytics: 'analytics', statement: 'statement',
      aging: 'aging', communications: 'communications',
    };
    return map[s] ?? null;
  };

  const urlTab = searchParams.get('tab');
  const urlSection = searchParams.get('section') as MobileSectionId | null;
  const lastVisited = useLastVisitedSection(id);
  const initialSection: MobileSectionId =
    urlSection
      || (urlTab ? tabToSection(urlTab) : null)
      || (isMobile ? (lastVisited.read() ?? 'none') : 'none');
  const [mobileSection, setMobileSectionState] = useState<MobileSectionId>(initialSection);

  const detail = useCustomerDetail(id);
  const { prevId, nextId, goNext, goPrev } = useCustomerNavigation(id);

  // Sync URL tab → desktop active tab
  useEffect(() => {
    if (urlTab && !isMobile) detail.setActiveTab(urlTab);
  }, [urlTab, isMobile, detail]);

  // Sync URL section → mobile section (back/forward navigation)
  useEffect(() => {
    if (urlSection && urlSection !== mobileSection) setMobileSectionState(urlSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSection]);

  const writeParams = (tab: string | null, section: MobileSectionId | null, opts?: { replace?: boolean }) => {
    const next = new URLSearchParams(searchParams);
    if (tab) next.set('tab', tab); else next.delete('tab');
    if (section && section !== 'none') next.set('section', section); else next.delete('section');
    // افتراضياً: ادفع للسجل لكي يعمل زر "العودة" بين الأقسام
    setSearchParams(next, { replace: opts?.replace ?? false });
  };

  const handleTabChange = (tab: string) => {
    detail.setActiveTab(tab);
    writeParams(tab, tabToSection(tab));
  };

  const setMobileSection = (s: MobileSectionId) => {
    setMobileSectionState(s);
    writeParams(sectionToTab(s), s);
    lastVisited.write(s);
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
          onNewCreditNote={() => setCreditNoteDialogOpen(true)}
          onToggleActive={handleToggleActive} onChangeVip={handleChangeVip}
        />
      </div>

      {/* Desktop only — alerts/health/pinned-note عند أعلى الصفحة */}
      {!isMobile && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <CustomerSmartAlerts
              currentBalance={detail.currentBalance} creditLimit={detail.creditLimit}
              invoices={detail.invoices} lastPurchaseDate={detail.lastPurchaseDate}
              lastCommunicationAt={customer.last_communication_at}
              onEditCreditLimit={() => setEditDialogOpen(true)}
              onSendReminder={() => handleTabChange('reminders')}
              onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
              onContact={handleWhatsApp}
              persistKey={id}
            />
            <CustomerHealthBadge customerId={id!} />
          </div>
          <CustomerPinnedNote customerId={id!} onViewAllNotes={() => handleTabChange('notes')} />
        </>
      )}

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
          onNewCreditNote={() => setCreditNoteDialogOpen(true)}
          upcomingReminders={upcomingReminders}
          onWhatsApp={handleWhatsApp}
          onImageUpdate={(url) => detail.updateImageMutation.mutate(url)}
          onToggleActive={handleToggleActive}
          onChangeVip={handleChangeVip}
          onQuickPay={handleQuickPay}
          setSelectedAddress={setSelectedAddress}
          setAddressDialogOpen={setAddressDialogOpen}
          navProps={{ hasPrev: !!prevId, hasNext: !!nextId, onPrev: goPrev, onNext: goNext }}
          belowProfileSlot={
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CustomerSmartAlerts
                  currentBalance={detail.currentBalance} creditLimit={detail.creditLimit}
                  invoices={detail.invoices} lastPurchaseDate={detail.lastPurchaseDate}
                  lastCommunicationAt={customer.last_communication_at}
                  onEditCreditLimit={() => setEditDialogOpen(true)}
                  onSendReminder={() => setMobileSection('reminders')}
                  onNewInvoice={() => navigate('/invoices', { state: { prefillCustomerId: id } })}
                  onContact={handleWhatsApp}
                  persistKey={id}
                />
                <CustomerHealthBadge customerId={id!} />
              </div>
              <CustomerPinnedNote customerId={id!} onViewAllNotes={() => setMobileSection('notes')} />
            </div>
          }
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
            <TabsContent value="invoices" className="mt-6"><CustomerTabInvoices invoices={detail.invoices} customerId={id!} totalPaymentsFromLedger={detail.totalPayments} onQuickPay={handleQuickPay} creditNotes={detail.creditNotes} currentBalance={detail.currentBalance} onViewAllReturns={() => handleTabChange('credit-notes')} paginatedData={detail.paginatedInvoices} currentPage={detail.invoicePage} pageSize={detail.invoicePageSize} onPageChange={detail.goToInvoicePage} /></TabsContent>
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
              <LazyOnVisible minHeight={300} placeholder={<ChartSkeleton variant="donut" height={260} />}>
                <ChartErrorBoundary title="أعمار الديون">
                  <AgingDonutChart customerId={id!} />
                </ChartErrorBoundary>
              </LazyOnVisible>
              <LazyOnVisible minHeight={300} placeholder={<ChartSkeleton variant="line" height={260} />}>
                <ChartErrorBoundary title="التدفق المالي">
                  <CashFlowLineChart monthlyData={detail.chartData?.monthly_data} />
                </ChartErrorBoundary>
              </LazyOnVisible>
              <LazyOnVisible minHeight={300} placeholder={<ChartSkeleton variant="bars" height={260} />}>
                <ChartErrorBoundary title="المنتجات">
                  <TopProductsChart topProducts={detail.chartData?.top_products} />
                </ChartErrorBoundary>
              </LazyOnVisible>
            </TabsContent>
            <TabsContent value="activity" className="mt-6"><CustomerTabActivity activities={detail.activities} /></TabsContent>
            <TabsContent value="attachments" className="mt-6"><CustomerTabAttachments customerId={id!} /></TabsContent>
          </Suspense>
        </Tabs>
      )}

      <CustomerFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} customer={customer} />
      <CustomerAddressDialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen} customerId={id!} address={selectedAddress} />
      <CreditNoteFormDialog
        open={creditNoteDialogOpen}
        onOpenChange={setCreditNoteDialogOpen}
        prefillCustomerId={id}
        onSuccess={() => {
          setCreditNoteDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['customer-credit-notes', id] });
          queryClient.invalidateQueries({ queryKey: ['customer-financial-summary', id] });
          toast({ title: 'تم إنشاء إشعار الإرجاع بنجاح' });
        }}
      />

      {/* FAB عائم — فاتورة جديدة بنقرة من أي مكان */}
      {isMobile && (
        <>
          <WindowPullToRefresh
            onRefresh={async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['customer', id] }),
                queryClient.invalidateQueries({ queryKey: ['customer-invoices', id] }),
                queryClient.invalidateQueries({ queryKey: ['customer-payments', id] }),
                queryClient.invalidateQueries({ queryKey: ['customer-financial-summary', id] }),
                queryClient.invalidateQueries({ queryKey: ['customer-credit-notes', id] }),
              ]);
            }}
          />
          <CustomerMobileFAB onClick={() => navigate('/invoices', { state: { prefillCustomerId: id } })} />
        </>
      )}
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
