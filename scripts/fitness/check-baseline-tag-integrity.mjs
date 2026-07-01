#!/usr/bin/env node
/**
 * Fitness: Baseline Tag Integrity (ADR-0013 R-BASE-1, R-BASE-3, R-BASE-4).
 *
 * For every scripts/audits/output/baseline-*.json:
 *   1. Re-hash every listed file and verify SHA-256 matches.
 *   2. Recompute the composite SHA-256 and verify it matches.
 *   3. Fail on any mismatch or missing file.
 *
 * Baselines that reference files not yet committed are treated as invalid
 * (fix-forward: re-run build-baseline-tag.mjs after the fact).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT = join(ROOT, "scripts/audits/output");

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const baselines = existsSync(OUT)
  ? readdirSync(OUT).filter((f) => /^baseline-.+\.json$/.test(f))
  : [];

if (baselines.length === 0) {
  console.log("[fitness:baseline-tag-integrity] no baselines present — skipping");
  process.exit(0);
}

let failed = 0;
for (const name of baselines) {
  const abs = join(OUT, name);
  const manifest = JSON.parse(readFileSync(abs, "utf8"));
  const tag = manifest.tag ?? name;
  let localFail = 0;

  for (const entry of manifest.entries ?? []) {
    const fileAbs = join(ROOT, entry.path);
    if (!existsSync(fileAbs)) {
      console.error(`[${tag}] MISSING ${entry.path}`);
      localFail++;
      continue;
    }
    const actual = sha256(readFileSync(fileAbs));
    if (actual !== entry.sha256) {
      console.error(
        `[${tag}] SHA MISMATCH ${entry.path}\n  expected ${entry.sha256}\n  actual   ${actual}`,
      );
      localFail++;
    }
  }

  const recomputed = sha256(
    Buffer.from(
      (manifest.entries ?? [])
        .map((e) => `${e.path}\t${e.sha256}`)
        .join("\n"),
      "utf8",
    ),
  );
  if (recomputed !== manifest.composite) {
    console.error(
      `[${tag}] COMPOSITE MISMATCH\n  expected ${manifest.composite}\n  actual   ${recomputed}`,
    );
    localFail++;
  }

  if (localFail === 0) {
    console.log(
      `[fitness:baseline-tag-integrity] ${tag} ok (${manifest.entries.length} entries)`,
    );
  } else {
    failed += localFail;
  }
}

if (failed > 0) {
  console.error(`[fitness:baseline-tag-integrity] FAILED (${failed} violations)`);
  process.exit(1);
}
process.exit(0);
