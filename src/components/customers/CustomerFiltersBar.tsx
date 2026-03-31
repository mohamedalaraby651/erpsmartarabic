import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { CustomerSearchPreview } from "@/components/customers/CustomerSearchPreview";
import { FilterChips } from "@/components/filters/FilterChips";
import { vipLabels, typeLabels } from "@/lib/customerConstants";

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

  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <CustomerSearchPreview value={searchQuery} onChange={onSearchChange} />
          {isMobile ? (
            <Button variant="outline" size="sm" onClick={onOpenDrawer} className="relative">
              <Filter className="h-4 w-4 ml-2" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          ) : (
            <>
              <Select value={typeFilter} onValueChange={onTypeChange}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="نوع العميل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="company">شركة</SelectItem>
                  <SelectItem value="farm">مزرعة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vipFilter} onValueChange={onVipChange}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="مستوى VIP" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="regular">عادي</SelectItem>
                  <SelectItem value="silver">فضي</SelectItem>
                  <SelectItem value="gold">ذهبي</SelectItem>
                  <SelectItem value="platinum">بلاتيني</SelectItem>
                </SelectContent>
              </Select>
              <Select value={governorateFilter} onValueChange={onGovernorateChange}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المحافظات</SelectItem>
                  {governorates.map((gov) => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {activeChipIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <FilterChips
              chips={chips}
              activeChips={activeChipIds}
              onToggle={(chipId) => onClearFilter(chipId)}
              onClearAll={onClearAll}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
