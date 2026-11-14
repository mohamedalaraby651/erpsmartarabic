/** Decision 357: tree search keeps matched accounts in place, expands their ancestors and marks matches. */
export interface TreeAccount { id: string; parent_id: string | null; code: string; name: string; name_en?: string | null }

export function searchAccountTree(accounts: TreeAccount[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const matches = new Set<string>();
  const visible = new Set<string>();
  const expand = new Set<string>();
  for (const a of accounts) {
    if (a.name.toLowerCase().includes(q) || a.code.includes(q) || (a.name_en ?? '').toLowerCase().includes(q)) {
      matches.add(a.id);
      visible.add(a.id);
      let p = a.parent_id ? byId.get(a.parent_id) : undefined;
      while (p && !expand.has(p.id)) {
        expand.add(p.id);
        visible.add(p.id);
        p = p.parent_id ? byId.get(p.parent_id) : undefined;
      }
    }
  }
  return { matches, visible, expand };
}
