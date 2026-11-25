export interface JournalDimensions {
  cost_center_id?: string | null;
  project_id?: string | null;
  department_id?: string | null;
}

/** All supplied dimension identifiers must resolve inside the journal's tenant. */
export async function validateJournalDimensions(
  entries: JournalDimensions[],
  lookup: (table: string, ids: string[]) => Promise<string[]>,
): Promise<boolean> {
  const dimensions = [
    ['cost_center_id', 'tenant_cost_centers'],
    ['project_id', 'tenant_projects'],
    ['department_id', 'tenant_departments'],
  ] as const;
  for (const [field, table] of dimensions) {
    const ids = [...new Set(entries.flatMap(entry => {
      const value = entry[field];
      return value ? [value] : [];
    }))];
    if (ids.length === 0) continue;
    const found = new Set(await lookup(table, ids));
    if (ids.some(id => !found.has(id))) return false;
  }
  return true;
}