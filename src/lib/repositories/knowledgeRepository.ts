/**
 * Knowledge Repository — read-only access to repo documents bundled at build time.
 * No backend access, no writes.
 */
import { buildKnowledgeIndex, type KnowledgeIndex } from '@/domain/knowledge';
import { evidencePaths, loadKnowledgeSources } from '@/lib/knowledge/sources';

export const knowledgeRepository = {
  async loadIndex(): Promise<KnowledgeIndex> {
    return buildKnowledgeIndex(await loadKnowledgeSources(), evidencePaths());
  },
};
