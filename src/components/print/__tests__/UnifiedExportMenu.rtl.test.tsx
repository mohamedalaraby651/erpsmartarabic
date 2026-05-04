/**
 * UnifiedExportMenu — RTL & Arabic regression tests
 * --------------------------------------------------
 * Guarantees that every export path (PDF / Excel / CSV) emits Arabic content
 * with proper RTL metadata, on both desktop and mobile viewports.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Some Radix/Floating-UI internals call `new ResizeObserver()` directly — ensure constructable
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverStub;
class MutationObserverStub {
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
}
(globalThis as any).MutationObserver = MutationObserverStub;
// hasPointerCapture is required by Radix in jsdom
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
}

import { UnifiedExportMenu } from '../UnifiedExportMenu';

// ---- Mocks -----------------------------------------------------------------

const generatePDF = vi.fn(async (..._args: any[]) => undefined);
const generateDocumentPDF = vi.fn(async (..._args: any[]) => undefined);

vi.mock('@/lib/pdfGeneratorLazy', () => ({
  generatePDF: (...args: any[]) => generatePDF(...args),
  generateDocumentPDF: (...args: any[]) => generateDocumentPDF(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// xlsx mock — captures workbook + writeFile filename
const writeFileSpy = vi.fn((..._args: any[]) => undefined);
const json_to_sheet = vi.fn((..._args: any[]) => ({ __rows: _args[0] } as any));
const sheet_to_csv = vi.fn(
  () => 'الرقم,المنتج,الكمية\n1,قلم رصاص,2\n2,دفتر ملاحظات,5\n',
);
const book_new = vi.fn(() => ({} as any));
const book_append_sheet = vi.fn((..._args: any[]) => undefined);

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (...a: any[]) => json_to_sheet(...(a as [any])),
    sheet_to_csv: () => sheet_to_csv(),
    book_new: () => book_new(),
    book_append_sheet: (...a: any[]) => book_append_sheet(...(a as [any])),
  },
  writeFile: (...a: any[]) => writeFileSpy(...(a as [any])),
}));


// ---- Helpers ---------------------------------------------------------------

const ARABIC_RANGE = /[\u0600-\u06FF]/;

const sampleDocumentData = {
  invoice_number: 'INV-2024-001',
  customer_name: 'شركة المثال',
  total: 1250.5,
  items: [
    { products: { name: 'قلم رصاص' }, quantity: 2, unit_price: 5, total_price: 10 },
    { products: { name: 'دفتر ملاحظات' }, quantity: 5, unit_price: 25, total_price: 125 },
  ],
};

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
};

// Open the dropdown menu reliably (Radix uses portal)
const openMenu = async () => {
  const trigger = screen.getByRole('button', { name: /تصدير/ });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  await waitFor(() => {
    expect(screen.getByText('Excel (.xlsx)')).toBeInTheDocument();
  });
};

const clickItem = (label: RegExp) => {
  const item = screen.getByText(label).closest('[role="menuitem"]') as HTMLElement;
  fireEvent.click(item);
};

// ---- Cross-viewport test suite --------------------------------------------

describe.each([
  ['desktop', 1280, 720],
  ['mobile', 390, 844],
])('UnifiedExportMenu (%s)', (_label, width, height) => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewport(width, height);
  });

  it('Excel: produces RTL workbook + worksheet view with Arabic headers', async () => {
    render(
      <UnifiedExportMenu
        documentType="invoice"
        documentData={sampleDocumentData as any}
        filename="فاتورة-001"
      />,
    );
    await openMenu();
    clickItem(/Excel/);

    await waitFor(() => expect(writeFileSpy).toHaveBeenCalledTimes(1));

    const [workbook, filename] = writeFileSpy.mock.calls[0];
    expect(filename).toMatch(/\.xlsx$/);
    expect(workbook.Workbook?.Views?.[0]?.RTL).toBe(true);

    // Rows fed to json_to_sheet must contain Arabic column labels
    const rows = json_to_sheet.mock.calls[0][0] as Record<string, unknown>[];
    const headerKeys = Object.keys(rows[0]);
    expect(headerKeys.some((k) => ARABIC_RANGE.test(k))).toBe(true);
    expect(rows.some((r) => Object.values(r).some((v) => typeof v === 'string' && ARABIC_RANGE.test(v)))).toBe(true);
  });

  it('CSV: emits UTF-8 BOM + Arabic content + correct mime', async () => {
    const captured: { blob?: Blob } = {};
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn((b: Blob) => {
      captured.blob = b;
      return 'blob:mock';
    }) as any;
    URL.revokeObjectURL = vi.fn() as any;

    try {
      render(
        <UnifiedExportMenu
          documentType="invoice"
          documentData={sampleDocumentData as any}
          filename="فاتورة-001"
        />,
      );
      await openMenu();
      clickItem(/^CSV$/);

      await waitFor(() => expect(captured.blob).toBeDefined());
      expect(captured.blob!.type).toBe('text/csv;charset=utf-8');
      const text = await captured.blob!.text();
      expect(text.charCodeAt(0)).toBe(0xfeff); // BOM
      expect(ARABIC_RANGE.test(text)).toBe(true);
    } finally {
      URL.createObjectURL = origCreate;
    }
  });

  it('PDF: invokes the Arabic document pipeline with untouched Arabic data', async () => {
    render(
      <UnifiedExportMenu
        documentType="invoice"
        documentData={sampleDocumentData as any}
        filename="فاتورة-001"
      />,
    );
    await openMenu();
    clickItem(/تحميل PDF/);

    await waitFor(() => expect(generateDocumentPDF).toHaveBeenCalledTimes(1));
    const [docType, payload] = generateDocumentPDF.mock.calls[0];
    expect(docType).toBe('invoice');
    expect(payload.customer_name).toBe('شركة المثال');
    // No bidi-control characters were injected upstream
    expect(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/.test(payload.customer_name)).toBe(false);
  });

  it('PDF (report mode): forwards Arabic title and columns', async () => {
    render(
      <UnifiedExportMenu
        reportTitle="تقرير المبيعات الشهري"
        rows={[{ name: 'فاتورة', total: 100 }]}
        columns={[
          { key: 'name', label: 'البيان' },
          { key: 'total', label: 'الإجمالي' },
        ]}
      />,
    );
    await openMenu();
    clickItem(/تحميل PDF/);

    await waitFor(() => expect(generatePDF).toHaveBeenCalledTimes(1));
    const opts = generatePDF.mock.calls[0][0];
    expect(ARABIC_RANGE.test(opts.title)).toBe(true);
    expect(opts.columns.every((c: any) => ARABIC_RANGE.test(c.label))).toBe(true);
  });
});
