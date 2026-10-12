import { useQuery } from '@tanstack/react-query';
import { knowledgeRepository } from '@/lib/repositories/knowledgeRepository';
import { backlinksFor } from '@/domain/knowledge';

/** Docs are fixed for the life of a build, so the index never goes stale. */
export function useKnowledgeIndex() {
  return useQuery({
    queryKey: ['knowledge-index'],
    queryFn: () => knowledgeRepository.loadIndex(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useKnowledgeRecord(id: string | undefined) {
  const q = useKnowledgeIndex();
  const matches = q.data && id ? q.data.records.filter((r) => r.id === id) : [];
  const record = matches[0] ?? null;
  const backlinks = q.data && record ? backlinksFor(q.data, record) : [];
  const issues = q.data && record ? q.data.issues.filter((i) => i.recordId === record.id) : [];
  return { ...q, record, duplicates: matches.slice(1), backlinks, issues };
}
