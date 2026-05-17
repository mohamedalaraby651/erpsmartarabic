import { memo, useMemo } from 'react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/customerConstants';
import { regions } from '@/lib/uiCopy';

interface CustomerSummaryBarProps {
  customers: Customer[];
  hidden?: boolean;
  activeQuickFilter?: string | null;
  onQuickFilter?: (id: string | null) => void;
}

/**
 * شريط ملخص ذكي قابل للضغط — يعرض إجمالي الديون، المتأخرين، وقرب حد الائتمان.
 * يستخدم semantic HSL tokens فقط.
 */
export const CustomerSummaryBar = memo(function CustomerSummaryBar({
  customers, hidden, activeQuickFilter, onQuickFilter,
}: CustomerSummaryBarProps) {
  const summary = useMemo(() => {
    let totalDebt = 0;
    let debtorCount = 0;
    let nearLimitCount = 0;
    for (const c of customers) {
      const bal = Number(c.current_balance || 0);
      const limit = Number(c.credit_limit || 0);
      if (bal > 0) {
        totalDebt += bal;
        debtorCount += 1;
      }
      if (limit > 0 && bal > 0 && (bal / limit) >= 0.8) {
        nearLimitCount += 1;
      }
    }
    return {
      totalDebt: Math.round(totalDebt * 100) / 100,
      debtorCount,
      nearLimitCount,
    };
  }, [customers]);

  if (hidden || customers.length === 0) return null;
  if (summary.debtorCount === 0 && summary.nearLimitCount === 0) return null;

  // Show only the most actionable card to reduce duplication with StatsBar chips.
  // Debtors card is primary; near-limit appears as a small inline note.
  const cards = [
    {
      id: 'debtors',
      label: 'إجمالي المستحق',
      value: `${summary.totalDebt.toLocaleString()} ج.م`,
      sub: `${summary.debtorCount} عميل · اضغط للتصفية`,
      icon: Wallet,
      tone: 'destructive' as const,
      show: summary.debtorCount > 0,
    },
  ].filter(c => c.show);

  const debtCard = cards[0];
  if (!debtCard) return null;
  const Icon = debtCard.icon;
  const isActive = activeQuickFilter === debtCard.id;
  const isClickable = !!onQuickFilter;

  return (
    <div className="mb-3 space-y-1.5" role="region" aria-label={regions.customerFinancialSummary}>
      <button
        type="button"
        onClick={isClickable ? () => onQuickFilter?.(isActive ? null : debtCard.id) : undefined}
        aria-pressed={isActive}
        aria-label={`${debtCard.label}: ${debtCard.value}`}
        className={cn(
          'w-full rounded-xl border bg-card border-border p-3.5 text-right transition-all',
          'shadow-sm hover:shadow-md',
          isClickable && 'cursor-pointer active:scale-[0.99] min-h-11',
          isActive && 'ring-2 ring-destructive/50 border-destructive/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-destructive/10 text-destructive shrink-0">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">{debtCard.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{debtCard.sub}</div>
            </div>
          </div>
          <div className="text-lg font-bold tabular-nums leading-tight text-destructive shrink-0">
            {debtCard.value}
          </div>
        </div>
      </button>
      {summary.nearLimitCount > 0 && (
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-warning">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          <span>{summary.nearLimitCount} عميل تجاوز 80% من حد الائتمان</span>
        </div>
      )}
    </div>
  );
});
