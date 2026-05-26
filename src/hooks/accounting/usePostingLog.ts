/**
 * usePostingLog — read-only feed of automated journal postings.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { postingLogRepository } from "@/lib/repositories/postingLogRepository";
import { queryPresets } from "@/lib/queryConfig";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";

export function usePostingLog(limit = 200) {
  return useQuery({
    queryKey: ["document-posting-log", limit],
    queryFn: () => postingLogRepository.listRecent(limit),
    ...queryPresets.operational,
  });
}

export function useEnsureLogisticsAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postingLogRepository.ensureLogisticsAccounts(),
    onSuccess: (res) => {
      const c = res.created?.length ?? 0;
      const l = res.linked?.length ?? 0;
      toast.success(`تم الإعداد — ${c} حساب جديد، ${l} ربط جديد`);
      qc.invalidateQueries({ queryKey: ["document-posting-log"] });
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (err) => {
      logErrorSafely("useEnsureLogisticsAccounts", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}
