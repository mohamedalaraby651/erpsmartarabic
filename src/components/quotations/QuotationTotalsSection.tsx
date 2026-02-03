import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseFormRegister } from "react-hook-form";

interface QuotationFormData {
  customer_id: string;
  valid_until: string;
  notes: string;
  discount_amount: number;
  tax_amount: number;
}

interface QuotationTotalsSectionProps {
  subtotal: number;
  total: number;
  register: UseFormRegister<QuotationFormData>;
}

export function QuotationTotalsSection({
  subtotal,
  total,
  register,
}: QuotationTotalsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="ملاحظات إضافية..."
          rows={3}
        />
      </div>
      
      <div className="space-y-3 bg-muted p-4 rounded-lg">
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span className="font-bold">{subtotal.toLocaleString()} ج.م</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>الخصم:</span>
          <Input
            type="number"
            step="0.01"
            className="w-32"
            {...register('discount_amount', { valueAsNumber: true })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>الضريبة:</span>
          <Input
            type="number"
            step="0.01"
            className="w-32"
            {...register('tax_amount', { valueAsNumber: true })}
          />
        </div>
        <div className="flex justify-between text-lg border-t pt-3">
          <span className="font-bold">الإجمالي:</span>
          <span className="font-bold text-primary">{total.toLocaleString()} ج.م</span>
        </div>
      </div>
    </div>
  );
}
