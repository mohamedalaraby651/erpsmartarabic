/**
 * Builds the knowledge index and detects integrity problems.
 * Detection only — nothing is repaired or rewritten.
 */
import { parseRecord } from './parse';
import type { IntegrityIssue, KnowledgeIndex, KnowledgeRecord, KnowledgeSourceFile } from './types';

const INDEX_FILES = new Set(['INDEX.md', 'README.md', 'TEMPLATE.md']);

export function buildKnowledgeIndex(files: KnowledgeSourceFile[]): KnowledgeIndex {
  const allPaths = new Set(files.map((f) => f.path));
  const records: KnowledgeRecord[] = [];
  for (const f of files) {
    const name = f.path.split('/').pop() ?? '';
    if (f.path.startsWith('docs/adr/') && INDEX_FILES.has(name)) continue;
    const r = parseRecord(f);
    if (r) records.push(r);
  }
  records.sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path));

  const issues: IntegrityIssue[] = [];

  // Duplicate ids
  const byId = new Map<string, KnowledgeRecord[]>();
  for (const r of records) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);
  for (const [id, list] of byId) {
    if (list.length > 1) {
      issues.push({
        type: 'duplicate_id', severity: 'error', recordId: id, path: null,
        detail: `المعرّف ${id} مستخدم في ${list.length} ملفات: ${list.map((r) => r.path).join('، ')}`,
      });
    }
  }

  const ids = new Set(records.map((r) => r.id));
  for (const r of records) {
    for (const link of r.fileLinks) {
      // Only links inside the scanned doc sets can be checked.
      if (!link.startsWith('docs/') || link.startsWith('docs/security/')) continue;
      if (!allPaths.has(link)) {
        issues.push({ type: 'broken_file_link', severity: 'error', recordId: r.id, path: r.path, detail: `رابط إلى ملف غير موجود: ${link}` });
      }
    }
    for (const ref of r.references) {
      if (!ids.has(ref)) {
        issues.push({ type: 'unresolved_reference', severity: 'warning', recordId: r.id, path: r.path, detail: `إشارة إلى ${ref} لا يقابلها سجل في المستودع` });
      }
    }
    if ((r.kind === 'adr' || r.kind === 'governance' || r.kind === 'risk') && r.status.raw === null) {
      issues.push({ type: 'unparsed_status', severity: 'warning', recordId: r.id, path: r.path, detail: 'لا يوجد حقل حالة قابل للقراءة في رأس الملف' });
    }
  }

  // ADR index drift: ADR files not listed in docs/adr/INDEX.md
  const indexFile = files.find((f) => f.path === 'docs/adr/INDEX.md');
  if (indexFile) {
    const listed = new Set([...indexFile.content.matchAll(/\]\(\.\/([^)]+\.md)\)/g)].map((m) => `docs/adr/${m[1]}`));
    for (const r of records.filter((x) => x.kind === 'adr')) {
      if (!listed.has(r.path)) {
        issues.push({ type: 'index_drift', severity: 'warning', recordId: r.id, path: r.path, detail: 'ملف ADR غير مُدرج في docs/adr/INDEX.md' });
      }
    }
    for (const p of listed) {
      if (!allPaths.has(p)) {
        issues.push({ type: 'index_drift', severity: 'error', recordId: null, path: 'docs/adr/INDEX.md', detail: `INDEX يشير إلى ملف غير موجود: ${p}` });
      }
    }
  } else {
    issues.push({ type: 'index_drift', severity: 'warning', recordId: null, path: 'docs/adr/INDEX.md', detail: 'ملف INDEX غير موجود ضمن المصادر' });
  }

  return { records, issues };
}

/** Records that reference the given id or link to its file (backlinks). */
export function backlinksFor(index: KnowledgeIndex, record: KnowledgeRecord): KnowledgeRecord[] {
  return index.records.filter((r) => r !== record && (r.references.includes(record.id) || r.fileLinks.includes(record.path)));
}
