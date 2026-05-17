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
      <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] min-w-[160px] md:min-w-0 rounded-lg snap-start shrink-0 md:shrink" />
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
      label: 'هامش الربح (شهري)',
      value: `${data.grossMarginPct}%`,
      icon: Percent,
      tone: data.grossMarginPct >= 20 ? 'success' : data.grossMarginPct >= 10 ? 'warning' : 'destructive',
      href: '/reports',
      hint: fmtCurrency(data.grossMarginValue),
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
      label: 'DSO (متوسط التحصيل)',
      value: `${data.dsoDays} يوم`,
      icon: Hourglass,
      tone: data.dsoDays <= 30 ? 'success' : data.dsoDays <= 60 ? 'warning' : 'destructive',
      href: '/reports',
      hint: 'آخر 90 يوم',
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
    <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 scrollbar-thin">
      {cards.map((c) => (
        <div key={c.label} className="min-w-[180px] md:min-w-0 snap-start shrink-0 md:shrink">
          <KpiCardView card={c} />
        </div>
      ))}
    </div>
  );
});
