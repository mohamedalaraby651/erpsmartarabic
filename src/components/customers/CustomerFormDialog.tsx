import { useEffect, useState, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { customerSchema, type CustomerFormData } from "@/lib/validations";
import { verifyPermissionOnServer, verifyFinancialLimit } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";
import { User, Phone, MapPin, Wallet, AlertTriangle } from "lucide-react";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useDuplicateCheck } from "@/hooks/customers/useDuplicateCheck";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Path } from "react-hook-form";

// Sub-components
import CustomerFormBasicInfo from "./form/CustomerFormBasicInfo";
import CustomerFormContact from "./form/CustomerFormContact";
import CustomerFormLocation from "./form/CustomerFormLocation";
import CustomerFormFinancial from "./form/CustomerFormFinancial";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerCategory = Database['public']['Tables']['customer_categories']['Row'];

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pt-4 pb-2">
    <Icon className="h-4 w-4 text-primary" />
    <h3 className="text-sm font-semibold text-primary">{title}</h3>
    <Separator className="flex-1" />
  </div>
);

const WIZARD_STEP_FIELDS: Record<number, Path<CustomerFormData>[]> = {
  0: ['name', 'customer_type', 'vip_level'],
  1: ['phone', 'email'],
  2: ['governorate', 'city'],
  3: ['credit_limit', 'discount_percentage'],
};

const defaultValues: CustomerFormData = {
  name: '', customer_type: 'individual', vip_level: 'regular',
  phone: '', phone2: '', email: '', tax_number: '', credit_limit: 0,
  category_id: '', notes: '', is_active: true,
  governorate: '', city: '', discount_percentage: 0,
  contact_person: '', contact_person_role: '',
  payment_terms_days: 0, preferred_payment_method: '',
  facebook_url: '', website_url: '',
};

const CustomerFormDialog = ({ open, onOpenChange, customer }: CustomerFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!customer;

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_categories').select('*').order('name');
      if (error) throw error;
      return data as CustomerCategory[];
    },
  });

  const methods = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  const { reset, handleSubmit, watch, trigger, formState: { isDirty } } = methods;

  const [unsavedWarningOpen, setUnsavedWarningOpen] = useState(false);
  const pendingCloseRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setUnsavedWarningOpen(true);
      pendingCloseRef.current = true;
      return;
    }
    onOpenChange(nextOpen);
  };

  const confirmDiscard = () => {
    setUnsavedWarningOpen(false);
    pendingCloseRef.current = false;
    reset(defaultValues);
    onOpenChange(false);
  };

  const customerType = watch('customer_type');

  const wizard = useFormWizard<CustomerFormData>({
    totalSteps: 4,
    stepFields: WIZARD_STEP_FIELDS,
    trigger,
  });

  const formData = watch();
  const { hasDraft, restoreDraft, clearDraft } = useFormDraft({
    key: `customer_${customer?.id || 'new'}`,
    data: formData,
    enabled: !isEditing,
  });

  useEffect(() => {
    if (hasDraft && !isEditing && open) {
      const draft = restoreDraft();
      if (draft) {
        toast({ title: 'تم استعادة المسودة', description: 'تم استرجاع بيانات العميل المحفوظة' });
        reset(draft);
      }
    }
  }, [hasDraft, isEditing, open]);

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        customer_type: customer.customer_type,
        vip_level: customer.vip_level,
        phone: customer.phone || '', phone2: customer.phone2 || '',
        email: customer.email || '', tax_number: customer.tax_number || '',
        credit_limit: Number(customer.credit_limit) || 0,
        category_id: customer.category_id || '', notes: customer.notes || '',
        is_active: customer.is_active ?? true,
        governorate: customer.governorate || '', city: customer.city || '',
        discount_percentage: Number(customer.discount_percentage) || 0,
        contact_person: customer.contact_person || '',
        contact_person_role: customer.contact_person_role || '',
        payment_terms_days: Number(customer.payment_terms_days) || 0,
        preferred_payment_method: customer.preferred_payment_method || '',
        facebook_url: customer.facebook_url || '', website_url: customer.website_url || '',
      });
    } else {
      reset(defaultValues);
    }
    wizard.reset();
  }, [customer, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const sanitize = (val: string | undefined | null) =>
        val?.trim().replace(/[\u200E\u200F\u061C\u200B\u200C\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '') || null;

      const payload: Database['public']['Tables']['customers']['Insert'] = {
        name: sanitize(data.name) || data.name.trim(),
        customer_type: data.customer_type, vip_level: data.vip_level,
        phone: sanitize(data.phone), phone2: sanitize(data.phone2),
        email: data.email?.trim().toLowerCase() || null,
        tax_number: sanitize(data.tax_number), credit_limit: data.credit_limit,
        category_id: data.category_id || null, notes: sanitize(data.notes),
        is_active: data.is_active, governorate: sanitize(data.governorate),
        city: sanitize(data.city), discount_percentage: data.discount_percentage || 0,
        contact_person: sanitize(data.contact_person),
        contact_person_role: sanitize(data.contact_person_role),
        payment_terms_days: data.payment_terms_days || 0,
        preferred_payment_method: data.preferred_payment_method || null,
        facebook_url: sanitize(data.facebook_url), website_url: sanitize(data.website_url),
      };

      if (isEditing) {
        const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer?.id] });
      clearDraft();
      toast({ title: isEditing ? "تم تحديث العميل بنجاح" : "تم إضافة العميل بنجاح" });
      onOpenChange(false);
    },
    onError: (error) => {
      logErrorSafely('CustomerFormDialog', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    const action = isEditing ? 'edit' : 'create';
    const hasPermission = await verifyPermissionOnServer('customers', action);
    if (!hasPermission) {
      toast({ title: "غير مصرح", description: `ليس لديك صلاحية ${isEditing ? 'تعديل' : 'إضافة'} العملاء`, variant: "destructive" });
      return;
    }
    if (data.credit_limit && data.credit_limit > 0) {
      const creditAllowed = await verifyFinancialLimit('credit', data.credit_limit);
      if (!creditAllowed) {
        toast({ title: "تجاوز الحد المسموح", description: `الحد الائتماني (${data.credit_limit.toLocaleString()} ج.م) يتجاوز الحد المسموح لك`, variant: "destructive" });
        return;
      }
    }
    mutation.mutate(data);
  };

  // Wizard steps for mobile
  const wizardSteps = [
    { title: 'المعلومات الأساسية', content: (
      <><SectionHeader icon={User} title="المعلومات الأساسية" /><CustomerFormBasicInfo categories={categories} /></>
    )},
    { title: 'معلومات الاتصال', content: (
      <><SectionHeader icon={Phone} title="معلومات الاتصال" /><CustomerFormContact showCompanyFields={customerType === 'company'} /></>
    )},
    { title: 'الموقع الجغرافي', content: (
      <><SectionHeader icon={MapPin} title="الموقع الجغرافي" /><CustomerFormLocation /></>
    )},
    { title: 'المالي والملاحظات', content: (
      <><SectionHeader icon={Wallet} title="المعلومات المالية" /><CustomerFormFinancial /></>
    )},
  ];

  const unsavedDialog = (
    <AlertDialog open={unsavedWarningOpen} onOpenChange={setUnsavedWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>بيانات غير محفوظة</AlertDialogTitle>
          <AlertDialogDescription>لديك تغييرات لم يتم حفظها. هل تريد تجاهلها؟</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>متابعة التعديل</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تجاهل التغييرات</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const desktopForm = (
    <FormProvider {...methods}>
      {unsavedDialog}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => { if (isDirty) { e.preventDefault(); setUnsavedWarningOpen(true); } }}
          onEscapeKeyDown={(e) => { if (isDirty) { e.preventDefault(); setUnsavedWarningOpen(true); } }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <SectionHeader icon={User} title="المعلومات الأساسية" />
            <CustomerFormBasicInfo categories={categories} />
            {customerType === 'company' && (
              <CustomerFormContact showCompanyFields idPrefix="desktop" />
            )}
            <SectionHeader icon={Phone} title="معلومات الاتصال" />
            <CustomerFormContact idPrefix="desktop_contact" />
            <SectionHeader icon={MapPin} title="الموقع الجغرافي" />
            <CustomerFormLocation />
            <SectionHeader icon={Wallet} title="المعلومات المالية" />
            <CustomerFormFinancial />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>إلغاء</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );

  const mobileForm = (
    <FormProvider {...methods}>
      {unsavedDialog}
      <FullScreenForm
        open={open}
        onOpenChange={handleOpenChange}
        title={isEditing ? 'تعديل العميل' : 'إضافة عميل جديد'}
        steps={wizardSteps}
        activeStep={wizard.currentStep}
        onNext={wizard.nextStep}
        onPrev={wizard.prevStep}
        onSubmit={handleSubmit(onSubmit)}
        progress={wizard.progress}
        isSubmitting={mutation.isPending}
        submitLabel={isEditing ? 'تحديث' : 'إضافة'}
      />
    </FormProvider>
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
};

export default CustomerFormDialog;
