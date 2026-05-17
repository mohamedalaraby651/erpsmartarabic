import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt, ChevronDown } from 'lucide-react';
import { InvoiceQuickActions } from './InvoiceQuickActions';
import { DashboardListCard, type AccentTone } from './_shared/DashboardListCard';
import { cn } from '@/lib/utils';

interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_paid: number | null;
  payment_status: string;
  due_date: string | null;
  created_at: string;
  customer_id: string;
  customers: { name: string } | null;
}

interface RecentInvoicesWidgetProps {
  invoices: InvoiceWithCustomer[] | undefined;
}

const statusTone = (s: string): AccentTone =>
  s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'destructive';

const statusLabel = (s: string) => (s === 'paid' ? 'مدفوع' : s === 'partial' ? 'جزئي' : 'معلق');
const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' =>
  s === 'paid' ? 'default' : s === 'partial' ? 'secondary' : 'destructive';

const MobileInvoiceRow = memo(function MobileInvoiceRow({
  invoice,
  onOpen,
}: {
  invoice: InvoiceWithCustomer;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((p) => !p), []);

  return (
    <div className="space-y-0">
      <DashboardListCard
        accentTone={statusTone(invoice.payment_status)}
        onTap={toggle}
        ariaLabel={`فاتورة ${invoice.invoice_number} — ${invoice.customers?.name || 'عميل'}`}
        leading={
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
        }
        title={invoice.customers?.name || 'عميل'}
        meta={
          <>
            <span className="truncate">{invoice.invoice_number}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
            </span>
          </>
        }
        trailing={
          <>
            <p className="font-bold text-sm tabular-nums leading-tight">
              {invoice.total_amount.toLocaleString()} ج.م
            </p>
            <div className="flex items-center gap-1">
              <Badge variant={statusVariant(invoice.payment_status)} className="text-[10px] px-1.5 py-0 h-4">
                {statusLabel(invoice.payment_status)}
              </Badge>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground/60 transition-transform',
                  expanded && 'rotate-180',
                )}
                aria-hidden
              />
            </div>
          </>
        }
        className={cn(expanded && 'rounded-b-none border-b-0')}
      />
      {expanded && (
        <div
          className="border border-t-0 border-s-[3px] bg-card rounded-b-lg px-3 py-2 flex items-center justify-between gap-2 animate-fade-in"
          style={{ borderInlineStartColor: 'transparent' }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[11px] px-2 text-muted-foreground"
            onClick={onOpen}
          >
            فتح الفاتورة
            <ArrowLeft className="mr-1 h-3 w-3" />
          </Button>
          <InvoiceQuickActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            customerId={invoice.customer_id}
            customerName={invoice.customers?.name || 'عميل'}
            totalAmount={invoice.total_amount}
            amountPaid={invoice.amount_paid || 0}
            paymentStatus={invoice.payment_status}
            dueDate={invoice.due_date}
            createdAt={invoice.created_at}
          />
        </div>
      )}
    </div>
  );
});

export const RecentInvoicesWidget = memo(function RecentInvoicesWidget({ invoices }: RecentInvoicesWidgetProps) {
  const navigate = useNavigate();

  const MobileHeader = (
    <div className="sm:hidden flex items-center justify-between px-3 pt-2.5 pb-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-base font-bold">آخر الفواتير</h3>
        {invoices && invoices.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
            {invoices.length}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 text-[11px] px-2.5 shrink-0"
        onClick={() => navigate('/invoices')}
      >
        عرض الكل
        <ArrowLeft className="mr-1 h-3 w-3" />
      </Button>
    </div>
  );

  const DesktopHeader = (
    <CardHeader className="hidden sm:flex flex-row items-center justify-between px-6 pt-6 pb-1.5">
      <div className="min-w-0">
        <CardTitle className="text-lg">آخر الفواتير</CardTitle>
        <CardDescription className="text-sm leading-tight">أحدث الفواتير المصدرة</CardDescription>
      </div>
      <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0 px-2" onClick={() => navigate('/invoices')}>
        عرض الكل
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
      </Button>
    </CardHeader>
  );

  if (invoices === undefined) {
    return (
      <>
        {MobileHeader}
        {DesktopHeader}
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[180px]">
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg bg-muted/40 animate-pulse h-[60px]" />
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  if (invoices.length === 0) {
    return (
      <>
        {MobileHeader}
        {DesktopHeader}
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[180px]">
          <div className="text-center py-6 px-4">
            <Receipt className="h-9 w-9 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-1">لا توجد فواتير بعد</p>
            <p className="text-xs text-muted-foreground mb-3">أنشئ أول فاتورة لبدء تتبّع المبيعات</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/invoices?action=new')}>
              إنشاء فاتورة
            </Button>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      {MobileHeader}
      {DesktopHeader}
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 min-h-[180px]">
        {/* Mobile: list-card with expandable quick actions */}
        <div className="sm:hidden space-y-2 animate-fade-in">
          {invoices.map((invoice) => (
            <MobileInvoiceRow
              key={invoice.id}
              invoice={invoice}
              onOpen={() => navigate(`/invoices/${invoice.id}`)}
            />
          ))}
        </div>

        {/* Desktop: original compact row layout */}
        <div className="hidden sm:block space-y-1.5 animate-fade-in">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-muted/50 md:hover:bg-muted transition-colors min-h-[44px]"
            >
              <button
                type="button"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="flex items-center gap-2 min-w-0 flex-1 text-right active:scale-[0.99] transition-transform"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 text-right">
                  <p className="font-medium text-sm truncate leading-tight">
                    {invoice.customers?.name || 'عميل'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    {invoice.invoice_number}
                  </p>
                </div>
              </button>

              <div className="flex flex-col items-end shrink-0 min-w-0">
                <p className="font-bold text-sm tabular-nums truncate leading-tight">
                  {invoice.total_amount.toLocaleString()} ج.م
                </p>
                <Badge variant={statusVariant(invoice.payment_status)} className="text-xs mt-0.5 px-1.5 py-0 h-5">
                  {statusLabel(invoice.payment_status)}
                </Badge>
              </div>

              <InvoiceQuickActions
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                customerId={invoice.customer_id}
                customerName={invoice.customers?.name || 'عميل'}
                totalAmount={invoice.total_amount}
                amountPaid={invoice.amount_paid || 0}
                paymentStatus={invoice.payment_status}
                dueDate={invoice.due_date}
                createdAt={invoice.created_at}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
});
