import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PurchaseInvoiceStatus = "draft" | "posted" | "paid" | "cancelled";
export type MatchingStatus =
  | "matched"
  | "over_received"
  | "under_received"
  | "no_receipt"
  | "pending";

export interface PurchaseInvoiceRow {
  id: string;
  invoice_number: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  status: PurchaseInvoiceStatus;
  payment_status: "pending" | "partial" | "paid";
  matching_status: MatchingStatus;
  approval_required: boolean;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  suppliers?: { id: string; name: string } | null;
  purchase_orders?: { id: string; order_number: string } | null;
}

export interface PurchaseInvoiceItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  notes?: string | null;
}

export interface PurchaseInvoiceDraft {
  supplier_id: string;
  purchase_order_id?: string | null;
  invoice_date: string;
  due_date?: string | null;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string | null;
  items: PurchaseInvoiceItemInput[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function usePurchaseInvoicesList(search = "") {
  return useQuery({
    queryKey: ["purchase-invoices", search],
    queryFn: async () => {
      let q = supabase
        .from("purchase_invoices")
        .select("*, suppliers(id,name), purchase_orders(id,order_number)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search.trim()) q = q.ilike("invoice_number", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseInvoiceRow[];
    },
  });
}

export function usePurchaseInvoiceDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["purchase-invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("*, suppliers(id,name), purchase_orders(id,order_number)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PurchaseInvoiceRow | null;
    },
  });

  const items = useQuery({
    queryKey: ["purchase-invoice-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoice_items")
        .select("*, products(id,name,sku)")
        .eq("invoice_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  return { header, items };
}

export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: PurchaseInvoiceDraft) => {
      const { data: tenantData } = await supabase.rpc("get_current_tenant");
      const tenant_id = tenantData as string | null;
      if (!tenant_id) throw new Error("لم يتم تحديد المنشأة الحالية");

      const subtotal = round2(
        draft.items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
      );
      const tax = round2(draft.tax_amount ?? 0);
      const discount = round2(draft.discount_amount ?? 0);
      const total = round2(subtotal + tax - discount);

      const { data: header, error: hErr } = await supabase
        .from("purchase_invoices")
        .insert({
          tenant_id,
          supplier_id: draft.supplier_id,
          purchase_order_id: draft.purchase_order_id ?? null,
          invoice_date: draft.invoice_date,
          due_date: draft.due_date ?? null,
          subtotal,
          tax_amount: tax,
          discount_amount: discount,
          total_amount: total,
          notes: draft.notes ?? null,
        })
        .select("id, invoice_number")
        .single();
      if (hErr) throw hErr;

      if (draft.items.length > 0) {
        const { error: iErr } = await supabase.from("purchase_invoice_items").insert(
          draft.items.map((it) => ({
            tenant_id,
            invoice_id: header.id,
            product_id: it.product_id,
            variant_id: it.variant_id ?? null,
            quantity: round2(it.quantity),
            unit_price: round2(it.unit_price),
            total_price: round2(it.quantity * it.unit_price),
            notes: it.notes ?? null,
          }))
        );
        if (iErr) throw iErr;
      }
      return header;
    },
    onSuccess: (h) => {
      toast.success(`تم إنشاء فاتورة المشتريات ${h.invoice_number}`);
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر إنشاء الفاتورة"),
  });
}

export function usePostPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("post_purchase_invoice", { p_id: id });
      if (error) throw error;
      const res = data as {
        success: boolean;
        error?: string;
        matching_status?: MatchingStatus;
        approval_required?: boolean;
      };
      if (!res?.success) throw new Error(res?.error || "فشل الترحيل");
      return res;
    },
    onSuccess: (res) => {
      const labels: Record<MatchingStatus, string> = {
        matched: "مطابقة كاملة ✓",
        under_received: "كمية مستلمة أقل (مقبول)",
        over_received: "تجاوز الكمية المستلمة — يتطلب موافقة",
        no_receipt: "لا يوجد إيصال استلام — يتطلب موافقة",
        pending: "قيد المعالجة",
      };
      const label = labels[res.matching_status as MatchingStatus] || "تم الترحيل";
      if (res.approval_required) {
        toast.warning(`تم الترحيل — ${label}`);
      } else {
        toast.success(`تم الترحيل — ${label}`);
      }
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoice"] });
    },
    onError: (e: any) => toast.error(e?.message || "فشل الترحيل"),
  });
}
