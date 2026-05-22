/**
 * Tasks Repository — CRUD for the `tasks` table.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";
import type { Database } from "@/integrations/supabase/types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  priority?: string;
  due_date?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
}

export const tasksRepository = {
  async list(): Promise<TaskRow[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل المهام.");
    return (data ?? []) as TaskRow[];
  },

  async create(input: TaskCreateInput): Promise<void> {
    const { error } = await supabase.from("tasks").insert({
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "medium",
      due_date: input.due_date || null,
      created_by: input.created_by ?? null,
      assigned_to: input.assigned_to ?? input.created_by ?? null,
    });
    if (error) throw mapRepoError(error, "تعذّر إضافة المهمة.");
  },

  async toggleCompletion(id: string, is_completed: boolean): Promise<void> {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed })
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث حالة المهمة.");
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف المهمة.");
  },
};
