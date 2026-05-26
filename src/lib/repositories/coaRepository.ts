/**
 * Chart of Accounts Repository — typed data access for the accounting COA.
 *
 * All COA reads/writes funnel through this module so pages/hooks never touch
 * `supabase.from('chart_of_accounts')` directly. Tenant isolation is enforced
 * by RLS; permission gating is enforced by `check_section_permission` inside
 * the policies added in Phase 1.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError, unwrap } from "./_base";

type T = Database["public"]["Tables"];
export type AccountRow = T["chart_of_accounts"]["Row"];
export type AccountInsert = T["chart_of_accounts"]["Insert"];
export type AccountUpdate = T["chart_of_accounts"]["Update"];

export type AccountTreeNode = AccountRow & {
  children: AccountTreeNode[];
  depth: number;
};

const round2 = (n: number): number => Math.round(Number(n) * 100) / 100;

function normalizeBalances<T extends { current_balance: number | null }>(row: T): T {
  return { ...row, current_balance: round2(row.current_balance ?? 0) };
}

function buildTree(rows: AccountRow[], parentId: string | null = null, depth = 0): AccountTreeNode[] {
  return rows
    .filter((r) => r.parent_id === parentId)
    .map((r) => ({
      ...r,
      depth,
      children: buildTree(rows, r.id, depth + 1),
    }));
}

export const coaRepository = {
  async getFlat(): Promise<AccountRow[]> {
    const data = await unwrap(
      supabase.from("chart_of_accounts").select("*").order("code"),
      "تعذّر تحميل دليل الحسابات.",
    );
    return (data ?? []).map(normalizeBalances);
  },

  async getActiveFlat(): Promise<AccountRow[]> {
    const data = await unwrap(
      supabase.from("chart_of_accounts").select("*").eq("is_active", true).order("code"),
      "تعذّر تحميل الحسابات النشطة.",
    );
    return (data ?? []).map(normalizeBalances);
  },

  async getTree(): Promise<AccountTreeNode[]> {
    const rows = await this.getFlat();
    return buildTree(rows, null, 0);
  },

  async getByCode(code: string): Promise<AccountRow | null> {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر البحث عن الحساب.");
    return data ? normalizeBalances(data) : null;
  },

  async getById(id: string): Promise<AccountRow | null> {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل الحساب.");
    return data ? normalizeBalances(data) : null;
  },

  /**
   * Insert OR update an account. The caller decides by presence of `id`.
   * Numeric fields are rounded to 2 decimals.
   */
  async upsertAccount(
    payload: (AccountInsert | AccountUpdate) & { id?: string },
  ): Promise<AccountRow> {
    const clean = {
      ...payload,
      current_balance:
        payload.current_balance != null ? round2(Number(payload.current_balance)) : undefined,
    };

    if (payload.id) {
      const { id, ...update } = clean as AccountUpdate & { id: string };
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw mapRepoError(error, "تعذّر تحديث الحساب.");
      return normalizeBalances(data);
    }

    const { data, error } = await supabase
      .from("chart_of_accounts")
      .insert(clean as AccountInsert)
      .select("*")
      .single();
    if (error) throw mapRepoError(error, "تعذّر إنشاء الحساب.");
    return normalizeBalances(data);
  },
};

export type CoaRepository = typeof coaRepository;
