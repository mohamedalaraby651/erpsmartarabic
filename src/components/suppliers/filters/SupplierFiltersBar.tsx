import React, { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, Search } from "lucide-react";
import { FilterChips } from "@/components/filters/FilterChips";
import { cn } from "@/lib/utils";
import { egyptGovernorates } from "@/lib/egyptLocations";

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'لوجستية', other: 'أخرى',
};

interface SupplierFiltersBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  governorateFilter: string;
  onGovernorateChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  activeFiltersCount: number;
  isMobile: boolean;
  onOpenDrawer: () => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
}

export const SupplierFiltersBar = memo(function SupplierFiltersBar({
  searchQuery, onSearchChange,
  governorateFilter, onGovernorateChange,
  categoryFilter, onCategoryChange,
  statusFilter, onStatusChange,
  activeFiltersCount, isMobile, onOpenDrawer,
  onClearFilter, onClearAll,
}: SupplierFiltersBarProps) {
  const chips = [
    ...(governorateFilter !== 'all' ? [{ id: 'gov', label: `المحافظة: ${governorateFilter}`, value: governorateFilter }] : []),
    ...(categoryFilter !== 'all' ? [{ id: 'cat', label: `التصنيف: ${categoryLabels[categoryFilter] || categoryFilter}`, value: categoryFilter }] : []),
    ...(statusFilter !== 'all' ? [{ id: 'status', label: statusFilter === 'active' ? 'نشط' : statusFilter === 'debtors' ? 'مدين' : 'غير نشط', value: statusFilter }] : []),
  ];

  const activeChipIds = chips.map(c => c.id);

  if (isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDrawer}
            className={cn(
              'relative flex items-center justify-center h-11 w-11 rounded-xl border transition-all duration-200 shrink-0',
              activeFiltersCount > 0
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-card text-muted-foreground border-border hover:bg-accent',
            )}
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
        {activeChipIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <FilterChips chips={chips} activeChips={activeChipIds} onToggle={(chipId) => onClearFilter(chipId)} onClearAll={onClearAll} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pr-10 h-9 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
            <SelectItem value="debtors">مدين</SelectItem>
          </SelectContent>
        </Select>
        <Select value={governorateFilter} onValueChange={onGovernorateChange}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="المحافظة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المحافظات</SelectItem>
            {egyptGovernorates.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={onOpenDrawer}
          className={cn(
            'flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs transition-all',
            activeFiltersCount > 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-accent',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          متقدم
          {activeFiltersCount > 0 && (
            <span className="bg-primary-foreground/20 text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center">{activeFiltersCount}</span>
          )}
        </button>
      </div>
      {activeChipIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChips chips={chips} activeChips={activeChipIds} onToggle={(chipId) => onClearFilter(chipId)} onClearAll={onClearAll} />
        </div>
      )}
    </div>
  );
});
