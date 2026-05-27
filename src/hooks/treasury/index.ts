/**
 * Treasury hooks — cache-bound wrappers around `treasuryRepository`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  treasuryRepository,
  type CashTxFilters,
} from "@/lib/repositories/treasuryRepository";
import type { RecordSupplierPaymentData } from "@/lib/services/supplierService";
import { queryPresets } from "@/lib/queryConfig";

export function useCashRegisters() {
  return useQuery({
    queryKey: ["cash-registers"],
    queryFn: () => treasuryRepository.listCashRegisters(),
    ...queryPresets.standard,
  });
}

export function useCashRegister(id?: string) {
  return useQuery({
    queryKey: ["cash-register", id],
    queryFn: () => treasuryRepository.getCashRegister(id as string),
    enabled: !!id,
    ...queryPresets.standard,
  });
}

export function useCashTransactions(filters: CashTxFilters) {
  return useQuery({
    queryKey: ["cash-transactions", filters],
    queryFn: () => treasuryRepository.listCashTransactions(filters),
    enabled: !!filters.registerId || !!filters.fromDate,
    ...queryPresets.operational,
  });
}

export function useTreasuryBalances() {
  return useQuery({
    queryKey: ["treasury-today-stats"],
    queryFn: () => treasuryRepository.getTreasuryBalances(),
    ...queryPresets.report,
  });
}

export function useCreateSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordSupplierPaymentData) =>
      treasuryRepository.createSupplierPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["treasury-today-stats"] });
    },
  });
}
