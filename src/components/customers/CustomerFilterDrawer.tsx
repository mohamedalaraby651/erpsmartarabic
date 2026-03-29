import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FilterDrawer, FilterSection } from "@/components/filters/FilterDrawer";
import { egyptGovernorates } from "@/lib/egyptLocations";
import { vipOptions } from "@/lib/customerConstants";

interface CustomerFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFiltersCount: number;
  onApply: () => void;
  onReset: () => void;
  tempType: string;
  setTempType: (v: string) => void;
  tempVip: string;
  setTempVip: (v: string) => void;
  tempGovernorate: string;
  setTempGovernorate: (v: string) => void;
  tempStatus: string;
  setTempStatus: (v: string) => void;
  tempNoCommDays: string;
  setTempNoCommDays: (v: string) => void;
  tempInactiveDays: string;
  setTempInactiveDays: (v: string) => void;
}

export const CustomerFilterDrawer = memo(function CustomerFilterDrawer({
  open, onOpenChange, activeFiltersCount, onApply, onReset,
  tempType, setTempType, tempVip, setTempVip,
  tempGovernorate, setTempGovernorate, tempStatus, setTempStatus,
  tempNoCommDays, setTempNoCommDays, tempInactiveDays, setTempInactiveDays,
}: CustomerFilterDrawerProps) {
  return (
    <FilterDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="فلاتر العملاء"
      activeFiltersCount={activeFiltersCount}
      onApply={onApply}
      onReset={onReset}
    >
      <FilterSection title="نوع العميل">
        <Select value={tempType} onValueChange={setTempType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="individual">فرد</SelectItem>
            <SelectItem value="company">شركة</SelectItem>
            <SelectItem value="farm">مزرعة</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="مستوى VIP">
        <Select value={tempVip} onValueChange={setTempVip}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {vipOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="المحافظة">
        <Select value={tempGovernorate} onValueChange={setTempGovernorate}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المحافظات</SelectItem>
            {egyptGovernorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="الحالة">
        <Select value={tempStatus} onValueChange={setTempStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="بدون تواصل منذ (أيام)">
        <Input
          type="number" min={0} placeholder="مثال: 30"
          value={tempNoCommDays}
          onChange={(e) => setTempNoCommDays(e.target.value)}
        />
      </FilterSection>
      <FilterSection title="بدون نشاط منذ (أيام)">
        <Input
          type="number" min={0} placeholder="مثال: 60"
          value={tempInactiveDays}
          onChange={(e) => setTempInactiveDays(e.target.value)}
        />
      </FilterSection>
    </FilterDrawer>
  );
});
