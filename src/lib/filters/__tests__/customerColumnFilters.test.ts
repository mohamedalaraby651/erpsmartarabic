import { describe, expect, it, vi } from 'vitest';
import { applyCustomerColumnFilters } from '@/lib/filters/customerColumnFilters';

function queryMock() {
  const query = {
    in: vi.fn(), eq: vi.fn(), ilike: vi.fn(), gte: vi.fn(), lte: vi.fn(), gt: vi.fn(), lt: vi.fn(),
  };
  Object.values(query).forEach((method) => method.mockReturnValue(query));
  return query;
}

describe('applyCustomerColumnFilters', () => {
  it('maps multi-option customer filters to the repository fields', () => {
    const query = queryMock();
    applyCustomerColumnFilters(query, {
      type: { kind: 'options', values: ['company', 'farm'] },
      status: { kind: 'options', values: ['true'] },
    });

    expect(query.in).toHaveBeenCalledWith('customer_type', ['company', 'farm']);
    expect(query.eq).toHaveBeenCalledWith('is_active', 'true');
  });

  it('combines text, number and date filters on their authoritative columns', () => {
    const query = queryMock();
    applyCustomerColumnFilters(query, {
      name: { kind: 'text', operator: 'contains', text: 'محمد' },
      balance: { kind: 'number', operator: 'between', from: '100', to: '500' },
      created_at: { kind: 'date', from: '2026-09-01', to: '2026-09-19' },
    });

    expect(query.ilike).toHaveBeenCalledWith('name', '%محمد%');
    expect(query.gte).toHaveBeenCalledWith('current_balance', 100);
    expect(query.lte).toHaveBeenCalledWith('current_balance', 500);
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-09-01T00:00:00');
    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-09-19T23:59:59.999');
  });

  it('ignores unknown presentation keys', () => {
    const query = queryMock();
    applyCustomerColumnFilters(query, { unknown: { kind: 'text', text: 'x' } });
    expect(query.ilike).not.toHaveBeenCalled();
  });
});