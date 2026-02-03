import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { paymentSchema, type PaymentFormData } from "@/lib/validations";
import { processPayment, getErrorMessage } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'credit', label: 'آجل' },
  { value: 'advance_payment', label: 'دفعة مقدمة' },
  { value: 'installment', label: 'تقسيط' },
];

const PaymentFormDialog = ({ open, onOpenChange }: PaymentFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_id: '',
      invoice_id: '',
      amount: 0,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    },
  });

  const selectedCustomerId = watch('customer_id');

  const { data: customerInvoices = [] } = useQuery({
    queryKey: ['customer-unpaid-invoices', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', selectedCustomerId)
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!selectedCustomerId,
  });

  useEffect(() => {
    if (open) {
      reset({
        customer_id: '',
        invoice_id: '',
        amount: 0,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
      });
    }
  }, [open, reset]);

  const [isProcessing, setIsProcessing] = useState(false);

  const generatePaymentNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY-${year}${month}-${random}`;
  };

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      setIsProcessing(true);
      try {
        // Use secure Edge Function for payment processing
        const result = await processPayment({
          customer_id: data.customer_id,
          invoice_id: data.invoice_id || undefined,
          amount: data.amount,
          payment_method: data.payment_method as 'cash' | 'credit_card' | 'bank_transfer' | 'check',
          payment_number: generatePaymentNumber(),
          reference_number: data.reference_number?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
        });

        if (!result.success) {
          throw new Error(getErrorMessage(result.code || 'PAYMENT_ERROR'));
        }

        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ 
        title: "تم تسجيل الدفعة بنجاح",
        description: "تم تحديث رصيد العميل والفاتورة تلقائياً",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('PaymentFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    mutation.mutate(data);
  };

  const selectedInvoice = customerInvoices.find(i => i.id === watch('invoice_id'));
  const invoiceRemaining = selectedInvoice 
    ? Number(selectedInvoice.total_amount) - Number(selectedInvoice.paid_amount || 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>العميل *</Label>
            <Select
              value={watch('customer_id')}
              onValueChange={(value) => {
                setValue('customer_id', value);
                setValue('invoice_id', '');
              }}
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
          </div>

          {selectedCustomerId && customerInvoices.length > 0 && (
            <div>
              <Label>الفاتورة (اختياري)</Label>
              <Select
                value={watch('invoice_id')}
                onValueChange={(value) => setValue('invoice_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفاتورة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فاتورة محددة</SelectItem>
                  {customerInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - متبقي: {(Number(invoice.total_amount) - Number(invoice.paid_amount || 0)).toLocaleString()} ج.م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInvoice && (
                <p className="text-sm text-muted-foreground mt-1">
                  المتبقي على الفاتورة: {invoiceRemaining.toLocaleString()} ج.م
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">المبلغ (ج.م) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label>طريقة الدفع</Label>
              <Select
                value={watch('payment_method')}
                onValueChange={(value: 'cash' | 'bank_transfer' | 'credit' | 'advance_payment' | 'installment') => setValue('payment_method', value)}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_date">تاريخ الدفع</Label>
              <Input
                id="payment_date"
                type="date"
                {...register('payment_date')}
              />
            </div>

            <div>
              <Label htmlFor="reference_number">رقم المرجع</Label>
              <Input
                id="reference_number"
                {...register('reference_number')}
                placeholder="رقم الحوالة/الشيك"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending || isProcessing}>
              {isProcessing ? (
                <>
                  <ShieldCheck className="h-4 w-4 ml-2 animate-pulse" />
                  جاري المعالجة...
                </>
              ) : mutation.isPending ? (
                'جاري الحفظ...'
              ) : (
                'تسجيل الدفعة'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFormDialog;
