import { describe, it, expect } from 'vitest';
import { searchAccountTree } from './accountTreeSearch';

const acc = [
  { id: '1', parent_id: null, code: '1', name: 'الأصول' },
  { id: '11', parent_id: '1', code: '11', name: 'الأصول المتداولة' },
  { id: '111', parent_id: '11', code: '1101', name: 'الصندوق' },
  { id: '2', parent_id: null, code: '2', name: 'الخصوم' },
];

describe('searchAccountTree', () => {
  it('returns null for empty query', () => expect(searchAccountTree(acc, '  ')).toBeNull());
  it('keeps and expands ancestors of a deep match', () => {
    const r = searchAccountTree(acc, 'الصندوق')!;
    expect([...r.matches]).toEqual(['111']);
    expect([...r.expand].sort()).toEqual(['1', '11']);
    expect(r.visible.has('2')).toBe(false);
  });
  it('matches by code', () => expect([...searchAccountTree(acc, '1101')!.matches]).toEqual(['111']));
});
