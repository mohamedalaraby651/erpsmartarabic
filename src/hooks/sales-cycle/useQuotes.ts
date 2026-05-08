import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";

export interface QuoteRow {
  id: string;
  quote_number: string;
  customer_id: string;
  quote_date: string;
  valid_until: string;
  status: QuoteStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  converted_order_id: string | null;
  created_at: string;
  customers?: { id: string; name: string } | null;
}

export interface QuoteItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  notes?: string | null;
}

export interface QuoteDraft {
  customer_id: string;
  quote_date: string;
  valid_until: string;
  notes?: string | null;
  items: QuoteItemInput[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function useQuotesList(search = "") {
  return useQuery({
    queryKey: ["quotes", search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("quotes")
        .select("*, customers(id,name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search.trim()) q = q.ilike("quote_number", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QuoteRow[];
    },
  });
}

export function useQuoteDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["quote", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quotes")
        .select("*, customers(id,name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as QuoteRow | null;
    },
  });

  const items = useQuery({
    queryKey: ["quote-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quote_items")
        .select("*, products(id,name,sku)")
        .eq("quote_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  return { header, items };
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: QuoteDraft) => {
      const { data: tenantData } = await supabase.rpc("get_current_tenant");
      const tenant_id = tenantData as string | null;
      if (!tenant_id) throw new Error("لم يتم تحديد المنشأة الحالية");

      const subtotal = round2(
        draft.items.reduce(
          (s, it) =>
            s +
            it.quantity * it.unit_price * (1 - (it.discount_percentage ?? 0) / 100),
          0
        )
      );

      const { data: header, error: hErr } = await (supabase as any)
        .from("quotes")
        .insert({
          tenant_id,
          customer_id: draft.customer_id,
          quote_date: draft.quote_date,
          valid_until: draft.valid_until,
          notes: draft.notes ?? null,
          subtotal,
          total_amount: subtotal,
        })
        .select("id, quote_number")
        .single();
      if (hErr) throw hErr;

      if (draft.items.length > 0) {
        const { error: iErr } = await (supabase as any).from("quote_items").insert(
          draft.items.map((it) => ({
            tenant_id,
            quote_id: header.id,
            product_id: it.product_id,
            variant_id: it.variant_id ?? null,
            quantity: round2(it.quantity),
            unit_price: round2(it.unit_price),
            discount_percentage: round2(it.discount_percentage ?? 0),
            total_price: round2(
              it.quantity * it.unit_price * (1 - (it.discount_percentage ?? 0) / 100)
            ),
            notes: it.notes ?? null,
          }))
        );
        if (iErr) throw iErr;
      }
      return header;
    },
    onSuccess: (h: any) => {
      toast.success(`تم إنشاء عرض السعر ${h.quote_number}`);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء عرض السعر"),
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const { error } = await (supabase as any)
        .from("quotes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة العرض");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
    },
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "تعذّر التحديث"),
  });
}

export function useConvertQuoteToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase.rpc("convert_quote_to_order", {
        p_quote_id: quoteId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("تم تحويل عرض السعر إلى أمر بيع");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
    },
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل التحويل"),
  });
}

export function useConvertOrderToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc("convert_order_to_invoice", {
        p_order_id: orderId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("تم إنشاء فاتورة المبيعات");
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل إنشاء الفاتورة"),
  });
}

export function useConvertInvoiceToDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      warehouseId,
    }: {
      invoiceId: string;
      warehouseId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("convert_invoice_to_delivery", {
        p_invoice_id: invoiceId,
        p_warehouse_id: warehouseId ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success("تم إنشاء إذن التسليم");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
    },
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل إنشاء إذن التسليم"),
  });
}
