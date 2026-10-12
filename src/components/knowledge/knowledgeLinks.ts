import type { KnowledgeIndex, KnowledgeKind } from '@/domain/knowledge';

export const knowledgeHome = '/admin/knowledge';
export const knowledgeListHref = (kind: KnowledgeKind) => `/admin/knowledge/${kind}`;
export const knowledgeDocHref = (path: string) => `/admin/knowledge/doc/${path}`;
export const knowledgeIntegrityHref = '/admin/knowledge/integrity';

export function makeResolvers(index: KnowledgeIndex | undefined) {
  const byId = new Map<string, string>();
  const paths = new Set<string>();
  for (const r of index?.records ?? []) {
    if (!byId.has(r.id)) byId.set(r.id, r.path);
    paths.add(r.path);
  }
  return {
    hrefForId: (id: string) => { const p = byId.get(id); return p ? knowledgeDocHref(p) : null; },
    hrefForPath: (p: string) => (paths.has(p) ? knowledgeDocHref(p) : null),
  };
}
