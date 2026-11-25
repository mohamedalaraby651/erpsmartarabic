import { describe, expect, it, vi } from 'vitest';
import { validateJournalDimensions } from '../../../supabase/functions/_shared/journalDimensions';

describe('journal dimension tenant isolation', () => {
  it.each([
    ['cost_center_id', 'tenant_cost_centers'],
    ['project_id', 'tenant_projects'],
    ['department_id', 'tenant_departments'],
  ])('rejects a foreign %s absent from the tenant-scoped lookup', async (field, table) => {
    const lookup = vi.fn().mockResolvedValue(['own']);
    expect(await validateJournalDimensions([{ [field]: 'foreign' }], lookup)).toBe(false);
    expect(lookup).toHaveBeenCalledWith(table, ['foreign']);
  });
  it('allows own dimensions and deduplicates identifiers', async () => {
    const lookup = vi.fn().mockResolvedValue(['own']);
    expect(await validateJournalDimensions([{ project_id: 'own' }, { project_id: 'own' }], lookup)).toBe(true);
    expect(lookup).toHaveBeenCalledWith('tenant_projects', ['own']);
  });
  it('allows optional dimensions without querying', async () => {
    const lookup = vi.fn();
    expect(await validateJournalDimensions([{}], lookup)).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('does not accept lookup failures', async () => {
    await expect(validateJournalDimensions([{ project_id: 'own' }], async () => { throw new Error('unavailable'); })).rejects.toThrow('unavailable');
  });
});