import { describe, it, expect, vi } from 'vitest';
import {
  planTableChunks,
  pickPrimaryTable,
  shouldChunk,
  renderChunkedHtmlPdf,
} from './chunkedRender';
import { DEFAULT_PAGE_CONFIG } from '../config/PageConfig';

function buildContainer(rowCount: number): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = `
    <h1>Header</h1>
    <table class="pdf-table">
      <thead><tr><th>#</th><th>Item</th></tr></thead>
      <tbody>
        ${Array.from({ length: rowCount }, (_, i) => `<tr><td>${i + 1}</td><td>row-${i + 1}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
  return div;
}

describe('planTableChunks', () => {
  it('splits rows into equal windows', () => {
    const plans = planTableChunks(55, 25);
    expect(plans).toHaveLength(3);
    expect(plans[0].rowIndices).toHaveLength(25);
    expect(plans[1].rowIndices).toHaveLength(25);
    expect(plans[2].rowIndices).toEqual([50, 51, 52, 53, 54]);
  });

  it('coerces rowsPerChunk below 1 to 1', () => {
    expect(planTableChunks(3, 0)).toHaveLength(3);
  });

  it('returns single empty page for empty rows', () => {
    const p = planTableChunks(0, 25);
    expect(p).toEqual([{ pageIndex: 0, rowIndices: [] }]);
  });
});

describe('pickPrimaryTable', () => {
  it('picks the largest matching table', () => {
    const c = buildContainer(10);
    const picked = pickPrimaryTable(c);
    expect(picked).not.toBeNull();
    expect(picked!.rows).toHaveLength(10);
  });

  it('returns null when no chunkable rows exist', () => {
    const c = document.createElement('div');
    c.innerHTML = '<p>nothing</p>';
    expect(pickPrimaryTable(c)).toBeNull();
  });
});

describe('shouldChunk', () => {
  it('auto-enables above the threshold', () => {
    expect(shouldChunk(buildContainer(60))).toBe(true);
  });
  it('stays off below the threshold', () => {
    expect(shouldChunk(buildContainer(20))).toBe(false);
  });
  it('honours explicit enabled=false even on large docs', () => {
    expect(shouldChunk(buildContainer(200), { enabled: false })).toBe(false);
  });
  it('honours explicit enabled=true on small docs', () => {
    expect(shouldChunk(buildContainer(5), { enabled: true })).toBe(true);
  });
  it('respects custom threshold', () => {
    expect(shouldChunk(buildContainer(30), { autoThresholdRows: 25 })).toBe(true);
  });
});

describe('renderChunkedHtmlPdf', () => {
  it('renders one PDF page per chunk and reuses watermark/header shell', async () => {
    const container = buildContainer(60);
    // Add a watermark element to verify the shell is cloned per page.
    const wm = document.createElement('div');
    wm.className = 'pdf-watermark';
    wm.textContent = 'CONFIDENTIAL';
    container.appendChild(wm);
    document.body.appendChild(container);

    const canvasCalls: HTMLElement[] = [];
    const html2canvas = vi.fn(async (el: HTMLElement) => {
      canvasCalls.push(el);
      // Minimal canvas stub html2canvas would return.
      const c = document.createElement('canvas') as HTMLCanvasElement & {
        toDataURL: (t: string, q?: number) => string;
      };
      c.width = 800;
      c.height = 1100;
      c.toDataURL = () => 'data:image/jpeg;base64,AAAA';
      return c as HTMLCanvasElement;
    });

    const addImage = vi.fn();
    const addPage = vi.fn();
    class FakeJsPDF {
      addPage = addPage;
      addImage = addImage;
      internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      output() {
        return new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
      }
    }

    const blob = await renderChunkedHtmlPdf({
      container,
      page: DEFAULT_PAGE_CONFIG,
      options: { rowsPerChunk: 25, autoThresholdRows: 1 },
      loaders: {
        loadHtml2Canvas: async () => html2canvas as never,
        loadJsPDF: async () => FakeJsPDF as never,
      },
    });

    expect(blob).toBeInstanceOf(Blob);
    // 60 rows / 25 per chunk → 3 pages
    expect(html2canvas).toHaveBeenCalledTimes(3);
    expect(addImage).toHaveBeenCalledTimes(3);
    // addPage is called only between pages (n-1 times)
    expect(addPage).toHaveBeenCalledTimes(2);

    // Every cloned shell must contain the watermark and table header.
    for (const el of canvasCalls) {
      expect(el.querySelector('.pdf-watermark')).not.toBeNull();
      expect(el.querySelector('thead')).not.toBeNull();
    }

    // First chunk: rows 1..25, last chunk: rows 51..60.
    const firstRows = canvasCalls[0].querySelectorAll('tbody > tr');
    const lastRows = canvasCalls[2].querySelectorAll('tbody > tr');
    expect(firstRows).toHaveLength(25);
    expect(lastRows).toHaveLength(10);
    expect(firstRows[0].textContent).toContain('row-1');
    expect(lastRows[lastRows.length - 1].textContent).toContain('row-60');

    container.remove();
  });
});
