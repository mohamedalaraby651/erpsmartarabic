import { useState } from "react";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle, ResponsiveDialogFooter as DialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { referenceRepository } from "@/application/queries/reference";
import { z } from "zod";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useDocumentFormExperience } from "@/hooks/forms/useDocumentFormExperience";
import { DraftRestoreBanner } from "@/components/shared/forms/DraftRestoreBanner";
import { UnsavedChangesDialog } from "@/components/shared/forms/UnsavedChangesDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import { Loader2 } from "lucide-react";
import LogisticsItemsTable, { ItemRow } from "./LogisticsItemsTable";

interface BaseProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (draft: any) => Promise<void>;
  loading?: boolean;
}

function useSuppliers() {
  return useQuery({
    queryKey: ["lg-suppliers"],
    queryFn: () => referenceRepository.listSuppliersForSelect(),
  });
}
function useCustomers() {
  return useQuery({
    queryKey: ["lg-customers"],
    queryFn: () => referenceRepository.listCustomersForSelect(),
  });
}
function useWarehouses() {
  return useQuery({
    queryKey: ["lg-warehouses"],
    queryFn: () => referenceRepository.listActiveWarehouses(),
  });
}
function usePOs() {
  return useQuery({
    queryKey: ["lg-pos"],
    queryFn: () => referenceRepository.listRecentPurchaseOrders(),
  });
}

export function GoodsReceiptDialog({ open, onOpenChange, onSubmit, loading }: BaseProps) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: pos = [] } = usePOs();
  const feedback = useMutationToast({ silentSuccess: true });
  const { form, isSubmitting, submit, reset: resetHeader } = useFormDialog({
    schema: z.object({ supplier_id: z.string().min(1, "هذا الحقل مطلوب"), warehouse_id: z.string().min(1, "هذا الحقل مطلوب"), purchase_order_id: z.string(), received_date: z.string(), notes: z.string() }), entity: null,
    toValues: () => ({ supplier_id: '', warehouse_id: '', purchase_order_id: '', received_date: new Date().toISOString().slice(0, 10), notes: '' }), toPayload: values => values,
    mutationFn: async () => { await handleSubmit(); },
    onError: feedback.onError,
  });
  const supplier_id = form.watch("supplier_id");
  const setSup = (value: string) => form.setValue("supplier_id", value, { shouldDirty: true, shouldValidate: true });
  const warehouse_id = form.watch("warehouse_id");
  const setWh = (value: string) => form.setValue("warehouse_id", value, { shouldDirty: true, shouldValidate: true });
  const purchase_order_id = form.watch("purchase_order_id");
  const setPo = (value: string) => form.setValue("purchase_order_id", value, { shouldDirty: true, shouldValidate: true });
  const received_date = form.watch("received_date");
  const setDate = (value: string) => form.setValue("received_date", value, { shouldDirty: true, shouldValidate: true });
  const notes = form.watch("notes");
  const setNotes = (value: string) => form.setValue("notes", value, { shouldDirty: true, shouldValidate: true });
  const [items, setItems] = useState<ItemRow[]>([]);

  const reset = () => { resetHeader(); setItems([]); };
  const experience = useDocumentFormExperience({
    form, lines: items, restoreLines: setItems, documentKey: "goods_receipt_new",
    open, busy: !!loading || isSubmitting, submit,
    close: () => { reset(); onOpenChange(false); }, linesDirty: items.length > 0,
  });
  const busy = !!loading || isSubmitting;


  const handleSubmit = async () => {
    if (!supplier_id || !warehouse_id || items.length === 0) return;
    await onSubmit({
      supplier_id, warehouse_id,
      purchase_order_id: purchase_order_id || null,
      received_date, notes: notes || null,
      items: items.filter(i => i.product_id && Number(i.received_qty) > 0),
    });
    experience.clearDraft();
    reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={experience.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إيصال استلام جديد</DialogTitle></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); void experience.save(); }} className="space-y-4">
          {experience.hasDraft && <DraftRestoreBanner onRestore={experience.restore} onDiscard={experience.clearDraft} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>المورد *</Label>
              <Select value={supplier_id} onValueChange={setSup}>
                <SelectTrigger aria-label="المورد" aria-invalid={!!form.formState.errors.supplier_id}><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.supplier_id && <p role="alert" className="text-sm text-destructive">{form.formState.errors.supplier_id?.message}</p>}
            </div>
            <div>
              <Label>المستودع *</Label>
              <Select value={warehouse_id} onValueChange={setWh}>
                <SelectTrigger aria-label="المستودع" aria-invalid={!!form.formState.errors.warehouse_id}><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.warehouse_id && <p role="alert" className="text-sm text-destructive">{form.formState.errors.warehouse_id?.message}</p>}
            </div>
            <div>
              <Label>أمر الشراء (اختياري)</Label>
              <Select value={purchase_order_id} onValueChange={setPo}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{pos.map(p => <SelectItem key={p.id} value={p.id}>{p.order_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الاستلام</Label>
              <Input type="date" value={received_date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <LogisticsItemsTable
            value={items}
            onChange={setItems}
            columns={[
              { key: "ordered_qty", label: "كمية مطلوبة", type: "number", step: "0.01", default: 0 },
              { key: "received_qty", label: "كمية مستلمة *", type: "number", step: "0.01", default: 0, min: 0 },
              { key: "unit_cost", label: "تكلفة الوحدة", type: "number", step: "0.01", default: 0 },
            ]}
          />
          <div>
            <Label>ملاحظات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </form>
        <DialogFooter className="bg-background border-t min-h-16 mt-4">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={experience.requestClose}>إلغاء</Button>
          <Button className="min-h-11" onClick={() => void experience.save()} disabled={busy || !supplier_id || !warehouse_id || items.length === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "جارٍ الحفظ…" : "حفظ كمسودة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog open={experience.confirmOpen} onOpenChange={experience.setConfirmOpen} onConfirm={experience.confirmLeave} />
    </>
  );
}

export function DeliveryNoteDialog({ open, onOpenChange, onSubmit, loading }: BaseProps) {
  const { data: customers = [] } = useCustomers();
  const { data: warehouses = [] } = useWarehouses();
  const feedback = useMutationToast({ silentSuccess: true });
  const { form, isSubmitting, submit, reset: resetHeader } = useFormDialog({
    schema: z.object({ customer_id: z.string().min(1, "هذا الحقل مطلوب"), warehouse_id: z.string().min(1, "هذا الحقل مطلوب"), delivery_date: z.string(), notes: z.string() }), entity: null,
    toValues: () => ({ customer_id: '', warehouse_id: '', delivery_date: new Date().toISOString().slice(0, 10), notes: '' }), toPayload: values => values,
    mutationFn: async () => { await handleSubmit(); },
    onError: feedback.onError,
  });
  const customer_id = form.watch("customer_id");
  const setCust = (value: string) => form.setValue("customer_id", value, { shouldDirty: true, shouldValidate: true });
  const warehouse_id = form.watch("warehouse_id");
  const setWh = (value: string) => form.setValue("warehouse_id", value, { shouldDirty: true, shouldValidate: true });
  const delivery_date = form.watch("delivery_date");
  const setDate = (value: string) => form.setValue("delivery_date", value, { shouldDirty: true, shouldValidate: true });
  const notes = form.watch("notes");
  const setNotes = (value: string) => form.setValue("notes", value, { shouldDirty: true, shouldValidate: true });
  const [items, setItems] = useState<ItemRow[]>([]);

  const reset = () => { resetHeader(); setItems([]); };
  const experience = useDocumentFormExperience({
    form, lines: items, restoreLines: setItems, documentKey: "delivery_note_new",
    open, busy: !!loading || isSubmitting, submit,
    close: () => { reset(); onOpenChange(false); }, linesDirty: items.length > 0,
  });
  const busy = !!loading || isSubmitting;


  const handleSubmit = async () => {
    if (!customer_id || !warehouse_id || items.length === 0) return;
    await onSubmit({
      customer_id, warehouse_id, delivery_date,
      notes: notes || null,
      items: items.filter(i => i.product_id && Number(i.delivered_qty) > 0),
    });
    experience.clearDraft();
    reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={experience.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إذن تسليم جديد</DialogTitle></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); void experience.save(); }} className="space-y-4">
          {experience.hasDraft && <DraftRestoreBanner onRestore={experience.restore} onDiscard={experience.clearDraft} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>العميل *</Label>
              <Select value={customer_id} onValueChange={setCust}>
                <SelectTrigger aria-label="العميل" aria-invalid={!!form.formState.errors.customer_id}><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.customer_id && <p role="alert" className="text-sm text-destructive">{form.formState.errors.customer_id?.message}</p>}
            </div>
            <div>
              <Label>المستودع *</Label>
              <Select value={warehouse_id} onValueChange={setWh}>
                <SelectTrigger aria-label="المستودع" aria-invalid={!!form.formState.errors.warehouse_id}><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.warehouse_id && <p role="alert" className="text-sm text-destructive">{form.formState.errors.warehouse_id?.message}</p>}
            </div>
            <div>
              <Label>تاريخ التسليم</Label>
              <Input type="date" value={delivery_date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <LogisticsItemsTable
            value={items}
            onChange={setItems}
            columns={[
              { key: "ordered_qty", label: "كمية مطلوبة", type: "number", step: "0.01", default: 0 },
              { key: "delivered_qty", label: "كمية مسلّمة *", type: "number", step: "0.01", default: 0, min: 0 },
            ]}
          />
          <div>
            <Label>ملاحظات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </form>
        <DialogFooter className="bg-background border-t min-h-16 mt-4">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={experience.requestClose}>إلغاء</Button>
          <Button className="min-h-11" onClick={() => void experience.save()} disabled={busy || !customer_id || !warehouse_id || items.length === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "جارٍ الحفظ…" : "حفظ كمسودة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog open={experience.confirmOpen} onOpenChange={experience.setConfirmOpen} onConfirm={experience.confirmLeave} />
    </>
  );
}

export function PurchaseInvoiceDialog({ open, onOpenChange, onSubmit, loading }: BaseProps) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: pos = [] } = usePOs();
  const feedback = useMutationToast({ silentSuccess: true });
  const { form, isSubmitting, submit, reset: resetHeader } = useFormDialog({
    schema: z.object({ supplier_id: z.string().min(1, "هذا الحقل مطلوب"), purchase_order_id: z.string(), invoice_date: z.string(), due_date: z.string(), tax_amount: z.number(), discount_amount: z.number(), notes: z.string() }), entity: null,
    toValues: () => ({ supplier_id: '', purchase_order_id: '', invoice_date: new Date().toISOString().slice(0, 10), due_date: '', tax_amount: 0, discount_amount: 0, notes: '' }), toPayload: values => values,
    mutationFn: async () => { await handleSubmit(); },
    onError: feedback.onError,
  });
  const supplier_id = form.watch("supplier_id");
  const setSup = (value: string) => form.setValue("supplier_id", value, { shouldDirty: true, shouldValidate: true });
  const purchase_order_id = form.watch("purchase_order_id");
  const setPo = (value: string) => form.setValue("purchase_order_id", value, { shouldDirty: true, shouldValidate: true });
  const invoice_date = form.watch("invoice_date");
  const setIDate = (value: string) => form.setValue("invoice_date", value, { shouldDirty: true, shouldValidate: true });
  const due_date = form.watch("due_date");
  const setDue = (value: string) => form.setValue("due_date", value, { shouldDirty: true, shouldValidate: true });
  const tax_amount = form.watch("tax_amount");
  const setTax = (value: number) => form.setValue("tax_amount", value, { shouldDirty: true, shouldValidate: true });
  const discount_amount = form.watch("discount_amount");
  const setDisc = (value: number) => form.setValue("discount_amount", value, { shouldDirty: true, shouldValidate: true });
  const notes = form.watch("notes");
  const setNotes = (value: string) => form.setValue("notes", value, { shouldDirty: true, shouldValidate: true });
  const [items, setItems] = useState<ItemRow[]>([]);

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const total = Math.round((subtotal + Number(tax_amount || 0) - Number(discount_amount || 0)) * 100) / 100;

  const reset = () => { resetHeader(); setItems([]); };
  const experience = useDocumentFormExperience({
    form, lines: items, restoreLines: setItems, documentKey: "purchase_invoice_new",
    open, busy: !!loading || isSubmitting, submit,
    close: () => { reset(); onOpenChange(false); }, linesDirty: items.length > 0,
  });
  const busy = !!loading || isSubmitting;


  const handleSubmit = async () => {
    if (!supplier_id || items.length === 0) return;
    await onSubmit({
      supplier_id,
      purchase_order_id: purchase_order_id || null,
      invoice_date, due_date: due_date || null,
      tax_amount: Number(tax_amount) || 0,
      discount_amount: Number(discount_amount) || 0,
      notes: notes || null,
      items: items.filter(i => i.product_id && Number(i.quantity) > 0),
    });
    experience.clearDraft();
    reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={experience.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>فاتورة مشتريات جديدة</DialogTitle></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); void experience.save(); }} className="space-y-4">
          {experience.hasDraft && <DraftRestoreBanner onRestore={experience.restore} onDiscard={experience.clearDraft} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>المورد *</Label>
              <Select value={supplier_id} onValueChange={setSup}>
                <SelectTrigger aria-label="المورد" aria-invalid={!!form.formState.errors.supplier_id}><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.supplier_id && <p role="alert" className="text-sm text-destructive">{form.formState.errors.supplier_id?.message}</p>}
            </div>
            <div>
              <Label>أمر الشراء (للمطابقة الثلاثية)</Label>
              <Select value={purchase_order_id} onValueChange={setPo}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{pos.map(p => <SelectItem key={p.id} value={p.id}>{p.order_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الفاتورة</Label>
              <Input type="date" value={invoice_date} onChange={(e) => setIDate(e.target.value)} />
            </div>
            <div>
              <Label>تاريخ الاستحقاق</Label>
              <Input type="date" value={due_date} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <LogisticsItemsTable
            value={items}
            onChange={setItems}
            columns={[
              { key: "quantity", label: "الكمية *", type: "number", step: "0.01", default: 1, min: 0 },
              { key: "unit_price", label: "سعر الوحدة *", type: "number", step: "0.01", default: 0 },
            ]}
          />
          <div className="grid grid-cols-3 gap-3">
            <div><Label>الضريبة</Label><Input type="number" step="0.01" value={tax_amount} onChange={(e) => setTax(Number(e.target.value || 0))} /></div>
            <div><Label>الخصم</Label><Input type="number" step="0.01" value={discount_amount} onChange={(e) => setDisc(Number(e.target.value || 0))} /></div>
            <div className="text-end self-end font-semibold">الإجمالي: {total.toLocaleString()}</div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </form>
        <DialogFooter className="bg-background border-t min-h-16 mt-4">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={experience.requestClose}>إلغاء</Button>
          <Button className="min-h-11" onClick={() => void experience.save()} disabled={busy || !supplier_id || items.length === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "جارٍ الحفظ…" : "حفظ كمسودة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog open={experience.confirmOpen} onOpenChange={experience.setConfirmOpen} onConfirm={experience.confirmLeave} />
    </>
  );
}
