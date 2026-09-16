import { describe, expect, it } from 'vitest';
import {
  TABLE_LAYOUT_VERSION,
  normalizeTableLayout,
  tableLayoutStorageKey,
} from '@/hooks/useTableLayout';

describe('table layout contract', () => {
  it('scopes preferences by version, user, and screen', () => {
    expect(tableLayoutStorageKey('invoices', 'user-1')).toBe(
      `table-layout:v${TABLE_LAYOUT_VERSION}:user-1:invoices`,
    );
    expect(tableLayoutStorageKey('sales-orders', 'user-1')).not.toBe(
      tableLayoutStorageKey('invoices', 'user-1'),
    );
    expect(tableLayoutStorageKey('invoices', 'user-2')).not.toBe(
      tableLayoutStorageKey('invoices', 'user-1'),
    );
  });

  it('migrates legacy state and drops columns that no longer exist', () => {
    expect(normalizeTableLayout({
      widths: { invoice_number: 220, removed: 400 },
      hidden: ['remaining', 'removed'],
      order: ['removed', 'remaining', 'invoice_number'],
      density: 'compact',
      bodyHeight: 620,
    }, ['invoice_number', 'remaining'])).toEqual({
      version: TABLE_LAYOUT_VERSION,
      widths: { invoice_number: 220 },
      hidden: ['remaining'],
      order: ['remaining', 'invoice_number'],
      density: 'compact',
      bodyHeight: 620,
    });
  });

  it('falls back safely for malformed preferences', () => {
    expect(normalizeTableLayout({ density: 'dense', bodyHeight: -1 }, ['name'])).toEqual({
      version: TABLE_LAYOUT_VERSION,
      widths: {},
      hidden: [],
      order: [],
      density: 'medium',
      bodyHeight: 0,
    });
  });
});