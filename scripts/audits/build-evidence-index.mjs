#!/usr/bin/env node
/**
 * Audit — Evidence index (UX-1E).
 *
 * Walks `docs/architecture/ux1e-evidence/` and writes `index.json` so
 * downstream tooling (UX-2 entry gate) has a single manifest of all
 * evidence artifacts.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DIR = resolve(ROOT, "docs/architecture/ux1e-evidence");
const OUT = resolve(DIR, "index.json");

function listFiles(prefix) {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.startsWith(prefix) && statSync(resolve(DIR, f)).isFile())
    .sort();
}

function commit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const snapshots = existsSync(resolve(DIR, "snapshots"))
  ? readdirSync(resolve(DIR, "snapshots"))
      .filter((f) => f.endsWith(".snapshot.json"))
      .sort()
  : [];

const hashesPath = resolve(DIR, "snapshots/hashes.json");
const hashes = existsSync(hashesPath)
  ? JSON.parse(readFileSync(hashesPath, "utf8")).hashes ?? {}
  : {};

const manifestSrc = existsSync(resolve(ROOT, "src/ui/__integration__/integration.manifest.ts"))
  ? readFileSync(resolve(ROOT, "src/ui/__integration__/integration.manifest.ts"), "utf8")
  : "";
const fingerprint = (manifestSrc.match(/fingerprint:\s*"([^"]+)"/) ?? [])[1] ?? null;
const manifestSchema = Number((manifestSrc.match(/manifestSchema:\s*(\d+)/) ?? [])[1] ?? 0);

const index = {
  schemaVersion: 1,
  generatedAt: new Date(0).toISOString(), // deterministic; real timestamps belong in CI metadata, not artifacts
  commit: commit(),
  manifest: { fingerprint, manifestSchema },
  events: listFiles("events."),
  perf: listFiles("perf."),
  snapshots,
  hashes,
  coverage: existsSync(resolve(DIR, "adapter-coverage.json")) ? "adapter-coverage.json" : null,
  knownFindings: existsSync(resolve(DIR, "known-findings.json")) ? "known-findings.json" : null,
  successCriteria: existsSync(resolve(DIR, "success-criteria.json")) ? "success-criteria.json" : null,
  readiness: existsSync(resolve(DIR, "ux2-readiness.json")) ? "ux2-readiness.json" : null,
};

writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n");
console.log(`[audit:evidence-index] OK — snapshots=${snapshots.length} events=${index.events.length} perf=${index.perf.length}`);
