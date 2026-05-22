/**
 * Sales-orders hooks — thin wrappers over `salesOrderRepository`.
 * UI components must depend on these hooks (never on `supabase.from('sales_orders')`).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import {
  salesOrderRepository,
  type SalesOrderFilters,
  type SalesOrderHeaderInput,
  type SalesOrderItemInput,
} from "@/lib/repositories/salesOrderRepository";

const LIST_KEY = ["sales-orders"] as const;

export function useSalesOrdersList(filters: SalesOrderFilters = {}, limit = 200) {
  return useQuery({
    queryKey: [...LIST_KEY, filters, limit],
    queryFn: async () => (await salesOrderRepository.list(filters, limit)).data,
  });
}

export function useSalesOrderDetails(id: string | undefined) {
  const order = useQuery({
    queryKey: ["sales-order", id],
    enabled: !!id,
    queryFn: () => salesOrderRepository.findById(id!),
  });
  const items = useQuery({
    queryKey: ["sales-order-items", id],
    enabled: !!id,
    queryFn: () => salesOrderRepository.listItems(id!),
  });
  const invoices = useQuery({
    queryKey: ["sales-order-invoices", id],
    enabled: !!id,
    queryFn: () => salesOrderRepository.listInvoicesByOrder(id!),
  });
  const activities = useQuery({
    queryKey: ["sales-order-activities", id],
    enabled: !!id,
    queryFn: () => salesOrderRepository.listActivity(id!),
  });
  return { order, items, invoices, activities };
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      header,
      items,
    }: {
      header: SalesOrderHeaderInput;
      items: SalesOrderItemInput[];
    }) => salesOrderRepository.create(header, items),
    onSuccess: () => {
      toast.success("تم إنشاء أمر البيع");
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء أمر البيع"),
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      header,
      items,
    }: {
      id: string;
      header: Partial<SalesOrderHeaderInput>;
      items: SalesOrderItemInput[];
    }) => salesOrderRepository.update(id, header, items),
    onSuccess: (_data, vars) => {
      toast.success("تم تحديث أمر البيع");
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ["sales-order", vars.id] });
      qc.invalidateQueries({ queryKey: ["sales-order-items", vars.id] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر تحديث أمر البيع"),
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrderRepository.remove(id),
    onSuccess: () => {
      toast.success("تم حذف أمر البيع");
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر حذف أمر البيع"),
  });
}
