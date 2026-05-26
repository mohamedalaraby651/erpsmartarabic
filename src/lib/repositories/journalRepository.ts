/**
 * Journal Repository — typed data access for accounting journals & entries.
 *
 * Creation goes through the `create-journal` Edge Function (idempotent),
 * everything else is direct table access guarded by RLS policies from
 * Phase 1 (WITH CHECK on tenant + accounting.create permission).
 *
 * Posting and reversal are encapsulated here so pages don't need to know the
 * underlying mechanism (simple UPDATE for posting; insert mirrored journal
 * for reversal).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError, unwrap } from "./_base";
import { buildRequestHeaders, newIdempotencyKey } from "@/lib/requestHeaders";

type T = Database["public"]["Tables"];
export type JournalRow = T["journals"]["Row"] & {
  fiscal_periods?: { name: string } | null;
};
export type JournalEntryRow = T["journal_entries"]["Row"] & {
  chart_of_accounts?: { code: string; name: string } | null;
};

export interface JournalFilters {
  status?: "posted" | "draft" | "all";
  fiscalPeriodId?: string;
  sourceType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface JournalLineInput {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  memo?: string | null;
}

export interface JournalHeaderInput {
  journal_date: string;
  description: string;
  fiscal_period_id?: string;
  source_type?: string;
  source_id?: string;
}

const round2 = (n: number) => Math.round(Number(n) * 100) / 100;

function normalizeJournal(j: JournalRow): JournalRow {
  return {
    ...j,
    total_debit: round2(j.total_debit ?? 0),
    total_credit: round2(j.total_credit ?? 0),
  };
}

export const journalRepository = {
  async listJournals(filters: JournalFilters = {}): Promise<JournalRow[]> {
    let q = supabase
      .from("journals")
      .select("*, fiscal_periods(name)")
      .order("journal_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.status === "posted") q = q.eq("is_posted", true);
    if (filters.status === "draft") q = q.eq("is_posted", false);
    if (filters.fiscalPeriodId) q = q.eq("fiscal_period_id", filters.fiscalPeriodId);
    if (filters.sourceType) q = q.eq("source_type", filters.sourceType);
    if (filters.from) q = q.gte("journal_date", filters.from);
    if (filters.to) q = q.lte("journal_date", filters.to);
    if (filters.limit) q = q.limit(filters.limit);

    const data = await unwrap(q, "تعذّر تحميل القيود.");
    return (data ?? []).map(normalizeJournal);
  },

  async getJournal(id: string): Promise<JournalRow | null> {
    const { data, error } = await supabase
      .from("journals")
      .select("*, fiscal_periods(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل القيد.");
    return data ? normalizeJournal(data) : null;
  },

  async getEntries(journalId: string): Promise<JournalEntryRow[]> {
    const data = await unwrap(
      supabase
        .from("journal_entries")
        .select("*, chart_of_accounts(code, name)")
        .eq("journal_id", journalId)
        .order("line_number"),
      "تعذّر تحميل بنود القيد.",
    );
    return (data ?? []).map((e) => ({
      ...e,
      debit_amount: round2(e.debit_amount ?? 0),
      credit_amount: round2(e.credit_amount ?? 0),
    }));
  },

  /**
   * Create a manual journal via the idempotent `create-journal` Edge Function.
   * Lines must already be balanced (Σ debit == Σ credit). Returns journal_id.
   */
  async createManualJournal(
    header: JournalHeaderInput,
    lines: JournalLineInput[],
  ): Promise<{ journal_id: string }> {
    const cleanLines = lines.map((l, idx) => ({
      line_number: idx + 1,
      account_id: l.account_id,
      debit_amount: round2(Number(l.debit_amount) || 0),
      credit_amount: round2(Number(l.credit_amount) || 0),
      memo: l.memo ?? null,
    }));

    const totalDebit = cleanLines.reduce((s, l) => s + l.debit_amount, 0);
    const totalCredit = cleanLines.reduce((s, l) => s + l.credit_amount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error("القيد غير متوازن: إجمالي المدين ≠ إجمالي الدائن.");
    }
    if (totalDebit <= 0) {
      throw new Error("يجب إدخال مبالغ في القيد.");
    }

    const { data, error } = await supabase.functions.invoke("create-journal", {
      body: {
        journal_date: header.journal_date,
        description: header.description,
        fiscal_period_id: header.fiscal_period_id,
        source_type: header.source_type ?? "manual",
        source_id: header.source_id,
        entries: cleanLines,
      },
      headers: buildRequestHeaders({ idempotencyKey: newIdempotencyKey() }),
    });
    if (error) throw mapRepoError(error, "تعذّر إنشاء القيد.");
    const res = data as { success: boolean; journal_id?: string; error?: string };
    if (!res?.success || !res.journal_id) {
      throw new Error(res?.error || "فشل إنشاء القيد.");
    }
    return { journal_id: res.journal_id };
  },

  /** Mark a draft journal as posted. RLS + trigger enforce fiscal-period rules. */
  async postJournal(id: string): Promise<void> {
    const { error } = await supabase
      .from("journals")
      .update({ is_posted: true, posted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر ترحيل القيد.");
  },

  /**
   * Reverse a posted journal by inserting a mirror journal (debits↔credits)
   * referencing the original via `source_type='reversal'` and `source_id=id`.
   * The new journal is created as a draft so an accountant can review before
   * posting.
   */
  async reverseJournal(id: string, reason: string): Promise<{ journal_id: string }> {
    const original = await this.getJournal(id);
    if (!original) throw new Error("القيد الأصلي غير موجود.");
    if (!original.is_posted) {
      throw new Error("لا يمكن عكس قيد غير مرحّل.");
    }
    const entries = await this.getEntries(id);
    if (entries.length === 0) throw new Error("القيد الأصلي لا يحتوي بنوداً.");

    const today = new Date().toISOString().slice(0, 10);
    return this.createManualJournal(
      {
        journal_date: today,
        description: `عكس قيد ${original.journal_number}: ${reason}`.slice(0, 500),
        fiscal_period_id: original.fiscal_period_id,
        source_type: "reversal",
        source_id: id,
      },
      entries.map((e) => ({
        account_id: e.account_id,
        debit_amount: round2(Number(e.credit_amount) || 0),
        credit_amount: round2(Number(e.debit_amount) || 0),
        memo: `عكس: ${e.memo ?? ""}`.slice(0, 500),
      })),
    );
  },
};

export type JournalRepository = typeof journalRepository;
