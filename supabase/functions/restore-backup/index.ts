/**
 * restore-backup — Safely restores user-uploaded backup data into the
 * current tenant's tables.
 *
 * Security model:
 *   - Caller must be authenticated.
 *   - Caller must be Admin (has_role 'admin') OR Owner of the tenant
 *     (user_tenants.is_owner = true) — fallback: tenant member with admin role.
 *   - Every row is force-rewritten with the caller's current tenant_id,
 *     regardless of what the source file contains. This blocks
 *     cross-tenant injection even if an attacker hand-edits the file.
 *   - Only whitelisted business tables can be restored. System tables
 *     (user_roles, tenants, audit_trail, platform_admins, …) are blocked.
 *
 * Modes:
 *   - append:  insert only; rows whose id already exists are skipped.
 *   - upsert:  insert or update on id conflict.
 *   - replace: delete all rows of selected tables for the current tenant,
 *              then insert. DANGEROUS — requires explicit confirm flag.
 *
 * Input shape (JSON body):
 *   {
 *     "data": { "<table>": [ {row}, ... ], ... },   // already-parsed JSON
 *     "tables": ["customers", "products", ...],     // subset to restore
 *     "mode": "append" | "upsert" | "replace",
 *     "confirm_replace": true                       // required for replace
 *   }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkIdempotency, getIdempotencyKey, getCorrelationId } from "../_shared/idempotency.ts";
import {
  foreignIdIssues,
  referenceIssues,
  referenceValues,
  sanitizeRestoreRows,
  type RestoreColumn,
  type RestoreReference,
  type RestoreRow,
  type RestoreValidationIssue,
} from "../_shared/restoreValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key, x-correlation-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Whitelist of regular business tables that may be restored at any time.
const ALLOWED_TABLES = new Set<string>([
  "customers",
  "customer_addresses",
  "customer_categories",
  "customer_notes",
  "customer_communications",
  "customer_reminders",
  "suppliers",
  "supplier_notes",
  "products",
  "product_categories",
  "product_variants",
  "product_stock",
  "warehouses",
  "quotations",
  "quotation_items",
  "sales_orders",
  "sales_order_items",
  "invoices",
  "invoice_items",
  "payments",
  "purchase_orders",
  "purchase_order_items",
  "supplier_payments",
  "stock_movements",
  "expenses",
  "expense_categories",
  "tasks",
  "employees",
  "bank_accounts",
  "cash_registers",
]);

// Sensitive tables — restoring these can affect access control, audit
// integrity, or platform-level data. They are BLOCKED by default and only
// allowed when the caller:
//   1. Is a platform admin (has_role 'admin'), AND
//   2. Explicitly sets `allow_sensitive: true` in the request body.
// Owner-of-tenant alone is NOT enough.
const SENSITIVE_TABLES = new Set<string>([
  "custom_roles",
  "role_section_permissions",
  "role_limits",
  "user_tenants",
  "company_settings",
  "approval_chains",
  "fiscal_periods",
  "chart_of_accounts",
]);

// Tables that are NEVER restorable through this endpoint, no matter who asks.
// They are platform-level or tamper-evident logs.
const FORBIDDEN_TABLES = new Set<string>([
  "tenants",
  "user_roles",
  "platform_admins",
  "audit_trail",
  "activity_logs",
  "restore_snapshots",
  "domain_events",
  "event_metrics",
]);

type Mode = "append" | "upsert" | "replace";

interface RestoreBody {
  data: Record<string, Record<string, unknown>[]>;
  tables: string[];
  mode: Mode;
  confirm_replace?: boolean;
  /**
   * Opt-in flag required to restore tables in SENSITIVE_TABLES.
   * Even with this flag, the caller must be a platform admin.
   */
  allow_sensitive?: boolean;
  /**
   * Optional per-table row caps. Keys are table names, values are the
   * maximum number of rows from `data[table]` to actually restore.
   * Anything beyond the cap is left in the file and reported as `truncated`.
   */
  row_limits?: Record<string, number>;
}

interface TableResult {
  table: string;
  inserted: number;
  skipped: number;
  errors: number;
  /**
   * Rows rejected because their `tenant_id` belonged to another tenant
   * (cross-tenant injection attempt). These rows are NEVER written.
   */
  rejected_foreign_tenant: number;
  /** Distinct foreign tenant IDs found in this table (for the report). */
  foreign_tenant_ids?: string[];
  /** First error message (back-compat). */
  error_sample?: string;
  /** All distinct error messages collected during chunked inserts. */
  error_messages?: string[];
  /** Rows skipped because the caller capped this table via row_limits. */
  truncated?: number;
  /** True when the table is in SENSITIVE_TABLES (surface in report). */
  is_sensitive?: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[restore-backup] request received");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse({ success: false, error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    // Auth client (uses caller's JWT — for identity & RPC auth context).
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return jsonResponse({ success: false, error: "Invalid token", code: "INVALID_TOKEN" }, 401);
    }
    const userId = claims.claims.sub as string;

    // Service-role client (bypasses RLS — required for restore).
    // We compensate by manually enforcing tenant scoping below.
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Resolve current tenant for this user.
    const { data: tenantRow, error: tenantErr } = await supabaseAdmin
      .from("user_tenants")
      .select("tenant_id, is_default, role")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();
    if (tenantErr || !tenantRow?.tenant_id) {
      return jsonResponse(
        { success: false, error: "لم يتم تحديد المستأجر الحالي", code: "NO_TENANT" },
        400,
      );
    }
    const tenantId = tenantRow.tenant_id as string;

    // Authorization: Admin OR Owner of current tenant.
    const { data: isAdminData } = await supabaseAuth.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const isAdmin = isAdminData === true;
    const isOwner = tenantRow.role === "owner";
    if (!isAdmin && !isOwner) {
      return jsonResponse(
        { success: false, error: "لا تملك صلاحية الاستعادة", code: "NO_PERMISSION" },
        403,
      );
    }

    // Idempotency guard — restore is destructive; protect against retries
    const correlationId = getCorrelationId(req);
    const idemKey = getIdempotencyKey(req);
    if (idemKey) {
      const guard = await checkIdempotency(supabaseAdmin, {
        tenantId, userId, operation: 'restore-backup', key: idemKey,
      });
      if (guard.duplicate) {
        console.log(`[restore-backup] [${correlationId}] Idempotent replay rejected`);
        return jsonResponse(
          { success: false, error: 'Duplicate restore request', code: 'IDEMPOTENT_REPLAY' },
          409,
        );
      }
    }

    let body: RestoreBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { data, tables, mode } = body;
    if (!data || typeof data !== "object") {
      return jsonResponse({ success: false, error: "حقل البيانات مفقود", code: "MISSING_DATA" }, 400);
    }
    if (!Array.isArray(tables) || tables.length === 0) {
      return jsonResponse({ success: false, error: "لم يتم اختيار أي جدول", code: "NO_TABLES" }, 400);
    }
    if (!["append", "upsert", "replace"].includes(mode)) {
      return jsonResponse({ success: false, error: "وضع الاستعادة غير صالح", code: "BAD_MODE" }, 400);
    }
    if (mode === "replace" && body.confirm_replace !== true) {
      return jsonResponse(
        {
          success: false,
          error: "وضع الاستبدال الكامل يتطلب تأكيداً صريحاً",
          code: "CONFIRM_REQUIRED",
        },
        400,
      );
    }

    // Validate table names BEFORE any write. Three tiers:
    //   1. FORBIDDEN_TABLES → always rejected (system / audit / platform).
    //   2. SENSITIVE_TABLES → require platform admin AND `allow_sensitive`.
    //   3. ALLOWED_TABLES   → restorable for any authorized caller.
    //   anything else       → unknown table, rejected.
    const forbidden = tables.filter((t) => FORBIDDEN_TABLES.has(t));
    if (forbidden.length > 0) {
      return jsonResponse(
        {
          success: false,
          error: `جداول محظورة لا يمكن استعادتها أبداً: ${forbidden.join(", ")}`,
          code: "TABLE_FORBIDDEN",
          forbidden_tables: forbidden,
        },
        400,
      );
    }

    const sensitiveRequested = tables.filter((t) => SENSITIVE_TABLES.has(t));
    if (sensitiveRequested.length > 0) {
      if (!isAdmin) {
        return jsonResponse(
          {
            success: false,
            error: `استعادة جداول حساسة (${sensitiveRequested.join(", ")}) تتطلب صلاحية مدير منصة.`,
            code: "SENSITIVE_REQUIRES_ADMIN",
            sensitive_tables: sensitiveRequested,
          },
          403,
        );
      }
      if (body.allow_sensitive !== true) {
        return jsonResponse(
          {
            success: false,
            error: `يجب تفعيل خيار "السماح بالجداول الحساسة" صراحة لاستعادة: ${sensitiveRequested.join(", ")}`,
            code: "SENSITIVE_OPT_IN_REQUIRED",
            sensitive_tables: sensitiveRequested,
          },
          400,
        );
      }
    }

    const blocked = tables.filter(
      (t) => !ALLOWED_TABLES.has(t) && !SENSITIVE_TABLES.has(t),
    );
    if (blocked.length > 0) {
      return jsonResponse(
        {
          success: false,
          error: `جداول غير معروفة أو غير مسموح باستعادتها: ${blocked.join(", ")}`,
          code: "TABLE_BLOCKED",
          blocked_tables: blocked,
        },
        400,
      );
    }

    const cappedData: Record<string, RestoreRow[]> = {};
    const truncatedByTable: Record<string, number> = {};
    for (const table of tables) {
      const allRows = data[table];
      if (!Array.isArray(allRows)) {
        cappedData[table] = allRows as unknown as RestoreRow[];
        continue;
      }
      const cap = body.row_limits?.[table];
      const isCapped = typeof cap === "number" && Number.isInteger(cap) && cap >= 0 && cap < allRows.length;
      cappedData[table] = isCapped ? allRows.slice(0, cap) : allRows;
      truncatedByTable[table] = isCapped ? allRows.length - cappedData[table].length : 0;
    }

    const [{ data: columns, error: columnsErr }, { data: references, error: referencesErr }] = await Promise.all([
      supabaseAdmin.rpc("restore_table_contract", { _tables: tables }),
      supabaseAdmin.rpc("restore_reference_contract", { _tables: tables }),
    ]);
    if (columnsErr || referencesErr) throw new Error("Restore contract unavailable");
    const { sanitized: sanitizedByTable, issues } = sanitizeRestoreRows(cappedData, tables, tenantId, (columns ?? []) as RestoreColumn[]);
    const tenantReferences = ((references ?? []) as RestoreReference[]).filter((reference) => reference.target_has_tenant);
    const neededReferences = referenceValues(sanitizedByTable, tenantReferences);
    const availableReferences = new Map<string, Set<string>>();
    for (const [key, valuesSet] of neededReferences) {
      const [targetTable, targetColumn] = key.split(".");
      const values = [...valuesSet];
      const found = new Set<string>();
      for (let i = 0; i < values.length; i += 500) {
        const { data: matches, error } = await supabaseAdmin.from(targetTable).select(targetColumn).eq("tenant_id", tenantId).in(targetColumn, values.slice(i, i + 500));
        if (error) throw new Error("Reference validation unavailable");
        for (const match of matches ?? []) found.add(String((match as unknown as Record<string, unknown>)[targetColumn]));
      }
      availableReferences.set(key, found);
    }
    issues.push(...referenceIssues(sanitizedByTable, tenantReferences, availableReferences));

    const existingIds: Record<string, Array<{ id: string; tenant_id: string }>> = {};
    for (const table of tables) {
      const ids = [...new Set(sanitizedByTable[table].map((row) => row.id).filter((id): id is string => typeof id === "string"))];
      existingIds[table] = [];
      for (let i = 0; i < ids.length; i += 500) {
        const { data: existing, error } = await supabaseAdmin.from(table).select("id, tenant_id").in("id", ids.slice(i, i + 500));
        if (error) throw new Error("Ownership validation unavailable");
        existingIds[table].push(...((existing ?? []) as Array<{ id: string; tenant_id: string }>));
      }
    }
    issues.push(...foreignIdIssues(sanitizedByTable, existingIds, tenantId));
    if (issues.length > 0) {
      return jsonResponse({
        success: false,
        code: "RESTORE_VALIDATION_FAILED",
        error: "تم رفض النسخة قبل أي تعديل لأن بعض البيانات غير مسموح بها أو تخص شركة أخرى",
        tenant_id: tenantId,
        total_inserted: 0,
        total_errors: issues.length,
        total_rejected_foreign_tenant: issues.filter((issue) => issue.message.includes("شركة أخرى")).length,
        results: tables.map((table) => {
          const tableIssues = issues.filter((issue) => issue.table === table);
          const messages = [...new Set(tableIssues.slice(0, 20).map((issue: RestoreValidationIssue) => `صف ${issue.row}${issue.field ? ` / ${issue.field}` : ""}: ${issue.message}`))];
          return { table, inserted: 0, skipped: 0, errors: tableIssues.length, rejected_foreign_tenant: tableIssues.filter((issue) => issue.message.includes("شركة أخرى")).length, truncated: truncatedByTable[table] ?? 0, is_sensitive: SENSITIVE_TABLES.has(table), error_messages: messages, error_sample: messages[0] };
        }),
      });
    }

    // ────────────────────────────────────────────────────────────────
    // SNAPSHOT (auto-backup) — capture current rows of every selected
    // table BEFORE any write. Stored as one JSON blob in private bucket.
    // If snapshot fails, we abort the restore: a restore without an
    // undo path is too risky.
    // ────────────────────────────────────────────────────────────────
    const snapshotId = crypto.randomUUID();
    const snapshotData: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};
    let snapshotTotal = 0;
    try {
      for (const table of tables) {
        const { data: existing, error: snapErr } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq("tenant_id", tenantId);
        if (snapErr) throw new Error(`فشل التقاط ${table}: ${snapErr.message}`);
        const arr = existing ?? [];
        snapshotData[table] = arr;
        rowCounts[table] = arr.length;
        snapshotTotal += arr.length;
      }

      const storagePath = `${tenantId}/${snapshotId}.json`;
      const blob = new Blob([JSON.stringify(snapshotData)], {
        type: "application/json",
      });
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("restore-snapshots")
        .upload(storagePath, blob, {
          contentType: "application/json",
          upsert: false,
        });
      if (uploadErr) throw new Error(`فشل رفع snapshot: ${uploadErr.message}`);

      const { error: insErr } = await supabaseAdmin.from("restore_snapshots").insert({
        id: snapshotId,
        tenant_id: tenantId,
        created_by: userId,
        storage_path: storagePath,
        tables,
        row_counts: rowCounts,
        total_rows: snapshotTotal,
        planned_mode: mode,
        status: "active",
      });
      if (insErr) throw new Error(`فشل تسجيل snapshot: ${insErr.message}`);
    } catch (snapErr) {
      const msg = snapErr instanceof Error ? snapErr.message : "snapshot failed";
      console.error("[restore-backup] snapshot abort:", msg);
      return jsonResponse(
        {
          success: false,
          error: `تعذّر إنشاء نسخة احتياطية تلقائية قبل الاستعادة: ${msg}. تم إلغاء العملية لحماية بياناتك.`,
          code: "SNAPSHOT_FAILED",
        },
        500,
      );
    }

    const results: TableResult[] = [];

    for (const table of tables) {
      const sanitized = sanitizedByTable[table] ?? [];
      const result: TableResult = {
        table,
        inserted: 0,
        skipped: 0,
        errors: 0,
        rejected_foreign_tenant: 0,
        truncated: truncatedByTable[table] ?? 0,
        is_sensitive: SENSITIVE_TABLES.has(table),
      };

      try {
        if (mode === "replace") {
          // Wipe existing tenant rows for this table first.
          const { error: delErr } = await supabaseAdmin
            .from(table)
            .delete()
            .eq("tenant_id", tenantId);
          if (delErr) {
            result.errors = sanitized.length;
            result.error_sample = delErr.message;
            results.push(result);
            continue;
          }
        }

        if (sanitized.length === 0) {
          results.push(result);
          continue;
        }

        // Insert in chunks to avoid payload limits.
        const CHUNK = 500;
        const errorSet = new Set<string>();
        for (let i = 0; i < sanitized.length; i += CHUNK) {
          const slice = sanitized.slice(i, i + CHUNK);
          // We chain `.select('id')` to get back the rows actually written so
          // we can distinguish inserted vs. skipped rows in append mode.
          let resp;
          if (mode === "upsert") {
            resp = await supabaseAdmin
              .from(table)
              .upsert(slice, { onConflict: "id", ignoreDuplicates: false })
              .select("id");
          } else if (mode === "append") {
            resp = await supabaseAdmin
              .from(table)
              .upsert(slice, { onConflict: "id", ignoreDuplicates: true })
              .select("id");
          } else {
            resp = await supabaseAdmin.from(table).insert(slice).select("id");
          }

          if (resp.error) {
            result.errors += slice.length;
            errorSet.add(resp.error.message);
          } else {
            const wrote = resp.data?.length ?? slice.length;
            if (mode === "append") {
              result.inserted += wrote;
              result.skipped += slice.length - wrote;
            } else {
              result.inserted += wrote;
            }
          }
        }
        if (errorSet.size > 0) {
          result.error_messages = Array.from(errorSet);
          result.error_sample = result.error_messages[0];
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors += sanitized.length;
        result.error_sample = message;
        result.error_messages = [message];
      }

      results.push(result);
    }

    // Audit log entry.
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      tenant_id: tenantId,
      action: "restore_backup",
      entity_type: "system",
      entity_id: snapshotId,
      entity_name: `restore (${mode})`,
      new_values: { mode, tables, results, snapshot_id: snapshotId },
    });

    const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    const totalRejectedForeignTenant = results.reduce(
      (s, r) => s + (r.rejected_foreign_tenant ?? 0),
      0,
    );

    return jsonResponse({
      success: totalErrors === 0 && totalRejectedForeignTenant === 0,
      mode,
      tenant_id: tenantId,
      snapshot_id: snapshotId,
      snapshot_total_rows: snapshotTotal,
      total_inserted: totalInserted,
      total_errors: totalErrors,
      total_rejected_foreign_tenant: totalRejectedForeignTenant,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[restore-backup] unexpected:", message);
    return jsonResponse({ success: false, error: message, code: "UNEXPECTED" }, 500);
  }
});
