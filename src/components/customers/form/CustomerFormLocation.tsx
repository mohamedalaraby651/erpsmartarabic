import { memo, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { egyptGovernorates, egyptCities } from "@/lib/egyptLocations";
import type { CustomerFormData } from "@/lib/validations";

function CustomerFormLocation() {
  const { watch, setValue } = useFormContext<CustomerFormData>();
  const selectedGovernorate = watch('governorate');

  const cities = useMemo(() => {
    if (!selectedGovernorate) return [];
    return egyptCities[selectedGovernorate] || [];
  }, [selectedGovernorate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>المحافظة</Label>
        <Select
          value={watch('governorate') || ''}
          onValueChange={(v) => { setValue('governorate', v); setValue('city', ''); }}
        >
          <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
          <SelectContent>
            {egyptGovernorates.map((gov) => (
              <SelectItem key={gov} value={gov}>{gov}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>المدينة / المركز</Label>
        <Select
          value={watch('city') || ''}
          onValueChange={(v) => setValue('city', v)}
          disabled={!selectedGovernorate}
        >
          <SelectTrigger><SelectValue placeholder={selectedGovernorate ? "اختر المدينة" : "اختر المحافظة أولاً"} /></SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default memo(CustomerFormLocation);
