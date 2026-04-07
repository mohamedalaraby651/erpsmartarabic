import { memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterDrawer, FilterSection } from "@/components/filters/FilterDrawer";
import { egyptGovernorates } from "@/lib/egyptLocations";

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'لوجستية', other: 'أخرى',
};

interface SupplierFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFiltersCount: number;
  onApply: () => void;
  onReset: () => void;
  tempGovernorate: string;
  setTempGovernorate: (v: string) => void;
  tempCategory: string;
  setTempCategory: (v: string) => void;
  tempStatus: string;
  setTempStatus: (v: string) => void;
}

export const SupplierFilterDrawer = memo(function SupplierFilterDrawer({
  open, onOpenChange, activeFiltersCount, onApply, onReset,
  tempGovernorate, setTempGovernorate,
  tempCategory, setTempCategory,
  tempStatus, setTempStatus,
}: SupplierFilterDrawerProps) {
  return (
    <FilterDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="فلاتر الموردين"
      activeFiltersCount={activeFiltersCount}
      onApply={onApply}
      onReset={onReset}
    >
      <FilterSection title="المحافظة">
        <Select value={tempGovernorate} onValueChange={setTempGovernorate}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المحافظات</SelectItem>
            {egyptGovernorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="التصنيف">
        <Select value={tempCategory} onValueChange={setTempCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
            <SelectItem value="debtors">مدين</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
    </FilterDrawer>
  );
});
