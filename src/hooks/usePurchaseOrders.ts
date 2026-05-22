/**
 * Purchase-orders hooks — thin wrappers over `purchaseOrderRepository`.
 * UI components must depend on these hooks (never on `supabase.from('purchase_orders')`).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import {
  purchaseOrderRepository,
  type PurchaseOrderFilters,
  type PurchaseOrderHeaderInput,
  type PurchaseOrderItemInput,
} from "@/lib/repositories/purchaseOrderRepository";

const LIST_KEY = ["purchase-orders"] as const;
const COUNT_KEY = ["purchase-orders-count"] as const;

export function usePurchaseOrdersList(
  filters: PurchaseOrderFilters,
  range?: { from: number; to: number },
) {
  return useQuery({
    queryKey: [...LIST_KEY, filters, range],
    queryFn: async () => (await purchaseOrderRepository.list(filters, range)).data,
  });
}

export function usePurchaseOrdersCount(filters: PurchaseOrderFilters) {
  return useQuery({
    queryKey: [...COUNT_KEY, filters],
    queryFn: () => purchaseOrderRepository.countMatching(filters),
  });
}

export function usePurchaseOrderDetails(id: string | undefined) {
  const order = useQuery({
    queryKey: ["purchase-order", id],
    enabled: !!id,
    queryFn: () => purchaseOrderRepository.findById(id!),
  });
  const items = useQuery({
    queryKey: ["purchase-order-items", id],
    enabled: !!id,
    queryFn: () => purchaseOrderRepository.listItems(id!),
  });
  const payments = useQuery({
    queryKey: ["purchase-order-payments", id],
    enabled: !!id,
    queryFn: () => purchaseOrderRepository.listPaymentsByOrder(id!),
  });
  const activities = useQuery({
    queryKey: ["purchase-order-activities", id],
    enabled: !!id,
    queryFn: () => purchaseOrderRepository.listActivity(id!),
  });
  return { order, items, payments, activities };
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      header,
      items,
    }: {
      header: PurchaseOrderHeaderInput;
      items: PurchaseOrderItemInput[];
    }) => purchaseOrderRepository.create(header, items),
    onSuccess: () => {
      toast.success("تم إنشاء أمر الشراء");
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: COUNT_KEY });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء أمر الشراء"),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      header,
      items,
    }: {
      id: string;
      header: Partial<PurchaseOrderHeaderInput>;
      items: PurchaseOrderItemInput[];
    }) => purchaseOrderRepository.update(id, header, items),
    onSuccess: (_d, vars) => {
      toast.success("تم تحديث أمر الشراء");
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ["purchase-order", vars.id] });
      qc.invalidateQueries({ queryKey: ["purchase-order-items", vars.id] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر تحديث أمر الشراء"),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseOrderRepository.remove(id),
    onSuccess: () => {
      toast.success("تم حذف أمر الشراء");
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: COUNT_KEY });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر حذف أمر الشراء"),
  });
}
