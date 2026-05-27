/**
 * Approval Repository — typed access for the `approval_records` table.
 * Side effects (downstream entity status, audit) are handled by DB triggers;
 * this layer only mutates the approval row itself.
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export interface ApprovalRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  current_level: number;
  approved_by: string[] | null;
  rejection_reason: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "escalated";

export interface ApprovalListFilters {
  status?: ApprovalStatusFilter;
  entityType?: string;
}

export interface ExecuteApprovalParams {
  recordId: string;
  action: "approve" | "reject";
  userId?: string;
  rejectionReason?: string;
}

export const approvalRepository = {
  async listApprovals(
    filters: ApprovalListFilters = {},
  ): Promise<ApprovalRecord[]> {
    let q = supabase
      .from("approval_records")
      .select("*")
      .order("created_at", { ascending: false });
    if (filters.status && filters.status !== "all") {
      q = q.eq("status", filters.status);
    }
    if (filters.entityType) q = q.eq("entity_type", filters.entityType);

    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل طلبات الاعتماد.");
    return (data ?? []) as ApprovalRecord[];
  },

  async getById(id: string): Promise<ApprovalRecord> {
    const { data, error } = await supabase
      .from("approval_records")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw mapRepoError(error, "تعذّر تحميل طلب الاعتماد.");
    return data as ApprovalRecord;
  },

  async executeApprovalAction(params: ExecuteApprovalParams): Promise<void> {
    if (params.action === "approve") {
      const current = await this.getById(params.recordId);
      const approvedBy = [
        ...(current.approved_by || []),
        ...(params.userId ? [params.userId] : []),
      ];
      const { error } = await supabase
        .from("approval_records")
        .update({
          approved_by: approvedBy,
          status: "approved",
          current_level: current.current_level + 1,
        })
        .eq("id", params.recordId);
      if (error) throw mapRepoError(error, "تعذّر اعتماد الطلب.");
    } else {
      const { error } = await supabase
        .from("approval_records")
        .update({
          status: "rejected",
          rejection_reason: params.rejectionReason || null,
        })
        .eq("id", params.recordId);
      if (error) throw mapRepoError(error, "تعذّر رفض الطلب.");
    }
  },
};
