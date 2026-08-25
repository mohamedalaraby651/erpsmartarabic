#!/usr/bin/env node
// scripts/audits/codebase-inventory.mjs
//
// Wave 0 — Codebase Inventory (READ-ONLY OBSERVER).
//
// Contract rule (MASTER_EXECUTION_CONTRACT.md §21):
//   "Inventory observes the system; it does not certify the system or
//    authorize architectural decisions."
//
// This script is NOT a fitness check. It never fails a build, is never wired
// into a gate, and never emits a pass/fail verdict. It always exits 0 unless
// it genuinely cannot produce the inventory.
//
// Outputs:
//   scripts/audits/output/codebase-inventory.json
//   docs/architecture/CODEBASE_INVENTORY.md

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const GENERATOR_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const BASELINE_ID = "BASELINE-NAZRA-001";
const PARENT_BASELINE = "BASELINE-UX3A-002";
const EVIDENCE_ID = "CODEBASE-INVENTORY-001";
const OWNER = "Human Governance";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT_DIR = resolve(__dirname, "output");
const OUT_JSON = resolve(OUT_DIR, "codebase-inventory.json");
const OUT_MD = resolve(ROOT, "docs/architecture/CODEBASE_INVENTORY.md");

// ---------------------------------------------------------------- utilities

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// -------------------------------------------------------------- layer model

// Ordered: first match wins. Mirrors docs/architecture/DEPENDENCY_RULES.md.
const LAYER_RULES = [
  ["kernel", /^src\/kernel\//],
  ["platform", /^src\/platform\//],
  ["domain", /^src\/domain\//],
  ["application", /^src\/application\//],
  ["infrastructure", /^src\/infrastructure\//],
  ["composition", /^src\/composition\//],
  ["ui", /^src\/ui\//],
  ["pages", /^src\/pages\//],
  ["components", /^src\/components\//],
  ["hooks", /^src\/hooks\//],
  ["repositories", /^src\/lib\/repositories\//],
  ["queries", /^src\/lib\/queries\//],
  ["services", /^src\/lib\/services\//],
  ["contracts", /^src\/contracts\//],
  ["integrations", /^src\/integrations\//],
  ["shared-kernel", /^src\/shared-kernel\//],
  ["tests", /^src\/(__tests__|test)\//],
  ["lib", /^src\/lib\//],
  ["types", /^src\/types\//],
  ["root", /^src\/[^/]+$/],
];

function layerOf(relPath) {
  for (const [name, re] of LAYER_RULES) if (re.test(relPath)) return name;
  return "other";
}

// ------------------------------------------------------------- static pass

const sourceFiles = walk(SRC)
  .map((p) => relative(ROOT, p).split("\\").join("/"))
  .filter((p) => /\.(tsx?|jsx?|css)$/.test(p))
  .sort();

const EXPORT_RE = /^\s*export\s+(?:(?:async\s+)?function|const|let|class|type|interface|enum|default|\*|\{)/;

const moduleMap = new Map(); // moduleKey -> record
for (const file of sourceFiles) {
  const layer = layerOf(file);
  // Module = the directory one level below its layer root, else the layer root.
  const parts = file.split("/");
  const moduleKey = parts.length > 3 ? parts.slice(0, 3).join("/") : parts.slice(0, 2).join("/");
  let rec = moduleMap.get(moduleKey);
  if (!rec) {
    rec = { path: moduleKey, layer, files: 0, loc: 0, publicExports: 0, barrels: [] };
    moduleMap.set(moduleKey, rec);
  }
  const code = readFileSync(resolve(ROOT, file), "utf8");
  const lines = code.split("\n");
  rec.files += 1;
  rec.loc += lines.length;
  if (/\/index\.tsx?$/.test(file)) {
    const exports = lines.filter((l) => EXPORT_RE.test(l)).length;
    rec.publicExports += exports;
    rec.barrels.push({ file, exports });
  }
}

const modules = [...moduleMap.values()].sort((a, b) => a.path.localeCompare(b.path));

// --------------------------------------------------------- source artifacts

const SOURCE_ARTIFACT_FILES = [
  "scripts/audits/output/dependency-report.json",
  "scripts/audits/output/component-report.json",
  "scripts/audits/output/route-report.json",
  "scripts/audits/output/data-access-report.json",
  "scripts/audits/output/snapshot-report.json",
];

const sourceArtifacts = SOURCE_ARTIFACT_FILES.map((rel) => {
  const abs = resolve(ROOT, rel);
  const present = existsSync(abs);
  return {
    path: rel,
    present,
    sha256: present ? sha256(readFileSync(abs, "utf8")) : null,
  };
});

const dep = readJson(resolve(ROOT, SOURCE_ARTIFACT_FILES[0])) ?? {};
const comp = readJson(resolve(ROOT, SOURCE_ARTIFACT_FILES[1])) ?? {};
const routes = readJson(resolve(ROOT, SOURCE_ARTIFACT_FILES[2])) ?? {};
const dataAccess = readJson(resolve(ROOT, SOURCE_ARTIFACT_FILES[3])) ?? {};

// --------------------------------------------------------------- layers[]

const violationsBySummary = dep?.importLayerViolations?.bySummary ?? {};
const filesByLayer = {};
for (const m of modules) filesByLayer[m.layer] = (filesByLayer[m.layer] ?? 0) + m.files;

const violationsByFromLayer = {};
for (const [summary, count] of Object.entries(violationsBySummary)) {
  const from = summary.split("→")[0];
  violationsByFromLayer[from] = (violationsByFromLayer[from] ?? 0) + count;
}

const layers = Object.keys(filesByLayer)
  .sort()
  .map((name) => ({
    layer: name,
    files: filesByLayer[name],
    observedOutboundViolations: violationsByFromLayer[name] ?? 0,
  }));

// -------------------------------------------------------- publicSurfaces[]

const SURFACE_BARRELS = [
  ["src/ui/index.ts", 55],
  ["src/kernel/index.ts", 40],
  ["src/platform/index.ts", 40],
  ["src/application/queries/index.ts", 30],
  ["src/application/finance/index.ts", 30],
  ["src/domain/finance/index.ts", 40],
  ["src/infrastructure/finance/index.ts", 20],
  ["src/composition/index.ts", 15],
  ["src/ui/contracts/index.ts", 20],
];

const publicSurfaces = SURFACE_BARRELS.map(([rel, observedBudget]) => {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    return { barrel: rel, present: false, observedExports: null, observedBudget, observedBudgetStatus: "not-observed" };
  }
  const observedExports = readFileSync(abs, "utf8").split("\n").filter((l) => EXPORT_RE.test(l)).length;
  return {
    barrel: rel,
    present: true,
    observedExports,
    observedBudget,
    // OBSERVATION ONLY. "over-budget" is not a declared architecture violation;
    // that determination belongs to Governance (Contract §21).
    observedBudgetStatus: observedExports > observedBudget ? "over-observed-budget" : "within-observed-budget",
  };
}).sort((a, b) => a.barrel.localeCompare(b.barrel));

// ------------------------------------------------------------- hotspots[]

const hotspots = {
  topFanIn: (dep.topImported ?? []).slice(0, 15),
  topFanOut: (dep.topImporters ?? []).slice(0, 15),
  cycles: {
    count: dep?.circular?.count ?? null,
    cycles: dep?.circular?.cycles ?? [],
  },
  deepestChain: dep?.deepestChain ?? null,
  observedLayerViolations: {
    total: dep?.importLayerViolations?.total ?? null,
    bySummary: violationsBySummary,
  },
};

// -------------------------------------------------------------- backend[]
// Repository-observed backend surface ONLY (Contract §23).

const backend = [];

for (const dir of ["supabase/functions"]) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) continue;
  for (const e of readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory() || e.name.startsWith("_")) continue;
    backend.push({ name: e.name, type: "edge-function", discoverySource: "repository-files" });
  }
}

const rpcNames = new Set();
const tableNames = new Set();
for (const file of sourceFiles) {
  if (!/\.tsx?$/.test(file)) continue;
  const code = readFileSync(resolve(ROOT, file), "utf8");
  for (const m of code.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) rpcNames.add(m[1]);
  for (const m of code.matchAll(/\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) tableNames.add(m[1]);
}
for (const n of [...rpcNames].sort()) backend.push({ name: n, type: "rpc", discoverySource: "repository-files" });
for (const n of [...tableNames].sort()) backend.push({ name: n, type: "table-or-view", discoverySource: "repository-files" });

// ---------------------------------------------------------------- evidence

const gitCommit = sh("git", ["rev-parse", "HEAD"]) || "unknown";
const generatedAt = new Date().toISOString();
const snapshotId = `SNAPSHOT-${generatedAt.slice(0, 10).replace(/-/g, "")}-001`;
const lockPath = resolve(ROOT, "bun.lockb");
const lockPathAlt = resolve(ROOT, "package-lock.json");
const dependencyLockHash = existsSync(lockPath)
  ? sha256(readFileSync(lockPath).toString("binary"))
  : existsSync(lockPathAlt)
    ? sha256(readFileSync(lockPathAlt, "utf8"))
    : null;

const report = {
  evidence: {
    evidenceId: EVIDENCE_ID,
    snapshotId,
    baselineId: BASELINE_ID,
    parentBaseline: PARENT_BASELINE,
    gitCommit,
    generatedAt,
    environment: "lovable-sandbox",
    command: "node scripts/audits/codebase-inventory.mjs",
    result: "GENERATED",
    owner: OWNER,
    generatorVersion: GENERATOR_VERSION,
    schemaVersion: SCHEMA_VERSION,
    sourceArtifacts,
    dependencyLockHash,
    artifactHash: null, // filled below over the rest of the document
    validity: "valid while gitCommit matches HEAD",
  },
  disclaimer:
    "Inventory observes the system; it does not certify the system or authorize architectural decisions. " +
    "This artifact is an observation tool, not a fitness check, and is not wired into any gate. " +
    "Backend entries are a repository-observed surface, not a verified live backend.",
  totals: {
    sourceFiles: sourceFiles.length,
    modules: modules.length,
    totalModulesInDependencyGraph: dep.totalModules ?? null,
    totalEdges: dep.totalEdges ?? null,
    components: comp.totalFiles ?? null,
    routes: routes.totalRoutes ?? null,
    repositories: dataAccess.repositoryCount ?? null,
    queries: dataAccess.queryCount ?? null,
  },
  modules,
  layers,
  publicSurfaces,
  hotspots,
  backend,
};

const { artifactHash: _ignored, ...hashable } = report.evidence;
report.evidence.artifactHash = sha256(
  JSON.stringify({ ...report, evidence: hashable }),
);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");

// ------------------------------------------------------------- markdown

const md = `# Codebase Inventory — Observation Report

> **Inventory observes the system; it does not certify the system or authorize architectural decisions.**
> This document is generated by \`scripts/audits/codebase-inventory.mjs\`, a read-only observer.
> It is not a fitness check, it is not wired into any gate, and it records no pass/fail verdict.

## Evidence

| Field | Value |
|---|---|
| Evidence ID | ${report.evidence.evidenceId} |
| Snapshot ID | ${report.evidence.snapshotId} |
| Baseline | ${report.evidence.baselineId} |
| Parent Baseline | ${report.evidence.parentBaseline} |
| Git Commit | ${report.evidence.gitCommit} |
| Generated At | ${report.evidence.generatedAt} |
| Environment | ${report.evidence.environment} |
| Command | \`${report.evidence.command}\` |
| Result | ${report.evidence.result} |
| Generator Version | ${report.evidence.generatorVersion} |
| Schema Version | ${report.evidence.schemaVersion} |
| Artifact Hash | \`${report.evidence.artifactHash}\` |
| Owner | ${report.evidence.owner} |

### Source artifacts

| Artifact | Present | SHA-256 |
|---|---|---|
${sourceArtifacts.map((a) => `| \`${a.path}\` | ${a.present ? "yes" : "no"} | ${a.sha256 ? "`" + a.sha256.slice(0, 16) + "…`" : "—"} |`).join("\n")}

## Totals

| Metric | Observed |
|---|---|
| Source files (src) | ${report.totals.sourceFiles} |
| Modules | ${report.totals.modules} |
| Modules in dependency graph | ${report.totals.totalModulesInDependencyGraph ?? "—"} |
| Dependency edges | ${report.totals.totalEdges ?? "—"} |
| Component/hook files | ${report.totals.components ?? "—"} |
| Routes | ${report.totals.routes ?? "—"} |
| Repositories | ${report.totals.repositories ?? "—"} |
| Query modules | ${report.totals.queries ?? "—"} |

## Layers

| Layer | Files | Observed outbound violations |
|---|---|---|
${layers.map((l) => `| ${l.layer} | ${l.files} | ${l.observedOutboundViolations} |`).join("\n")}

## Public surfaces (observed size vs observed budget)

An entry marked \`over-observed-budget\` is an **observation**, not a declared architecture violation.

| Barrel | Observed exports | Observed budget | Status |
|---|---|---|---|
${publicSurfaces.map((s) => `| \`${s.barrel}\` | ${s.observedExports ?? "—"} | ${s.observedBudget} | ${s.observedBudgetStatus} |`).join("\n")}

## Hotspots

- Cycles observed: **${hotspots.cycles.count ?? "—"}**
- Deepest import chain: **${hotspots.deepestChain?.length ?? "—"}**
- Total observed layer violations: **${hotspots.observedLayerViolations.total ?? "—"}**

### Observed layer violations by route

| Route | Count |
|---|---|
${Object.entries(violationsBySummary).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

### Top fan-in modules

${(hotspots.topFanIn ?? []).slice(0, 10).map((x) => `- \`${x.module ?? x.file ?? JSON.stringify(x)}\`${x.count != null ? ` — ${x.count}` : ""}`).join("\n")}

### Top fan-out modules

${(hotspots.topFanOut ?? []).slice(0, 10).map((x) => `- \`${x.module ?? x.file ?? JSON.stringify(x)}\`${x.count != null ? ` — ${x.count}` : ""}`).join("\n")}

## Repository-observed backend surface

Discovered from repository files only (\`discoverySource: "repository-files"\`). This is **not** a verified picture of the live backend; live verification belongs to the Tenant/Security phases.

| Type | Count |
|---|---|
| Edge functions | ${backend.filter((b) => b.type === "edge-function").length} |
| RPCs referenced in code | ${backend.filter((b) => b.type === "rpc").length} |
| Tables/views referenced in code | ${backend.filter((b) => b.type === "table-or-view").length} |

Full entries are listed in \`scripts/audits/output/codebase-inventory.json\`.

## Generation vs health

| Signal | Value |
|---|---|
| Inventory | GENERATED |
| Codebase health | reported separately — see \`docs/governance/PRE_EXISTING_ISSUES.md\` |

A pre-existing typecheck, lint, or test failure does not block inventory generation and does not change the wave's scope.
`;

mkdirSync(dirname(OUT_MD), { recursive: true });
writeFileSync(OUT_MD, md);

console.log(
  `[codebase-inventory] modules=${modules.length} files=${sourceFiles.length} layers=${layers.length} ` +
    `surfaces=${publicSurfaces.length} backend=${backend.length} → ${relative(ROOT, OUT_JSON)}, ${relative(ROOT, OUT_MD)}`,
);
