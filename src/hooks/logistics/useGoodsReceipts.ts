import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import { toast } from "sonner";
import {
  goodsReceiptRepository,
  type GoodsReceiptDraft,
  type GoodsReceiptItemInput,
} from "@/lib/repositories/logisticsRepository";

export type GoodsReceiptStatus = "draft" | "posted" | "cancelled";
export type { GoodsReceiptDraft, GoodsReceiptItemInput };

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

export function useGoodsReceiptsList(search = "") {
  return useQuery({
    queryKey: ["goods-receipts", search],
    queryFn: async () => (await goodsReceiptRepository.list(search)) as unknown as GoodsReceiptRow[],
  });
}

export function useGoodsReceiptDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["goods-receipt", id],
    enabled: !!id,
    queryFn: async () => (await goodsReceiptRepository.findById(id!)) as unknown as GoodsReceiptRow | null,
  });
  const items = useQuery({
    queryKey: ["goods-receipt-items", id],
    enabled: !!id,
    queryFn: () => goodsReceiptRepository.listItems(id!),
  });
  return { header, items };
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: GoodsReceiptDraft) => goodsReceiptRepository.create(draft),
    onSuccess: (h) => {
      toast.success(`تم إنشاء إيصال الاستلام ${h.receipt_number}`);
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء الإيصال"),
  });
}

export function usePostGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goodsReceiptRepository.post(id),
    onSuccess: (res) => {
      toast.success(`تم الترحيل — ${res.items_processed} بند تم تحديث المخزون`);
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
      qc.invalidateQueries({ queryKey: ["goods-receipt"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل الترحيل"),
  });
}

export function useCancelGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      goodsReceiptRepository.cancel(id, reason),
    onSuccess: () => {
      toast.success("تم إلغاء الإيصال وعكس حركة المخزون");
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
      qc.invalidateQueries({ queryKey: ["goods-receipt"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error(getSafeErrorMessage(e) || "فشل الإلغاء"),
  });
}
