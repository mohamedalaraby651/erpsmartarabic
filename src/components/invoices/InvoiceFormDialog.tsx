import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { invoiceFormSchema, invoiceItemSchema, type InvoiceFormData } from "@/lib/validations";
import { validateInvoice, getErrorMessage } from "@/lib/api/secureOperations";
import { useInvoiceItems } from "./useInvoiceItems";
import { useFormDraft } from "@/hooks/useFormDraft";
import InvoiceFormHeader from "./InvoiceFormHeader";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";
import InvoiceValidation from "./InvoiceValidation";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  prefillCustomerId?: string;
}

const InvoiceFormDialog = ({ open, onOpenChange, invoice, prefillCustomerId }: InvoiceFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!invoice;
  const [isValidating, setIsValidating] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers_safe').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  const { items, subtotal, addItem, updateItem, removeItem, loadItems, resetItems } = useInvoiceItems(products);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customer_id: prefillCustomerId || '', payment_method: 'cash', due_date: '', notes: '', internal_notes: '',
      discount_amount: 0, tax_amount: 0,
    },
  });

  const wizard = useFormWizard({ totalSteps: 3 });
  const formData = watch();
  const { hasDraft, restoreDraft, clearDraft } = useFormDraft({
    key: `invoice_${invoice?.id || 'new'}`,
    data: formData,
    enabled: !isEditing,
  });

  // Restore draft if available
  useEffect(() => {
    if (hasDraft && !isEditing && open) {
      const draft = restoreDraft();
      if (draft) {
        toast({ title: 'تم استعادة المسودة', description: 'تم استرجاع البيانات المحفوظة تلقائياً' });
        reset(draft);
      }
    }
  }, [hasDraft, isEditing, open]);

  useEffect(() => {
    if (invoice) {
      reset({
        customer_id: invoice.customer_id,
        payment_method: invoice.payment_method as InvoiceFormData['payment_method'],
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
        internal_notes: (invoice as Record<string, unknown>).internal_notes as string || '',
        discount_amount: Number(invoice.discount_amount) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
      });
      loadItems(invoice.id);
    } else {
      reset({ customer_id: prefillCustomerId || '', payment_method: 'cash', due_date: '', notes: '', internal_notes: '', discount_amount: 0, tax_amount: 0 });
      resetItems();
    }
    wizard.reset();
  }, [invoice, reset, loadItems, resetItems]);

  const discountAmount = watch('discount_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;
  const total = subtotal - discountAmount + taxAmount;

  const generateInvoiceNumber = () => {
    const date = new Date();
    return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  };

  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      if (items.length === 0) throw new Error('يجب إضافة منتج واحد على الأقل');
      for (const item of items) {
        if (!item.product_id) throw new Error('يجب اختيار منتج لكل صف');
        const result = invoiceItemSchema.safeParse(item);
        if (!result.success) throw new Error(result.error.issues[0].message);
      }

      if (!isEditing) {
        setIsValidating(true);
        try {
          const validation = await validateInvoice({
            customer_id: data.customer_id, total_amount: total,
            items: items.map(item => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price })),
          });
          if (!validation.valid) throw new Error(getErrorMessage(validation.code || 'VALIDATION_ERROR'));
        } finally { setIsValidating(false); }
      }

      const invoiceData = {
        customer_id: data.customer_id, invoice_number: invoice?.invoice_number || generateInvoiceNumber(),
        payment_method: data.payment_method, due_date: data.due_date || null,
        notes: data.notes?.trim() || null, subtotal, discount_amount: discountAmount,
        tax_amount: taxAmount, total_amount: total, status: 'pending' as const,
        payment_status: 'pending' as const, created_by: user?.id || null,
      };

      let invoiceId: string;
      if (isEditing) {
        const { error } = await supabase.from('invoices').update(invoiceData).eq('id', invoice.id);
        if (error) throw error;
        invoiceId = invoice.id;
        await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
      } else {
        const { data: newInvoice, error } = await supabase.from('invoices').insert(invoiceData).select().single();
        if (error) throw error;
        invoiceId = newInvoice.id;
      }

      const itemsData = items.map(item => ({
        invoice_id: invoiceId, product_id: item.product_id, quantity: item.quantity,
        unit_price: item.unit_price, discount_percentage: item.discount_percentage, total_price: item.total_price,
      }));
      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsData);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      clearDraft();
      toast({ title: isEditing ? "تم تحديث الفاتورة بنجاح" : "تم إنشاء الفاتورة بنجاح", description: "تم التحقق من الصلاحيات والحدود المالية" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('InvoiceFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = (data: InvoiceFormData) => mutation.mutate(data);

  // ─── Wizard steps ────
  const Step1Header = (
    <InvoiceFormHeader customers={customers} watch={watch} setValue={setValue} register={register} errors={errors} />
  );
  const Step2Items = (
    <InvoiceItemsTable items={items} products={products} onAddItem={addItem} onUpdateItem={updateItem} onRemoveItem={removeItem} />
  );
  const Step3Totals = (
    <div className="space-y-6">
      <InvoiceTotalsSection subtotal={subtotal} total={total} register={register} />
      <InvoiceValidation isValidating={isValidating} isPending={mutation.isPending} isEditing={isEditing} onCancel={() => onOpenChange(false)} />
    </div>
  );

  const wizardSteps = [
    { title: 'بيانات العميل', content: Step1Header },
    { title: 'المنتجات', content: Step2Items },
    { title: 'المجاميع والحفظ', content: Step3Totals },
  ];

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل الفاتورة' : 'فاتورة جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {Step1Header}
          {Step2Items}
          <InvoiceTotalsSection subtotal={subtotal} total={total} register={register} />
          <InvoiceValidation isValidating={isValidating} isPending={mutation.isPending} isEditing={isEditing} onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm
      open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'تعديل الفاتورة' : 'فاتورة جديدة'}
      steps={wizardSteps} activeStep={wizard.currentStep}
      onNext={wizard.nextStep} onPrev={wizard.prevStep}
      onSubmit={handleSubmit(onSubmit)} progress={wizard.progress}
      isSubmitting={mutation.isPending || isValidating}
      submitLabel={isEditing ? 'تحديث' : 'إنشاء'}
    />
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
};

export default InvoiceFormDialog;
