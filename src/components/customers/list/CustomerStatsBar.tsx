import React, { memo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Building2, Crown, DollarSign, UserCheck, UserX, TrendingUp, X } from "lucide-react";
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

  const hasActive = !!activeFilter;

  return (
    <ScrollArea className="w-full">
      <div className={cn('flex gap-2 items-center', isMobile ? 'pb-1' : 'pb-0.5')}>
        {/* Clear chip — appears only when a quick filter is active */}
        {hasActive && (
          <button
            onClick={() => onFilterChange?.(null)}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors animate-fade-in"
            aria-label="مسح الفلتر النشط"
          >
            <X className="h-3.5 w-3.5" />
            مسح
          </button>
        )}
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
              aria-pressed={isActive}
            >
              {ChipIcon && <ChipIcon className="h-3.5 w-3.5" />}
              {chip.label}
              <span className={cn(
                'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 tabular-nums',
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
