import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LogisticsItemsTable, { ItemRow } from "./LogisticsItemsTable";

interface BaseProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (draft: any) => Promise<void>;
  loading?: boolean;
}

function useSuppliers() {
  return useQuery({
    queryKey: ["lg-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,name").order("name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useCustomers() {
  return useQuery({
    queryKey: ["lg-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").order("name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useWarehouses() {
  return useQuery({
    queryKey: ["lg-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
function usePOs() {
  return useQuery({
    queryKey: ["lg-pos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("id,order_number").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function GoodsReceiptDialog({ open, onOpenChange, onSubmit, loading }: BaseProps) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: pos = [] } = usePOs();
  const [supplier_id, setSup] = useState("");
  const [warehouse_id, setWh] = useState("");
  const [purchase_order_id, setPo] = useState<string>("");
  const [received_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const reset = () => {
    setSup(""); setWh(""); setPo(""); setNotes(""); setItems([]);
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = async () => {
    if (!supplier_id || !warehouse_id || items.length === 0) return;
    await onSubmit({
      supplier_id, warehouse_id,
      purchase_order_id: purchase_order_id || null,
      received_date, notes: notes || null,
      items: items.filter(i => i.product_id && Number(i.received_qty) > 0),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إيصال استلام جديد</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>المورد *</Label>
              <Select value={supplier_id} onValueChange={setSup}>
                <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>المستودع *</Label>
              <Select value={warehouse_id} onValueChange={setWh}>
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading || !supplier_id || !warehouse_id || items.length === 0}>
            {loading ? "جارٍ الحفظ…" : "حفظ كمسودة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeliveryNoteDialog({ open, onOpenChange, onSubmit, loading }: BaseProps) {
  const { data: customers = [] } = useCustomers();
  const { data: warehouses = [] } = useWarehouses();
  const [customer_id, setCust] = useState("");
  const [warehouse_id, setWh] = useState("");
  const [delivery_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const reset = () => {
    setCust(""); setWh(""); setNotes(""); setItems([]);
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = async () => {
    if (!customer_id || !warehouse_id || items.length === 0) return;
    await onSubmit({
      customer_id, warehouse_id, delivery_date,
      notes: notes || null,
      items: items.filter(i => i.product_id && Number(i.delivered_qty) > 0),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إذن تسليم جديد</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>العميل *</Label>
              <Select value={customer_id} onValueChange={setCust}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>المستودع *</Label>
              <Select value={warehouse_id} onValueChange={setWh}>
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading || !customer_id || !warehouse_id || items.length === 0}>
            {loading ? "جارٍ الحفظ…" : "حفظ كمسودة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PurchaseInvoiceDialog({ open, onOpenChange, onSubmit, loading }: BaseProps) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: pos = [] } = usePOs();
  const [supplier_id, setSup] = useState("");
  const [purchase_order_id, setPo] = useState<string>("");
  const [invoice_date, setIDate] = useState(new Date().toISOString().slice(0, 10));
  const [due_date, setDue] = useState("");
  const [tax_amount, setTax] = useState(0);
  const [discount_amount, setDisc] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const total = Math.round((subtotal + Number(tax_amount || 0) - Number(discount_amount || 0)) * 100) / 100;

  const reset = () => {
    setSup(""); setPo(""); setNotes(""); setItems([]); setTax(0); setDisc(0); setDue("");
    setIDate(new Date().toISOString().slice(0, 10));
  };

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
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>فاتورة مشتريات جديدة</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>المورد *</Label>
              <Select value={supplier_id} onValueChange={setSup}>
                <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading || !supplier_id || items.length === 0}>
            {loading ? "جارٍ الحفظ…" : "حفظ كمسودة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
