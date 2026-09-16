/**
 * Approval hooks — wrap `approvalRepository` with caching + invalidation.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approvalRepository,
  type ApprovalListFilters,
  type ExecuteApprovalParams,
} from "@/lib/repositories/approvalRepository";
import { queryPresets } from "@/lib/queryConfig";

export function usePendingApprovals(filters: ApprovalListFilters = {}) {
  return useQuery({
    queryKey: ["approval-records", filters],
    queryFn: () => approvalRepository.listApprovals(filters),
    ...queryPresets.realtime,
  });
}

export function useExecuteApprovalAction() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم تنفيذ إجراء الاعتماد' },
    mutationFn: (params: ExecuteApprovalParams) =>
      approvalRepository.executeApprovalAction(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-records"] });
    },
  });
}
