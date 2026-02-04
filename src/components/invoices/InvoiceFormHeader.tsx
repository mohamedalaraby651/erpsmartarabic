import { memo } from 'react';
import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';
import { InvoiceFormData } from '@/lib/validations';

type Customer = Database['public']['Tables']['customers']['Row'];

interface InvoiceFormHeaderProps {
  customers: Customer[];
  watch: UseFormWatch<InvoiceFormData>;
  setValue: UseFormSetValue<InvoiceFormData>;
  register: ReturnType<typeof import('react-hook-form').useForm<InvoiceFormData>>['register'];
  errors: FieldErrors<InvoiceFormData>;
}

const paymentMethods = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'credit', label: 'آجل' },
  { value: 'advance_payment', label: 'دفعة مقدمة' },
  { value: 'installment', label: 'تقسيط' },
] as const;

function InvoiceFormHeader({
  customers,
  watch,
  setValue,
  register,
  errors,
}: InvoiceFormHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label>العميل *</Label>
        <Select
          value={watch('customer_id')}
          onValueChange={(value) => setValue('customer_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر العميل" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customer_id && (
          <p className="text-sm text-destructive mt-1">{errors.customer_id.message}</p>
        )}
      </div>

      <div>
        <Label>طريقة الدفع</Label>
        <Select
          value={watch('payment_method')}
          onValueChange={(value: 'cash' | 'bank_transfer' | 'credit' | 'advance_payment' | 'installment') => 
            setValue('payment_method', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
        <Input
          id="due_date"
          type="date"
          {...register('due_date')}
        />
      </div>
    </div>
  );
}

export default memo(InvoiceFormHeader);
