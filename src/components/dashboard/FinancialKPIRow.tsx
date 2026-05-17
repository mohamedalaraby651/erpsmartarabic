import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Wallet,
  Clock,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Hourglass,
  Percent,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface FinancialKPIData {
  todayRevenue: number;
  mtdRevenue: number;
  outstandingAR: number;
  overdueAR: number;
  cashBalance: number;
  pendingApprovals: number;
  dsoDays: number;
  grossMarginValue: number;
  grossMarginPct: number;
}

interface FinancialKPIRowProps {
  data: FinancialKPIData | undefined;
  isLoading: boolean;
}

interface KpiCard {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  href?: string;
  hint?: string;
}

const fmtCurrency = (n: number) =>
  `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(Math.round(n))} ج.م`;

const toneClasses: Record<KpiCard['tone'], { ring: string; icon: string; bg: string }> = {
  primary: { ring: 'border-primary/20', icon: 'text-primary', bg: 'bg-primary/10' },
  success: { ring: 'border-success/20', icon: 'text-success', bg: 'bg-success/10' },
  warning: { ring: 'border-warning/20', icon: 'text-warning', bg: 'bg-warning/10' },
  destructive: {
    ring: 'border-destructive/30',
    icon: 'text-destructive',
    bg: 'bg-destructive/10',
  },
  info: { ring: 'border-accent/30', icon: 'text-accent-foreground', bg: 'bg-accent/40' },
};

const KpiCardView = memo(function KpiCardView({ card }: { card: KpiCard }) {
  const tone = toneClasses[card.tone];
  const Icon = card.icon;
  const navigate = useNavigate();
  const clickable = !!card.href;

  return (
    <Card
      className={cn(
        'border transition-all hover:shadow-md',
        tone.ring,
        clickable && 'cursor-pointer hover:-translate-y-0.5'
      )}
      onClick={clickable ? () => navigate(card.href!) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('p-2.5 rounded-lg shrink-0', tone.bg)}>
          <Icon className={cn('h-5 w-5', tone.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{card.label}</p>
          <p className="text-xl font-bold mt-0.5 truncate">{card.value}</p>
          {card.hint && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{card.hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const FinancialKPIRow = memo(function FinancialKPIRow({
  data,
  isLoading,
}: FinancialKPIRowProps) {
  if (isLoading && !data) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards: KpiCard[] = [
    {
      label: 'إيرادات اليوم',
      value: fmtCurrency(data.todayRevenue),
      icon: TrendingUp,
      tone: 'primary',
      href: '/invoices',
    },
    {
      label: 'إيرادات الشهر',
      value: fmtCurrency(data.mtdRevenue),
      icon: Banknote,
      tone: 'success',
      href: '/reports',
    },
    {
      label: 'مستحقات العملاء',
      value: fmtCurrency(data.outstandingAR),
      icon: Wallet,
      tone: 'info',
      href: '/invoices?filter=unpaid',
    },
    {
      label: 'متأخرات',
      value: fmtCurrency(data.overdueAR),
      icon: AlertTriangle,
      tone: data.overdueAR > 0 ? 'destructive' : 'success',
      href: '/invoices?filter=overdue',
      hint: data.overdueAR > 0 ? 'يحتاج متابعة' : 'لا توجد متأخرات',
    },
    {
      label: 'رصيد الخزينة',
      value: fmtCurrency(data.cashBalance),
      icon: Wallet,
      tone: 'success',
      href: '/treasury',
    },
    {
      label: 'بانتظار الاعتماد',
      value: String(data.pendingApprovals),
      icon: data.pendingApprovals > 0 ? Clock : CheckCircle2,
      tone: data.pendingApprovals > 0 ? 'warning' : 'success',
      href: '/invoices?approval=pending',
      hint: data.pendingApprovals > 0 ? 'فواتير تنتظر' : 'كل شيء معتمد',
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <KpiCardView key={c.label} card={c} />
      ))}
    </div>
  );
});
