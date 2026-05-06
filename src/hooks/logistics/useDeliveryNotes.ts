import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DeliveryNoteStatus = "draft" | "in_transit" | "delivered" | "cancelled";

export interface DeliveryNoteRow {
  id: string;
  delivery_number: string;
  sales_order_id: string | null;
  invoice_id: string | null;
  customer_id: string;
  warehouse_id: string;
  delivery_date: string;
  status: DeliveryNoteStatus;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  customers?: { id: string; name: string } | null;
  warehouses?: { id: string; name: string } | null;
  sales_orders?: { id: string; order_number: string } | null;
  invoices?: { id: string; invoice_number: string } | null;
}

export interface DeliveryNoteItemInput {
  product_id: string;
  variant_id?: string | null;
  ordered_qty: number;
  delivered_qty: number;
  notes?: string | null;
}

export interface DeliveryNoteDraft {
  customer_id: string;
  warehouse_id: string;
  sales_order_id?: string | null;
  invoice_id?: string | null;
  delivery_date: string;
  notes?: string | null;
  items: DeliveryNoteItemInput[];
}

export function useDeliveryNotesList(search = "") {
  return useQuery({
    queryKey: ["delivery-notes", search],
    queryFn: async () => {
      let q = supabase
        .from("delivery_notes")
        .select(
          "*, customers(id,name), warehouses(id,name), sales_orders(id,order_number), invoices(id,invoice_number)"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (search.trim()) q = q.ilike("delivery_number", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryNoteRow[];
    },
  });
}

export function useDeliveryNoteDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["delivery-note", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_notes")
        .select(
          "*, customers(id,name), warehouses(id,name), sales_orders(id,order_number), invoices(id,invoice_number)"
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DeliveryNoteRow | null;
    },
  });

  const items = useQuery({
    queryKey: ["delivery-note-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_note_items")
        .select("*, products(id,name,sku)")
        .eq("delivery_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  return { header, items };
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: DeliveryNoteDraft) => {
      const { data: tenantData } = await supabase.rpc("get_current_tenant");
      const tenant_id = tenantData as string | null;
      if (!tenant_id) throw new Error("لم يتم تحديد المنشأة الحالية");

      const { data: header, error: hErr } = await supabase
        .from("delivery_notes")
        .insert({
          tenant_id,
          customer_id: draft.customer_id,
          warehouse_id: draft.warehouse_id,
          sales_order_id: draft.sales_order_id ?? null,
          invoice_id: draft.invoice_id ?? null,
          delivery_date: draft.delivery_date,
          notes: draft.notes ?? null,
        })
        .select("id, delivery_number")
        .single();
      if (hErr) throw hErr;

      if (draft.items.length > 0) {
        const { error: iErr } = await supabase.from("delivery_note_items").insert(
          draft.items.map((it) => ({
            tenant_id,
            delivery_id: header.id,
            product_id: it.product_id,
            variant_id: it.variant_id ?? null,
            ordered_qty: Math.round((it.ordered_qty ?? 0) * 100) / 100,
            delivered_qty: Math.round(it.delivered_qty * 100) / 100,
            notes: it.notes ?? null,
          }))
        );
        if (iErr) throw iErr;
      }
      return header;
    },
    onSuccess: (h) => {
      toast.success(`تم إنشاء إذن التسليم ${h.delivery_number}`);
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر إنشاء إذن التسليم"),
  });
}

export function usePostDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("post_delivery_note", { p_id: id });
      if (error) throw error;
      const res = data as {
        success: boolean;
        error?: string;
        items_processed?: number;
        stock_warnings?: number;
      };
      if (!res?.success) throw new Error(res?.error || "فشل الترحيل");
      return res;
    },
    onSuccess: (res) => {
      if ((res.stock_warnings ?? 0) > 0) {
        toast.warning(
          `تم التسليم — تحذير: ${res.stock_warnings} منتج بمخزون سالب. راجع سجل التزامن.`
        );
      } else {
        toast.success(`تم التسليم — ${res.items_processed} بند تم خصمه من المخزون`);
      }
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
      qc.invalidateQueries({ queryKey: ["delivery-note"] });
    },
    onError: (e: any) => toast.error(e?.message || "فشل الترحيل"),
  });
}

export function useCancelDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("cancel_delivery_note", {
        p_id: id,
        _reason: reason ?? null,
      });
      if (error) throw error;
      const res = data as { success: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "فشل الإلغاء");
      return res;
    },
    onSuccess: () => {
      toast.success("تم إلغاء الإذن وعكس حركة المخزون");
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
      qc.invalidateQueries({ queryKey: ["delivery-note"] });
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإلغاء"),
  });
}
