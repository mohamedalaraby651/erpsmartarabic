/**
 * SalesOrderFormDialog — Phase 1B Tier 2 (Batch 2).
 *
 * Migrated to the `useFormDialog` contract:
 *  - Hook owns header state + lifecycle (zod schema).
 *  - Line items remain in external `useState` (per Batch 2 rule: hook never owns nested arrays).
 *  - `mutationFn` is the single submit pipeline: pre-MUTATE guards
 *    (permission + financial-limit + items) → header/payload build → repository write.
 *  - Toasts via `useMutationToast`. Cache invalidation handled in `onSuccess`.
 *  - Component layer only closes the dialog.
 */
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  verifyPermissionOnServer,
  verifyFinancialLimit,
} from "@/lib/api/secureOperations";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormDialogFooter from "@/components/shared/FormDialogFooter";
import FormFieldError from "@/components/shared/FormFieldError";
import { customerRepository } from "@/application/queries/customers";
import { listActiveProductsForSelect } from "@/application/queries/products";
import { salesOrderRepository } from "@/application/queries/sales-orders";
import type { Database } from "@/integrations/supabase/types";

type SalesOrder = Database["public"]["Tables"]["sales_orders"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

interface SalesOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: SalesOrder | null;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

const schema = z.object({
  customer_id: z.string().min(1, "العميل مطلوب"),
  delivery_date: z.string().optional().default(""),
  delivery_address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  discount_amount: z.coerce.number().min(0, "الخصم لا يمكن أن يكون سالبًا").default(0),
  tax_amount: z.coerce.number().min(0, "الضريبة لا يمكن أن تكون سالبة").default(0),
});

type FormValues = z.infer<typeof schema>;

const round2 = (n: number) => Math.round(n * 100) / 100;

const generateOrderNumber = () => {
  const d = new Date();
  return `SO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(
    Math.random() * 1000,
  )
    .toString()
    .padStart(3, "0")}`;
};

const SalesOrderFormDialog = ({
  open,
  onOpenChange,
  order,
}: SalesOrderFormDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "select"],
    queryFn: () => customerRepository.listForSelect(1000),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "select"],
    queryFn: () => listActiveProductsForSelect(1000),
  });

  const wizard = useFormWizard({ totalSteps: 3 });
  const toast = useMutationToast({
    successTitle: order ? "تم تحديث أمر البيع بنجاح" : "تم إنشاء أمر البيع بنجاح",
  });

  const { form, isEditing, isSubmitting, submit } = useFormDialog<
    FormValues,
    SalesOrder,
    FormValues
  >({
    schema,
    entity: order ?? null,
    toValues: (e) =>
      e
        ? {
            customer_id: e.customer_id,
            delivery_date: e.delivery_date || "",
            delivery_address: e.delivery_address || "",
            notes: e.notes || "",
            discount_amount: Number(e.discount_amount) || 0,
            tax_amount: Number(e.tax_amount) || 0,
          }
        : {
            customer_id: "",
            delivery_date: "",
            delivery_address: "",
            notes: "",
            discount_amount: 0,
            tax_amount: 0,
          },
    toPayload: (v) => v,
    mutationFn: async (values, { isEditing }) => {
      // Pre-MUTATE guards (no branching in component layer).
      if (items.length === 0) {
        throw new Error("يجب إضافة منتج واحد على الأقل");
      }
      const ok = await verifyPermissionOnServer(
        "sales_orders",
        isEditing ? "edit" : "create",
      );
      if (!ok) {
        throw new Error(
          `ليس لديك صلاحية ${isEditing ? "تعديل" : "إنشاء"} أوامر البيع`,
        );
      }
      const maxD = Math.max(0, ...items.map((i) => i.discount_percentage || 0));
      if (maxD > 0) {
        const limitOk = await verifyFinancialLimit("discount", maxD);
        if (!limitOk) throw new Error("تجاوز الحد المسموح للخصم");
      }

      const subtotal = round2(items.reduce((s, i) => s + i.total_price, 0));
      const discountAmount = Number(values.discount_amount) || 0;
      const taxAmount = Number(values.tax_amount) || 0;
      const total = round2(subtotal - discountAmount + taxAmount);

      const header = {
        customer_id: values.customer_id,
        order_number: order?.order_number || generateOrderNumber(),
        delivery_date: values.delivery_date || null,
        delivery_address: values.delivery_address || null,
        notes: values.notes || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: total,
        status: "pending" as const,
        created_by: user?.id || null,
      };
      const itemInputs = items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percentage: i.discount_percentage,
      }));

      if (isEditing && order) {
        await salesOrderRepository.update(order.id, header, itemInputs);
      } else {
        await salesOrderRepository.create(header, itemInputs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      if (order) {
        queryClient.invalidateQueries({ queryKey: ["sales-order", order.id] });
        queryClient.invalidateQueries({
          queryKey: ["sales-order-items", order.id],
        });
      }
      toast.onSuccess();
      onOpenChange(false);
    },
    onError: toast.onError,
  });

  // Sync line items when entity changes (external state — outside the hook contract).
  useEffect(() => {
    let cancelled = false;
    if (order) {
      salesOrderRepository
        .listItems(order.id)
        .then((rows) => {
          if (cancelled) return;
          setItems(
            rows.map((i) => ({
              product_id: i.product_id,
              product_name: i.products?.name || "",
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              discount_percentage: Number(i.discount_percentage) || 0,
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
      {
        product_id: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        discount_percentage: 0,
        total_price: 0,
      },
    ]);

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const n = [...items];
    n[index] = { ...n[index], [field]: value };
    if (field === "product_id") {
      const p = products.find((p: Product) => p.id === value);
      if (p) {
        n[index].product_name = p.name;
        n[index].unit_price = Number(p.selling_price);
      }
    }
    const it = n[index];
    const s = it.quantity * it.unit_price;
    it.total_price = round2(s - s * (it.discount_percentage / 100));
    setItems(n);
  };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subtotal = round2(items.reduce((s, i) => s + i.total_price, 0));
  const discountAmount = form.watch("discount_amount") || 0;
  const taxAmount = form.watch("tax_amount") || 0;
  const total = round2(subtotal - discountAmount + taxAmount);

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
              <TableHead className="w-32">السعر</TableHead>
              <TableHead className="w-24">الخصم %</TableHead>
              <TableHead className="w-32">الإجمالي</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                        {products.map((p: Product) => (
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
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount_percentage}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "discount_percentage",
                          parseFloat(e.target.value) || 0,
                        )
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>العميل *</Label>
          <Select
            value={form.watch("customer_id")}
            onValueChange={(v) =>
              form.setValue("customer_id", v, { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر العميل" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError error={form.formState.errors.customer_id} />
        </div>
        <div>
          <Label htmlFor="delivery_date">تاريخ التسليم</Label>
          <Input id="delivery_date" type="date" {...form.register("delivery_date")} />
        </div>
      </div>
      <div>
        <Label htmlFor="delivery_address">عنوان التسليم</Label>
        <Input
          id="delivery_address"
          {...form.register("delivery_address")}
          placeholder="عنوان التسليم..."
        />
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
          <span>الخصم:</span>
          <Input
            type="number"
            step="0.01"
            className="w-32"
            {...form.register("discount_amount", { valueAsNumber: true })}
          />
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
        <div className="flex justify-between text-lg border-t pt-3">
          <span className="font-bold">الإجمالي:</span>
          <span className="font-bold text-primary">{total.toLocaleString()} ج.م</span>
        </div>
      </div>
    </div>
  );

  const wizardSteps = [
    { title: "بيانات العميل", content: Step1 },
    { title: "المنتجات", content: ItemsTable },
    { title: "المجاميع", content: Step3 },
  ];

  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "تعديل أمر البيع" : "أمر بيع جديد"}</DialogTitle>
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
      title={isEditing ? "تعديل أمر البيع" : "أمر بيع جديد"}
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

export default SalesOrderFormDialog;
