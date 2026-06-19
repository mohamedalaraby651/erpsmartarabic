#!/usr/bin/env node
// scripts/audits/build-manifest.mjs
// UX-0: Aggregates env + all JSON reports into MANIFEST.json.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT_DIR = resolve(__dirname, "output");
const MANIFEST = resolve(ROOT, "docs/architecture/MANIFEST.json");

function safeExec(cmd) { try { return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } }

const reports = {
  snapshot:     "scripts/audits/output/snapshot-report.json",
  dependencies: "scripts/audits/output/dependency-report.json",
  components:   "scripts/audits/output/component-report.json",
  routes:       "scripts/audits/output/route-report.json",
  dataAccess:   "scripts/audits/output/data-access-report.json",
  complexity:   "scripts/audits/output/complexity-report.json",
  depcheck:     "scripts/audits/output/depcheck-report.json",
  bundle:       "scripts/audits/output/bundle-report.json",
  lintTypes:    "scripts/audits/output/lint-types-report.json",
  tests:        "scripts/audits/output/tests-report.json",
};

const loaded = {};
for (const [k, p] of Object.entries(reports)) {
  const abs = resolve(ROOT, p);
  if (existsSync(abs)) {
    try { loaded[k] = JSON.parse(readFileSync(abs, "utf8")); } catch { loaded[k] = null; }
  } else loaded[k] = null;
}

// Lockfile hash
let lockfileHash = null;
for (const f of ["bun.lockb", "bun.lock", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"]) {
  const p = resolve(ROOT, f);
  if (existsSync(p)) {
    const buf = readFileSync(p);
    lockfileHash = createHash("sha256").update(buf).digest("hex");
    break;
  }
}

const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const tv = (n) => pkg.devDependencies?.[n] ?? pkg.dependencies?.[n] ?? null;

const health = {
  directDbAccessUi: loaded.dataAccess?.uiHits ?? null,
  asAnyTotal: loaded.lintTypes?.asAny?.total ?? null,
  asAnyByCategory: loaded.lintTypes?.asAny?.byCategory ?? null,
  consoleTotal: loaded.lintTypes?.console?.total ?? null,
  consoleByCategory: loaded.lintTypes?.console?.byCategory ?? null,
  filesOver500: loaded.components?.filesOver500 ?? null,
  filesOver300: loaded.components?.filesOver300 ?? null,
  circularDeps: loaded.dependencies?.circular?.count ?? null,
  importLayerViolations: loaded.dependencies?.importLayerViolations?.total ?? null,
  bundleTotalBytes: loaded.bundle?.totalBytes ?? null,
  tscStrictErrors: loaded.lintTypes?.typescript?.strictErrors ?? null,
  eslintErrors: loaded.lintTypes?.eslint?.errors ?? null,
  eslintWarnings: loaded.lintTypes?.eslint?.warnings ?? null,
  vitestPassed: loaded.tests?.vitest?.passed ?? null,
  vitestTotal: loaded.tests?.vitest?.total ?? null,
  maintainabilityIndexAvg: loaded.complexity?.maintainabilityIndexAvg ?? null,
  cyclomaticP95: loaded.complexity?.cyclomatic?.p95 ?? null,
  avgComponentLoc: loaded.components?.avgComponentLoc ?? null,
  avgHookLoc: loaded.components?.avgHookLoc ?? null,
  avgProps: loaded.components?.avgProps ?? null,
  repositoryReuseMean: loaded.dataAccess?.repositoryReuseMean ?? null,
  queryReuseMean: loaded.dataAccess?.queryReuseMean ?? null,
};

const targets = {
  directDbAccessUi: { value: 0, phase: "UX-2 → UX-7" },
  asAnyInfraPlusUi: { value: 0, phase: "UX-1 → UX-2" },
  consoleLeftover: { value: 0, phase: "UX-1" },
  filesOver500: { value: 0, phase: "UX-5 → UX-7" },
  circularDeps: { value: 0, phase: "UX-1" },
  importLayerViolations: { value: 0, phase: "UX-2" },
  bundleDeltaPerPhase: { value: "±5%", phase: "every phase" },
  vitestPassed: { value: ">=1187", phase: "every phase (never regress)" },
  tscStrictErrors: { value: 0, phase: "UX-1" },
  cyclomaticP95: { value: 15, phase: "UX-7" },
};

const manifest = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  generatedAt: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    packageManager: safeExec("bun --version") ? `bun@${safeExec("bun --version")}` : null,
    gitCommit: safeExec("git rev-parse HEAD"),
    gitBranch: safeExec("git rev-parse --abbrev-ref HEAD"),
    gitTag: "architecture-baseline-ux0",
    lockfileHash,
    toolVersions: {
      madge: tv("madge"),
      "rollup-plugin-visualizer": tv("rollup-plugin-visualizer"),
      "ts-complex": tv("ts-complex"),
      depcheck: tv("depcheck"),
      vite: tv("vite"),
      typescript: tv("typescript"),
      vitest: tv("vitest"),
      eslint: tv("eslint"),
    },
  },
  reports,
  health,
  targets,
  hardStops: {
    tscStrictErrors: health.tscStrictErrors !== null && health.tscStrictErrors > 0,
    vitestRegression: health.vitestPassed !== null && health.vitestPassed < 1187,
    sourceChanged: false,
  },
  determinism: { verified: null, runs: 0, diff: null },
};

mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`[manifest] written → ${MANIFEST}`);
