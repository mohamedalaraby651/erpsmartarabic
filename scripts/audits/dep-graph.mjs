#!/usr/bin/env node
// scripts/audits/dep-graph.mjs
// UX-0: Dependency graph + circular deps + import-layer violations.
// Output: scripts/audits/output/dependency-report.json (deterministic).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "output/dependency-report.json");

function madge(args) {
  const raw = execFileSync(
    "bunx",
    ["madge", ...args, "--extensions", "ts,tsx,js,jsx", "--ts-config", "tsconfig.json", "src"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return raw;
}

const graphJson = JSON.parse(madge(["--json"]));
const circularJson = JSON.parse(madge(["--circular", "--json"]));

// Build sorted, deterministic graph
const sortedGraph = {};
for (const k of Object.keys(graphJson).sort()) {
  sortedGraph[k] = [...graphJson[k]].sort();
}

// Importers / imported counts
const importedBy = {};
for (const [importer, deps] of Object.entries(sortedGraph)) {
  for (const dep of deps) {
    importedBy[dep] = (importedBy[dep] ?? 0) + 1;
  }
}
const topImported = Object.entries(importedBy)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 20)
  .map(([file, count]) => ({ file, count }));

const topImporters = Object.entries(sortedGraph)
  .map(([file, deps]) => ({ file, count: deps.length }))
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
  .slice(0, 20);

// Import layer violations (measurement only)
const violationRules = [
  { name: "components→repositories", from: /^components\//, to: /^lib\/repositories\// },
  { name: "components→services",     from: /^components\//, to: /^lib\/services\// },
  { name: "pages→repositories",      from: /^pages\//,      to: /^lib\/repositories\// },
  { name: "hooks→supabase-client",   from: /^hooks\//,      to: /^integrations\/supabase\/client/ },
  { name: "components→supabase-client", from: /^components\//, to: /^integrations\/supabase\/client/ },
  { name: "pages→supabase-client",   from: /^pages\//,      to: /^integrations\/supabase\/client/ },
  { name: "domain→ui",               from: /^domain\//,     to: /^components\// },
];
const violations = Object.fromEntries(violationRules.map(r => [r.name, []]));
for (const [importer, deps] of Object.entries(sortedGraph)) {
  for (const dep of deps) {
    for (const rule of violationRules) {
      if (rule.from.test(importer) && rule.to.test(dep)) {
        violations[rule.name].push({ from: importer, to: dep });
      }
    }
  }
}
const violationsSummary = Object.fromEntries(
  Object.entries(violations).map(([k, v]) => [k, v.length]),
);
const violationsTotal = Object.values(violationsSummary).reduce((a, b) => a + b, 0);

// Deepest path heuristic: longest chain through circular[0] or longest dep chain
function deepestChain(graph) {
  const seen = new Set();
  let best = [];
  function dfs(node, path) {
    if (seen.has(node)) return;
    seen.add(node);
    const next = graph[node] ?? [];
    if (next.length === 0) {
      if (path.length > best.length) best = path;
      return;
    }
    for (const n of next) dfs(n, [...path, n]);
  }
  for (const root of Object.keys(graph).sort()) dfs(root, [root]);
  return best;
}
const deepest = deepestChain(sortedGraph);

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  totalModules: Object.keys(sortedGraph).length,
  totalEdges: Object.values(sortedGraph).reduce((a, b) => a + b.length, 0),
  circular: {
    count: circularJson.length,
    cycles: circularJson.map(c => [...c]).sort((a, b) => a.join("|").localeCompare(b.join("|"))),
  },
  deepestChain: { length: deepest.length, path: deepest },
  topImporters,
  topImported,
  importLayerViolations: {
    total: violationsTotal,
    bySummary: violationsSummary,
    samples: Object.fromEntries(
      Object.entries(violations).map(([k, v]) => [k, v.slice(0, 5)]),
    ),
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[dep-graph] ${report.totalModules} modules, ${report.circular.count} cycles, ${violationsTotal} layer violations → ${OUT}`);
