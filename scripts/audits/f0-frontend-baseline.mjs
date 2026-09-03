#!/usr/bin/env node
/**
 * f0-frontend-baseline.mjs — Track A · F0 Frontend Platform Baseline.
 *
 * MEASUREMENT AND CLASSIFICATION ONLY. This script never mutates source.
 * It re-derives the full import-layer violation list (same rules as
 * scripts/audits/dep-graph.mjs), classifies every single occurrence, and
 * emits scripts/audits/output/f0-frontend-baseline.json.
 *
 * Classification taxonomy (per human-authorized F0 scope):
 *   LEGITIMATE_EXCEPTION — direct access is architecturally correct
 *                          (auth session, storage, realtime channels,
 *                          infrastructure adapters).
 *   TRANSITIONAL        — sanctioned seam that will move behind a query
 *                          service / repository facade in F1–F2.
 *   FALSE_POSITIVE      — edge is type-only or points at an already
 *                          sanctioned facade/barrel.
 *   ACTUAL_VIOLATION    — presentation code performing data access that
 *                          must be redirected in F1/F2.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "output/f0-frontend-baseline.json");

function madge() {
  const tmp = resolve(__dirname, "output/.f0-madge.json");
  try {
    execSync(
      `bunx madge --json --extensions ts,tsx,js,jsx --ts-config tsconfig.json src > ${tmp}`,
      { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], maxBuffer: 256 * 1024 * 1024 },
    );
  } catch { /* madge may exit non-zero; file still written */ }
  const raw = readFileSync(tmp, "utf8");
  try { unlinkSync(tmp); } catch {}
  return JSON.parse(raw);
}

const RULES = [
  { name: "components→repositories", from: /^components\//, to: /^lib\/repositories\// },
  { name: "components→services", from: /^components\//, to: /^lib\/services\// },
  { name: "pages→repositories", from: /^pages\//, to: /^lib\/repositories\// },
  { name: "hooks→supabase-client", from: /^hooks\//, to: /^integrations\/supabase\/client/ },
  { name: "components→supabase-client", from: /^components\//, to: /^integrations\/supabase\/client/ },
  { name: "pages→supabase-client", from: /^pages\//, to: /^integrations\/supabase\/client/ },
  { name: "domain→ui", from: /^domain\//, to: /^components\// },
];

const graph = madge();
const sorted = {};
for (const k of Object.keys(graph).sort()) sorted[k] = [...graph[k]].sort();

const read = (rel) => {
  const p = resolve(ROOT, "src", rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
};

/** Detect which Supabase/data capability the importer actually uses. */
function usageOf(src) {
  const kinds = [];
  if (/supabase\.auth\./.test(src)) kinds.push("auth");
  if (/supabase\.storage\./.test(src)) kinds.push("storage");
  if (/supabase\s*\.\s*channel\(|removeChannel\(/.test(src)) kinds.push("realtime");
  if (/supabase\.functions\.invoke/.test(src)) kinds.push("edge-function");
  if (/supabase\.rpc\(/.test(src)) kinds.push("rpc");
  if (/supabase\s*\n?\s*\.from\(/.test(src)) kinds.push("table-query");
  return kinds;
}

function isTypeOnly(src, target) {
  const leaf = target.split("/").pop().replace(/\.(ts|tsx)$/, "");
  const re = new RegExp(`import\\s+type[^;]*${leaf}`);
  return re.test(src);
}

function classify(rule, from, to, src) {
  const kinds = usageOf(src);
  const only = (...allowed) => kinds.length > 0 && kinds.every((k) => allowed.includes(k));

  if (rule.endsWith("supabase-client")) {
    if (only("auth")) {
      return ["LEGITIMATE_EXCEPTION", "auth-session access; identity is a kernel port, not a repository concern"];
    }
    if (only("auth", "storage") || only("storage")) {
      return ["LEGITIMATE_EXCEPTION", "object-storage access; no relational read/write behind the repository layer"];
    }
    if (only("realtime") || only("auth", "realtime") || only("realtime", "storage")) {
      return ["LEGITIMATE_EXCEPTION", "realtime channel subscription; no repository equivalent exists yet by design"];
    }
    if (kinds.length === 0) {
      return ["FALSE_POSITIVE", "client imported but no data-access call site detected in this module"];
    }
    if (rule.startsWith("hooks")) {
      return ["TRANSITIONAL", "hook is the sanctioned data-access seam; moves behind a query service in F2"];
    }
    return ["ACTUAL_VIOLATION", `presentation module performs ${kinds.join("+")} directly; redirect through query facade in F2`];
  }

  if (isTypeOnly(src, to)) {
    return ["FALSE_POSITIVE", "type-only import; erased at compile time, no runtime coupling"];
  }
  if (/^lib\/repositories\/_base/.test(to)) {
    return ["TRANSITIONAL", "shared base types/utilities of the repository layer; extract to a contract module in F1"];
  }
  if (rule === "components→services") {
    return ["TRANSITIONAL", "application service invoked from UI; moves behind an application command facade in F2"];
  }
  return ["ACTUAL_VIOLATION", "presentation module imports a repository directly; redirect through @/application/queries in F2"];
}

const rows = [];
for (const [importer, deps] of Object.entries(sorted)) {
  const src = read(importer);
  for (const dep of deps) {
    for (const rule of RULES) {
      if (!rule.from.test(importer) || !rule.to.test(dep)) continue;
      const [classification, rationale] = classify(rule.name, importer, dep, src);
      rows.push({ rule: rule.name, from: importer, to: dep, classification, rationale });
    }
  }
}
rows.sort((a, b) => (a.rule + a.from + a.to).localeCompare(b.rule + b.from + b.to));

const byClass = {};
const byRuleClass = {};
for (const r of rows) {
  byClass[r.classification] = (byClass[r.classification] ?? 0) + 1;
  byRuleClass[r.rule] ??= {};
  byRuleClass[r.rule][r.classification] = (byRuleClass[r.rule][r.classification] ?? 0) + 1;
}

const load = (rel) => {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};
const sha = (rel) => {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null;
};

const dep = load("scripts/audits/output/dependency-report.json");
const ds = load("scripts/audits/output/wave2-discovery/design-system-inventory.json");
const uikit = load("scripts/audits/output/wave2-discovery/ui-kit-usage.json");
const dataAccess = load("scripts/audits/output/data-access-report.json");
const components = load("scripts/audits/output/component-report.json");
const routes = load("scripts/audits/output/route-report.json");

const report = {
  schemaVersion: 1,
  unit: "F0-NAZRA-001",
  track: "Track A — Frontend Platform Baseline",
  mode: "MEASUREMENT AND CLASSIFICATION ONLY — no source mutation",
  generatedAt: new Date().toISOString(),
  predecessor: { boundary: "BND-05", state: "CERTIFIED (1/8)", evidence: "CERT-REV-BND05-R2" },
  architecture: {
    totalModules: dep?.totalModules ?? null,
    totalEdges: dep?.totalEdges ?? null,
    cycles: dep?.circular?.count ?? null,
    cycleList: dep?.circular?.cycles ?? [],
    importLayerViolations: dep?.importLayerViolations?.bySummary ?? null,
    violationTotalFromDepGraph: dep?.importLayerViolations?.total ?? null,
    violationTotalReclassified: rows.length,
    classificationTotals: byClass,
    classificationByRule: byRuleClass,
  },
  dataAccess: dataAccess
    ? { total: dataAccess.total, ui: dataAccess.ui, repositories: dataAccess.repositories, queries: dataAccess.queries }
    : null,
  uiPlatform: {
    designSystemFindings: ds?.totals ?? null,
    designSystemTotal: ds ? Object.values(ds.totals).reduce((a, b) => a + b, 0) : null,
    uiKitCallSites: uikit?.files?.length ?? uikit?.count ?? null,
    componentFiles: components?.totalFiles ?? components?.files?.length ?? null,
    componentsOverLocBudget: components?.overBudget?.length ?? null,
  },
  routes: { total: routes?.routes?.length ?? routes?.total ?? null },
  violations: rows,
  evidenceLineage: {
    "dependency-report.json": sha("scripts/audits/output/dependency-report.json"),
    "data-access-report.json": sha("scripts/audits/output/data-access-report.json"),
    "design-system-inventory.json": sha("scripts/audits/output/wave2-discovery/design-system-inventory.json"),
    "component-report.json": sha("scripts/audits/output/component-report.json"),
    "route-report.json": sha("scripts/audits/output/route-report.json"),
    "cert-rev-bnd05-r2.json": sha("scripts/audits/output/cert-rev-bnd05-r2.json"),
  },
  verdict: "F0 MEASUREMENT COMPLETE — F1 scope is a DRAFT, not frozen; human review required",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[f0] ${rows.length} violations classified → ${JSON.stringify(byClass)}`);
console.log(`[f0] written ${OUT}`);
