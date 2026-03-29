import { memo } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomerFormData } from "@/lib/validations";

interface Props {
  categories: Array<{ id: string; name: string }>;
}

function CustomerFormBasicInfo({ categories }: Props) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CustomerFormData>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label htmlFor="name">اسم العميل *</Label>
        <Input id="name" {...register('name')} placeholder="أدخل اسم العميل" />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <Label>نوع العميل</Label>
        <Select value={watch('customer_type')} onValueChange={(v) => setValue('customer_type', v as CustomerFormData['customer_type'])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">فرد</SelectItem>
            <SelectItem value="company">شركة</SelectItem>
            <SelectItem value="farm">مزرعة</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>التصنيف</Label>
        <Select value={watch('category_id')} onValueChange={(v) => setValue('category_id', v)}>
          <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>مستوى VIP</Label>
        <Select value={watch('vip_level')} onValueChange={(v) => setValue('vip_level', v as CustomerFormData['vip_level'])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">عادي</SelectItem>
            <SelectItem value="silver">فضي</SelectItem>
            <SelectItem value="gold">ذهبي</SelectItem>
            <SelectItem value="platinum">بلاتيني</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default memo(CustomerFormBasicInfo);
