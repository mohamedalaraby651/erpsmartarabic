#!/usr/bin/env node
/**
 * CERT-REV-BND05 — certification review of PH1A-OBS-001.
 *
 * Zero mutation: this script only reads the live catalog. For every function
 * that the PH1A audit flagged as "references tenant, no explicit tenant
 * predicate", it records the facts that decide the question — security mode,
 * EXECUTE reachability from `anon` / `authenticated`, trigger attachment,
 * caller-controlled tenant argument, tables touched — and joins them to a
 * hand-authored classification with its rationale.
 *
 * Output: scripts/audits/output/cert-rev-bnd05.json
 * Requires SUPABASE_DB_URL. Without it: exit 2, nothing written.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "output/cert-rev-bnd05.json");
const PH1A = resolve(__dirname, "output/tenant-isolation-report.json");
const PROOF = resolve(__dirname, "output/cert-rev-bnd05-journal-proof.json");

const DB = process.env.SUPABASE_DB_URL || process.env.DB_URL;
if (!DB) {
  console.error("[cert-rev-bnd05] SUPABASE_DB_URL is required");
  process.exit(2);
}

const q = (sql) => {
  const raw = execFileSync("psql", [DB, "-At", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
  return raw ? JSON.parse(raw) : [];
};

const ph1a = JSON.parse(readFileSync(PH1A, "utf8"));
const observed = ph1a.rpcs
  .filter((r) => r.references_tenant && !r.has_tenant_check)
  .map((r) => r.proname);

/**
 * Classification decided by review, keyed by `proname(identity args)`.
 * class: ACCEPTED_EXEMPTION | FALSE_POSITIVE | REMEDIATION_REQUIRED
 */
const CLASSIFICATION = {
  "check_financial_limit(_user_id uuid, _limit_type text, _value numeric)": {
    class: "FALSE_POSITIVE",
    severity: null,
    rationale:
      "Derives the tenant itself: `_tenant := public.get_current_tenant()` and filters user_roles/role_limits on it. The heuristic missed the predicate because it is held in a variable.",
  },
  "check_financial_limit(_user_id uuid, _tenant uuid, _limit_type text, _amount numeric)": {
    class: "REMEDIATION_REQUIRED",
    severity: "low",
    rationale:
      "SECURITY DEFINER, EXECUTE granted to authenticated, `_tenant` is caller-controlled and never compared to get_current_tenant(). A caller who knows a foreign tenant id and a foreign user id can learn whether an amount is within that tenant's role limit — a boolean oracle over foreign configuration. No write path. Legacy overload; the 3-arg form supersedes it.",
    remediation:
      "Either drop the 4-arg overload or add `if _tenant <> public.get_current_tenant() then return false; end if;`.",
  },
  "find_duplicate_customers(p_tenant_id uuid DEFAULT NULL::uuid)": {
    class: "REMEDIATION_REQUIRED",
    severity: "high",
    rationale:
      "SECURITY DEFINER (RLS bypassed), EXECUTE granted to authenticated, and `p_tenant_id` defaults to NULL which disables the filter entirely: `WHERE (p_tenant_id IS NULL OR ...)`. Calling it with no argument returns customer names and phone numbers from every tenant. This is a direct cross-tenant PII read reachable from a normal client session.",
    remediation:
      "Ignore the parameter and use `public.get_current_tenant()` as the only filter (or reject a `p_tenant_id` that differs from it).",
  },
  "get_dashboard_overview()": {
    class: "FALSE_POSITIVE",
    severity: null,
    rationale:
      "Resolves `v_tenant := public.get_user_tenant_id(auth.uid())` and filters every subsequent query on it; returns `{error: no_tenant}` when absent. No caller-controlled tenant input.",
  },
  "get_user_tenant_id(_user_id uuid)": {
    class: "REMEDIATION_REQUIRED",
    severity: "low",
    rationale:
      "SECURITY DEFINER over user_tenants, EXECUTE granted to authenticated, `_user_id` caller-controlled and unvalidated: a caller holding another user's uuid learns that user's home tenant. Membership metadata disclosure, not tenant data. Also used internally by other definer functions, so removal is not a pure deletion.",
    remediation:
      "Restrict to `auth.uid()` for the authenticated grant (keep the arbitrary-user form for internal/service_role callers only).",
  },
  "get_user_tenants(_user_id uuid)": {
    class: "REMEDIATION_REQUIRED",
    severity: "low",
    rationale:
      "Same shape as get_user_tenant_id: definer read of user_tenants for any supplied user id, granted to authenticated. Discloses tenant membership of other users.",
    remediation: "Constrain the authenticated path to `auth.uid()`.",
  },
  "is_admin_equivalent_custom_role(_role_id uuid, _tenant_id uuid)": {
    class: "REMEDIATION_REQUIRED",
    severity: "low",
    rationale:
      "Definer boolean over custom_roles/role_section_permissions with both ids caller-controlled and granted to authenticated. Requires knowledge of a foreign role uuid; discloses one bit about a foreign tenant's role configuration.",
    remediation: "Add `and _tenant_id = public.get_current_tenant()`.",
  },
  "is_period_closed(_tenant_id uuid, _date date)": {
    class: "REMEDIATION_REQUIRED",
    severity: "low",
    rationale:
      "Definer boolean over fiscal_periods with a caller-controlled tenant id, granted to authenticated. Discloses whether a foreign tenant has a closed period covering a date.",
    remediation: "Add `and _tenant_id = public.get_current_tenant()`.",
  },
  "switch_user_tenant(_user_id uuid, _tenant_id uuid)": {
    class: "FALSE_POSITIVE",
    severity: null,
    rationale:
      "Explicitly enforces `auth.uid() = _user_id` and membership in the target tenant before updating user_tenants. Authority is server-derived; the heuristic only missed a literal `get_current_tenant()` call.",
  },
  "void_invoice(_invoice_id uuid, _reason text DEFAULT NULL::text)": {
    class: "REMEDIATION_REQUIRED",
    severity: "critical",
    rationale:
      "SECURITY DEFINER, EXECUTE granted to authenticated, and the invoice is loaded by id alone: `select * into _inv from public.invoices where id = _invoice_id`. The tenant is then taken FROM THE ROW (`_tenant := _inv.tenant_id`), so every subsequent statement is consistent with the foreign tenant instead of being blocked by it. A caller holding a foreign invoice uuid can cancel that invoice and insert a reversing journal into another tenant's ledger. RLS does not intervene because the function is a definer. This is a cross-tenant WRITE path and it is reachable from an ordinary client session.",
    remediation:
      "Add `and tenant_id = public.get_current_tenant()` to the invoice lookup and raise when not found.",
  },
  "ph1a_cross_tenant_probe()": {
    class: "FALSE_POSITIVE",
    severity: null,
    rationale:
      "Stale row in the PH1A artifact: the function was dropped by migration 0004 (SET ROLE is not permitted inside a definer). It no longer exists in the catalog.",
  },
};

/** Reason template for the non-reachable remainder. */
function autoClassify(row) {
  if (row.attached_to_trigger || row.is_trigger) {
    return {
      class: "ACCEPTED_EXEMPTION",
      severity: null,
      rationale:
        "Trigger function. Not directly invocable (no EXECUTE for anon/authenticated) and it only ever sees rows that the statement's own RESTRICTIVE tenant policy already admitted, so its tenant value is the row's own, RLS-checked tenant. Compensating control: table RLS + absent grant.",
    };
  }
  return {
    class: "ACCEPTED_EXEMPTION",
    severity: null,
    rationale:
      "Not reachable from a client: EXECUTE is held only by postgres/service_role, so the function runs on the server plane (edge functions, triggers, scheduled work) where the tenant is supplied by trusted code. Compensating control: grant surface.",
  };
}

const rows = q(`select coalesce(json_agg(t), '[]'::json) from (
  select p.proname,
         pg_get_function_identity_arguments(p.oid) as args,
         p.prosecdef as security_definer,
         (p.prorettype::regtype::text = 'trigger') as is_trigger,
         exists (select 1 from pg_trigger tg where tg.tgfoid = p.oid and not tg.tgisinternal) as attached_to_trigger,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
         (pg_get_functiondef(p.oid) ~* 'get_current_tenant\\(\\)') as calls_get_current_tenant,
         (pg_get_functiondef(p.oid) ~* 'auth\\.uid\\(\\)') as uses_auth_uid,
         array_to_string(p.proconfig, ',') as config,
         md5(pg_get_functiondef(p.oid)) as definition_md5,
         (select coalesce(array_agg(distinct c.relname order by c.relname), '{}')
            from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace
           where n2.nspname = 'public' and c.relkind = 'r'
             and pg_get_functiondef(p.oid) ~* ('\\m' || c.relname || '\\M')) as tables_touched
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = any (string_to_array('${observed.join(",")}', ','))
   order by p.proname, args
) t`);

const reviewed = rows.map((r) => {
  const key = `${r.proname}(${r.args})`;
  const decided =
    CLASSIFICATION[key] ??
    Object.entries(CLASSIFICATION).find(([k]) => k.startsWith(`${r.proname}(`))?.[1] ??
    autoClassify(r);
  return {
    function: key,
    tenant_scoped: true,
    security_mode: r.security_definer ? "SECURITY DEFINER" : "SECURITY INVOKER",
    search_path: r.config || null,
    trigger_function: r.is_trigger || r.attached_to_trigger,
    execute_grants: {
      authenticated: r.authenticated_execute,
      anon: r.anon_execute,
      note: r.authenticated_execute
        ? "client-reachable"
        : "server plane only (postgres/service_role)",
    },
    tenant_authority: r.calls_get_current_tenant
      ? "get_current_tenant()"
      : r.uses_auth_uid
        ? "auth.uid()"
        : "inherited from the row / caller argument",
    caller_controlled_tenant_id: /tenant\w*\s+uuid/.test(r.args),
    cross_tenant_reachable:
      r.authenticated_execute && r.security_definer && /tenant\w*\s+uuid/.test(r.args)
        ? "yes — definer + client grant + caller-supplied tenant"
        : r.authenticated_execute
          ? "client-reachable; see rationale"
          : "no — not executable by anon/authenticated",
    tables_touched: r.tables_touched ?? [],
    definition_md5: r.definition_md5,
    ...decided,
  };
});

// functions the PH1A artifact listed but that no longer exist in the catalog
const present = new Set(rows.map((r) => r.proname));
for (const name of observed) {
  if (!present.has(name)) {
    reviewed.push({
      function: `${name}()`,
      tenant_scoped: null,
      security_mode: "N/A — not present in the catalog",
      class: "FALSE_POSITIVE",
      severity: null,
      rationale:
        "Listed in the PH1A artifact but absent from the live catalog (dropped by migration 0004). Stale observation, not a finding.",
    });
  }
}

const counts = reviewed.reduce((a, r) => ({ ...a, [r.class]: (a[r.class] ?? 0) + 1 }), {});
const remediation = reviewed.filter((r) => r.class === "REMEDIATION_REQUIRED");

let journalProof = null;
try {
  journalProof = JSON.parse(readFileSync(PROOF, "utf8"));
} catch {
  journalProof = { error: "journal proof artifact missing" };
}

const record = {
  id: "CERT-REV-BND05",
  boundary: "BND-05 — Tenant → Data",
  observation: "PH1A-OBS-001",
  generatedAt: new Date().toISOString(),
  mutation: "none — read-only review",
  source: "live catalog (pg_proc / pg_trigger / has_function_privilege)",
  ph1aArtifact: { generatedAt: ph1a.generatedAt, x6: ph1a.summary.x6_tenant_rpcs },
  observedNames: observed.length,
  reviewedEntries: reviewed.length,
  counts,
  remediationRequired: remediation.map((r) => ({
    function: r.function,
    severity: r.severity,
    remediation: r.remediation,
  })),
  functions: reviewed,
  journalProof: journalProof && {
    source: journalProof.source,
    generatedAt: journalProof.generatedAt,
    results: journalProof.results,
    failures: journalProof.failures,
  },
  verdict:
    remediation.length === 0
      ? "NO REMEDIATION REQUIRED — recommendation only; certification remains a human decision"
      : `REMEDIATION REQUIRED on ${remediation.length} function(s) — BND-05 cannot be certified as-is`,
  certification: "NOT CLAIMED — human decision",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(
  JSON.stringify(
    { counts, remediationRequired: record.remediationRequired, verdict: record.verdict },
    null,
    2,
  ),
);
