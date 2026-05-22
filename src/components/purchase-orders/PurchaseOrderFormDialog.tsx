import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { AdaptiveContainer } from "@/components/mobile/AdaptiveContainer";
import { FullScreenForm } from "@/components/mobile/FullScreenForm";
import { useFormWizard } from "@/hooks/useFormWizard";
import { listActiveSuppliersForSelect } from "@/lib/repositories/supplierRepository";
import { listActiveProductsForSelect } from "@/lib/repositories/productRepository";
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
interface FormData {
  supplier_id: string;
  expected_date: string;
  notes: string;
  tax_amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const PurchaseOrderFormDialog = ({ open, onOpenChange, order, prefillSupplierId }: PurchaseOrderFormDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!order;
  const [items, setItems] = useState<OrderItem[]>([]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "active-select"],
    queryFn: () => listActiveSuppliersForSelect(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "active-select"],
    queryFn: () => listActiveProductsForSelect(),
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: { supplier_id: prefillSupplierId || "", expected_date: "", notes: "", tax_amount: 0 },
  });
  const wizard = useFormWizard({ totalSteps: 3 });

  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (order) {
      reset({
        supplier_id: order.supplier_id,
        expected_date: order.expected_date || "",
        notes: order.notes || "",
        tax_amount: Number(order.tax_amount) || 0,
      });
      loadOrderItems(order.id);
    } else {
      reset({ supplier_id: prefillSupplierId || "", expected_date: "", notes: "", tax_amount: 0 });
      setItems([]);
    }
    wizard.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, reset]);

  const loadOrderItems = async (orderId: string) => {
    // Lazy import to avoid pulling repository into critical path
    const { purchaseOrderRepository } = await import("@/lib/repositories/purchaseOrderRepository");
    const rows = await purchaseOrderRepository.listItems(orderId);
    setItems(
      rows.map((i) => ({
        product_id: i.product_id,
        product_name: i.products?.name || "",
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price),
      })),
    );
  };

  const addItem = () =>
    setItems([...items, { product_id: "", product_name: "", quantity: 1, unit_price: 0, total_price: 0 }]);

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
  const taxAmount = Number(watch("tax_amount")) || 0;
  const total = round2(subtotal + taxAmount);

  const generateOrderNumber = () => {
    const d = new Date();
    return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
  };

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) {
      toast({ title: "يجب إضافة منتج واحد على الأقل", variant: "destructive" });
      return;
    }
    const action = isEditing ? "edit" : "create";
    const ok = await verifyPermissionOnServer("purchase_orders", action);
    if (!ok) {
      toast({ title: "غير مصرح", variant: "destructive" });
      return;
    }
    const header = {
      supplier_id: data.supplier_id,
      order_number: order?.order_number || generateOrderNumber(),
      expected_date: data.expected_date || null,
      notes: data.notes || null,
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
    try {
      if (isEditing && order) {
        await updateMut.mutateAsync({ id: order.id, header, items: itemsPayload });
      } else {
        await createMut.mutateAsync({ header, items: itemsPayload });
      }
      onOpenChange(false);
    } catch (err) {
      logErrorSafely("PurchaseOrderFormDialog", err);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(err), variant: "destructive" });
    }
  };

  const ItemsTable = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label>المنتجات</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 ml-2" />إضافة منتج
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
                    <Select value={item.product_id} onValueChange={(v) => updateItem(index, "product_id", v)}>
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
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">{item.total_price.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
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
        <Select value={watch("supplier_id")} onValueChange={(v) => setValue("supplier_id", v)}>
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
      </div>
      <div>
        <Label htmlFor="expected_date">تاريخ التوريد المتوقع</Label>
        <Input id="expected_date" type="date" {...register("expected_date")} />
      </div>
    </div>
  );

  const Step3 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea id="notes" {...register("notes")} placeholder="ملاحظات إضافية..." rows={3} />
      </div>
      <div className="space-y-3 bg-muted p-4 rounded-lg">
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span className="font-bold">{subtotal.toLocaleString()} ج.م</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>الضريبة:</span>
          <Input type="number" step="0.01" className="w-32" {...register("tax_amount", { valueAsNumber: true })} />
        </div>
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
          <DialogTitle>{isEditing ? "تعديل أمر الشراء" : "أمر شراء جديد"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {Step1}
          {ItemsTable}
          {Step3}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : isEditing ? "تحديث" : "إنشاء"}
            </Button>
          </div>
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
      onSubmit={handleSubmit(onSubmit)}
      progress={wizard.progress}
      isSubmitting={isPending}
      submitLabel={isEditing ? "تحديث" : "إنشاء"}
    />
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
};

export default PurchaseOrderFormDialog;
