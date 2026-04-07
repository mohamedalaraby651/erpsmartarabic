import React, { memo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Building2, DollarSign, UserCheck, UserX, Package, Wrench, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierStatsBarProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    debtors: number;
    rawMaterials: number;
    services: number;
    equipment: number;
  };
  isMobile: boolean;
  activeFilter?: string;
  onFilterChange?: (filterId: string | null) => void;
}

export const SupplierStatsBar = memo(function SupplierStatsBar({ stats, isMobile, activeFilter, onFilterChange }: SupplierStatsBarProps) {
  const chips = [
    { id: null as string | null, label: 'الكل', count: stats.total },
    { id: 'active', label: 'نشط', count: stats.active, Icon: UserCheck },
    { id: 'inactive', label: 'غير نشط', count: stats.inactive, Icon: UserX },
    { id: 'debtors', label: 'مدينين', count: stats.debtors, Icon: DollarSign },
    { id: 'raw_materials', label: 'مواد خام', count: stats.rawMaterials, Icon: Package },
    { id: 'services', label: 'خدمات', count: stats.services, Icon: Wrench },
    { id: 'equipment', label: 'معدات', count: stats.equipment, Icon: Truck },
  ];

  return (
    <ScrollArea className="w-full">
      <div className={cn('flex gap-2', isMobile ? 'pb-1' : 'pb-0.5')}>
        {chips.map(chip => {
          const isActive = chip.id === null ? !activeFilter : activeFilter === chip.id;
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
              {chip.Icon && <chip.Icon className="h-3.5 w-3.5" />}
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
