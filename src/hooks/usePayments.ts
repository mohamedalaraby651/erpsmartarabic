/**
 * usePayments — Hooks موحّدة للوصول إلى جدول المدفوعات عبر paymentRepository.
 *
 * لا يُسمح لأي مكوّن UI باستيراد supabase مباشرة للوصول إلى المدفوعات.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  paymentRepository,
  type PaymentFilters,
  type PaymentListResult,
} from "@/lib/repositories/paymentRepository";

const KEYS = {
  all: ["payments"] as const,
  list: (filters: PaymentFilters, page: number) =>
    ["payments", "list", filters, page] as const,
  count: (filters: PaymentFilters) => ["payments", "count", filters] as const,
};

export function usePaymentsCount(filters: PaymentFilters) {
  return useQuery({
    queryKey: KEYS.count(filters),
    queryFn: () => paymentRepository.count(filters),
  });
}

export function usePaymentsList(
  filters: PaymentFilters,
  page: number,
  pageSize: number,
) {
  return useQuery<PaymentListResult>({
    queryKey: KEYS.list(filters, page),
    queryFn: () => paymentRepository.list({ filters, page, pageSize }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { deletePayment } = await import("@/lib/services/paymentService");
      await deletePayment(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
