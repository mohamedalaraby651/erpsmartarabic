import { memo, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { CreditCard, Target, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerTimelineDrawer } from "./CustomerTimelineDrawer";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

export type KPIFilter = 'balance' | 'outstanding' | 'purchases';

interface CustomerKPICardsProps {
  currentBalance: number;
  balanceIsDebit: boolean;
  totalOutstanding: number;
  totalPurchases: number;
  invoices: Invoice[];
  payments: Payment[];
  compact?: boolean;
}

interface CardSpec {
  key: KPIFilter;
  label: string;
  value: string;
  icon: React.ElementType;
  /** Semantic tone class (text + bg) */
  tone: 'destructive' | 'success' | 'warning' | 'primary';
  trend?: 'up' | 'down';
  badge?: { label: string; tone: 'destructive' | 'warning' };
}

const toneStyles: Record<CardSpec['tone'], { text: string; bg: string; border: string; iconBg: string }> = {
  destructive: { text: 'text-destructive', bg: 'bg-destructive/5',  border: 'border-destructive/30', iconBg: 'bg-destructive/15' },
  success:     { text: 'text-success',     bg: 'bg-success/5',      border: 'border-success/30',     iconBg: 'bg-success/15'     },
  warning:     { text: 'text-warning',     bg: 'bg-warning/5',      border: 'border-warning/30',     iconBg: 'bg-warning/15'     },
  primary:     { text: 'text-primary',     bg: 'bg-primary/5',      border: 'border-primary/30',     iconBg: 'bg-primary/15'     },
};

export const CustomerKPICards = memo(function CustomerKPICards({
  currentBalance, balanceIsDebit, totalOutstanding, totalPurchases,
  invoices, payments, compact = false,
}: CustomerKPICardsProps) {
  const [drawerFilter, setDrawerFilter] = useState<KPIFilter | null>(null);

  // Compute overdue invoices for the outstanding card badge
  const overdueCount = useMemo(() => {
    const now = Date.now();
    return invoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      const due = inv.due_date ? new Date(inv.due_date).getTime() : new Date(inv.created_at).getTime();
      return due < now;
    }).length;
  }, [invoices]);

  // Hide "outstanding" card when it duplicates the current balance to avoid visual redundancy
  const balanceAndOutstandingMatch = Math.round(currentBalance) === Math.round(totalOutstanding) && totalOutstanding > 0;

  const balanceTone: CardSpec['tone'] = balanceIsDebit ? 'destructive' : 'success';

  const allCards: CardSpec[] = [
    {
      key: 'balance',
      label: balanceAndOutstandingMatch ? 'الرصيد / المستحق' : 'الرصيد الحالي',
      value: currentBalance.toLocaleString(),
      icon: CreditCard,
      tone: balanceTone,
      trend: balanceIsDebit ? 'up' : 'down',
    },
    {
      key: 'outstanding',
      label: 'إجمالي المستحق',
      value: totalOutstanding.toLocaleString(),
      icon: Target,
      tone: totalOutstanding > 0 ? 'warning' : 'success',
      badge: overdueCount > 0
        ? { label: `${overdueCount} متأخرة`, tone: 'destructive' }
        : undefined,
    },
    {
      key: 'purchases',
      label: 'إجمالي المشتريات',
      value: totalPurchases.toLocaleString(),
      icon: TrendingUp,
      tone: 'primary',
    },
  ];

  const cards = balanceAndOutstandingMatch ? allCards.filter(c => c.key !== 'outstanding') : allCards;

  return (
    <>
      <div className={cn(
        "grid gap-3",
        compact
          ? (cards.length === 2 ? "grid-cols-2" : "grid-cols-3")
          : (cards.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3")
      )}>
        {cards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          const tone = toneStyles[card.tone];
          const badgeTone = card.badge ? toneStyles[card.badge.tone] : null;
          return (
            <Card
              key={card.key}
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border",
                tone.bg, tone.border,
                compact ? "p-3" : "p-4"
              )}
              onClick={() => setDrawerFilter(card.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawerFilter(card.key); } }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={cn("rounded-lg p-1.5", tone.iconBg)}>
                  <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", tone.text)} />
                </div>
                {card.trend && <TrendIcon className={cn("h-4 w-4", tone.text)} />}
              </div>
              <p className={cn("font-bold leading-tight tabular-nums", tone.text, compact ? "text-base" : "text-xl")}>
                {card.value}
              </p>
              <p className={cn("text-muted-foreground mt-0.5", compact ? "text-[10px]" : "text-xs")}>
                {card.label}
              </p>
              {card.badge && badgeTone && (
                <div className={cn(
                  "absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                  badgeTone.iconBg, badgeTone.text,
                )}>
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {card.badge.label}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <CustomerTimelineDrawer
        open={drawerFilter !== null}
        onOpenChange={(open) => !open && setDrawerFilter(null)}
        filter={drawerFilter || 'balance'}
        invoices={invoices}
        payments={payments}
      />
    </>
  );
});
