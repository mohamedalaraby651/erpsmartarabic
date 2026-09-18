import React, { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import { CustomerSearchPreview } from "@/components/customers/filters/CustomerSearchPreview";
import { FilterChips } from "@/components/filters/FilterChips";
import { vipLabels, typeLabels } from "@/lib/customerConstants";
import { customerRepository } from "@/application/queries/customers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  categoryFilter?: string;
  onCategoryChange?: (v: string) => void;
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
  categoryFilter, onCategoryChange,
  governorates, activeFiltersCount, isMobile, onOpenDrawer,
  onClearFilter, onClearAll,
  noCommDays, inactiveDays,
}: CustomerFiltersBarProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => customerRepository.findCategories(),
    staleTime: 300000,
  });

  const categoryName = categories.find(c => c.id === categoryFilter)?.name;

  const chips = [
    ...(typeFilter !== 'all' ? [{ id: 'type', label: `النوع: ${typeLabels[typeFilter] || typeFilter}`, value: typeFilter }] : []),
    ...(vipFilter !== 'all' ? [{ id: 'vip', label: `VIP: ${vipLabels[vipFilter] || vipFilter}`, value: vipFilter }] : []),
    ...(governorateFilter !== 'all' ? [{ id: 'gov', label: `المحافظة: ${governorateFilter}`, value: governorateFilter }] : []),
    ...(statusFilter !== 'all' ? [{ id: 'status', label: statusFilter === 'active' ? 'نشط' : statusFilter === 'debtors' ? 'مدين' : 'غير نشط', value: statusFilter }] : []),
    ...(categoryFilter && categoryFilter !== 'all' ? [{ id: 'cat', label: `الفئة: ${categoryName || categoryFilter}`, value: categoryFilter }] : []),
    ...(noCommDays ? [{ id: 'noComm', label: `بدون تواصل منذ ${noCommDays} يوم`, value: noCommDays }] : []),
    ...(inactiveDays ? [{ id: 'inactive', label: `بدون نشاط منذ ${inactiveDays} يوم`, value: inactiveDays }] : []),
  ];

  const activeChipIds = chips.map(c => c.id);

  if (isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenDrawer}
            type="button"
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            size="icon"
            aria-label={activeFiltersCount > 0 ? `الفلاتر المتقدمة (${activeFiltersCount} نشط)` : 'فتح الفلاتر المتقدمة'}
            aria-haspopup="dialog"
            aria-expanded={false}
            className={cn(
              'relative h-11 w-11 shrink-0',
              activeFiltersCount > 0
                ? 'shadow-md shadow-primary/20'
                : 'text-muted-foreground',
            )}
          >
            <SlidersHorizontal className="h-4.5 w-4.5" aria-hidden="true" />
            {activeFiltersCount > 0 && (
              <span
                className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-sm"
                aria-hidden="true"
              >
                {activeFiltersCount}
              </span>
            )}
          </Button>
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
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <CustomerSearchPreview value={searchQuery} onChange={onSearchChange} className="min-w-64 max-w-sm basis-64 grow lg:grow-0" />
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
        {categories.length > 0 && onCategoryChange && (
          <Select value={categoryFilter || 'all'} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="الفئة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
            <SelectItem value="debtors">مدين</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={onOpenDrawer}
          type="button"
          aria-label={activeFiltersCount > 0 ? `فلاتر متقدمة (${activeFiltersCount} نشط)` : 'فلاتر متقدمة'}
          aria-haspopup="dialog"
          variant={activeFiltersCount > 0 ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          متقدم
          {activeFiltersCount > 0 && (
            <span
              className="bg-primary-foreground/20 text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center"
              aria-hidden="true"
            >
              {activeFiltersCount}
            </span>
          )}
        </Button>
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
