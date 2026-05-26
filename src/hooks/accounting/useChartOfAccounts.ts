/**
 * useChartOfAccounts — React Query hooks for the COA.
 * All page/dialog code consumes these instead of touching supabase directly.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { coaRepository, type AccountRow } from "@/lib/repositories/coaRepository";
import { queryPresets } from "@/lib/queryConfig";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";

const COA_KEY = ["chart-of-accounts"] as const;
const COA_TREE_KEY = ["chart-of-accounts", "tree"] as const;
const COA_ACTIVE_KEY = ["chart-of-accounts", "active"] as const;

export function useChartOfAccounts() {
  return useQuery({
    queryKey: COA_KEY,
    queryFn: () => coaRepository.getFlat(),
    ...queryPresets.reference,
  });
}

export function useActiveAccounts() {
  return useQuery({
    queryKey: COA_ACTIVE_KEY,
    queryFn: () => coaRepository.getActiveFlat(),
    ...queryPresets.reference,
  });
}

export function useChartOfAccountsTree() {
  return useQuery({
    queryKey: COA_TREE_KEY,
    queryFn: () => coaRepository.getTree(),
    ...queryPresets.reference,
  });
}

export function useAccountByCode(code: string | null | undefined) {
  return useQuery({
    queryKey: ["chart-of-accounts", "by-code", code],
    queryFn: () => coaRepository.getByCode(code!),
    enabled: !!code,
    ...queryPresets.reference,
  });
}

export function useUpsertAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AccountRow> & { id?: string }) =>
      coaRepository.upsertAccount(payload as never),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success(vars.id ? "تم تحديث الحساب" : "تم إنشاء الحساب");
    },
    onError: (err) => {
      logErrorSafely("useUpsertAccount", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}
