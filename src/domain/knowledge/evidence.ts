/**
 * Evidence references mentioned in knowledge documents.
 * Extraction is textual only: a mention is NOT proof of verification.
 * Security documents (docs/security/**) are never extracted or resolved.
 */
import type { EvidenceKind, EvidenceRef } from './types';

const EVIDENCE_RE = /(?:^|[\s(`'"[|])((?:scripts\/audits\/output|docs\/governance|docs\/audit-reports|docs\/qa|e2e|src)\/[\w./-]+\.(?:json|md|txt|csv|ts|tsx|sql|mjs))/g;

export function isSecurityPath(path: string): boolean {
  return /(^|\/)security\//i.test(path);
}

export function evidenceKindFor(path: string): EvidenceKind | null {
  if (isSecurityPath(path)) return null;
  if (path.startsWith('scripts/audits/output/')) return 'audit_output';
  if (/\.(test|spec)\.tsx?$/.test(path)) return 'test';
  if (path.startsWith('docs/governance/') && /(RECORD|VERIFICATION|CHANGELOG|EXECUTION)/i.test(path)) return 'execution_record';
  if (path.startsWith('docs/audit-reports/') || path.startsWith('docs/qa/')) return 'report';
  return null;
}

/** Pure extraction of evidence paths from Markdown text. Order-stable, de-duplicated. */
export function extractEvidence(content: string): EvidenceRef[] {
  const out = new Map<string, EvidenceRef>();
  for (const m of content.matchAll(EVIDENCE_RE)) {
    const path = m[1].replace(/[.,;:]+$/, '');
    const kind = evidenceKindFor(path);
    if (kind && !out.has(path)) out.set(path, { path, kind, exists: null });
  }
  return [...out.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** Marks each ref as present/missing against the known repo path set. */
export function resolveEvidence(refs: EvidenceRef[], repoPaths: ReadonlySet<string>): EvidenceRef[] {
  return refs.map((r) => ({ ...r, exists: repoPaths.has(r.path) }));
}
