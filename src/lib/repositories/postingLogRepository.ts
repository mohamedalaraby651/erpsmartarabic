/**
 * Document Posting Log Repository — read-only audit feed for auto-posting.
 *
 * Inserts are restricted to `service_role` (see Phase 1 hardening); the UI
 * only ever reads. The `ensure_logistics_posting_accounts` RPC is exposed
 * for one-click account/link bootstrapping from the PostingLog page.
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export interface PostingLogRow {
  id: string;
  document_type: string;
  document_id: string;
  document_number: string | null;
  journal_id: string | null;
  status: "success" | "skipped" | "failed";
  reason: string | null;
  total_amount: number | null;
  created_at: string;
}

export interface EnsureAccountsResult {
  success: boolean;
  created?: Array<{ code: string; name: string }>;
  linked?: Array<{ link: string; code: string }>;
  error?: string;
}

const round2 = (n: number | null) =>
  n == null ? null : Math.round(Number(n) * 100) / 100;

export const postingLogRepository = {
  async listRecent(limit = 200): Promise<PostingLogRow[]> {
    const { data, error } = await supabase
      .from("document_posting_log" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل سجل الترحيل.");
    return ((data ?? []) as unknown as PostingLogRow[]).map((r) => ({
      ...r,
      total_amount: round2(r.total_amount),
    }));
  },

  async ensureLogisticsAccounts(): Promise<EnsureAccountsResult> {
    const { data, error } = await supabase.rpc(
      "ensure_logistics_posting_accounts" as never,
    );
    if (error) throw mapRepoError(error, "تعذّر إعداد حسابات الترحيل.");
    const res = data as unknown as EnsureAccountsResult;
    if (!res?.success) throw new Error(res?.error || "فشل إعداد حسابات الترحيل.");
    return res;
  },
};

export type PostingLogRepository = typeof postingLogRepository;
