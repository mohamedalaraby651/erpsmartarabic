/**
 * Build-time, read-only knowledge sources: Markdown files already tracked in docs/.
 * Lazy: each file becomes its own chunk, fetched only when a knowledge page opens.
 * docs/security/** is intentionally excluded.
 */
import type { KnowledgeSourceFile } from '@/domain/knowledge';

const loaders = import.meta.glob(
  [
    '/docs/adr/*.md',
    '/docs/governance/*.md',
    '/docs/risk-log/*.md',
    '/docs/contracts/*.md',
    '/docs/architecture/**/*.md',
  ],
  { query: '?raw', import: 'default' },
) as Record<string, () => Promise<string>>;

export function knowledgeSourcePaths(): string[] {
  return Object.keys(loaders).map((k) => k.replace(/^\//, '')).sort();
}

export async function loadKnowledgeSources(): Promise<KnowledgeSourceFile[]> {
  const entries = Object.entries(loaders);
  const files = await Promise.all(
    entries.map(async ([key, load]) => ({ path: key.replace(/^\//, ''), content: await load() })),
  );
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
