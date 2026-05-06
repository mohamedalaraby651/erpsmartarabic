import { memo, useMemo } from 'react';
import { AlertTriangle, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/customerConstants';

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

  const cards = [
    {
      id: 'debtors',
      label: 'إجمالي المستحق',
      value: `${summary.totalDebt.toLocaleString()} ج.م`,
      sub: `${summary.debtorCount} عميل`,
      icon: Wallet,
      tone: 'destructive' as const,
      show: summary.debtorCount > 0,
    },
    {
      id: 'near-limit',
      label: 'قرب حد الائتمان',
      value: `${summary.nearLimitCount}`,
      sub: 'تجاوز 80% من الحد',
      icon: AlertTriangle,
      tone: 'warning' as const,
      show: summary.nearLimitCount > 0,
      disabled: true, // فلتر مشتق غير موجود — للعرض فقط حالياً
    },
    {
      id: 'overdue',
      label: 'متأخر السداد',
      value: '—',
      sub: 'يحتاج متابعة',
      icon: TrendingDown,
      tone: 'amber' as const,
      show: false, // يحتاج بيانات invoice overdue (مستقبلي)
    },
  ].filter(c => c.show);

  return (
    <div className="grid grid-cols-2 gap-2 mb-3" role="region" aria-label="ملخص الحالة المالية">
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = activeQuickFilter === card.id;
        const isClickable = !card.disabled && !!onQuickFilter && card.id === 'debtors';
        const toneClass =
          card.tone === 'destructive'
            ? 'from-destructive/10 to-destructive/5 border-destructive/20 text-destructive'
            : card.tone === 'warning'
              ? 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'from-muted to-muted/50 border-border text-foreground';

        const Wrapper: 'button' | 'div' = isClickable ? 'button' : 'div';
        return (
          <Wrapper
            key={card.id}
            type={isClickable ? 'button' : undefined}
            onClick={isClickable ? () => onQuickFilter?.(isActive ? null : card.id) : undefined}
            aria-pressed={isClickable ? isActive : undefined}
            aria-label={`${card.label}: ${card.value}`}
            className={cn(
              'rounded-xl border bg-gradient-to-br p-3 text-right transition-all',
              toneClass,
              isClickable && 'cursor-pointer active:scale-[0.97] hover:shadow-md min-h-[64px]',
              isActive && 'ring-2 ring-current shadow-sm',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className="h-4 w-4 opacity-80" aria-hidden />
              <span className="text-[10px] font-medium opacity-80">{card.label}</span>
            </div>
            <div className="text-base font-bold tabular-nums leading-tight">{card.value}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{card.sub}</div>
          </Wrapper>
        );
      })}
    </div>
  );
});
