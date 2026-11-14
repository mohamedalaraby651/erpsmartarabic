import { useMemo } from "react";
import { usePaymentCustomers, usePaymentInvoices } from "@/hooks/usePayments";
import { useDocumentFormExperience } from "@/hooks/forms/useDocumentFormExperience";
import { DraftRestoreBanner } from "@/components/shared/forms/DraftRestoreBanner";
import { UnsavedChangesDialog } from "@/components/shared/forms/UnsavedChangesDialog";
import { Amount } from "@/components/shared/amount/Amount";
import { useQueryClient } from "@tanstack/react-query";
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
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { logErrorSafely } from "@/lib/errorHandler";
import { paymentSchema, type PaymentFormData } from "@/lib/validations";
import { processPayment, getErrorMessage } from "@/lib/api/secureOperations";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormFieldError from "@/components/shared/FormFieldError";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillCustomerId?: string;
  prefillInvoiceId?: string;
}

const paymentMethods = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'credit', label: 'آجل' },
  { value: 'advance_payment', label: 'دفعة مقدمة' },
  { value: 'installment', label: 'تقسيط' },
];

const generatePaymentNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAY-${year}${month}-${random}`;
};

const defaultValues = (
  prefillCustomerId?: string,
  prefillInvoiceId?: string,
): PaymentFormData => ({
  customer_id: prefillCustomerId || '',
  invoice_id: prefillInvoiceId || '',
  amount: 0,
  payment_method: 'cash',
  payment_date: new Date().toISOString().split('T')[0],
  reference_number: '',
  notes: '',
});

const PaymentFormDialog = ({ open, onOpenChange, prefillCustomerId, prefillInvoiceId }: PaymentFormDialogProps) => {
  const queryClient = useQueryClient();

  const { data: customers = [] } = usePaymentCustomers(open);

  const toast = useMutationToast({
    successTitle: 'تم تسجيل الدفعة بنجاح',
    successDescription: 'تم تحديث رصيد العميل والفاتورة تلقائياً',
    errorTitle: 'حدث خطأ',
  });

  // Synthetic entity carrying only prefill identity, so re-opening with new
  // prefill resets the form via the hook's entity-change effect.
  const entity = useMemo(() => open ? { prefillCustomerId, prefillInvoiceId } : null, [open, prefillCustomerId, prefillInvoiceId]);

  const { form, isSubmitting, submit } = useFormDialog<PaymentFormData, typeof entity>({
    schema: paymentSchema,
    entity,
    toValues: () => defaultValues(prefillCustomerId, prefillInvoiceId),
    toPayload: (v) => v,
    mutationFn: async (values) => {
      const data = values as PaymentFormData;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      experience.clearDraft();
      toast.onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('PaymentFormDialog', error);
      toast.onError(error);
    },
  });

  const { register, setValue, watch, formState: { errors } } = form;
  const selectedCustomerId = watch('customer_id');

  const experience = useDocumentFormExperience({ form, lines: null, restoreLines: () => {}, documentKey: 'payment_new', open, busy: isSubmitting, submit, close: () => onOpenChange(false) });
  const { data: customerInvoices = [] } = usePaymentInvoices(selectedCustomerId, open);
  const customer = customers.find(customer => customer.id === selectedCustomerId);

  const selectedInvoice = customerInvoices.find(i => i.id === watch('invoice_id'));
  const invoiceRemaining = selectedInvoice
    ? Number(selectedInvoice.total_amount) - Number(selectedInvoice.paid_amount || 0)
    : 0;

  const formContent = (
    <form onSubmit={e => { e.preventDefault(); void experience.save(); }} className="space-y-4">
      {experience.hasDraft && <DraftRestoreBanner onRestore={experience.restore} onDiscard={experience.clearDraft} />}
      <div><Label>العميل *</Label><Select value={watch('customer_id')} onValueChange={(value) => { setValue('customer_id', value, { shouldDirty: true, shouldValidate: true }); setValue('invoice_id', '', { shouldDirty: true }); }}><SelectTrigger aria-invalid={!!errors.customer_id}><SelectValue placeholder="اختر العميل" /></SelectTrigger><SelectContent>{customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormFieldError error={errors.customer_id} /></div>
      {customer && <dl className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-sm"><dt>الرصيد</dt><dd><Amount value={customer.current_balance} /></dd><dt>الائتمان المتبقي</dt><dd><Amount value={Number(customer.credit_limit || 0) - Number(customer.current_balance || 0)} /></dd><dt>الهاتف</dt><dd dir="ltr">{customer.phone || '-'}</dd></dl>}
      {selectedCustomerId && customerInvoices.length > 0 && (
        <div><Label>الفاتورة (اختياري)</Label><Select value={watch('invoice_id')} onValueChange={(v) => setValue('invoice_id', v === 'none' ? '' : v)}><SelectTrigger><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger><SelectContent><SelectItem value="none">بدون فاتورة محددة</SelectItem>{customerInvoices.map((inv) => (<SelectItem key={inv.id} value={inv.id}>{inv.invoice_number} - متبقي: {(Number(inv.total_amount) - Number(inv.paid_amount || 0)).toLocaleString()} ج.م</SelectItem>))}</SelectContent></Select>{selectedInvoice && <p className="text-sm text-muted-foreground mt-1">المتبقي على الفاتورة: {invoiceRemaining.toLocaleString()} ج.م</p>}</div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="amount">المبلغ (ج.م) *</Label><Input id="amount" aria-invalid={!!errors.amount} type="number" step="0.01" {...register('amount', { valueAsNumber: true })} /><FormFieldError error={errors.amount} /></div>
        <div><Label>طريقة الدفع</Label><Select value={watch('payment_method')} onValueChange={(v: 'cash' | 'bank_transfer' | 'credit' | 'advance_payment' | 'installment') => setValue('payment_method', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{paymentMethods.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="payment_date">تاريخ الدفع</Label><Input id="payment_date" type="date" {...register('payment_date')} /></div>
        <div><Label htmlFor="reference_number">رقم المرجع</Label><Input id="reference_number" {...register('reference_number')} placeholder="رقم الحوالة/الشيك" /></div>
      </div>
      <div><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" {...register('notes')} placeholder="ملاحظات إضافية..." rows={2} /></div>
    </form>
  );

  const submitBtn = (
    <Button disabled={isSubmitting} onClick={() => void experience.save()} className="flex-1 min-h-11">
      {isSubmitting ? (<><ShieldCheck className="h-4 w-4 ml-2 animate-pulse" />جاري المعالجة...</>) : 'تسجيل الدفعة'}
    </Button>
  );

  const formFooter = (
    <div className="flex gap-3">
      {submitBtn}
      <Button type="button" variant="outline" className="min-h-11" onClick={experience.requestClose}>إلغاء</Button>
    </div>
  );

  const desktopForm = (
    <Dialog open={open} onOpenChange={experience.onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>تسجيل دفعة جديدة</DialogTitle></DialogHeader>
        {formContent}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" className="min-h-11" onClick={experience.requestClose}>إلغاء</Button>
          {submitBtn}
        </div>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm open={open} onOpenChange={experience.onOpenChange} title="تسجيل دفعة جديدة" footer={formFooter}>
      {formContent}
    </FullScreenForm>
  );

  return <><AdaptiveContainer desktop={desktopForm} mobile={mobileForm} /><UnsavedChangesDialog open={experience.confirmOpen} onOpenChange={experience.setConfirmOpen} onConfirm={experience.confirmLeave} /></>;
};

export default PaymentFormDialog;
