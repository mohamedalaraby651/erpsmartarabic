import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { toast } from "sonner";
import {
  purchaseInvoiceRepository,
  type PurchaseInvoiceDraft,
  type PurchaseInvoiceItemInput,
  type MatchingStatus,
} from "@/lib/repositories/logisticsRepository";

export type PurchaseInvoiceStatus = "draft" | "posted" | "paid" | "cancelled";
export type { PurchaseInvoiceDraft, PurchaseInvoiceItemInput, MatchingStatus };

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

export function usePurchaseInvoicesList(search = "") {
  return useQuery({
    queryKey: ["purchase-invoices", search],
    queryFn: async () =>
      (await purchaseInvoiceRepository.list(search)) as unknown as PurchaseInvoiceRow[],
  });
}

export function usePurchaseInvoiceDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["purchase-invoice", id],
    enabled: !!id,
    queryFn: async () =>
      (await purchaseInvoiceRepository.findById(id!)) as unknown as PurchaseInvoiceRow | null,
  });
  const items = useQuery({
    queryKey: ["purchase-invoice-items", id],
    enabled: !!id,
    queryFn: () => purchaseInvoiceRepository.listItems(id!),
  });
  return { header, items };
}

export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: PurchaseInvoiceDraft) => purchaseInvoiceRepository.create(draft),
    onSuccess: (h) => {
      toast.success(`تم إنشاء فاتورة المشتريات ${h.invoice_number}`);
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء الفاتورة"),
  });
}

export function usePostPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseInvoiceRepository.post(id),
    onSuccess: (res) => {
      const labels: Record<MatchingStatus, string> = {
        matched: "مطابقة كاملة ✓",
        under_received: "كمية مستلمة أقل (مقبول)",
        over_received: "تجاوز الكمية المستلمة — يتطلب موافقة",
        no_receipt: "لا يوجد إيصال استلام — يتطلب موافقة",
        pending: "قيد المعالجة",
      };
      const label = labels[res.matching_status as MatchingStatus] || "تم الترحيل";
      if (res.approval_required) toast.warning(`تم الترحيل — ${label}`);
      else toast.success(`تم الترحيل — ${label}`);
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoice"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل الترحيل"),
  });
}
