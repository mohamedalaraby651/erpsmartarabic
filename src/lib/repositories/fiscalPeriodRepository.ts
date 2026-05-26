/**
 * Fiscal Period Repository — list/open/close accounting periods.
 * All writes are RLS-gated by the Phase 1 policies (tenant + accounting.create).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError, unwrap } from "./_base";

type T = Database["public"]["Tables"];
export type FiscalPeriodRow = T["fiscal_periods"]["Row"];
export type FiscalPeriodInsert = T["fiscal_periods"]["Insert"];

export const fiscalPeriodRepository = {
  async listPeriods(): Promise<FiscalPeriodRow[]> {
    const data = await unwrap(
      supabase.from("fiscal_periods").select("*").order("start_date", { ascending: false }),
      "تعذّر تحميل الفترات المالية.",
    );
    return data ?? [];
  },

  async getCurrent(date = new Date().toISOString().slice(0, 10)): Promise<FiscalPeriodRow | null> {
    const { data, error } = await supabase
      .from("fiscal_periods")
      .select("*")
      .lte("start_date", date)
      .gte("end_date", date)
      .eq("is_closed", false)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحديد الفترة المالية الحالية.");
    return data ?? null;
  },

  async createPeriod(payload: FiscalPeriodInsert): Promise<FiscalPeriodRow> {
    const { data, error } = await supabase
      .from("fiscal_periods")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw mapRepoError(error, "تعذّر إنشاء الفترة المالية.");
    return data;
  },

  async openPeriod(id: string): Promise<void> {
    const { error } = await supabase
      .from("fiscal_periods")
      .update({ is_closed: false, closed_at: null, closed_by: null })
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر فتح الفترة المالية.");
  },

  async closePeriod(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("fiscal_periods")
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: userData.user?.id ?? null,
      })
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر إغلاق الفترة المالية.");
  },
};

export type FiscalPeriodRepository = typeof fiscalPeriodRepository;
