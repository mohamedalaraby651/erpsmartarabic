/**
 * PurchaseOrderFormDialog — Phase 1B Tier 2 (Batch 2).
 *
 * Migrated to the `useFormDialog` contract:
 *  - Hook owns header state + lifecycle (zod schema).
 *  - Line items remain in external `useState` (per Batch 2 rule: hook never owns nested arrays).
 *  - `mutationFn` is the single submit pipeline: pre-mutate guards
 *    (permission + items presence) → header/payload build → repository write.
 *  - Toasts + cache invalidation handled by `useCreatePurchaseOrder` /
 *    `useUpdatePurchaseOrder` hooks (no manual toast in submit).
 *  - Component layer only closes the dialog in `onSuccess`.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import { useFormDialog } from "@/hooks/useFormDialog";
import FormDialogFooter from "@/components/shared/FormDialogFooter";
import FormFieldError from "@/components/shared/FormFieldError";
import { listActiveSuppliersForSelect } from "@/application/queries/suppliers";
import { listActiveProductsForSelect } from "@/application/queries/products";
import { purchaseOrderRepository } from "@/lib/repositories/purchaseOrderRepository";
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/hooks/usePurchaseOrders";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrder | null;
  prefillSupplierId?: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const schema = z.object({
  supplier_id: z.string().min(1, "المورد مطلوب"),
  expected_date: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  tax_amount: z.coerce.number().min(0, "الضريبة لا يمكن أن تكون سالبة").default(0),
});

type FormValues = z.infer<typeof schema>;

const round2 = (n: number) => Math.round(n * 100) / 100;

const generateOrderNumber = () => {
  const d = new Date();
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(
    Math.random() * 1000,
  )
    .toString()
    .padStart(3, "0")}`;
};

const PurchaseOrderFormDialog = ({
  open,
  onOpenChange,
  order,
  prefillSupplierId,
}: PurchaseOrderFormDialogProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "active-select"],
    queryFn: () => listActiveSuppliersForSelect(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "active-select"],
    queryFn: () => listActiveProductsForSelect(),
  });

  const wizard = useFormWizard({ totalSteps: 3 });
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();

  const { form, isEditing, isSubmitting, submit } = useFormDialog<
    FormValues,
    PurchaseOrder,
    FormValues
  >({
    schema,
    entity: order ?? null,
    toValues: (e) =>
      e
        ? {
            supplier_id: e.supplier_id,
            expected_date: e.expected_date || "",
            notes: e.notes || "",
            tax_amount: Number(e.tax_amount) || 0,
          }
        : {
            supplier_id: prefillSupplierId || "",
            expected_date: "",
            notes: "",
            tax_amount: 0,
          },
    toPayload: (v) => v,
    mutationFn: async (values, { isEditing }) => {
      // Pre-MUTATE guards (no branching in component layer).
      if (items.length === 0) {
        throw new Error("يجب إضافة منتج واحد على الأقل");
      }
      const ok = await verifyPermissionOnServer(
        "purchase_orders",
        isEditing ? "edit" : "create",
      );
      if (!ok) throw new Error("غير مصرح بهذه العملية");

      const subtotal = round2(items.reduce((s, i) => s + i.total_price, 0));
      const taxAmount = Number(values.tax_amount) || 0;
      const total = round2(subtotal + taxAmount);

      const header = {
        supplier_id: values.supplier_id,
        order_number: order?.order_number || generateOrderNumber(),
        expected_date: values.expected_date || null,
        notes: values.notes || null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        status: "pending" as const,
        created_by: user?.id || null,
      };
      const itemsPayload = items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }));

      if (isEditing && order) {
        await updateMut.mutateAsync({ id: order.id, header, items: itemsPayload });
      } else {
        await createMut.mutateAsync({ header, items: itemsPayload });
      }
    },
    // Toasts + cache invalidations are handled inside the create/update hooks.
    onSuccess: () => onOpenChange(false),
  });

  // Sync line items when entity changes (external state — outside the hook contract).
  useEffect(() => {
    let cancelled = false;
    if (order) {
      purchaseOrderRepository
        .listItems(order.id)
        .then((rows) => {
          if (cancelled) return;
          setItems(
            rows.map((i) => ({
              product_id: i.product_id,
              product_name: i.products?.name || "",
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              total_price: Number(i.total_price),
            })),
          );
        })
        .catch(() => {
          /* swallow — items remain empty */
        });
    } else {
      setItems([]);
    }
    wizard.reset();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const addItem = () =>
    setItems([
      ...items,
      { product_id: "", product_name: "", quantity: 1, unit_price: 0, total_price: 0 },
    ]);

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const n = [...items];
    n[index] = { ...n[index], [field]: value };
    if (field === "product_id") {
      const p = products.find((p) => p.id === value);
      if (p) {
        n[index].product_name = p.name;
        n[index].unit_price = Number(p.cost_price);
      }
    }
    n[index].total_price = round2(n[index].quantity * n[index].unit_price);
    setItems(n);
  };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subtotal = round2(items.reduce((s, i) => s + i.total_price, 0));
  const taxAmount = Number(form.watch("tax_amount")) || 0;
  const total = round2(subtotal + taxAmount);

  const ItemsTable = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label>المنتجات</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المنتج</TableHead>
              <TableHead className="w-24">الكمية</TableHead>
              <TableHead className="w-32">سعر الشراء</TableHead>
              <TableHead className="w-32">الإجمالي</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  لا توجد منتجات
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={item.product_id}
                      onValueChange={(v) => updateItem(index, "product_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value) || 1)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">{item.total_price.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const Step1 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>المورد *</Label>
        <Select
          value={form.watch("supplier_id")}
          onValueChange={(v) =>
            form.setValue("supplier_id", v, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر المورد" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormFieldError error={form.formState.errors.supplier_id} />
      </div>
      <div>
        <Label htmlFor="expected_date">تاريخ التوريد المتوقع</Label>
        <Input id="expected_date" type="date" {...form.register("expected_date")} />
      </div>
    </div>
  );

  const Step3 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
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
          <span>الضريبة:</span>
          <Input
            type="number"
            step="0.01"
            className="w-32"
            {...form.register("tax_amount", { valueAsNumber: true })}
          />
        </div>
        <FormFieldError error={form.formState.errors.tax_amount} />
        <div className="flex justify-between text-lg border-t pt-3">
          <span className="font-bold">الإجمالي:</span>
          <span className="font-bold text-primary">{total.toLocaleString()} ج.م</span>
        </div>
      </div>
    </div>
  );

  const wizardSteps = [
    { title: "بيانات المورد", content: Step1 },
    { title: "المنتجات", content: ItemsTable },
    { title: "المجاميع", content: Step3 },
  ];

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "تعديل أمر الشراء" : "أمر شراء جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          {Step1}
          {ItemsTable}
          {Step3}
          <FormDialogFooter
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel={isEditing ? "تحديث" : "إنشاء"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );

  const mobileForm = (
    <FullScreenForm
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "تعديل أمر الشراء" : "أمر شراء جديد"}
      steps={wizardSteps}
      activeStep={wizard.currentStep}
      onNext={wizard.nextStep}
      onPrev={wizard.prevStep}
      onSubmit={submit}
      progress={wizard.progress}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "تحديث" : "إنشاء"}
    />
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
};

export default PurchaseOrderFormDialog;
