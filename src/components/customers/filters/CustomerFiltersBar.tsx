import React, { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import { CustomerSearchPreview } from "@/components/customers/CustomerSearchPreview";
import { FilterChips } from "@/components/filters/FilterChips";
import { vipLabels, typeLabels } from "@/lib/customerConstants";
import { cn } from "@/lib/utils";

interface CustomerFiltersBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (v: string) => void;
  vipFilter: string;
  onVipChange: (v: string) => void;
  governorateFilter: string;
  onGovernorateChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  governorates: readonly string[];
  activeFiltersCount: number;
  isMobile: boolean;
  onOpenDrawer: () => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
  noCommDays?: string;
  inactiveDays?: string;
}

export const CustomerFiltersBar = memo(function CustomerFiltersBar({
  searchQuery, onSearchChange,
  typeFilter, onTypeChange, vipFilter, onVipChange,
  governorateFilter, onGovernorateChange, statusFilter, onStatusChange,
  governorates, activeFiltersCount, isMobile, onOpenDrawer,
  onClearFilter, onClearAll,
  noCommDays, inactiveDays,
}: CustomerFiltersBarProps) {
  const chips = [
    ...(typeFilter !== 'all' ? [{ id: 'type', label: `النوع: ${typeLabels[typeFilter] || typeFilter}`, value: typeFilter }] : []),
    ...(vipFilter !== 'all' ? [{ id: 'vip', label: `VIP: ${vipLabels[vipFilter] || vipFilter}`, value: vipFilter }] : []),
    ...(governorateFilter !== 'all' ? [{ id: 'gov', label: `المحافظة: ${governorateFilter}`, value: governorateFilter }] : []),
    ...(statusFilter !== 'all' ? [{ id: 'status', label: statusFilter === 'active' ? 'نشط' : statusFilter === 'debtors' ? 'مدين' : 'غير نشط', value: statusFilter }] : []),
    ...(noCommDays ? [{ id: 'noComm', label: `بدون تواصل منذ ${noCommDays} يوم`, value: noCommDays }] : []),
    ...(inactiveDays ? [{ id: 'inactive', label: `بدون نشاط منذ ${inactiveDays} يوم`, value: inactiveDays }] : []),
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
            <FilterChips
              chips={chips}
              activeChips={activeChipIds}
              onToggle={(chipId) => onClearFilter(chipId)}
              onClearAll={onClearAll}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop: integrated row without Card wrapper
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <CustomerSearchPreview value={searchQuery} onChange={onSearchChange} className="max-w-sm" />
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="نوع العميل" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="individual">فرد</SelectItem>
            <SelectItem value="company">شركة</SelectItem>
            <SelectItem value="farm">مزرعة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vipFilter} onValueChange={onVipChange}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="VIP" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="regular">عادي</SelectItem>
            <SelectItem value="silver">فضي</SelectItem>
            <SelectItem value="gold">ذهبي</SelectItem>
            <SelectItem value="platinum">بلاتيني</SelectItem>
          </SelectContent>
        </Select>
        <Select value={governorateFilter} onValueChange={onGovernorateChange}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="المحافظة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المحافظات</SelectItem>
            {governorates.map((gov) => (
              <SelectItem key={gov} value={gov}>{gov}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
            <SelectItem value="debtors">مدين</SelectItem>
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
            <span className="bg-primary-foreground/20 text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
      {activeChipIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChips
            chips={chips}
            activeChips={activeChipIds}
            onToggle={(chipId) => onClearFilter(chipId)}
            onClearAll={onClearAll}
          />
        </div>
      )}
    </div>
  );
});
