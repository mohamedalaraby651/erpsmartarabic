import { describe, it, expect } from 'vitest';
import { openTab, closeTab, MAX_TABS } from './workspaceTabs';

describe('workspace tabs', () => {
  it('does not duplicate an already open screen', () => {
    const t = openTab([{ path: '/invoices', label: 'الفواتير' }], { path: '/invoices', label: 'الفواتير' });
    expect(t).toHaveLength(1);
  });
  it('keeps at most MAX_TABS tabs, dropping the oldest', () => {
    let t: { path: string; label: string }[] = [];
    for (let i = 0; i < MAX_TABS + 2; i++) t = openTab(t, { path: `/p${i}`, label: `${i}` });
    expect(t).toHaveLength(MAX_TABS);
    expect(t[0].path).toBe('/p2');
  });
  it('closes a tab by path', () => {
    expect(closeTab([{ path: '/a', label: 'a' }, { path: '/b', label: 'b' }], '/a')).toEqual([{ path: '/b', label: 'b' }]);
  });
});
