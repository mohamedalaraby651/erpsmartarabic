import { memo } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2 } from "lucide-react";
import type { CustomerFormData } from "@/lib/validations";

interface Props {
  showCompanyFields?: boolean;
  idPrefix?: string;
}

function CustomerFormContact({ showCompanyFields = false, idPrefix = "" }: Props) {
  const { register, formState: { errors } } = useFormContext<CustomerFormData>();
  const p = idPrefix ? `${idPrefix}_` : "";

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${p}phone`}>الهاتف</Label>
          <Input id={`${p}phone`} aria-invalid={!!errors.phone} {...register('phone')} placeholder="رقم الهاتف" />
          {errors.phone && <p role="alert" className="text-sm text-destructive mt-1">{errors.phone.message || 'رقم الهاتف غير صالح'}</p>}
        </div>
        <div>
          <Label htmlFor={`${p}phone2`}>هاتف إضافي</Label>
          <Input id={`${p}phone2`} aria-invalid={!!errors.phone2} {...register('phone2')} placeholder="رقم هاتف إضافي" />
          {errors.phone2 && <p role="alert" className="text-sm text-destructive mt-1">{errors.phone2.message || 'رقم الهاتف غير صالح'}</p>}
        </div>
        <div>
          <Label htmlFor={`${p}email`}>البريد الإلكتروني</Label>
          <Input id={`${p}email`} type="email" {...register('email')} placeholder="البريد الإلكتروني" />
        </div>
        <div>
          <Label htmlFor={`${p}facebook_url`}>فيسبوك</Label>
          <Input id={`${p}facebook_url`} {...register('facebook_url')} placeholder="رابط صفحة فيسبوك" />
        </div>
        <div>
          <Label htmlFor={`${p}website_url`}>الموقع الإلكتروني</Label>
          <Input id={`${p}website_url`} {...register('website_url')} placeholder="https://..." />
        </div>
      </div>
      {showCompanyFields && (
        <>
          <div className="flex items-center gap-2 pt-4 pb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary">الشخص المسؤول</h3>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${p}contact_person`}>اسم المسؤول</Label>
              <Input id={`${p}contact_person`} {...register('contact_person')} placeholder="اسم الشخص المسؤول" />
            </div>
            <div>
              <Label htmlFor={`${p}contact_person_role`}>المنصب</Label>
              <Input id={`${p}contact_person_role`} {...register('contact_person_role')} placeholder="مثال: مدير المشتريات" />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default memo(CustomerFormContact);
