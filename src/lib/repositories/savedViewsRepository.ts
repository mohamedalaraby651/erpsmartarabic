/**
 * Saved Views Repository — encapsulates user_saved_views table.
 * Used by customers/suppliers (and any future module) list filter persistence.
 */
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "./_base";

export type SavedViewSection = "customers" | "suppliers" | "invoices" | "products";

export interface SavedViewRow<F = Record<string, unknown>> {
  id: string;
  name: string;
  section: SavedViewSection | string;
  filters: F;
  created_at?: string;
}

export const savedViewsRepository = {
  async list<F = Record<string, unknown>>(
    section: SavedViewSection,
    userId?: string,
  ): Promise<SavedViewRow<F>[]> {
    let q = supabase
      .from("user_saved_views")
      .select("id, name, section, filters, created_at")
      .eq("section", section)
      .order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    const data = await unwrap(q);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      section: row.section,
      filters: row.filters as F,
      created_at: row.created_at,
    }));
  },

  async create<F = Record<string, unknown>>(input: {
    userId: string;
    section: SavedViewSection;
    name: string;
    filters: F;
  }): Promise<void> {
    await unwrap(
      supabase.from("user_saved_views").insert({
        user_id: input.userId,
        section: input.section,
        name: input.name,
        filters: input.filters as never,
      }),
    );
  },

  async remove(id: string): Promise<void> {
    await unwrap(supabase.from("user_saved_views").delete().eq("id", id));
  },

  /** OPA-CUST-UI-005 B1 — rename and/or replace the JSON payload of an existing view. */
  async update<F = Record<string, unknown>>(
    id: string,
    patch: { name?: string; filters?: F },
  ): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.filters !== undefined) row.filters = patch.filters;
    if (!Object.keys(row).length) return;
    await unwrap(supabase.from("user_saved_views").update(row as never).eq("id", id));
  },
};
