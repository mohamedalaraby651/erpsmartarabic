import React, { memo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Building2, Crown, DollarSign, UserCheck, UserX, TrendingUp } from "lucide-react";
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
    { id: 'farms', label: 'مزارع', count: stats.farms ?? 0, icon: TrendingUp },
    { id: 'individuals', label: 'أفراد', count: stats.individuals, icon: Users },
    { id: 'inactive', label: 'غير نشط', count: stats.inactive, icon: UserX },
  ];

  const allChips: Array<{ id: string | null; label: string; count: number; Icon?: React.ElementType }> = [
    { id: null, label: 'الكل', count: stats.total },
    ...chips.map(c => ({ id: c.id, label: c.label, count: c.count, Icon: c.icon })),
  ];

  return (
    <ScrollArea className="w-full">
      <div className={cn('flex gap-2', isMobile ? 'pb-1' : 'pb-0.5')}>
        {allChips.map(chip => {
          const isActive = chip.id === null ? !activeFilter : activeFilter === chip.id;
          const ChipIcon = chip.Icon;
          return (
            <button
              key={chip.id ?? 'all'}
              onClick={() => onFilterChange?.(chip.id === null ? null : (activeFilter === chip.id ? null : chip.id))}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {ChipIcon && <ChipIcon className="h-3.5 w-3.5" />}
              {chip.label}
              <span className={cn(
                'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
                isActive ? 'bg-primary-foreground/20' : 'bg-muted',
              )}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
});
