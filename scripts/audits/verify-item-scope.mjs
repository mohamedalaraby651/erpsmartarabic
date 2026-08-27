#!/usr/bin/env node
/**
 * BATCHB_SCOPE_001 — Item-level scope assertion (read-only).
 *
 * File-level control (Scope Hash) proves WHICH files may change.
 * This script proves WHERE inside a mixed-scope file the change is allowed.
 *
 * Exit 0 = MATCH  -> C2 may continue
 * Exit 1 = MISMATCH -> STOP (human decision + scope amendment required)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Files containing BOTH authorized and deferred Batch B items. */
const MIXED_SCOPE_FILES = [
  {
    path: 'src/pages/expenses/ExpensesPage.tsx',
    // Authorized (row 10): the expenseRepository import line may change.
    authorized: {
      maxChangedLines: 1,
      removedMustMatch:
        /^import \{ expenseRepository \} from '@\/lib\/repositories\/expenseRepository';$/,
      addedMustMatch: /^import \{ expenseRepository \} from '@\/application\/queries(\/expenses)?';$/,
    },
    // Deferred (row 13): must remain byte-identical.
    deferredLines: ["import { mapRepoError } from '@/lib/repositories/_base';"],
  },
];

const problems = [];

for (const spec of MIXED_SCOPE_FILES) {
  // 1) Deferred lines must still exist byte-identical in the working tree.
  let content;
  try {
    content = readFileSync(spec.path, 'utf8');
  } catch {
    problems.push(`${spec.path}: file missing`);
    continue;
  }
  const lines = content.split('\n');
  for (const deferred of spec.deferredLines) {
    if (!lines.includes(deferred)) {
      problems.push(`${spec.path}: deferred line not byte-identical -> ${deferred}`);
    }
  }

  // 2) Diff must contain only the authorized change.
  let diff = '';
  try {
    diff = execFileSync('git', ['diff', '--unified=0', process.env.SCOPE_BASE || 'HEAD', '--', spec.path], {
      encoding: 'utf8',
    });
  } catch (e) {
    problems.push(`${spec.path}: git diff failed (${e.message})`);
    continue;
  }

  const removed = [];
  const added = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('---') || line.startsWith('+++')) continue;
    if (line.startsWith('-')) removed.push(line.slice(1));
    else if (line.startsWith('+')) added.push(line.slice(1));
  }

  if (removed.length === 0 && added.length === 0) {
    console.log(`OK (unchanged): ${spec.path}`);
    continue;
  }

  const { maxChangedLines, removedMustMatch, addedMustMatch } = spec.authorized;
  if (removed.length > maxChangedLines || added.length > maxChangedLines) {
    problems.push(
      `${spec.path}: expected at most ${maxChangedLines} changed line(s), got -${removed.length}/+${added.length}`,
    );
  }
  for (const r of removed) {
    if (!removedMustMatch.test(r.trim())) {
      problems.push(`${spec.path}: unauthorized removed line -> ${r}`);
    }
  }
  for (const a of added) {
    if (!addedMustMatch.test(a.trim())) {
      problems.push(`${spec.path}: unauthorized added line -> ${a}`);
    }
  }
  if (problems.length === 0) console.log(`OK (authorized change only): ${spec.path}`);
}

if (problems.length > 0) {
  console.error('\nITEM-LEVEL SCOPE MISMATCH — STOP\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('\nITEM-LEVEL SCOPE: MATCH');
process.exit(0);
