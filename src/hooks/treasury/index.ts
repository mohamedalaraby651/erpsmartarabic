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
    meta: { successMessage: 'تم تسجيل دفعة المورد' },
    mutationFn: (input: RecordSupplierPaymentData) =>
      treasuryRepository.createSupplierPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["treasury-today-stats"] });
    },
  });
}

function invalidateRegisters(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["cash-registers"] });
  qc.invalidateQueries({ queryKey: ["cash-register"] });
}

export function useCreateCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم إنشاء الصندوق' },
    mutationFn: (input: Parameters<typeof treasuryRepository.createRegister>[0]) =>
      treasuryRepository.createRegister(input),
    onSuccess: () => invalidateRegisters(qc),
  });
}

export function useUpdateCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم تحديث الصندوق' },
    mutationFn: (params: {
      id: string;
      input: Parameters<typeof treasuryRepository.updateRegister>[1];
    }) => treasuryRepository.updateRegister(params.id, params.input),
    onSuccess: () => invalidateRegisters(qc),
  });
}

export function useRecordCashTransaction() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم تسجيل الحركة النقدية' },
    mutationFn: (input: Parameters<typeof treasuryRepository.recordCashTransaction>[0]) =>
      treasuryRepository.recordCashTransaction(input),
    onSuccess: () => {
      invalidateRegisters(qc);
      qc.invalidateQueries({ queryKey: ["cash-transactions"] });
      qc.invalidateQueries({ queryKey: ["treasury-today-stats"] });
    },
  });
}

