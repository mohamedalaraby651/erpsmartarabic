/**
 * Chunked / streaming HTML→PDF renderer (Wave C – Item 8).
 *
 * Large documents (statements, multi-page invoices) used to be rasterised
 * in a single html2canvas pass which spikes memory above 400MB on mobile
 * browsers. This helper renders the document page-by-page:
 *
 *   1. Detect the primary chunkable table inside the container.
 *   2. Slice its `<tbody>` rows into N-row windows (page-break safe).
 *   3. For each window: clone the whole container, swap the tbody to the
 *      window rows, rasterise via html2canvas, append to jsPDF, then
 *      release the DOM/canvas references.
 *
 * The whole-container clone preserves header, footer, watermark CSS and
 * RTL/bidi direction on every snapshot.
 *
 * Pure helpers (`planTableChunks`, `pickPrimaryTable`) are DOM-agnostic
 * enough to be unit-tested under jsdom.
 */
import type { PageConfig } from '../config/PageConfig';
import { resolvePageSize } from '../config/PageConfig';
import { applyOverflowGuard } from '../layout/overflowGuard';

export interface ChunkedRenderOptions {
  /** Force chunked path. Default: auto when rows ≥ autoThresholdRows. */
  enabled?: boolean;
  /** Threshold above which auto-chunking kicks in. Default 50. */
  autoThresholdRows?: number;
  /** Rows per generated page. Default 25. */
  rowsPerChunk?: number;
  /** CSS selector for chunkable tables. Default `table[data-pdf-chunk], table.pdf-table`. */
  tableSelector?: string;
  /** Per-chunk row selector inside the chunk table. Default `tbody > tr`. */
  rowSelector?: string;
  /** JPEG quality forwarded to html2canvas → jsPDF. Default 0.92. */
  jpegQuality?: number;
  /** html2canvas scale. Default 2. */
  scale?: number;
}

export interface ChunkPlan {
  /** Index of the page (0-based). */
  pageIndex: number;
  /** Row indices belonging to this page (in DOM order). */
  rowIndices: number[];
}

const DEFAULT_TABLE_SELECTOR = 'table[data-pdf-chunk], table.pdf-table';
const DEFAULT_ROW_SELECTOR = 'tbody > tr';
const DEFAULT_THRESHOLD = 50;
const DEFAULT_ROWS_PER_CHUNK = 25;

/**
 * Picks the single largest chunkable table inside a container. We only chunk
 * one table per document to keep page layout deterministic; secondary tables
 * are inlined on the first page.
 */
export function pickPrimaryTable(
  container: HTMLElement,
  tableSelector = DEFAULT_TABLE_SELECTOR,
  rowSelector = DEFAULT_ROW_SELECTOR,
): { table: HTMLTableElement; rows: HTMLTableRowElement[] } | null {
  const tables = Array.from(
    container.querySelectorAll<HTMLTableElement>(tableSelector),
  );
  let best: { table: HTMLTableElement; rows: HTMLTableRowElement[] } | null = null;
  for (const table of tables) {
    const rows = Array.from(
      table.querySelectorAll<HTMLTableRowElement>(rowSelector),
    );
    if (!best || rows.length > best.rows.length) {
      best = { table, rows };
    }
  }
  return best && best.rows.length > 0 ? best : null;
}

/** Pure: split a row count into page-sized windows. */
export function planTableChunks(
  rowCount: number,
  rowsPerChunk = DEFAULT_ROWS_PER_CHUNK,
): ChunkPlan[] {
  if (rowsPerChunk < 1) rowsPerChunk = 1;
  if (rowCount <= 0) return [{ pageIndex: 0, rowIndices: [] }];
  const plans: ChunkPlan[] = [];
  for (let start = 0, page = 0; start < rowCount; start += rowsPerChunk, page++) {
    const end = Math.min(start + rowsPerChunk, rowCount);
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);
    plans.push({ pageIndex: page, rowIndices: indices });
  }
  return plans;
}

/** Decide whether chunked rendering should kick in for this container. */
export function shouldChunk(
  container: HTMLElement,
  opts: ChunkedRenderOptions = {},
): boolean {
  if (opts.enabled === false) return false;
  const primary = pickPrimaryTable(
    container,
    opts.tableSelector,
    opts.rowSelector,
  );
  if (!primary) return !!opts.enabled;
  if (opts.enabled === true) return true;
  const threshold = opts.autoThresholdRows ?? DEFAULT_THRESHOLD;
  return primary.rows.length >= threshold;
}

// ---------------------------------------------------------------------------
// Browser-only rendering pipeline
// ---------------------------------------------------------------------------

type Html2CanvasFn = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type JsPDFCtor = new (opts: Record<string, unknown>) => {
  addPage: (format?: unknown, orientation?: string) => unknown;
  addImage: (
    data: string,
    fmt: string,
    x: number,
    y: number,
    w: number,
    h: number,
    alias?: string,
    compression?: string,
  ) => unknown;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  output: (kind: 'blob') => Blob;
};

export interface ChunkedRenderLoaders {
  loadHtml2Canvas?: () => Promise<Html2CanvasFn>;
  loadJsPDF?: () => Promise<JsPDFCtor>;
}

async function defaultLoadHtml2Canvas(): Promise<Html2CanvasFn> {
  const mod = (await import('html2canvas')) as { default: Html2CanvasFn };
  return mod.default;
}

async function defaultLoadJsPDF(): Promise<JsPDFCtor> {
  const mod = (await import('jspdf')) as { jsPDF: JsPDFCtor } & { default?: { jsPDF?: JsPDFCtor } };
  // jspdf v4 exports `{ jsPDF }`
  const ctor = mod.jsPDF ?? mod.default?.jsPDF;
  if (!ctor) throw new Error('jsPDF constructor not found');
  return ctor;
}

export interface ChunkedRenderInput {
  /** Container already mounted offscreen (will be left intact). */
  container: HTMLElement;
  page: PageConfig;
  options?: ChunkedRenderOptions;
  loaders?: ChunkedRenderLoaders;
}

/**
 * Renders the container in chunks. Returns a single concatenated PDF Blob.
 *
 * Memory profile: at any moment only one cloned chunk container + one canvas
 * live in memory; both are detached/cleared before the next iteration.
 */
export async function renderChunkedHtmlPdf(input: ChunkedRenderInput): Promise<Blob> {
  const { container, page } = input;
  const opts = input.options ?? {};
  const loadH2C = input.loaders?.loadHtml2Canvas ?? defaultLoadHtml2Canvas;
  const loadJsPDF = input.loaders?.loadJsPDF ?? defaultLoadJsPDF;

  const primary = pickPrimaryTable(
    container,
    opts.tableSelector,
    opts.rowSelector,
  );
  const allRows = primary?.rows ?? [];
  const plans = planTableChunks(allRows.length, opts.rowsPerChunk ?? DEFAULT_ROWS_PER_CHUNK);

  const [html2canvas, JsPDF] = await Promise.all([loadH2C(), loadJsPDF()]);

  const pageDims = resolvePageSize(page);
  const doc = new JsPDF({
    unit: 'mm',
    format: page.size.toLowerCase(),
    orientation: page.orientation,
    compress: true,
  });
  const pdfW = doc.internal.pageSize.getWidth();
  const pdfH = doc.internal.pageSize.getHeight();
  const marginX = page.margins.left;
  const marginY = page.margins.top;
  const contentW = pdfW - page.margins.left - page.margins.right;
  const contentH = pdfH - page.margins.top - page.margins.bottom;

  const scale = opts.scale ?? 2;
  const quality = opts.jpegQuality ?? 0.92;

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];

    // Build a cloned shell so header/footer/watermark stay on every page.
    const clone = container.cloneNode(true) as HTMLElement;
    if (primary) {
      // Find the corresponding table in the clone by stable index.
      const cloneTables = clone.querySelectorAll<HTMLTableElement>(
        opts.tableSelector ?? DEFAULT_TABLE_SELECTOR,
      );
      // Locate same-position table as primary in original.
      const originalTables = Array.from(
        container.querySelectorAll<HTMLTableElement>(
          opts.tableSelector ?? DEFAULT_TABLE_SELECTOR,
        ),
      );
      const idx = originalTables.indexOf(primary.table);
      const cloneTable = cloneTables[idx] ?? cloneTables[0];
      if (cloneTable) {
        const tbody = cloneTable.querySelector('tbody');
        if (tbody) {
          const subset = plan.rowIndices.map((ri) => allRows[ri]);
          tbody.innerHTML = '';
          for (const r of subset) {
            tbody.appendChild(r.cloneNode(true));
          }
        }
      }
    }

    // Offscreen mount for layout.
    clone.style.position = 'fixed';
    clone.style.left = '-10000px';
    clone.style.top = '0';
    clone.style.width = `${pageDims.width}mm`;
    document.body.appendChild(clone);

    try {
      applyOverflowGuard(clone);
      const canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: 'hsl(var(--background))',
      });
      const imgData = canvas.toDataURL('image/jpeg', quality);
      // Scale image height to maintain aspect ratio inside content box.
      const ratio = canvas.height / canvas.width;
      let drawW = contentW;
      let drawH = drawW * ratio;
      if (drawH > contentH) {
        drawH = contentH;
        drawW = drawH / ratio;
      }
      if (i > 0) doc.addPage(page.size.toLowerCase(), page.orientation);
      doc.addImage(imgData, 'JPEG', marginX, marginY, drawW, drawH, `chunk-${i}`, 'FAST');

      // Free canvas memory aggressively.
      canvas.width = 0;
      canvas.height = 0;
    } finally {
      clone.remove();
    }
  }

  return doc.output('blob');
}
