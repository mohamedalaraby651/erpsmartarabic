// Edge function: render-pdf
// Stub implementation for Phase 4 of the PDF v2 migration plan.
//
// Responsibilities (current scope):
//   • Verify JWT and resolve the caller's tenant.
//   • Create a row in `pdf_export_jobs` with status='queued'.
//   • Return the job id so the client can poll.
//
// Deferred to a follow-up wave:
//   • Actual Puppeteer/Chromium rendering for 50+ page reports.
//   • Uploading the produced PDF to Supabase Storage.
//   • Optional email delivery via Resend.
//
// Keeping this slim avoids shipping a 100MB+ Chromium dependency before the
// frontend is wired to call it. The client can already enqueue a job and the
// row + RLS are validated end-to-end against the new `pdf_export_jobs` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RenderRequest {
  docType: string;
  data: Record<string, unknown>;
  deliver?: "download" | "email";
  recipientEmail?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth-scoped client — RLS applies and `requested_by = auth.uid()` enforced.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RenderRequest;
    if (!body?.docType) {
      return new Response(JSON.stringify({ error: "docType is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant via the same RPC the frontend uses.
    const { data: tenantId, error: tenantErr } = await supabase.rpc(
      "get_user_tenant_id",
      { _user_id: userRes.user.id },
    );
    if (tenantErr || !tenantId) {
      return new Response(JSON.stringify({ error: "No tenant for user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: insertErr } = await supabase
      .from("pdf_export_jobs")
      .insert({
        tenant_id: tenantId,
        doc_type: body.docType,
        status: "queued",
        requested_by: userRes.user.id,
        delivered_to_email: body.deliver === "email" ? body.recipientEmail ?? null : null,
        payload: body.data ?? {},
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase-4 follow-up: hand off to a worker (pg_cron or background task)
    // that picks up rows where status='queued' and renders them via Puppeteer.

    return new Response(
      JSON.stringify({
        ok: true,
        jobId: job.id,
        status: "queued",
        message:
          "Job enqueued. Heavy rendering worker will pick it up. For documents <50 pages prefer the in-browser v2 engine.",
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
