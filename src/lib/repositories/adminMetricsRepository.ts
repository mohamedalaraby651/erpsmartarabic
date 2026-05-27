/**
 * Admin Metrics & Audit Repository — extra read paths used by the
 * admin dashboards (audit_trail, activity_logs, performance_metrics,
 * rate limits, role permissions, dashboard counters). Kept in a
 * sibling file to avoid bloating `adminRepository`.
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export interface AuditTrailEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditTrailFilters {
  tableName?: string;
  operation?: "INSERT" | "UPDATE" | "DELETE";
  limit?: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  entity_id: string | null;
  user_id: string;
  created_at: string;
  ip_address: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export interface ActivityLogFilters {
  search?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface PerformanceMetricRow {
  id: string;
  metric_name: string;
  metric_value: number;
  recorded_at: string;
  labels: Record<string, string> | null;
}

export const adminMetricsRepository = {
  // ---------- Audit Trail ----------
  async getAuditTrail(
    filters: AuditTrailFilters = {},
  ): Promise<AuditTrailEntry[]> {
    let q = supabase
      .from("audit_trail" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 200);
    if (filters.tableName) q = q.eq("table_name", filters.tableName);
    if (filters.operation) q = q.eq("operation", filters.operation);
    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل سجل التدقيق.");
    return (data ?? []) as unknown as AuditTrailEntry[];
  },

  // ---------- Activity Logs ----------
  async getActivityLog(
    filters: ActivityLogFilters = {},
  ): Promise<ActivityLogEntry[]> {
    let q = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 500);
    if (filters.search) q = q.or(`entity_name.ilike.%${filters.search}%`);
    if (filters.action && filters.action !== "all")
      q = q.eq("action", filters.action);
    if (filters.entityType && filters.entityType !== "all")
      q = q.eq("entity_type", filters.entityType);
    if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
    if (filters.dateTo) q = q.lte("created_at", filters.dateTo + "T23:59:59");
    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل سجل النشاطات.");
    return (data ?? []) as ActivityLogEntry[];
  },

  // ---------- System / Performance Metrics ----------
  async getSystemMetrics() {
    const [{ data: metrics, error: mErr }, { data: configs, error: cErr }, { data: usage, error: uErr }] =
      await Promise.all([
        supabase
          .from("performance_metrics" as never)
          .select("*")
          .order("recorded_at", { ascending: false })
          .limit(100),
        supabase
          .from("rate_limit_config")
          .select("*")
          .eq("is_active", true)
          .order("endpoint"),
        supabase.from("rate_limits").select("*").order("endpoint"),
      ]);
    if (mErr) throw mapRepoError(mErr, "تعذّر تحميل مقاييس الأداء.");
    if (cErr) throw mapRepoError(cErr, "تعذّر تحميل حدود الاستخدام.");
    if (uErr) throw mapRepoError(uErr, "تعذّر تحميل استخدام الحدود.");
    return {
      metrics: (metrics ?? []) as unknown as PerformanceMetricRow[],
      rateLimitConfigs: configs ?? [],
      rateLimitUsage: usage ?? [],
    };
  },

  // ---------- Admin Dashboard Counters ----------
  async getDashboardCounters() {
    const today = new Date().toISOString().split("T")[0];
    const [
      { data: profiles, error: pErr },
      { data: roles, error: rErr },
      { data: activities, error: aErr },
      { data: lowStock },
      { data: stockData },
      { data: overdueInvoices },
    ] = await Promise.all([
      supabase.from("profiles").select("id"),
      supabase.from("custom_roles").select("id").eq("is_active", true),
      supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("products")
        .select("id, name, min_stock")
        .eq("is_active", true),
      supabase.from("product_stock").select("product_id, quantity"),
      supabase
        .from("invoices")
        .select("id")
        .eq("payment_status", "pending")
        .lt("due_date", today),
    ]);
    if (pErr) throw mapRepoError(pErr, "تعذّر تحميل المستخدمين.");
    if (rErr) throw mapRepoError(rErr, "تعذّر تحميل الأدوار.");
    if (aErr) throw mapRepoError(aErr, "تعذّر تحميل النشاطات.");

    const lowStockCount =
      (lowStock ?? []).filter((p: { id: string; min_stock: number | null }) => {
        const totalStock =
          (stockData ?? [])
            .filter((s: { product_id: string }) => s.product_id === p.id)
            .reduce(
              (sum: number, s: { quantity: number }) => sum + s.quantity,
              0,
            ) || 0;
        return totalStock < (p.min_stock || 0);
      }).length || 0;

    const alerts: { type: "warning" | "error"; message: string; count: number }[] = [];
    if (lowStockCount > 0)
      alerts.push({ type: "warning", message: "منتجات منخفضة المخزون", count: lowStockCount });
    if (overdueInvoices && overdueInvoices.length > 0)
      alerts.push({ type: "error", message: "فواتير متأخرة", count: overdueInvoices.length });

    return {
      totalUsers: profiles?.length || 0,
      activeRoles: roles?.length || 0,
      recentActivities: activities ?? [],
      alerts,
    };
  },
};
