import { describe, it, expect } from 'vitest';
import { applyColumnFilters } from '../applyColumnFilters';
import type { ColumnFilters } from '@/components/ui/column-filter';

/** Records the operators the builder would send to PostgREST. */
function makeQuery() {
  const calls: string[] = [];
  const q: Record<string, unknown> = {};
  for (const op of ['in', 'eq', 'ilike', 'gte', 'lte', 'gt', 'lt']) {
    q[op] = (column: string, value: unknown) => {
      calls.push(`${op}:${column}:${Array.isArray(value) ? value.join('|') : String(value)}`);
      return q;
    };
  }
  return { q, calls };
}

const map = {
  payment_status: 'payment_status',
  invoice_number: 'invoice_number',
  created_at: 'created_at',
  total_amount: 'total_amount',
  customer_name: 'customers.name',
};

describe('applyColumnFilters', () => {
  it('uses eq for one option and in for several', () => {
    const a = makeQuery();
    applyColumnFilters(a.q, { payment_status: { kind: 'options', values: ['paid'] } }, map);
    expect(a.calls).toEqual(['eq:payment_status:paid']);

    const b = makeQuery();
    applyColumnFilters(b.q, { payment_status: { kind: 'options', values: ['paid', 'partial'] } }, map);
    expect(b.calls).toEqual(['in:payment_status:paid|partial']);
  });

  it('maps text operators to ilike patterns and escapes wildcards', () => {
    const { q, calls } = makeQuery();
    const filters: ColumnFilters = {
      invoice_number: { kind: 'text', operator: 'startsWith', text: 'INV_1' },
    };
    applyColumnFilters(q, filters, map);
    expect(calls).toEqual(['ilike:invoice_number:INV\\_1%']);
  });

  it('applies inclusive date bounds', () => {
    const { q, calls } = makeQuery();
    applyColumnFilters(q, { created_at: { kind: 'date', from: '2025-01-01', to: '2025-01-31' } }, map);
    expect(calls).toEqual([
      'gte:created_at:2025-01-01T00:00:00',
      'lte:created_at:2025-01-31T23:59:59.999',
    ]);
  });

  it('applies numeric ranges and single-bound operators', () => {
    const between = makeQuery();
    applyColumnFilters(between.q, { total_amount: { kind: 'number', operator: 'between', from: '10', to: '20' } }, map);
    expect(between.calls).toEqual(['gte:total_amount:10', 'lte:total_amount:20']);

    const gt = makeQuery();
    applyColumnFilters(gt.q, { total_amount: { kind: 'number', operator: 'gt', from: '10' } }, map);
    expect(gt.calls).toEqual(['gt:total_amount:10']);
  });

  it('ignores unmapped columns and empty filters', () => {
    const { q, calls } = makeQuery();
    applyColumnFilters(q, { unknown: { kind: 'text', text: 'x' }, invoice_number: { kind: 'text', text: '  ' } }, map);
    expect(calls).toEqual([]);
  });

  it('prefers picked values over the free term for text columns (FLT-001)', () => {
    const multi = makeQuery();
    applyColumnFilters(
      multi.q,
      { customer_name: { kind: 'text', text: 'ignored', values: ['شركة النور للتجارة', 'مزرعة البركة'] } },
      map,
    );
    expect(multi.calls).toEqual(['in:customers.name:شركة النور للتجارة|مزرعة البركة']);

    const single = makeQuery();
    applyColumnFilters(single.q, { customer_name: { kind: 'text', values: ['مزرعة البركة'] } }, map);
    expect(single.calls).toEqual(['eq:customers.name:مزرعة البركة']);
  });
});
