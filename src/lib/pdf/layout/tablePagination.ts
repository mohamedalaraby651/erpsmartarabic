/**
 * Table pagination helper (Wave 18).
 *
 * Splits a large item array into page-sized chunks and emits HTML
 * tables that repeat the `<thead>` on every page via the
 * `display: table-header-group` rule. Pure string in / string out so
 * it can run in both browser and Node test environments.
 */
export interface TablePaginationOptions {
  /** Rows to render per page. */
  rowsPerPage?: number;
  /** Optional class on the wrapping <table>. */
  tableClass?: string;
  /** When true, inserts an HTML page-break div between chunks. */
  pageBreak?: boolean;
}

export interface PaginatedTable<T> {
  pages: T[][];
  totalRows: number;
  totalPages: number;
}

/** Pure data split — no DOM. */
export function paginateRows<T>(rows: T[], rowsPerPage = 25): PaginatedTable<T> {
  if (rowsPerPage < 1) rowsPerPage = 1;
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += rowsPerPage) {
    pages.push(rows.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([]);
  return { pages, totalRows: rows.length, totalPages: pages.length };
}

export interface RenderTableOptions<T> extends TablePaginationOptions {
  headers: string[];
  renderRow: (row: T, index: number) => string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );

export function renderPaginatedTable<T>(rows: T[], opts: RenderTableOptions<T>): string {
  const rowsPerPage = opts.rowsPerPage ?? 25;
  const tableClass = opts.tableClass ?? 'pdf-table';
  const pageBreak = opts.pageBreak !== false;
  const { pages } = paginateRows(rows, rowsPerPage);

  const thead =
    '<thead style="display:table-header-group;">' +
    '<tr>' +
    opts.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('') +
    '</tr></thead>';

  return pages
    .map((chunk, pageIdx) => {
      const tbody =
        '<tbody>' +
        chunk
          .map((row, i) => opts.renderRow(row, pageIdx * rowsPerPage + i))
          .join('') +
        '</tbody>';
      const table = `<table class="${tableClass}" style="page-break-inside:avoid;width:100%;border-collapse:collapse;">${thead}${tbody}</table>`;
      const br =
        pageBreak && pageIdx < pages.length - 1
          ? '<div style="page-break-after:always;height:0;"></div>'
          : '';
      return table + br;
    })
    .join('');
}
