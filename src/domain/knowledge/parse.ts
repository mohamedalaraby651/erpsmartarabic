/**
 * Pure parsers for the real header formats used in docs/:
 *   "**Status:** Accepted", "- **Status:** Draft (...)", "Status: IMPLEMENTED + VERIFIED / NOT HUMAN ACCEPTED — 2026-09-24".
 * YAML front matter is honoured only when the file starts with "---".
 * Anything that can't be read stays unknown — values are never invented.
 */
import { extractEvidence } from './evidence';
import type {
  ApprovalStatus, ExecutionStatus, KnowledgeKind, KnowledgeRecord, KnowledgeSourceFile,
  KnowledgeStatus, VerificationStatus,
} from './types';

const HEADER_SCAN_LINES = 30;

export function kindForPath(path: string): KnowledgeKind | null {
  if (path.startsWith('docs/adr/')) return 'adr';
  if (path.startsWith('docs/risk-log/')) return 'risk';
  if (path.startsWith('docs/governance/')) return 'governance';
  if (path.startsWith('docs/contracts/')) return 'contract';
  if (path.startsWith('docs/architecture/')) return 'architecture';
  return null;
}

const fileName = (path: string) => path.split('/').pop() ?? path;
const stem = (path: string) => fileName(path).replace(/\.md$/i, '');

/** Stable id derived only from the file path. */
export function idForPath(path: string, kind: KnowledgeKind): string {
  const s = stem(path);
  if (kind === 'adr') {
    const m = /^(\d{4})-/.exec(s);
    if (m) return `ADR-${m[1]}`;
  }
  if (kind === 'risk') {
    const m = /^(RISK-\d{3})/i.exec(s);
    if (m) return m[1].toUpperCase();
  }
  const prefix = { adr: 'ADR', risk: 'RISK', governance: 'GOV', contract: 'CTR', architecture: 'ARC' }[kind];
  const rel = path.replace(/^docs\/[^/]+\//, '').replace(/\.md$/i, '');
  return `${prefix}:${rel}`;
}

function frontMatter(content: string): Record<string, string> {
  if (!content.startsWith('---\n')) return {};
  const end = content.indexOf('\n---', 4);
  if (end < 0) return {};
  const out: Record<string, string> = {};
  for (const line of content.slice(4, end).split('\n')) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (m) out[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Reads "Field: value" in the header area, tolerating bullets and bold markers. */
export function headerField(content: string, field: string): string | null {
  const lines = content.split('\n').slice(0, HEADER_SCAN_LINES);
  const re = new RegExp(`^\\s*(?:[-*]\\s+)?${field}\\s*:\\s*(.+?)\\s*$`, 'i');
  for (const line of lines) {
    const m = re.exec(line.replace(/\*\*/g, ''));
    if (m) return m[1].trim() || null;
  }
  return null;
}

export function parseTitle(content: string, path: string): string {
  const fm = frontMatter(content);
  if (fm.title) return fm.title;
  const h = /^#\s+(.+)$/m.exec(content);
  return h ? h[1].trim() : stem(path);
}

export function parseApproval(raw: string | null): ApprovalStatus {
  if (!raw) return 'unknown';
  const s = raw.toLowerCase();
  if (/superseded/.test(s)) return 'superseded';
  if (/\bnot\s+(human\s+)?accepted\b|not\s+approved/.test(s)) return 'pending';
  if (/rejected/.test(s)) return 'rejected';
  if (/^\s*(draft|proposed|candidate)\b|conditionally\s+accepted|pending/.test(s)) return 'pending';
  if (/\b(human\s+)?accepted\b|\bapproved\b/.test(s)) return 'accepted';
  return 'unknown';
}

export function parseVerification(raw: string | null): VerificationStatus {
  if (!raw) return 'unknown';
  const s = raw.toLowerCase();
  if (/not\s+verified|unverified/.test(s)) return 'unverified';
  if (/\bfail(ed)?\b/.test(s)) return 'failed';
  if (/\bverified\b|\bpass(ed)?\b/.test(s)) return 'verified';
  return 'unknown';
}

export function parseExecution(raw: string | null): ExecutionStatus {
  if (!raw) return 'unknown';
  const s = raw.toLowerCase();
  if (/not\s+(started|implemented|executed)/.test(s)) return 'not_started';
  if (/in\s+progress|\bwip\b|partial/.test(s)) return 'in_progress';
  if (/\b(implemented|executed|complete[d]?|done)\b/.test(s)) return 'executed';
  return 'unknown';
}

export function parseStatus(content: string): KnowledgeStatus {
  const fm = frontMatter(content);
  const raw = fm.status ?? headerField(content, 'Status');
  return {
    raw,
    execution: parseExecution(fm.execution_status ?? raw),
    verification: parseVerification(fm.verification_status ?? raw),
    approval: parseApproval(fm.approval_status ?? raw),
  };
}

export function parseDate(content: string, statusRaw: string | null): string | null {
  const d = headerField(content, 'Date') ?? frontMatter(content).date ?? statusRaw;
  const m = d ? /(\d{4}-\d{2}-\d{2})/.exec(d) : null;
  return m ? m[1] : null;
}

const REF_RE = /\b(ADR-\d{4}|RISK-\d{3})\b|\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

export function parseReferences(content: string, selfId: string): string[] {
  const out = new Set<string>();
  for (const m of content.matchAll(REF_RE)) {
    const id = (m[1] ?? m[2] ?? '').trim();
    if (id && id !== selfId) out.add(id);
  }
  return [...out].sort();
}

/** Normalises "a/./b/../c" style paths. */
export function normalizePath(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return parts.join('/');
}

/** Relative markdown links to .md files, resolved to repo paths. External links are ignored. */
export function parseFileLinks(content: string, path: string): string[] {
  const dir = path.split('/').slice(0, -1).join('/');
  const out = new Set<string>();
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  for (const m of stripped.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target) || !/\.md$/i.test(target)) continue;
    out.add(normalizePath(target.startsWith('/') ? target.slice(1) : `${dir}/${target}`));
  }
  return [...out].sort();
}

export function parseRecord(file: KnowledgeSourceFile): KnowledgeRecord | null {
  const kind = kindForPath(file.path);
  if (!kind) return null;
  const id = idForPath(file.path, kind);
  const status = parseStatus(file.content);
  return {
    id,
    kind,
    title: parseTitle(file.content, file.path),
    path: file.path,
    origin: 'repo',
    date: parseDate(file.content, status.raw),
    area: headerField(file.content, 'Area'),
    status,
    references: parseReferences(file.content, id),
    fileLinks: parseFileLinks(file.content, file.path),
    body: file.content,
    evidence: extractEvidence(file.content),
  };
}
