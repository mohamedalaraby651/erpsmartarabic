import { describe, it, expect } from 'vitest';
import {
  createDefaultWorkspaceState,
  normalizeCustomerWorkspaceState,
  parseCustomerWorkspaceState,
  serializeCustomerWorkspaceState,
  validateCustomerWorkspaceState,
  isSameWorkspaceState,
  encodeSortParam,
  decodeSortParam,
  encodeColumnFiltersParam,
  decodeColumnFiltersParam,
  WORKSPACE_PRESETS,
  LIMITS,
} from '@/lib/customers/workspaceState';

describe('CustomerWorkspaceStateV1 contract (B0)', () => {
  it('defaults are valid canonical V1', () => {
    expect(validateCustomerWorkspaceState(createDefaultWorkspaceState())).toBe(true);
  });

  it('round-trips a full state through serialize/parse', () => {
    const s = normalizeCustomerWorkspaceState({
      version: 1,
      search: 'محمد',
      filters: { status: 'debtors', governorate: 'القاهرة' },
      columnFilters: {
        name: { kind: 'text', values: ['أحمد', 'سارة'] },
        balance: { kind: 'number', operator: 'gt', from: '1000' },
      },
      sort: { key: 'current_balance', direction: 'desc' },
      activeViewId: 'preset:debtors',
    });
    const back = parseCustomerWorkspaceState(serializeCustomerWorkspaceState(s));
    expect(back).toEqual(s);
    expect(isSameWorkspaceState(s, back, true)).toBe(true);
  });

  it('drops only invalid fields and keeps valid ones', () => {
    const s = normalizeCustomerWorkspaceState({
      version: 1,
      search: 'x',
      filters: { type: 'HACK', vip: 'gold', noCommDays: '99999' },
      sort: { key: 'INVALID', direction: 'desc' },
      columnFilters: {
        unknown: { kind: 'text', text: 'a' },
        type: { kind: 'text', text: 'wrong kind' },
        phone: { kind: 'text', text: '010', operator: 'DROP' },
      },
    });
    expect(s.filters.type).toBe('all');
    expect(s.filters.vip).toBe('gold');
    expect(s.filters.noCommDays).toBe('');
    expect(s.sort).toEqual({ key: '', direction: null });
    expect(Object.keys(s.columnFilters)).toEqual(['phone']);
    expect(s.columnFilters.phone.operator).toBeUndefined();
    expect(s.search).toBe('x');
  });

  it('adapts legacy saved-view payloads without migration', () => {
    const s = normalizeCustomerWorkspaceState({
      type: 'company', vip: 'all', governorate: 'الجيزة', status: 'active', noCommDays: '30', inactiveDays: '',
    });
    expect(s.filters).toMatchObject({ type: 'company', governorate: 'الجيزة', status: 'active', noCommDays: '30' });
    expect(s.columnFilters).toEqual({});
  });

  it('rejects malformed and oversized payloads safely', () => {
    expect(parseCustomerWorkspaceState('{bad json')).toEqual(createDefaultWorkspaceState());
    expect(parseCustomerWorkspaceState('x'.repeat(LIMITS.rawPayload + 1))).toEqual(createDefaultWorkspaceState());
    expect(parseCustomerWorkspaceState(null)).toEqual(createDefaultWorkspaceState());
    const tooMany = Array.from({ length: LIMITS.optionCount + 1 }, (_, i) => `v${i}`);
    expect(normalizeCustomerWorkspaceState({ version: 1, columnFilters: { name: { kind: 'text', values: tooMany } } }).columnFilters)
      .toEqual({});
  });

  it('strips bidi / control markers from text', () => {
    const s = normalizeCustomerWorkspaceState({ version: 1, search: '\u202Bعلي\u200F' });
    expect(s.search).toBe('علي');
  });

  it('rejects arbitrary view ids', () => {
    expect(normalizeCustomerWorkspaceState({ activeViewId: 'javascript:alert(1)' }).activeViewId).toBeNull();
    expect(normalizeCustomerWorkspaceState({ activeViewId: '4b6f0c2e-1d2a-4c3b-9e8f-0a1b2c3d4e5f' }).activeViewId).not.toBeNull();
  });

  it('dirty comparison ignores the view id', () => {
    const debtors = WORKSPACE_PRESETS.find((p) => p.id === 'preset:debtors')!.state;
    const live = { ...debtors, activeViewId: null };
    expect(isSameWorkspaceState(debtors, live)).toBe(true);
    expect(isSameWorkspaceState(debtors, { ...live, search: 'محمد' })).toBe(false);
  });

  it('validate flags non-canonical input', () => {
    expect(validateCustomerWorkspaceState({ ...createDefaultWorkspaceState(), search: '\u200Fa' })).toBe(false);
    expect(validateCustomerWorkspaceState({ version: 2 })).toBe(false);
  });

  it('encodes/decodes URL params with whitelisting', () => {
    expect(encodeSortParam({ key: 'name', direction: 'asc' })).toBe('name.asc');
    expect(decodeSortParam('name.asc')).toEqual({ key: 'name', direction: 'asc' });
    expect(decodeSortParam('evil.asc')).toBeNull();
    const cf = { city: { kind: 'options' as const, values: ['المنيا'] } };
    expect(decodeColumnFiltersParam(encodeColumnFiltersParam(cf))).toEqual(cf);
    expect(decodeColumnFiltersParam('{{')).toEqual({});
    expect(encodeColumnFiltersParam({})).toBeNull();
  });
});
