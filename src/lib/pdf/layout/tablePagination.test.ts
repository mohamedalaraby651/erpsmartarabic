import { describe, it, expect } from 'vitest';
import { paginateRows, renderPaginatedTable } from './tablePagination';

describe('paginateRows', () => {
  it('splits into chunks of rowsPerPage', () => {
    const r = paginateRows([1, 2, 3, 4, 5], 2);
    expect(r.totalPages).toBe(3);
    expect(r.pages[2]).toEqual([5]);
    expect(r.totalRows).toBe(5);
  });

  it('returns single empty page for empty input', () => {
    const r = paginateRows([], 10);
    expect(r.totalPages).toBe(1);
    expect(r.pages[0]).toEqual([]);
  });

  it('coerces rowsPerPage < 1 to 1', () => {
    const r = paginateRows([1, 2], 0);
    expect(r.totalPages).toBe(2);
  });
});

describe('renderPaginatedTable', () => {
  it('renders thead with table-header-group on every chunk', () => {
    const html = renderPaginatedTable([1, 2, 3], {
      rowsPerPage: 2,
      headers: ['#'],
      renderRow: (n) => `<tr><td>${n}</td></tr>`,
    });
    const theads = html.match(/<thead/g) ?? [];
    expect(theads.length).toBe(2);
    expect(html).toContain('table-header-group');
  });

  it('inserts page-break between chunks but not after the last', () => {
    const html = renderPaginatedTable([1, 2, 3, 4], {
      rowsPerPage: 2,
      headers: ['#'],
      renderRow: (n) => `<tr><td>${n}</td></tr>`,
    });
    const breaks = html.match(/page-break-after:always/g) ?? [];
    expect(breaks.length).toBe(1);
  });

  it('escapes header HTML', () => {
    const html = renderPaginatedTable([1], {
      headers: ['<x>'],
      renderRow: () => '<tr><td>1</td></tr>',
    });
    expect(html).toContain('&lt;x&gt;');
    expect(html).not.toContain('<x>');
  });
});
