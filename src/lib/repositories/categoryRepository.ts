/**
 * Category Repository — typed access for product_categories.
 * All catches funnel through mapRepoError (Arabic copy).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError } from "./_base";

type Row = Database["public"]["Tables"]["product_categories"]["Row"];
type Insert = Database["public"]["Tables"]["product_categories"]["Insert"];
type Update = Database["public"]["Tables"]["product_categories"]["Update"];

export type ProductCategoryRow = Row;

export interface CategoryTreeNode extends Row {
  children: CategoryTreeNode[];
}

export const categoryRepository = {
  async list(): Promise<Row[]> {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw mapRepoError(error, "تعذّر تحميل التصنيفات.");
    return (data ?? []) as Row[];
  },

  async findById(id: string): Promise<Row | null> {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل التصنيف.");
    return (data as Row) ?? null;
  },

  async create(payload: Insert): Promise<void> {
    const { error } = await supabase.from("product_categories").insert(payload);
    if (error) throw mapRepoError(error, "تعذّر إضافة التصنيف.");
  },

  async update(id: string, payload: Update): Promise<void> {
    const { error } = await supabase
      .from("product_categories")
      .update(payload)
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث التصنيف.");
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف التصنيف.");
  },

  /** Build hierarchical tree from a flat list (one extra read avoided). */
  async tree(): Promise<CategoryTreeNode[]> {
    const flat = await this.list();
    const byId = new Map<string, CategoryTreeNode>();
    flat.forEach((c: Row) => byId.set(c.id, { ...c, children: [] }));
    const roots: CategoryTreeNode[] = [];
    byId.forEach((node) => {
      if (node.parent_id && byId.has(node.parent_id)) {
        byId.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  },
};
