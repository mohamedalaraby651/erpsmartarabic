import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildKnowledgeIndex, idForPath, parseApproval, parseExecution, parseFileLinks, parseRecord,
  parseReferences, parseStatus, parseVerification, type KnowledgeSourceFile,
} from '@/domain/knowledge';

describe('status axes are independent', () => {
  it('executed alone does not imply verified or accepted', () => {
    const s = parseStatus('# X\nStatus: IMPLEMENTED\n');
    expect(s.execution).toBe('executed');
    expect(s.verification).toBe('unknown');
    expect(s.approval).toBe('unknown');
  });
  it('"verified" alone does not imply accepted', () => {
    expect(parseApproval('IMPLEMENTED + VERIFIED')).toBe('unknown');
    expect(parseVerification('IMPLEMENTED + VERIFIED')).toBe('verified');
  });
  it('reads the real governance compound status', () => {
    const s = parseStatus('# G1\nStatus: IMPLEMENTED + VERIFIED / NOT HUMAN ACCEPTED / NOT CERTIFIED — 2026-09-24\n');
    expect(s).toMatchObject({ execution: 'executed', verification: 'verified', approval: 'pending' });
  });
  it('reads bold and bulleted ADR headers', () => {
    expect(parseStatus('# A\n\n**Status:** Accepted  \n').approval).toBe('accepted');
    expect(parseStatus('# A\n- **Status:** Draft (Wave-1 Conditionally Accepted — flips later)\n').approval).toBe('pending');
    expect(parseStatus('# A\n- **Status:** Superseded by ADR-0030\n').approval).toBe('superseded');
  });
  it('missing status stays unknown on every axis', () => {
    expect(parseStatus('# Just a title\n\nBody')).toEqual({ raw: null, execution: 'unknown', verification: 'unknown', approval: 'unknown' });
  });
  it('negations win over positives', () => {
    expect(parseVerification('NOT VERIFIED')).toBe('unverified');
    expect(parseExecution('NOT IMPLEMENTED')).toBe('not_started');
  });
});

describe('ids and links', () => {
  it('derives stable ids from paths', () => {
    expect(idForPath('docs/adr/0031-enterprise-boundary-contract.md', 'adr')).toBe('ADR-0031');
    expect(idForPath('docs/risk-log/RISK-007-security-backlog.md', 'risk')).toBe('RISK-007');
    expect(idForPath('docs/governance/F1A_EXECUTION_RECORD.md', 'governance')).toBe('GOV:F1A_EXECUTION_RECORD');
    expect(idForPath('docs/architecture/baseline/01-snapshot.md', 'architecture')).toBe('ARC:baseline/01-snapshot');
  });
  it('parses references and wikilinks, excluding self', () => {
    expect(parseReferences('see ADR-0031 and RISK-007 and [[ADR-0013|tags]] ADR-0014', 'ADR-0014')).toEqual(['ADR-0013', 'ADR-0031', 'RISK-007']);
  });
  it('resolves relative md links and ignores external/code links', () => {
    const c = '[a](../architecture/PRINCIPLES.md) [b](https://x.y/z.md) `[c](./no.md)` [d](./0013-baseline-architecture-tags.md#x)';
    expect(parseFileLinks(c, 'docs/adr/INDEX.md')).toEqual(['docs/adr/0013-baseline-architecture-tags.md', 'docs/architecture/PRINCIPLES.md']);
  });
  it('flags duplicate ids, broken links and index drift', () => {
    const files: KnowledgeSourceFile[] = [
      { path: 'docs/adr/INDEX.md', content: '[A](./0001-a.md) [Z](./0099-missing.md)' },
      { path: 'docs/adr/0001-a.md', content: '# A\n**Status:** Accepted\n[x](./0002-b.md)' },
      { path: 'docs/adr/0001-b.md', content: '# B\n**Status:** Proposed\nRefs ADR-0500' },
    ];
    const { records, issues } = buildKnowledgeIndex(files);
    expect(records).toHaveLength(2);
    const types = issues.map((i) => i.type).sort();
    expect(types).toEqual(['broken_file_link', 'duplicate_id', 'index_drift', 'index_drift', 'unresolved_reference']);
  });
});

// Real repository documents — the parser must handle the actual formats in docs/.
function walk(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const full = join(dir, n);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (n.endsWith('.md')) acc.push(full);
  }
  return acc;
}
const ROOTS = ['docs/adr', 'docs/governance', 'docs/risk-log', 'docs/contracts', 'docs/architecture'];
const realFiles: KnowledgeSourceFile[] = ROOTS.flatMap((r) => walk(r)).map((p) => ({ path: p.replace(/\\/g, '/'), content: readFileSync(p, 'utf8') }));

describe('real docs', () => {
  const index = buildKnowledgeIndex(realFiles);
  it('parses every real file into a record (except ADR index files)', () => {
    const skipped = realFiles.filter((f) => /docs\/adr\/(INDEX|README|TEMPLATE)\.md$/.test(f.path)).length;
    expect(index.records.length).toBe(realFiles.length - skipped);
    for (const r of index.records) expect(r.title.length).toBeGreaterThan(0);
  });
  it('reads ADR-0031 as accepted from its own header', () => {
    const r = parseRecord(realFiles.find((f) => f.path.endsWith('0031-enterprise-boundary-contract.md'))!);
    expect(r?.id).toBe('ADR-0031');
    expect(r?.status.approval).toBe('accepted');
    expect(r?.date).toBe('2026-08-29');
  });
  it('detects the known duplicate ADR-0028 without fixing it', () => {
    const dup = index.issues.find((i) => i.type === 'duplicate_id' && i.recordId === 'ADR-0028');
    expect(dup).toBeDefined();
  });
  it('detects ADR files missing from INDEX.md', () => {
    expect(index.issues.filter((i) => i.type === 'index_drift').length).toBeGreaterThan(0);
  });
  it('contains only repo-origin records (no demo, no drafts)', () => {
    expect(index.records.every((r) => r.origin === 'repo')).toBe(true);
  });
  it('never yields "accepted" without the word in the raw source status', () => {
    for (const r of index.records.filter((x) => x.status.approval === 'accepted')) {
      expect(r.status.raw ?? '').toMatch(/accepted|approved/i);
    }
  });
});
