/**
 * rollback-restore — Restores a tenant's data to the state captured by a
 * pre-restore snapshot.
 *
 * Flow:
 *   1. Verify caller is Admin or Owner of the snapshot's tenant.
 *   2. Verify snapshot status === 'active' (not already rolled back / expired).
 *   3. Download the JSON blob from the private `restore-snapshots` bucket.
 *   4. For each table in the snapshot:
 *        a. DELETE all current tenant rows.
 *        b. Re-insert the snapshot rows (chunked).
 *      tenant_id is force-rewritten as a defense-in-depth check.
 *   5. Mark the snapshot as `rolled_back` and log to activity_logs.
 *
 * Body: { "snapshot_id": "<uuid>" }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TableResult {
  table: string;
  restored: number;
  errors: number;
  error_messages?: string[];
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

  console.log("[rollback-restore] request received");

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

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return jsonResponse({ success: false, error: "Invalid token", code: "INVALID_TOKEN" }, 401);
    }
    const userId = claims.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Parse body.
    let body: { snapshot_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }
    const snapshotId = body.snapshot_id;
    if (!snapshotId || typeof snapshotId !== "string") {
      return jsonResponse(
        { success: false, error: "snapshot_id مطلوب", code: "MISSING_ID" },
        400,
      );
    }

    // Load snapshot record.
    const { data: snap, error: snapErr } = await supabaseAdmin
      .from("restore_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .maybeSingle();
    if (snapErr || !snap) {
      return jsonResponse(
        { success: false, error: "النسخة الاحتياطية غير موجودة", code: "NOT_FOUND" },
        404,
      );
    }

    if (snap.status !== "active") {
      return jsonResponse(
        {
          success: false,
          error: `لا يمكن التراجع — حالة النسخة: ${snap.status}`,
          code: "INVALID_STATUS",
        },
        400,
      );
    }

    // Authorization: Admin OR Owner of the snapshot's tenant.
    const { data: isAdminData } = await supabaseAuth.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const isAdmin = isAdminData === true;

    let isOwner = false;
    if (!isAdmin) {
      const { data: ut } = await supabaseAdmin
        .from("user_tenants")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", snap.tenant_id)
        .maybeSingle();
      isOwner = ut?.role === "owner";
    }
    if (!isAdmin && !isOwner) {
      return jsonResponse(
        { success: false, error: "لا تملك صلاحية التراجع", code: "NO_PERMISSION" },
        403,
      );
    }

    // Download snapshot blob.
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("restore-snapshots")
      .download(snap.storage_path);
    if (dlErr || !fileData) {
      return jsonResponse(
        { success: false, error: `تعذّر تنزيل ملف النسخة: ${dlErr?.message ?? "unknown"}`, code: "DOWNLOAD_FAILED" },
        500,
      );
    }

    let snapshotJson: Record<string, Record<string, unknown>[]>;
    try {
      const text = await fileData.text();
      snapshotJson = JSON.parse(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "parse error";
      return jsonResponse(
        { success: false, error: `ملف النسخة تالف: ${msg}`, code: "CORRUPT" },
        500,
      );
    }

    const tables: string[] = Array.isArray(snap.tables) ? snap.tables : [];
    const tenantId = snap.tenant_id as string;
    const results: TableResult[] = [];

    for (const table of tables) {
      const rows = Array.isArray(snapshotJson[table]) ? snapshotJson[table] : [];
      const result: TableResult = { table, restored: 0, errors: 0 };
      const errorSet = new Set<string>();

      // Defense in depth: rewrite tenant_id on every row.
      const sanitized = rows.map((row) => ({
        ...row,
        tenant_id: tenantId,
      }));

      try {
        // Wipe current tenant rows.
        const { error: delErr } = await supabaseAdmin
          .from(table)
          .delete()
          .eq("tenant_id", tenantId);
        if (delErr) {
          errorSet.add(`delete: ${delErr.message}`);
          result.errors = sanitized.length;
          if (errorSet.size > 0) result.error_messages = Array.from(errorSet);
          results.push(result);
          continue;
        }

        if (sanitized.length === 0) {
          results.push(result);
          continue;
        }

        const CHUNK = 500;
        for (let i = 0; i < sanitized.length; i += CHUNK) {
          const slice = sanitized.slice(i, i + CHUNK);
          const resp = await supabaseAdmin.from(table).insert(slice).select("id");
          if (resp.error) {
            result.errors += slice.length;
            errorSet.add(resp.error.message);
          } else {
            result.restored += resp.data?.length ?? slice.length;
          }
        }
        if (errorSet.size > 0) result.error_messages = Array.from(errorSet);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors += sanitized.length;
        errorSet.add(msg);
        result.error_messages = Array.from(errorSet);
      }

      results.push(result);
    }

    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    const totalRestored = results.reduce((s, r) => s + r.restored, 0);
    const finalStatus = totalErrors === 0 ? "rolled_back" : "failed";

    // Mark snapshot.
    await supabaseAdmin
      .from("restore_snapshots")
      .update({
        status: finalStatus,
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: userId,
      })
      .eq("id", snapshotId);

    // Audit log.
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      tenant_id: tenantId,
      action: "rollback_restore",
      entity_type: "system",
      entity_id: snapshotId,
      entity_name: `rollback snapshot ${snapshotId.slice(0, 8)}`,
      new_values: { snapshot_id: snapshotId, results, total_restored: totalRestored },
    });

    return jsonResponse({
      success: totalErrors === 0,
      snapshot_id: snapshotId,
      tenant_id: tenantId,
      total_restored: totalRestored,
      total_errors: totalErrors,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[rollback-restore] unexpected:", message);
    return jsonResponse({ success: false, error: message, code: "UNEXPECTED" }, 500);
  }
});
