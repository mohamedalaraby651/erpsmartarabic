import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { toast } from "sonner";
import {
  deliveryNoteRepository,
  type DeliveryNoteDraft,
  type DeliveryNoteItemInput,
} from "@/lib/repositories/logisticsRepository";

export type DeliveryNoteStatus = "draft" | "in_transit" | "delivered" | "cancelled";
export type { DeliveryNoteDraft, DeliveryNoteItemInput };

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

export function useDeliveryNotesList(search = "") {
  return useQuery({
    queryKey: ["delivery-notes", search],
    queryFn: async () => (await deliveryNoteRepository.list(search)) as unknown as DeliveryNoteRow[],
  });
}

export function useDeliveryNoteDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["delivery-note", id],
    enabled: !!id,
    queryFn: async () => (await deliveryNoteRepository.findById(id!)) as unknown as DeliveryNoteRow | null,
  });
  const items = useQuery({
    queryKey: ["delivery-note-items", id],
    enabled: !!id,
    queryFn: () => deliveryNoteRepository.listItems(id!),
  });
  return { header, items };
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: DeliveryNoteDraft) => deliveryNoteRepository.create(draft),
    onSuccess: (h) => {
      toast.success(`تم إنشاء إذن التسليم ${h.delivery_number}`);
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء إذن التسليم"),
  });
}

export function usePostDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deliveryNoteRepository.post(id),
    onSuccess: (res) => {
      if ((res.stock_warnings ?? 0) > 0) {
        toast.warning(
          `تم التسليم — تحذير: ${res.stock_warnings} منتج بمخزون سالب. راجع سجل التزامن.`,
        );
      } else {
        toast.success(`تم التسليم — ${res.items_processed} بند تم خصمه من المخزون`);
      }
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
      qc.invalidateQueries({ queryKey: ["delivery-note"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل الترحيل"),
  });
}

export function useCancelDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      deliveryNoteRepository.cancel(id, reason),
    onSuccess: () => {
      toast.success("تم إلغاء الإذن وعكس حركة المخزون");
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
      qc.invalidateQueries({ queryKey: ["delivery-note"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل الإلغاء"),
  });
}
