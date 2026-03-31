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
        {renderChip(null)}
        {chips.map(chip => renderChip(chip))}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
});
