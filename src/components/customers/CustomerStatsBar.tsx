import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Crown, DollarSign, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipDef {
  id: string;
  label: string;
  count: number;
  icon: React.ElementType;
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
    { id: 'active', label: 'نشط', count: stats.active, icon: UserCheck },
    { id: 'vip', label: 'VIP', count: stats.vip, icon: Crown },
    { id: 'debtors', label: 'مدين', count: stats.debtors ?? 0, icon: DollarSign },
    { id: 'companies', label: 'شركات', count: stats.companies, icon: Building2 },
    { id: 'farms', label: 'مزارع', count: stats.farms ?? 0, icon: Users },
    { id: 'individuals', label: 'أفراد', count: stats.individuals, icon: Users },
    { id: 'inactive', label: 'غير نشط', count: stats.inactive, icon: UserX },
  ];

  if (isMobile) {
    return (
      <div className="space-y-2">
        {/* Main stat */}
        <div className="flex items-center gap-2 px-1">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-xl font-bold">{stats.total}</span>
          <span className="text-sm text-muted-foreground">عميل</span>
          {stats.totalBalance > 0 && (
            <span className="mr-auto text-sm font-semibold text-destructive">
              {stats.totalBalance.toLocaleString()} ج.م
            </span>
          )}
        </div>

        {/* Quick filter chips */}
        {onFilterChange && (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              <Badge
                variant={!activeFilter ? 'default' : 'outline'}
                className="cursor-pointer shrink-0 px-3 py-1.5 text-xs"
                onClick={() => onFilterChange(null)}
              >
                الكل {stats.total}
              </Badge>
              {chips.map((chip) => (
                <Badge
                  key={chip.id}
                  variant={activeFilter === chip.id ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer shrink-0 px-3 py-1.5 text-xs transition-colors',
                    activeFilter === chip.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                  onClick={() => onFilterChange(activeFilter === chip.id ? null : chip.id)}
                >
                  <chip.icon className="h-3 w-3 ml-1" />
                  {chip.label} {chip.count}
                </Badge>
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
