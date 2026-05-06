import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GoodsReceiptStatus = "draft" | "posted" | "cancelled";

export interface GoodsReceiptRow {
  id: string;
  receipt_number: string;
  purchase_order_id: string | null;
  supplier_id: string;
  warehouse_id: string;
  received_date: string;
  status: GoodsReceiptStatus;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  suppliers?: { id: string; name: string } | null;
  warehouses?: { id: string; name: string } | null;
  purchase_orders?: { id: string; order_number: string } | null;
}

export interface GoodsReceiptItemInput {
  product_id: string;
  variant_id?: string | null;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
  notes?: string | null;
}

export interface GoodsReceiptDraft {
  supplier_id: string;
  warehouse_id: string;
  purchase_order_id?: string | null;
  received_date: string;
  notes?: string | null;
  items: GoodsReceiptItemInput[];
}

export function useGoodsReceiptsList(search = "") {
  return useQuery({
    queryKey: ["goods-receipts", search],
    queryFn: async () => {
      let q = supabase
        .from("goods_receipts")
        .select("*, suppliers(id,name), warehouses(id,name), purchase_orders(id,order_number)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search.trim()) {
        q = q.ilike("receipt_number", `%${search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as GoodsReceiptRow[];
    },
  });
}

export function useGoodsReceiptDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["goods-receipt", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipts")
        .select("*, suppliers(id,name), warehouses(id,name), purchase_orders(id,order_number)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as GoodsReceiptRow | null;
    },
  });

  const items = useQuery({
    queryKey: ["goods-receipt-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt_items")
        .select("*, products(id,name,sku)")
        .eq("receipt_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  return { header, items };
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: GoodsReceiptDraft) => {
      const { data: tenantData } = await supabase.rpc("get_current_tenant");
      const tenant_id = tenantData as string | null;
      if (!tenant_id) throw new Error("لم يتم تحديد المنشأة الحالية");

      const { data: header, error: hErr } = await supabase
        .from("goods_receipts")
        .insert({
          tenant_id,
          supplier_id: draft.supplier_id,
          warehouse_id: draft.warehouse_id,
          purchase_order_id: draft.purchase_order_id ?? null,
          received_date: draft.received_date,
          notes: draft.notes ?? null,
        })
        .select("id, receipt_number")
        .single();
      if (hErr) throw hErr;

      if (draft.items.length > 0) {
        const { error: iErr } = await supabase.from("goods_receipt_items").insert(
          draft.items.map((it) => ({
            tenant_id,
            receipt_id: header.id,
            product_id: it.product_id,
            variant_id: it.variant_id ?? null,
            ordered_qty: Math.round((it.ordered_qty ?? 0) * 100) / 100,
            received_qty: Math.round(it.received_qty * 100) / 100,
            unit_cost: Math.round(it.unit_cost * 100) / 100,
            notes: it.notes ?? null,
          })) as any
        );
        if (iErr) throw iErr;
      }
      return header;
    },
    onSuccess: (h) => {
      toast.success(`تم إنشاء إيصال الاستلام ${h.receipt_number}`);
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر إنشاء الإيصال"),
  });
}

export function usePostGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("post_goods_receipt", { p_id: id });
      if (error) throw error;
      const res = data as { success: boolean; error?: string; items_processed?: number };
      if (!res?.success) throw new Error(res?.error || "فشل الترحيل");
      return res;
    },
    onSuccess: (res) => {
      toast.success(`تم الترحيل — ${res.items_processed} بند تم تحديث المخزون`);
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
      qc.invalidateQueries({ queryKey: ["goods-receipt"] });
    },
    onError: (e: any) => toast.error(e?.message || "فشل الترحيل"),
  });
}

export function useCancelGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("cancel_goods_receipt", {
        p_id: id,
        _reason: reason ?? null,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "فشل الإلغاء");
      return res;
    },
    onSuccess: () => {
      toast.success("تم إلغاء الإيصال وعكس حركة المخزون");
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
      qc.invalidateQueries({ queryKey: ["goods-receipt"] });
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإلغاء"),
  });
}
