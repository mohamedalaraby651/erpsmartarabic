import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { legacyQuotationsRepository } from "@/lib/repositories/legacyQuotationsRepository";
import { creditNoteRepository } from "@/lib/repositories/creditNoteRepository";
import { referenceRepository } from "@/lib/repositories/referenceRepository";
import { mapRepoError } from "@/lib/repositories/_base";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Printer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { verifyPermissionOnServer, verifyFinancialLimit } from "@/lib/api/secureOperations";
import { QuotationItemsTable } from "./QuotationItemsTable";
import { useQuotationItems } from "./useQuotationItems";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import { LivePreviewPanel } from "@/components/settings/ExportCenter/LivePreviewPanel";
import { useLivePreviewProfile } from "@/components/settings/ExportCenter/useLivePreviewProfile";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import type { Database } from "@/integrations/supabase/types";

type Quotation = Database['public']['Tables']['quotations']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
}

const quotationFormSchema = z.object({
  customer_id: z.string().min(1, 'يجب اختيار العميل'),
  valid_until: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});
type FormData = z.infer<typeof quotationFormSchema>;

const generateQuotationNumber = () => {
  const d = new Date();
  return `QT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

const QuotationFormDialog = ({ open, onOpenChange, quotation }: QuotationFormDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastSavedId, setLastSavedId] = useState<string | null>(quotation?.id ?? null);
  const [printOpen, setPrintOpen] = useState(false);
  const { profile: pdfProfile } = useLivePreviewProfile();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-safe-active'],
    queryFn: () => creditNoteRepository.listCustomersForSelect(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => referenceRepository.listActiveProducts() as Promise<Product[]>,
  });

  const {
    items, subtotal, totalAfterDiscount: _totalAfterDiscount, taxAmount, grandTotal,
    vatEnabled, setVatEnabled, discountAmount, setDiscountAmount,
    addItem, updateItem, removeItem, loadItems, resetItems, validate,
  } = useQuotationItems({ products });

  const isEditingEntity = !!quotation;
  const toastHandlers = useMutationToast({
    successTitle: isEditingEntity ? 'تم تحديث عرض السعر بنجاح' : 'تم إنشاء عرض السعر بنجاح',
    successDescription: 'يمكنك الآن طباعة PDF',
  });

  const { form, isEditing, isSubmitting, submit } = useFormDialog<FormData, Quotation, FormData>({
    schema: quotationFormSchema,
    entity: quotation,
    toValues: (e) => e
      ? { customer_id: e.customer_id, valid_until: e.valid_until || '', notes: e.notes || '' }
      : { customer_id: '', valid_until: '', notes: '' },
    toPayload: (v) => v,
    // Pre-MUTATE discipline: validate items → permissions → financial limits → transform → submit.
    mutationFn: async (data, { isEditing }) => {
      // 1. VALIDATE items
      if (items.length === 0) throw new Error('يجب إضافة منتج واحد على الأقل');
      const errors = validate();
      if (errors.length > 0) throw new Error(errors[0].message);

      // 2. PERMISSION
      const action = isEditing ? 'edit' : 'create';
      const hasPermission = await verifyPermissionOnServer('quotations', action);
      if (!hasPermission) throw new Error(`ليس لديك صلاحية ${isEditing ? 'تعديل' : 'إنشاء'} عروض الأسعار`);

      // 3. FINANCIAL LIMIT (discount)
      const maxDiscount = items.length > 0 ? Math.max(...items.map(i => i.discount_percentage || 0)) : 0;
      if (maxDiscount > 0) {
        const ok = await verifyFinancialLimit('discount', maxDiscount);
        if (!ok) throw new Error(`نسبة الخصم (${maxDiscount}%) تتجاوز الحد المسموح لك`);
      }

      // 4. TRANSFORM
      const header = {
        customer_id: data.customer_id,
        quotation_number: quotation?.quotation_number || generateQuotationNumber(),
        valid_until: data.valid_until || null,
        notes: data.notes || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: grandTotal,
        status: 'draft' as const,
        created_by: user?.id || null,
      };
      const itemsPayload = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        total_price: item.total_price,
      }));

      // 5. SUBMIT
      const savedId = isEditing
        ? await legacyQuotationsRepository.updateWithItems(quotation!.id, header, itemsPayload)
        : (await legacyQuotationsRepository.create(header, itemsPayload)).id;
      setLastSavedId(savedId ?? quotation?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      form.reset(form.getValues(), { keepValues: true });
      toastHandlers.onSuccess();
    },
    onError: (error) => {
      const description = mapRepoError(error, '').message || undefined;
      if (description) toastHandlers.onError(new Error(description));
      else toastHandlers.onError(error);
    },
  });

  const { register, setValue, watch, formState: { isDirty } } = form;

  const wizard = useFormWizard({ totalSteps: 3 });

  // External state sync (line items + wizard)
  useEffect(() => {
    if (quotation) {
      setDiscountAmount(Number(quotation.discount_amount) || 0);
      setVatEnabled(Number(quotation.tax_amount) > 0);
      loadItems(quotation.id);
    } else {
      resetItems();
    }
    wizard.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation]);

  const Step1 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>العميل *</Label>
        <Select value={watch('customer_id')} onValueChange={(v) => setValue('customer_id', v)}>
          <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
          <SelectContent>{customers.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label htmlFor="valid_until">صالح حتى</Label><Input id="valid_until" type="date" {...register('valid_until')} /></div>
    </div>
  );

  const Step2 = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label>المنتجات</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button>
      </div>
      <QuotationItemsTable items={items} products={products} onAddItem={addItem} onUpdateItem={updateItem} onRemoveItem={removeItem} />
    </div>
  );

  const canPrint = Boolean(lastSavedId) && !isDirty && !isSubmitting;
  const printButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!canPrint}
      onClick={() => setPrintOpen(true)}
      title={canPrint ? 'طباعة PDF بعد الحفظ' : 'احفظ عرض السعر أولاً'}
    >
      <Printer className="h-4 w-4 ml-2" />
      طباعة PDF
    </Button>
  );

  const Step3 = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" {...register('notes')} placeholder="ملاحظات إضافية..." rows={3} /></div>
        <div className="space-y-3 bg-muted p-4 rounded-lg">
          <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="font-bold">{subtotal.toLocaleString()} ج.م</span></div>
          <div className="flex items-center justify-between gap-2">
            <span>الخصم:</span>
            <Input type="number" step="0.01" className="w-32" value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>ضريبة القيمة المضافة (14%):</span>
            <label className="inline-flex items-center cursor-pointer gap-2">
              <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">{vatEnabled ? `مفعّل (${taxAmount.toLocaleString()} ج.م)` : 'معطّل'}</span>
            </label>
          </div>
          <div className="flex justify-between text-lg border-t pt-3"><span className="font-bold">الإجمالي:</span><span className="font-bold text-primary">{grandTotal.toLocaleString()} ج.م</span></div>
        </div>
      </div>
      <div className="hidden lg:block">
        <LivePreviewPanel profile={pdfProfile} height={420} />
      </div>
      <div className="flex justify-start">{printButton}</div>
    </div>
  );

  const wizardSteps = [
    { title: 'بيانات العميل', content: Step1 },
    { title: 'المنتجات', content: Step2 },
    { title: 'المجاميع', content: Step3 },
  ];

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل عرض السعر' : 'عرض سعر جديد'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          {Step1}{Step2}{Step3}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إنشاء'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm open={open} onOpenChange={onOpenChange} title={isEditing ? 'تعديل عرض السعر' : 'عرض سعر جديد'}
      steps={wizardSteps} activeStep={wizard.currentStep} onNext={wizard.nextStep} onPrev={wizard.prevStep}
      onSubmit={submit} progress={wizard.progress} isSubmitting={isSubmitting} submitLabel={isEditing ? 'تحديث' : 'إنشاء'} />
  );

  return (
    <>
      <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />
      {lastSavedId && (
        <QuotationPrintView
          quotationId={lastSavedId}
          open={printOpen}
          onOpenChange={setPrintOpen}
        />
      )}
    </>
  );
};

export default QuotationFormDialog;
