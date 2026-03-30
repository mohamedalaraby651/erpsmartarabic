import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Building2, Crown, DollarSign, UserCheck, UserX } from "lucide-react";

interface CustomerStatsBarProps {
  stats: {
    total: number;
    individuals: number;
    companies: number;
    vip: number;
    totalBalance: number;
    active: number;
    inactive: number;
  };
  isMobile: boolean;
}

const statsDef = (s: CustomerStatsBarProps['stats']) => [
  { icon: Users, value: s.total, label: 'إجمالي العملاء', shortLabel: 'الإجمالي', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: UserCheck, value: s.active, label: 'نشط', shortLabel: 'نشط', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20' },
  { icon: UserX, value: s.inactive, label: 'غير نشط', shortLabel: 'غير نشط', color: 'text-muted-foreground', bg: 'bg-muted' },
  { icon: Users, value: s.individuals, label: 'أفراد', shortLabel: 'أفراد', color: 'text-info', bg: 'bg-info/10' },
  { icon: Building2, value: s.companies, label: 'شركات', shortLabel: 'شركات', color: 'text-secondary-foreground', bg: 'bg-secondary' },
  { icon: Crown, value: s.vip, label: 'عملاء VIP', shortLabel: 'VIP', color: 'text-warning', bg: 'bg-warning/10' },
  { icon: DollarSign, value: s.totalBalance.toLocaleString(), label: 'الأرصدة المستحقة', shortLabel: 'الأرصدة', color: s.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400', bg: s.totalBalance > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10 dark:bg-emerald-500/20' },
];

export const CustomerStatsBar = memo(function CustomerStatsBar({ stats, isMobile }: CustomerStatsBarProps) {
  const items = statsDef(stats);

  if (isMobile) {
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {items.map((stat, i) => (
            <Card key={i} className="min-w-[110px] shrink-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <div>
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.shortLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {items.map((stat, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
              <div>
                <p className={`text-2xl font-bold ${i === 4 ? stat.color : ''}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
