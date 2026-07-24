import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { invoiceFormSchema, invoiceItemSchema, type InvoiceFormData } from "@/lib/validations";
import { validateInvoice, getErrorMessage } from "@/lib/api/secureOperations";
import { saveInvoiceWithItems } from "@/lib/services/invoiceService";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { productRepository } from "@/application/queries/products";
import { queryKeys } from "@/lib/queryKeys";
import { useInvoiceItems } from "./useInvoiceItems";
import { useFormDraft } from "@/hooks/useFormDraft";
import InvoiceFormHeader from "./InvoiceFormHeader";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";
import InvoiceValidation from "./InvoiceValidation";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import { LivePreviewPanel } from "@/components/settings/ExportCenter/LivePreviewPanel";
import { useLivePreviewProfile } from "@/components/settings/ExportCenter/useLivePreviewProfile";
import { InvoicePrintView } from "@/components/print/InvoicePrintView";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  prefillCustomerId?: string;
}

const generateInvoiceNumber = () => {
  const date = new Date();
  return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

const InvoiceFormDialog = ({ open, onOpenChange, invoice, prefillCustomerId }: InvoiceFormDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(invoice?.id ?? null);
  const [printOpen, setPrintOpen] = useState(false);
  const { profile: pdfProfile } = useLivePreviewProfile();

  const { data: customers = [] } = useQuery({
    queryKey: queryKeys.customers.list({ active: true, safe: true }),
    queryFn: () => customerRepository.findActiveSafe(),
  });

  const { data: products = [] } = useQuery({
    queryKey: queryKeys.products.list({ active: true }),
    queryFn: () => productRepository.findActive(),
  });

  const { items, subtotal, addItem, updateItem, removeItem, loadItems, resetItems } = useInvoiceItems(products);

  const isEditingEntity = !!invoice;
  const toastHandlers = useMutationToast({
    successTitle: isEditingEntity ? 'تم تحديث الفاتورة بنجاح' : 'تم إنشاء الفاتورة بنجاح',
    successDescription: 'يمكنك الآن طباعة PDF',
  });

  const { form, isEditing, isSubmitting, submit } = useFormDialog<InvoiceFormData, Invoice, InvoiceFormData>({
    schema: invoiceFormSchema,
    entity: invoice,
    toValues: (e) => e
      ? {
          customer_id: e.customer_id,
          payment_method: e.payment_method as InvoiceFormData['payment_method'],
          due_date: e.due_date || '',
          notes: e.notes || '',
          internal_notes: (e as Record<string, unknown>).internal_notes as string || '',
          discount_amount: Number(e.discount_amount) || 0,
          tax_amount: Number(e.tax_amount) || 0,
        }
      : {
          customer_id: prefillCustomerId || '',
          payment_method: 'cash',
          due_date: '',
          notes: '',
          internal_notes: '',
          discount_amount: 0,
          tax_amount: 0,
        },
    toPayload: (v) => v,
    // Pre-MUTATE discipline: validate → server-validate (if creating) → transform → submit.
    mutationFn: async (data, { isEditing }) => {
      // 1. VALIDATE (items)
      if (items.length === 0) throw new Error('يجب إضافة منتج واحد على الأقل');
      for (const item of items) {
        if (!item.product_id) throw new Error('يجب اختيار منتج لكل صف');
        const result = invoiceItemSchema.safeParse(item);
        if (!result.success) throw new Error(result.error.issues[0].message);
      }

      const discountAmount = data.discount_amount || 0;
      const taxAmount = data.tax_amount || 0;
      const total = subtotal - discountAmount + taxAmount;

      // 2. SERVER-VALIDATE (only on create)
      if (!isEditing) {
        setIsValidating(true);
        try {
          const validation = await validateInvoice({
            customer_id: data.customer_id,
            total_amount: total,
            items: items.map(it => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })),
          });
          if (!validation.valid) throw new Error(getErrorMessage(validation.code || 'VALIDATION_ERROR'));
        } finally {
          setIsValidating(false);
        }
      }

      // 3. TRANSFORM
      const headerData = {
        customer_id: data.customer_id,
        invoice_number: invoice?.invoice_number || generateInvoiceNumber(),
        payment_method: data.payment_method,
        due_date: data.due_date || null,
        notes: data.notes?.trim() || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: total,
        status: 'pending' as const,
        payment_status: 'pending' as const,
        created_by: user?.id || null,
      };
      const itemsPayload = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        total_price: item.total_price,
      }));

      // 4. SUBMIT
      const savedId = await saveInvoiceWithItems({
        id: isEditing ? invoice!.id : undefined,
        header: headerData,
        items: itemsPayload,
      });
      setLastSavedId(savedId ?? invoice?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      clearDraft();
      form.reset(form.getValues(), { keepValues: true }); // mark pristine
      toastHandlers.onSuccess();
    },
    onError: toastHandlers.onError,
  });

  const { register, setValue, watch, formState: { errors, isDirty } } = form;

  const wizard = useFormWizard({ totalSteps: 3 });
  const formData = watch();
  const { hasDraft, restoreDraft, clearDraft } = useFormDraft({
    key: `invoice_${invoice?.id || 'new'}`,
    data: formData,
    enabled: !isEditing,
  });

  // Draft restore (independent from entity-driven reset)
  useEffect(() => {
    if (hasDraft && !isEditing && open) {
      const draft = restoreDraft();
      if (draft) {
        sonnerToast.success('تم استعادة المسودة', { description: 'تم استرجاع البيانات المحفوظة تلقائياً' });
        form.reset(draft);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDraft, isEditing, open]);

  // Items state sync (external — line items intentionally outside useFormDialog per Batch 2 rule)
  useEffect(() => {
    if (invoice) loadItems(invoice.id);
    else resetItems();
    wizard.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  const discountAmount = watch('discount_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;
  const total = subtotal - discountAmount + taxAmount;

  // ─── Wizard steps ────
  const Step1Header = (
    <InvoiceFormHeader customers={customers} watch={watch} setValue={setValue} register={register} errors={errors} />
  );
  const Step2Items = (
    <InvoiceItemsTable items={items} products={products} onAddItem={addItem} onUpdateItem={updateItem} onRemoveItem={removeItem} />
  );
  const canPrint = Boolean(lastSavedId) && !isDirty && !isSubmitting;
  const printButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!canPrint}
      onClick={() => setPrintOpen(true)}
      title={canPrint ? 'طباعة PDF بعد الحفظ' : 'احفظ الفاتورة أولاً'}
    >
      <Printer className="h-4 w-4 ml-2" />
      طباعة PDF
    </Button>
  );

  const Step3Totals = (
    <div className="space-y-6">
      <InvoiceTotalsSection subtotal={subtotal} total={total} register={register} />
      <div className="hidden lg:block">
        <LivePreviewPanel profile={pdfProfile} height={420} />
      </div>
      <div className="flex justify-between items-center gap-2">
        {printButton}
        <InvoiceValidation isValidating={isValidating} isPending={isSubmitting} isEditing={isEditing} onCancel={() => onOpenChange(false)} />
      </div>
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
        <form onSubmit={submit} className="space-y-6">
          {Step1Header}
          {Step2Items}
          <InvoiceTotalsSection subtotal={subtotal} total={total} register={register} />
          <div className="hidden lg:block">
            <LivePreviewPanel profile={pdfProfile} height={420} />
          </div>
          <div className="flex justify-between items-center gap-2">
            {printButton}
            <InvoiceValidation isValidating={isValidating} isPending={isSubmitting} isEditing={isEditing} onCancel={() => onOpenChange(false)} />
          </div>
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
      onSubmit={submit} progress={wizard.progress}
      isSubmitting={isSubmitting || isValidating}
      submitLabel={isEditing ? 'تحديث' : 'إنشاء'}
    />
  );

  return (
    <>
      <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />
      {lastSavedId && (
        <InvoicePrintView
          invoiceId={lastSavedId}
          open={printOpen}
          onOpenChange={setPrintOpen}
        />
      )}
    </>
  );
};

export default InvoiceFormDialog;
