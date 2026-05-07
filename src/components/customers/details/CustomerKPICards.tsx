import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { CreditCard, Target, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

export const CustomerKPICards = memo(function CustomerKPICards({
  currentBalance, balanceIsDebit, totalOutstanding, totalPurchases,
  invoices, payments, compact = false,
}: CustomerKPICardsProps) {
  const [drawerFilter, setDrawerFilter] = useState<KPIFilter | null>(null);

  // Hide "outstanding" card when it duplicates the current balance to avoid visual redundancy
  const balanceAndOutstandingMatch = Math.round(currentBalance) === Math.round(totalOutstanding) && totalOutstanding > 0;

  const allCards: { key: KPIFilter; label: string; value: string; icon: React.ElementType; colorClass: string; bgClass: string; trend?: 'up' | 'down' }[] = [
    {
      key: 'balance',
      label: balanceAndOutstandingMatch ? 'الرصيد / المستحق' : 'الرصيد الحالي',
      value: currentBalance.toLocaleString(),
      icon: CreditCard,
      colorClass: balanceIsDebit ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400',
      bgClass: balanceIsDebit ? 'bg-destructive/10 border-destructive/20' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
      trend: balanceIsDebit ? 'up' : 'down',
    },
    {
      key: 'outstanding',
      label: 'إجمالي المستحق',
      value: totalOutstanding.toLocaleString(),
      icon: Target,
      colorClass: totalOutstanding > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
      bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    },
    {
      key: 'purchases',
      label: 'إجمالي المشتريات',
      value: totalPurchases.toLocaleString(),
      icon: TrendingUp,
      colorClass: 'text-blue-700 dark:text-blue-400',
      bgClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    },
  ];

  const cards = balanceAndOutstandingMatch ? allCards.filter(c => c.key !== 'outstanding') : allCards;

  return (
    <>
      <div className={cn("grid gap-3", compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3")}>
        {cards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <Card
              key={card.key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border",
                card.bgClass,
                compact ? "p-3" : "p-4"
              )}
              onClick={() => setDrawerFilter(card.key)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={cn("rounded-lg p-1.5", card.colorClass.replace('text-', 'bg-').split(' ')[0] + '/20')}>
                  <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", card.colorClass)} />
                </div>
                {card.trend && <TrendIcon className={cn("h-4 w-4", card.colorClass)} />}
              </div>
              <p className={cn("font-bold leading-tight", card.colorClass, compact ? "text-base" : "text-xl")}>
                {card.value}
              </p>
              <p className={cn("text-muted-foreground mt-0.5", compact ? "text-[10px]" : "text-xs")}>
                {card.label}
              </p>
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
