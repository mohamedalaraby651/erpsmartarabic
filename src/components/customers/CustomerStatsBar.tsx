import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Building2, Crown, DollarSign, UserCheck, UserX, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipDef {
  id: string;
  label: string;
  count: number;
  icon: React.ElementType;
  activeClass: string;
  inactiveClass: string;
}

interface CustomerStatsBarProps {
  stats: {
    total: number;
    individuals: number;
    companies: number;
    farms?: number;
    vip: number;
    totalBalance: number;
    active: number;
    inactive: number;
    debtors?: number;
  };
  isMobile: boolean;
  activeFilter?: string;
  onFilterChange?: (filterId: string | null) => void;
}

export const CustomerStatsBar = memo(function CustomerStatsBar({ stats, isMobile, activeFilter, onFilterChange }: CustomerStatsBarProps) {
  const chips: FilterChipDef[] = [
    { id: 'active', label: 'نشط', count: stats.active, icon: UserCheck, activeClass: 'bg-emerald-500 text-white shadow-emerald-500/30', inactiveClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    { id: 'vip', label: 'VIP', count: stats.vip, icon: Crown, activeClass: 'bg-amber-500 text-white shadow-amber-500/30', inactiveClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    { id: 'debtors', label: 'مدين', count: stats.debtors ?? 0, icon: DollarSign, activeClass: 'bg-destructive text-white shadow-destructive/30', inactiveClass: 'bg-destructive/10 text-destructive border-destructive/20' },
    { id: 'companies', label: 'شركات', count: stats.companies, icon: Building2, activeClass: 'bg-info text-white shadow-info/30', inactiveClass: 'bg-info/10 text-info border-info/20' },
    { id: 'farms', label: 'مزارع', count: stats.farms ?? 0, icon: TrendingUp, activeClass: 'bg-primary text-primary-foreground shadow-primary/30', inactiveClass: 'bg-primary/10 text-primary border-primary/20' },
    { id: 'individuals', label: 'أفراد', count: stats.individuals, icon: Users, activeClass: 'bg-secondary-foreground text-secondary shadow-foreground/20', inactiveClass: 'bg-secondary text-secondary-foreground border-border' },
    { id: 'inactive', label: 'غير نشط', count: stats.inactive, icon: UserX, activeClass: 'bg-muted-foreground text-background shadow-muted-foreground/20', inactiveClass: 'bg-muted text-muted-foreground border-border' },
  ];

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Hero summary card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-4 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-12 -translate-y-12" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold leading-none">{stats.total}</p>
                <p className="text-sm text-primary-foreground/80 mt-0.5">إجمالي العملاء</p>
              </div>
            </div>
            {stats.totalBalance > 0 && (
              <div className="text-left">
                <p className="text-xl font-bold leading-none">{stats.totalBalance.toLocaleString()}</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5">ج.م مستحق</p>
              </div>
            )}
          </div>
        </div>

        {/* Colored filter chips */}
        {onFilterChange && (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              <button
                onClick={() => onFilterChange(null)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200',
                  !activeFilter
                    ? 'bg-foreground text-background shadow-md shadow-foreground/20 border-transparent'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent',
                )}
              >
                الكل
              </button>
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => onFilterChange(activeFilter === chip.id ? null : chip.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200',
                    activeFilter === chip.id
                      ? cn(chip.activeClass, 'shadow-md border-transparent')
                      : cn(chip.inactiveClass, 'hover:shadow-sm'),
                  )}
                >
                  <chip.icon className="h-3.5 w-3.5" />
                  {chip.label}
                  <span className={cn(
                    'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center',
                    activeFilter === chip.id ? 'bg-white/25' : 'bg-current/10',
                  )}>
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        )}
      </div>
    );
  }

  // Desktop: clickable stat cards with filter support
  const desktopItems = [
    { id: null, icon: Users, value: stats.total, label: 'إجمالي العملاء', color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'active', icon: UserCheck, value: stats.active, label: 'نشط', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20' },
    { id: 'inactive', icon: UserX, value: stats.inactive, label: 'غير نشط', color: 'text-muted-foreground', bg: 'bg-muted' },
    { id: 'individuals', icon: Users, value: stats.individuals, label: 'أفراد', color: 'text-info', bg: 'bg-info/10' },
    { id: 'companies', icon: Building2, value: stats.companies, label: 'شركات', color: 'text-secondary-foreground', bg: 'bg-secondary' },
    { id: 'vip', icon: Crown, value: stats.vip, label: 'عملاء VIP', color: 'text-warning', bg: 'bg-warning/10' },
    { id: 'debtors', icon: DollarSign, value: stats.totalBalance.toLocaleString(), label: 'الأرصدة المستحقة', color: stats.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400', bg: stats.totalBalance > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10 dark:bg-emerald-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {desktopItems.map((stat, i) => (
        <Card
          key={i}
          className={cn(
            "transition-all",
            onFilterChange && "cursor-pointer hover:shadow-md hover:border-primary/30",
            activeFilter === stat.id && stat.id !== null && "ring-2 ring-primary border-primary"
          )}
          onClick={() => onFilterChange?.(activeFilter === stat.id ? null : stat.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
              <div>
                <p className={cn('text-2xl font-bold', i === 6 ? stat.color : '')}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
