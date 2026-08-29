#!/usr/bin/env node
/**
 * Project-owned typecheck contract (PRE-TS-001 containment, Option A').
 *
 * The strict app typecheck (`tsgo -p tsconfig.app.json --noEmit`) is the
 * contract. Platform-owned generated artifacts are NOT project-authored, so
 * they cannot be held to a project-owned strictness contract (see
 * docs/architecture/PRE-TS-001-ROOT-CAUSE.md §3).
 *
 * This wrapper does NOT relax strictness and does NOT edit generated output.
 * It classifies every diagnostic:
 *   - PLATFORM  -> file+code pair is on the bounded allowlist below
 *   - PROJECT   -> anything else
 * Exit code is non-zero if there is ANY project-owned diagnostic, or if a
 * platform allowlist entry produces diagnostics it does not declare.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const OUT = resolve(__dirname, 'output/typecheck-app.json');

/** Bounded, auditable allowlist. One entry per platform-owned artifact. */
const PLATFORM_OWNED = [
  {
    file: 'src/integrations/supabase/previewAuthStorage.ts',
    codes: ['TS7011'],
    owner: 'Platform (Lovable Cloud integration scaffolder)',
    finding: 'PRE-TS-001',
    exception: 'EXC-002',
  },
];

const r = spawnSync('npx', ['tsgo', '-p', 'tsconfig.app.json', '--noEmit'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
const LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm;

const diagnostics = [];
for (const m of output.matchAll(LINE)) {
  diagnostics.push({ file: m[1], line: Number(m[2]), code: m[4], message: m[5] });
}

const platform = [];
const project = [];
for (const d of diagnostics) {
  const entry = PLATFORM_OWNED.find((p) => d.file.endsWith(p.file) && p.codes.includes(d.code));
  (entry ? platform : project).push(entry ? { ...d, ...entry } : d);
}

const report = {
  schemaVersion: 1,
  finding: 'PRE-TS-001',
  containment: 'Option A\u2032 — project-owned typecheck contract with bounded platform allowlist',
  total: diagnostics.length,
  platformOwned: platform.length,
  projectOwned: project.length,
  platform,
  project,
  verdict: project.length === 0 ? 'PASS' : 'FAIL',
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

for (const d of project) console.error(`[project] ${d.file}(${d.line}): ${d.code} ${d.message}`);
for (const d of platform) console.warn(`[platform:${d.finding}] ${d.file}(${d.line}): ${d.code}`);
console.log(
  `[typecheck-app] total=${diagnostics.length} platform=${platform.length} project=${project.length} verdict=${report.verdict} → ${OUT}`,
);
process.exit(project.length === 0 ? 0 : 1);
