import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseFormRegister } from "react-hook-form";
import type { InvoiceFormData } from "@/lib/validations";

interface InvoiceTotalsSectionProps {
  subtotal: number;
  total: number;
  register: UseFormRegister<InvoiceFormData>;
}

export function InvoiceTotalsSection({
  subtotal,
  total,
  register,
}: InvoiceTotalsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="notes">ملاحظات (مرئية للعميل)</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="ملاحظات تظهر على الفاتورة..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="internal_notes" className="flex items-center gap-2">
            ملاحظات داخلية
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">غير مرئية للعميل</span>
          </Label>
          <Textarea
            id="internal_notes"
            {...register('internal_notes')}
            placeholder="ملاحظات داخلية للفريق فقط..."
            rows={3}
            className="border-dashed"
          />
        </div>
      </div>
      
      <div className="space-y-3 bg-muted p-4 rounded-lg max-w-md mr-auto">
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
