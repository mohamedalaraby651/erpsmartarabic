/**
 * Notifications Repository — encapsulates the notifications table.
 * Used by alert notifier and any feature that needs to write in-app alerts.
 */
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "./_base";

export interface NotificationCreate {
  user_id: string;
  title: string;
  message: string;
  type: "alert" | "warning" | "info" | string;
  link?: string | null;
}

export const notificationsRepository = {
  /**
   * Returns the title|link composite keys for notifications created today
   * matching the provided links — used for deduplication.
   */
  async existingTodayKeys(userId: string, links: string[]): Promise<Set<string>> {
    if (!links.length) return new Set();
    const today = new Date().toISOString().slice(0, 10);
    const data = await unwrap(
      supabase
        .from("notifications")
        .select("link, title")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`)
        .in("link", links),
    );
    return new Set((data ?? []).map((r) => `${r.title}|${r.link}`));
  },

  /**
   * Creates a notification through the server-authoritative RPC.
   * Tenant is derived server-side; direct table INSERT is revoked.
   */
  async create(row: NotificationCreate): Promise<string> {
    const { data, error } = await supabase.rpc("create_tenant_notification", {
      target_user_id: row.user_id,
      title: row.title,
      message: row.message,
      notification_type: row.type,
      link: row.link ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  async createMany(rows: NotificationCreate[]): Promise<void> {
    for (const row of rows) {
      await notificationsRepository.create(row);
    }
  },
};

export const notificationsRepository = {
  /**
   * Returns the title|link composite keys for notifications created today
   * matching the provided links — used for deduplication.
   */
  async existingTodayKeys(userId: string, links: string[]): Promise<Set<string>> {
    if (!links.length) return new Set();
    const today = new Date().toISOString().slice(0, 10);
    const data = await unwrap(
      supabase
        .from("notifications")
        .select("link, title")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`)
        .in("link", links),
    );
    return new Set((data ?? []).map((r) => `${r.title}|${r.link}`));
  },

  async insertMany(rows: NotificationInsert[]): Promise<void> {
    if (!rows.length) return;
    await unwrap(supabase.from("notifications").insert(rows));
  },
};
