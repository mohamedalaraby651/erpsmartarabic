/**
 * Change-impact tree: which records depend on a record, from explicit
 * references/links in the source only. Depth-capped and cycle-safe.
 */
import type { KnowledgeIndex, KnowledgeRecord } from './types';

export const IMPACT_MAX_DEPTH = 2;

export interface ImpactNode {
  record: KnowledgeRecord;
  depth: number;
  /** True when this record already appears on the path back to the root. */
  cycle: boolean;
  children: ImpactNode[];
}

export function directDependents(index: KnowledgeIndex, target: KnowledgeRecord): KnowledgeRecord[] {
  return index.records.filter((r) => r.path !== target.path
    && (r.references.includes(target.id) || r.fileLinks.includes(target.path)));
}

export function impactTree(index: KnowledgeIndex, root: KnowledgeRecord, maxDepth = IMPACT_MAX_DEPTH): ImpactNode[] {
  const depthCap = Math.max(0, Math.min(maxDepth, IMPACT_MAX_DEPTH));
  const walk = (target: KnowledgeRecord, depth: number, onPath: Set<string>): ImpactNode[] => {
    if (depth > depthCap) return [];
    return directDependents(index, target).map((r) => {
      const cycle = onPath.has(r.path);
      const next = new Set(onPath); next.add(r.path);
      return { record: r, depth, cycle, children: cycle ? [] : walk(r, depth + 1, next) };
    });
  };
  return walk(root, 1, new Set([root.path]));
}
