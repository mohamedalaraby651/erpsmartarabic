/**
 * applyColumnFilters (OPA-UI-002).
 *
 * Translates the UI column-filter state into PostgREST query operators so
 * filtering applies to the whole result set, not only the loaded page.
 *
 * Semantics: values inside one column are OR-ed (`in`), columns are AND-ed.
 */
import type { ColumnFilter, ColumnFilters } from '@/components/ui/column-filter';

/** Narrow view of the Supabase filter builder; keeps this module testable. */
interface FilterableQuery {
  in(column: string, values: readonly string[]): FilterableQuery;
  eq(column: string, value: unknown): FilterableQuery;
  ilike(column: string, pattern: string): FilterableQuery;
  gte(column: string, value: unknown): FilterableQuery;
  lte(column: string, value: unknown): FilterableQuery;
  gt(column: string, value: unknown): FilterableQuery;
  lt(column: string, value: unknown): FilterableQuery;
}

const escapeLike = (s: string) => s.replace(/[%_]/g, (c) => `\\${c}`);

function applyOne(q: FilterableQuery, column: string, f: ColumnFilter): FilterableQuery {
  switch (f.kind) {
    case 'options': {
      const values = f.values ?? [];
      if (values.length === 0) return q;
      return values.length === 1 ? q.eq(column, values[0]) : q.in(column, values);
    }
    case 'text': {
      // Picked values win over the free term: they are an explicit OR-set
      // (OPA-UI-003 / FLT-001 — e.g. two customers at once).
      const picked = f.values ?? [];
      if (picked.length > 0) {
        return picked.length === 1 ? q.eq(column, picked[0]) : q.in(column, picked);
      }
      const term = (f.text ?? '').trim();
      if (!term) return q;
      const safe = escapeLike(term);
      switch (f.operator) {
        case 'equals':
          return q.ilike(column, safe);
        case 'startsWith':
          return q.ilike(column, `${safe}%`);
        case 'endsWith':
          return q.ilike(column, `%${safe}`);
        default:
          return q.ilike(column, `%${safe}%`);
      }
    }
    case 'date': {
      let next = q;
      if (f.from) next = next.gte(column, `${f.from}T00:00:00`);
      if (f.to) next = next.lte(column, `${f.to}T23:59:59.999`);
      return next;
    }
    case 'number': {
      const from = f.from === '' || f.from === undefined ? undefined : Number(f.from);
      const to = f.to === '' || f.to === undefined ? undefined : Number(f.to);
      switch (f.operator) {
        case 'gt':
          return from === undefined ? q : q.gt(column, from);
        case 'lt':
          return from === undefined ? q : q.lt(column, from);
        case 'eq':
          return from === undefined ? q : q.eq(column, from);
        default: {
          let next = q;
          if (from !== undefined) next = next.gte(column, from);
          if (to !== undefined) next = next.lte(column, to);
          return next;
        }
      }
    }
    default:
      return q;
  }
}

/**
 * @param query   a Supabase filter builder
 * @param filters current column-filter state (keyed by column id)
 * @param columnMap maps a column id to the database column it filters on
 */
export function applyColumnFilters<Q>(
  query: Q,
  filters: ColumnFilters,
  columnMap: Record<string, string>,
): Q {
  let q = query as unknown as FilterableQuery;
  for (const [key, filter] of Object.entries(filters)) {
    const column = columnMap[key];
    if (!column || !filter) continue;
    q = applyOne(q, column, filter);
  }
  return q as unknown as Q;
}
