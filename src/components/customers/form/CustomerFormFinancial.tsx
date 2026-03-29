import { memo } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import type { CustomerFormData } from "@/lib/validations";

function CustomerFormFinancial() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CustomerFormData>();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="credit_limit">حد الائتمان (ج.م)</Label>
          <Input id="credit_limit" type="number" {...register('credit_limit', { valueAsNumber: true })} placeholder="0" />
        </div>
        <div>
          <Label htmlFor="discount_percentage">نسبة الخصم (%)</Label>
          <Input id="discount_percentage" type="number" {...register('discount_percentage', { valueAsNumber: true })} placeholder="0" min={0} max={100} />
          {errors.discount_percentage && <p className="text-sm text-destructive mt-1">{errors.discount_percentage.message}</p>}
        </div>
        <div>
          <Label htmlFor="payment_terms_days">مدة السداد (أيام)</Label>
          <Input id="payment_terms_days" type="number" {...register('payment_terms_days', { valueAsNumber: true })} placeholder="0" />
        </div>
        <div>
          <Label>طريقة الدفع المفضلة</Label>
          <Select value={watch('preferred_payment_method') || ''} onValueChange={(v) => setValue('preferred_payment_method', v)}>
            <SelectTrigger><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">نقدي</SelectItem>
              <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              <SelectItem value="credit">آجل</SelectItem>
              <SelectItem value="installment">أقساط</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="tax_number">الرقم الضريبي</Label>
          <Input id="tax_number" {...register('tax_number')} placeholder="الرقم الضريبي" />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 pb-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary">ملاحظات</h3>
        <Separator className="flex-1" />
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="notes">ملاحظات إضافية</Label>
          <Textarea id="notes" {...register('notes')} placeholder="ملاحظات إضافية..." rows={3} />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="is_active" checked={watch('is_active')} onCheckedChange={(checked) => setValue('is_active', checked)} />
          <Label htmlFor="is_active">عميل نشط</Label>
        </div>
      </div>
    </>
  );
}

export default memo(CustomerFormFinancial);
