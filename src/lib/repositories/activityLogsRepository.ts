/**
 * Activity Logs Repository — read-only typed access for entity audit trails.
 * Writes happen via DB triggers + edge functions, never from the UI.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError } from "./_base";

type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];

export const activityLogsRepository = {
  async listForEntity(
    entityType: string,
    entityId: string,
    limit = 20,
  ): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل سجل النشاط.");
    return (data ?? []) as ActivityLog[];
  },
};
