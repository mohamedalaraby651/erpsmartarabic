/**
 * CustomerWorkspaceStateV1 — OPA-CUST-UI-005 v2.0 / B0.
 *
 * Single, versioned contract for the customers workspace *query* state
 * (search, legacy filters, column filters, sort, active saved view).
 *
 * Pure functions only: no React, no storage, no network. Every external
 * payload (URL, saved view JSON, localStorage) must pass through
 * `parse → normalize` before it reaches the page. Invalid fields are dropped
 * one by one; valid fields survive. Nothing here ever throws.
 *
 * Presentation preferences (widths, density, column order) are deliberately
 * NOT part of this contract — they live in `useTableLayout`.
 */
import type { ColumnFilter, ColumnFilters } from '@/components/ui/column-filter';
import { CUSTOMER_TABLE_COLUMNS } from '@/components/customers/list/customerTableColumns';
import { egyptGovernorates } from '@/lib/egyptLocations';

export const WORKSPACE_STATE_VERSION = 1 as const;

export type SortDirection = 'asc' | 'desc' | null;

export interface CustomerWorkspaceFilters {
  type: string;
  vip: string;
  governorate: string;
  status: string;
  category: string;
  noCommDays: string;
  inactiveDays: string;
}

export interface CustomerWorkspaceStateV1 {
  version: typeof WORKSPACE_STATE_VERSION;
  search: string;
  filters: CustomerWorkspaceFilters;
  columnFilters: ColumnFilters;
  sort: { key: string; direction: SortDirection };
  activeViewId: string | null;
}

// ── Limits ────────────────────────────────────────────────────────────────
export const LIMITS = {
  rawPayload: 8_000,
  search: 120,
  text: 120,
  optionValue: 120,
  optionCount: 200,
  bound: 32,
  category: 60,
  days: 4,
  viewId: 64,
} as const;

// ── Whitelists ────────────────────────────────────────────────────────────
const TYPE_VALUES = new Set(['all', 'individual', 'company', 'farm']);
const VIP_VALUES = new Set(['all', 'regular', 'silver', 'gold', 'platinum', 'non-regular']);
const STATUS_VALUES = new Set(['all', 'active', 'inactive', 'debtors']);
const GOVERNORATES = new Set<string>(['all', ...egyptGovernorates]);
const TEXT_OPERATORS = new Set(['contains', 'equals', 'startsWith', 'endsWith']);
const NUMBER_OPERATORS = new Set(['between', 'gt', 'lt', 'eq']);
const DATE_PRESETS = new Set(['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth']);
const COLUMN_KIND = new Map(CUSTOMER_TABLE_COLUMNS.map((c) => [c.key, c.kind]));
export const SORT_KEYS = new Set<string>([
  '',
  'vip_level',
  ...CUSTOMER_TABLE_COLUMNS.map((c) => c.sortKey).filter((k): k is string => Boolean(k)),
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRESET_ID_RE = /^preset:[a-z-]{1,24}$/;
const DAYS_RE = /^\d{1,4}$/;
const BOUND_RE = /^-?[\d.:\-T]{1,32}$/;

export const DEFAULT_FILTERS: CustomerWorkspaceFilters = Object.freeze({
  type: 'all', vip: 'all', governorate: 'all', status: 'all', category: 'all', noCommDays: '', inactiveDays: '',
}) as CustomerWorkspaceFilters;

export function createDefaultWorkspaceState(): CustomerWorkspaceStateV1 {
  return {
    version: WORKSPACE_STATE_VERSION,
    search: '',
    filters: { ...DEFAULT_FILTERS },
    columnFilters: {},
    sort: { key: '', direction: null },
    activeViewId: null,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Removes bidi/zero-width markers and control chars, trims, caps length. */
export function cleanText(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').trim();
  if (s.length > max) return undefined;
  return s;
}

const pick = (v: unknown, allowed: Set<string>): string | undefined =>
  typeof v === 'string' && allowed.has(v) ? v : undefined;

function normalizeFilters(input: unknown): CustomerWorkspaceFilters {
  const out = { ...DEFAULT_FILTERS };
  if (!isObj(input)) return out;
  // Accept both the V1 shape and the legacy saved-view / URL shapes.
  out.type = pick(input.type, TYPE_VALUES) ?? out.type;
  out.vip = pick(input.vip, VIP_VALUES) ?? out.vip;
  out.governorate = pick(input.governorate ?? input.gov, GOVERNORATES) ?? out.governorate;
  out.status = pick(input.status, STATUS_VALUES) ?? out.status;
  const cat = cleanText(input.category ?? input.cat, LIMITS.category);
  if (cat) out.category = cat;
  const noComm = input.noCommDays ?? input.noComm;
  if (typeof noComm === 'string' && DAYS_RE.test(noComm)) out.noCommDays = noComm;
  const inactive = input.inactiveDays ?? input.inactive;
  if (typeof inactive === 'string' && DAYS_RE.test(inactive)) out.inactiveDays = inactive;
  return out;
}

function normalizeColumnFilter(key: string, input: unknown): ColumnFilter | undefined {
  const expected = COLUMN_KIND.get(key);
  if (!expected || !isObj(input) || input.kind !== expected) return undefined;
  const f: ColumnFilter = { kind: expected };
  if (Array.isArray(input.values)) {
    if (input.values.length > LIMITS.optionCount) return undefined;
    const values = input.values
      .map((v) => cleanText(v, LIMITS.optionValue))
      .filter((v): v is string => !!v);
    if (values.length) f.values = Array.from(new Set(values));
  }
  if (expected === 'text') {
    const text = cleanText(input.text, LIMITS.text);
    if (text) f.text = text;
    const op = pick(input.operator, TEXT_OPERATORS);
    if (op) f.operator = op as ColumnFilter['operator'];
  }
  if (expected === 'number' || expected === 'date') {
    for (const k of ['from', 'to'] as const) {
      const b = input[k];
      if (typeof b === 'string' && BOUND_RE.test(b)) f[k] = b;
    }
    if (expected === 'number') {
      const op = pick(input.operator, NUMBER_OPERATORS);
      if (op) f.operator = op as ColumnFilter['operator'];
    } else {
      const preset = pick(input.preset, DATE_PRESETS);
      if (preset) f.preset = preset;
    }
  }
  const active =
    (f.values?.length ?? 0) > 0 || !!f.text || !!f.from || !!f.to;
  return active ? f : undefined;
}

function normalizeColumnFilters(input: unknown): ColumnFilters {
  const out: ColumnFilters = {};
  if (!isObj(input)) return out;
  for (const [key, value] of Object.entries(input)) {
    const f = normalizeColumnFilter(key, value);
    if (f) out[key] = f;
  }
  return out;
}

function normalizeSort(input: unknown): CustomerWorkspaceStateV1['sort'] {
  if (!isObj(input)) return { key: '', direction: null };
  const key = pick(input.key, SORT_KEYS) ?? '';
  const direction: SortDirection =
    input.direction === 'asc' || input.direction === 'desc' ? input.direction : null;
  return key ? { key, direction } : { key: '', direction: null };
}

export function normalizeViewId(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > LIMITS.viewId) return null;
  return UUID_RE.test(v) || PRESET_ID_RE.test(v) ? v : null;
}

// ── Public API ────────────────────────────────────────────────────────────

/** Normalises any unknown value (V1, legacy saved view, partial) into V1. */
export function normalizeCustomerWorkspaceState(input: unknown): CustomerWorkspaceStateV1 {
  const state = createDefaultWorkspaceState();
  if (!isObj(input)) return state;
  const isV1 = input.version === WORKSPACE_STATE_VERSION;
  state.search = cleanText(isV1 ? input.search : input.search ?? input.q, LIMITS.search) ?? '';
  state.filters = normalizeFilters(isV1 ? input.filters : input);
  state.columnFilters = normalizeColumnFilters(input.columnFilters);
  state.sort = normalizeSort(input.sort);
  state.activeViewId = normalizeViewId(input.activeViewId);
  return state;
}

/** Safe JSON entry point: oversized / malformed payloads yield defaults. */
export function parseCustomerWorkspaceState(raw: unknown): CustomerWorkspaceStateV1 {
  if (typeof raw !== 'string') return normalizeCustomerWorkspaceState(raw);
  if (raw.length === 0 || raw.length > LIMITS.rawPayload) return createDefaultWorkspaceState();
  try {
    return normalizeCustomerWorkspaceState(JSON.parse(raw));
  } catch {
    return createDefaultWorkspaceState();
  }
}

/** True when the state is structurally valid V1 (after normalisation it always is). */
export function validateCustomerWorkspaceState(input: unknown): input is CustomerWorkspaceStateV1 {
  return isObj(input) && isSameWorkspaceState(input as CustomerWorkspaceStateV1, normalizeCustomerWorkspaceState(input), true)
    && input.version === WORKSPACE_STATE_VERSION;
}

/** Compact, deterministic payload: defaults are omitted, keys sorted. */
export function toWorkspacePayload(state: CustomerWorkspaceStateV1): Record<string, unknown> {
  const s = normalizeCustomerWorkspaceState(state);
  const payload: Record<string, unknown> = { version: WORKSPACE_STATE_VERSION };
  if (s.search) payload.search = s.search;
  const filters = Object.fromEntries(
    Object.entries(s.filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k as keyof CustomerWorkspaceFilters]),
  );
  // Always emit filters so the V1 marker never falls back to legacy parsing.
  payload.filters = filters;
  const cfKeys = Object.keys(s.columnFilters).sort();
  if (cfKeys.length) payload.columnFilters = Object.fromEntries(cfKeys.map((k) => [k, s.columnFilters[k]]));
  if (s.sort.key) payload.sort = s.sort;
  if (s.activeViewId) payload.activeViewId = s.activeViewId;
  return payload;
}

export function serializeCustomerWorkspaceState(state: CustomerWorkspaceStateV1): string {
  return JSON.stringify(toWorkspacePayload(state));
}

/**
 * Query-equivalence: compares everything that changes the result set.
 * `activeViewId` is ignored unless `includeView` is set, so a saved view can be
 * compared against the live state to derive "dirty".
 */
export function isSameWorkspaceState(
  a: CustomerWorkspaceStateV1,
  b: CustomerWorkspaceStateV1,
  includeView = false,
): boolean {
  const strip = (s: CustomerWorkspaceStateV1) => {
    const p = toWorkspacePayload(s);
    if (!includeView) delete p.activeViewId;
    return JSON.stringify(p);
  };
  return strip(a) === strip(b);
}

// ── Built-in presets (same semantics as the existing quick filters) ───────
export interface WorkspacePreset {
  id: `preset:${string}`;
  name: string;
  state: CustomerWorkspaceStateV1;
}

const preset = (id: string, name: string, filters: Partial<CustomerWorkspaceFilters>): WorkspacePreset => ({
  id: `preset:${id}`,
  name,
  state: { ...createDefaultWorkspaceState(), filters: { ...DEFAULT_FILTERS, ...filters }, activeViewId: `preset:${id}` },
});

export const WORKSPACE_PRESETS: readonly WorkspacePreset[] = [
  preset('all', 'الكل', {}),
  preset('active', 'النشطون', { status: 'active' }),
  preset('inactive', 'غير النشطين', { status: 'inactive' }),
  preset('vip', 'VIP', { vip: 'non-regular' }),
  preset('debtors', 'المدينون', { status: 'debtors' }),
];

// ── URL encoding (B1) ─────────────────────────────────────────────────────
/** Query-param keys owned by the customers workspace in addition to legacy q/type/vip/gov/status/cat/noComm/inactive. */
export const URL_KEYS = { sort: 'sort', columnFilters: 'cf', view: 'view' } as const;

export function encodeSortParam(sort: CustomerWorkspaceStateV1['sort']): string | null {
  const s = normalizeSort(sort);
  return s.key && s.direction ? `${s.key}.${s.direction}` : null;
}

export function decodeSortParam(raw: string | null): CustomerWorkspaceStateV1['sort'] | null {
  if (!raw || raw.length > 40) return null;
  const [key, direction] = raw.split('.');
  const s = normalizeSort({ key, direction });
  return s.key && s.direction ? s : null;
}

export function encodeColumnFiltersParam(cf: ColumnFilters): string | null {
  const n = normalizeColumnFilters(cf);
  const keys = Object.keys(n).sort();
  if (!keys.length) return null;
  const s = JSON.stringify(Object.fromEntries(keys.map((k) => [k, n[k]])));
  return s.length <= LIMITS.rawPayload ? s : null;
}

export function decodeColumnFiltersParam(raw: string | null): ColumnFilters {
  if (!raw || raw.length > LIMITS.rawPayload) return {};
  try {
    return normalizeColumnFilters(JSON.parse(raw));
  } catch {
    return {};
  }
}
