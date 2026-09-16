#!/usr/bin/env node
/**
 * OPA-UX-001 — Action Feedback Audit (mutation-definition level)
 *
 * In this codebase user feedback for a write action lives either:
 *   • inside the mutation definition (hook: toast.success / toast.error), or
 *   • declaratively via `meta.successMessage` handled by the global
 *     MutationCache in src/App.tsx (src/lib/mutationFeedback.ts), or
 *   • at the call site's own onError.
 *
 * Error feedback is guaranteed globally (MutationCache.onError) unless the
 * mutation declares its own onError. So this audit reports SUCCESS coverage
 * per mutation definition, which is the part that cannot be defaulted.
 *
 * Verdicts: OK | NO_SUCCESS | SILENT (explicitly opted out).
 * Read-only: performs no mutations.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'scripts/audits/output');
mkdirSync(outDir, { recursive: true });

const files = execSync('rg -l "useMutation" src || true', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !/\.test\.tsx?$/.test(f));

const SUCCESS_RE = /toast\.success|successMessage|showSuccess|useMutationToast|toast\(\s*\{/;
const SILENT_RE = /silentSuccess/;

function mutationBlocks(src) {
  const out = [];
  let idx = 0;
  while ((idx = src.indexOf('useMutation', idx)) !== -1) {
    const lineStart = src.lastIndexOf('\n', idx) + 1;
    const lineEnd = src.indexOf('\n', idx);
    const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);
    const open = src.indexOf('(', idx);
    // skip imports / type-only references / re-exports
    if (/\bimport\b|\bexport\b\s*\{/.test(line) || open === -1 || src.slice(idx, open).includes('\n')) {
      idx += 11;
      continue;
    }
    let depth = 0;
    let i = open;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '(' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '}' || c === ']') {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push({ offset: idx, text: src.slice(idx, i + 1) });
    idx = i + 1;
  }
  return out;
}

const rows = [];
for (const file of files) {
  const src = readFileSync(path.join(root, file), 'utf8');
  for (const b of mutationBlocks(src)) {
    const verdict = SILENT_RE.test(b.text)
      ? 'SILENT'
      : SUCCESS_RE.test(b.text)
        ? 'OK'
        : 'NO_SUCCESS';
    rows.push({ file, line: src.slice(0, b.offset).split('\n').length, verdict });
  }
}

const summary = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
const report = {
  id: 'OPA-UX-001',
  scope: 'useMutation definitions across src (tests excluded)',
  generatedAt: new Date().toISOString(),
  filesScanned: files.length,
  mutations: rows.length,
  errorFeedback: 'global — MutationCache.onError in src/App.tsx',
  summary,
  gaps: rows.filter((r) => r.verdict === 'NO_SUCCESS'),
};
writeFileSync(path.join(outDir, 'action-feedback-audit.json'), JSON.stringify(report, null, 2));
console.log(
  `[action-feedback] files=${files.length} mutations=${rows.length} ` +
    Object.entries(summary)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')
);
