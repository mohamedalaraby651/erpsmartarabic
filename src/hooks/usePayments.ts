/**
 * usePayments — Hooks موحّدة للوصول إلى جدول المدفوعات عبر paymentRepository.
 *
 * لا يُسمح لأي مكوّن UI باستيراد supabase مباشرة للوصول إلى المدفوعات.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  paymentRepository,
  type PaymentFilters,
  type PaymentListResult,
} from "@/lib/repositories/paymentRepository";

const KEYS = {
  all: ["payments"] as const,
  list: (filters: PaymentFilters, page: number, pageSize: number) =>
    ["payments", "list", filters, page, pageSize] as const,
  count: (filters: PaymentFilters) => ["payments", "count", filters] as const,
};

export function usePaymentsCount(filters: PaymentFilters) {
  return useQuery({
    queryKey: KEYS.count(filters),
    queryFn: () => paymentRepository.count(filters),
  });
}

export function usePaymentCustomers(open: boolean) {
  return useQuery({ queryKey: ['payment-customers'], queryFn: () => paymentRepository.listActiveCustomers(), enabled: open });
}

export function usePaymentInvoices(customerId: string, open: boolean) {
  return useQuery({ queryKey: ['customer-unpaid-invoices', customerId], queryFn: () => paymentRepository.listUnpaidInvoices(customerId), enabled: open && !!customerId });
}

export function usePaymentsList(
  filters: PaymentFilters,
  page: number,
  pageSize: number,
) {
  return useQuery<PaymentListResult>({
    queryKey: KEYS.list(filters, page, pageSize),
    placeholderData: keepPreviousData,
    queryFn: () => paymentRepository.list({ filters, page, pageSize }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم حذف الدفعة' },
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
