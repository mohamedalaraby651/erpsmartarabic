import { describe, it, expect } from 'vitest';
import {
  buildKnowledgeIndex, extractEvidence, resolveEvidence, impactTree, IMPACT_MAX_DEPTH,
  knowledgeBreadcrumbs, isKnowledgePath, hasSuccessorRef, type KnowledgeSourceFile,
} from '@/domain/knowledge';

const f = (path: string, content: string): KnowledgeSourceFile => ({ path, content });
const INDEX = f('docs/adr/INDEX.md', '');

describe('evidence extraction', () => {
  it('extracts audit outputs, execution records and tests', () => {
    const refs = extractEvidence('See scripts/audits/output/a.json, `docs/governance/F1A_EXECUTION_RECORD.md` and src/x/y.test.ts.');
    expect(refs.map((r) => [r.path, r.kind])).toEqual([
      ['docs/governance/F1A_EXECUTION_RECORD.md', 'execution_record'],
      ['scripts/audits/output/a.json', 'audit_output'],
      ['src/x/y.test.ts', 'test'],
    ]);
  });
  it('never extracts security paths or plain source files', () => {
    expect(extractEvidence('docs/governance/security/x_RECORD.md src/security/a.test.ts src/lib/a.ts')).toEqual([]);
  });
  it('resolves presence against the repo path set', () => {
    const refs = resolveEvidence(extractEvidence('scripts/audits/output/a.json scripts/audits/output/missing.json'), new Set(['scripts/audits/output/a.json']));
    expect(refs.map((r) => r.exists)).toEqual([true, false]);
  });
});

describe('impact tree', () => {
  const idx = buildKnowledgeIndex([
    INDEX,
    f('docs/adr/0001-a.md', '# A\n'),
    f('docs/adr/0002-b.md', '# B\nuses ADR-0001 and ADR-0003'),
    f('docs/adr/0003-c.md', '# C\nuses ADR-0002'),
    f('docs/adr/0004-d.md', '# D\nuses ADR-0003'),
  ]);
  const a = idx.records.find((r) => r.id === 'ADR-0001')!;
  it('caps depth at 2', () => {
    const tree = impactTree(idx, a, 10);
    expect(IMPACT_MAX_DEPTH).toBe(2);
    expect(tree.map((n) => n.record.id)).toEqual(['ADR-0002']);
    expect(tree[0].children.map((n) => n.record.id)).toEqual(['ADR-0003']);
    expect(tree[0].children[0].children).toEqual([]);
  });
  it('flags and stops cycles', () => {
    const b = idx.records.find((r) => r.id === 'ADR-0002')!;
    const tree = impactTree(idx, b);
    const c = tree.find((n) => n.record.id === 'ADR-0003')!;
    const back = c.children.find((n) => n.record.id === 'ADR-0002')!;
    expect(back.cycle).toBe(true);
    expect(back.children).toEqual([]);
  });
});

describe('status warnings', () => {
  it('warns when executed without any evidence, not when evidence is mentioned', () => {
    const idx = buildKnowledgeIndex([
      INDEX,
      f('docs/governance/A.md', '# A\nStatus: IMPLEMENTED\n'),
      f('docs/governance/B.md', '# B\nStatus: IMPLEMENTED\nscripts/audits/output/x.json'),
    ]);
    const w = idx.issues.filter((i) => i.type === 'executed_without_evidence').map((i) => i.path);
    expect(w).toEqual(['docs/governance/A.md']);
  });
  it('warns when superseded without naming the successor', () => {
    const idx = buildKnowledgeIndex([
      INDEX,
      f('docs/adr/0005-x.md', '# X\n- **Status:** Superseded\n'),
      f('docs/adr/0006-y.md', '# Y\n- **Status:** Superseded by ADR-0030\n'),
    ]);
    expect(idx.issues.filter((i) => i.type === 'superseded_without_successor').map((i) => i.recordId)).toEqual(['ADR-0005']);
    expect(hasSuccessorRef('Superseded by ADR-0005', 'ADR-0005')).toBe(false);
  });
  it('warnings never change record status', () => {
    const idx = buildKnowledgeIndex([INDEX, f('docs/governance/A.md', '# A\nStatus: IMPLEMENTED\n')]);
    expect(idx.records[0].status).toMatchObject({ execution: 'executed', verification: 'unknown', approval: 'unknown' });
  });
  it('excludes security documents from the index', () => {
    const idx = buildKnowledgeIndex([INDEX, f('docs/security/x.md', '# S'), f('docs/governance/security/y.md', '# S')]);
    expect(idx.records).toEqual([]);
  });
});

describe('knowledge breadcrumbs', () => {
  it('only applies to knowledge paths', () => {
    expect(isKnowledgePath('/admin/knowledge/adr')).toBe(true);
    expect(isKnowledgePath('/admin/users')).toBe(false);
  });
  it('uses Arabic labels for technical segments', () => {
    expect(knowledgeBreadcrumbs('/admin/knowledge/adr').map((c) => c.label)).toEqual(['الإدارة', 'المعرفة الهندسية', 'القرارات المعمارية']);
    expect(knowledgeBreadcrumbs('/admin/knowledge/matrix').at(-1)?.label).toBe('مصفوفة الحالات');
  });
  it('shows the document title instead of the full path', () => {
    const c = knowledgeBreadcrumbs('/admin/knowledge/doc/docs/adr/0031-x.md', (p) => (p === 'docs/adr/0031-x.md' ? 'عقد الحدود' : null));
    expect(c.map((x) => x.label)).toEqual(['الإدارة', 'المعرفة الهندسية', 'عقد الحدود']);
    expect(c.at(-1)?.isLast).toBe(true);
  });
  it('falls back to the file name, never the full path', () => {
    expect(knowledgeBreadcrumbs('/admin/knowledge/doc/docs/adr/0031-x.md').at(-1)?.label).toBe('0031-x.md');
  });
});
