import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Wallet, Undo2, Scale, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type CreditNote = Database['public']['Tables']['credit_notes']['Row'];

interface InvoicesReturnsSummaryProps {
  invoices: Invoice[];
  creditNotes: CreditNote[];
  currentBalance: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Unified summary linking invoices ↔ credit notes (returns) ↔ balance
 * for the customer profile. Shows: invoiced, paid, returned, net due.
 */
export const InvoicesReturnsSummary = memo(function InvoicesReturnsSummary({
  invoices, creditNotes, currentBalance,
}: InvoicesReturnsSummaryProps) {
  const stats = useMemo(() => {
    const totalInvoiced = round2(invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0));
    const totalPaid = round2(invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0));
    const activeReturns = creditNotes.filter((c) => c.status !== 'cancelled');
    const totalReturns = round2(activeReturns.reduce((s, c) => s + Number(c.amount || 0), 0));
    const outstanding = round2(totalInvoiced - totalPaid - totalReturns);
    const returnsRatio = totalInvoiced > 0 ? Math.round((totalReturns / totalInvoiced) * 100) : 0;
    return {
      totalInvoiced, totalPaid, totalReturns, outstanding, returnsRatio,
      invoiceCount: invoices.length,
      returnsCount: activeReturns.length,
    };
  }, [invoices, creditNotes]);

  const balanceMatches = Math.abs(stats.outstanding - currentBalance) < 0.5;

  const tiles = [
    {
      key: 'invoiced',
      icon: FileText,
      label: 'إجمالي الفواتير',
      value: stats.totalInvoiced,
      sub: `${stats.invoiceCount} فاتورة`,
      tone: 'text-foreground',
      bg: 'from-primary/5 to-primary/10',
      iconColor: 'text-primary',
    },
    {
      key: 'paid',
      icon: Wallet,
      label: 'المدفوع',
      value: stats.totalPaid,
      sub: stats.totalInvoiced > 0
        ? `${Math.round((stats.totalPaid / stats.totalInvoiced) * 100)}% من الإجمالي`
        : '—',
      tone: 'text-emerald-600 dark:text-emerald-400',
      bg: 'from-emerald-500/5 to-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'returns',
      icon: Undo2,
      label: 'المرتجعات',
      value: stats.totalReturns,
      sub: stats.returnsCount > 0 ? `${stats.returnsCount} إشعار · ${stats.returnsRatio}%` : 'لا توجد',
      tone: 'text-amber-600 dark:text-amber-400',
      bg: 'from-amber-500/5 to-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'net',
      icon: Scale,
      label: 'الصافي المستحق',
      value: stats.outstanding,
      sub: balanceMatches ? 'مطابق للرصيد' : `الرصيد المحفوظ: ${currentBalance.toLocaleString()}`,
      tone: stats.outstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
      bg: stats.outstanding > 0 ? 'from-destructive/5 to-destructive/10' : 'from-emerald-500/5 to-emerald-500/10',
      iconColor: stats.outstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
    },
  ] as const;

  return (
    <Card className="overflow-hidden border shadow-sm" role="region" aria-label="ملخص الفواتير والمرتجعات">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-2">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className={cn('rounded-xl p-3 bg-gradient-to-br border border-border/40', t.bg)}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className={cn('h-3.5 w-3.5', t.iconColor)} aria-hidden="true" />
                <span className="truncate">{t.label}</span>
              </div>
              <div className={cn('text-base sm:text-lg font-bold tabular-nums mt-1', t.tone)}>
                {t.value.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-muted-foreground">ج.م</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{t.sub}</div>
            </div>
          );
        })}
      </div>
      {!balanceMatches && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] border-t border-amber-500/20">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>
            فرق بين الصافي المحسوب ({stats.outstanding.toLocaleString()}) والرصيد المحفوظ
            ({currentBalance.toLocaleString()}) — قد تحتاج إعادة احتساب الرصيد.
          </span>
        </div>
      )}
    </Card>
  );
});
