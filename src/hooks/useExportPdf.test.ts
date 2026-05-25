import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportPdfError } from './useExportPdf';

vi.mock('@/lib/pdf/printInvoiceHtmlPdf', () => ({
  printInvoiceHtmlPdf: vi.fn(),
}));

import { printInvoiceHtmlPdf } from '@/lib/pdf/printInvoiceHtmlPdf';

// Import the raw exportPdf via re-export trick — use the mutationFn through useMutation
// Here we test the underlying function by re-exporting it indirectly: easiest is to
// call the hook's mutation through @tanstack/react-query's QueryClient, but for unit
// scope we exercise the validation branch via the public API surface.
import { useExportPdf } from './useExportPdf';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const validData = {
  invoiceNumber: 'INV-001',
  issueDate: '2026-05-25',
  company: { name: 'شركة' },
  customer: { name: 'عميل' },
  items: [{ description: 'بند', quantity: 1, unitPrice: 100 }],
};

beforeEach(() => {
  (printInvoiceHtmlPdf as unknown as ReturnType<typeof vi.fn>).mockReset();
});

describe('useExportPdf', () => {
  it('throws ExportPdfError(preflight) on invalid payload', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useExportPdf(), { wrapper: wrapper(client) });

    await act(async () => {
      try {
        await result.current.mutateAsync({ data: { invoiceNumber: '' } as never });
      } catch {
        /* expected */
      }
    });

    expect(result.current.error).toBeInstanceOf(ExportPdfError);
    expect(result.current.error?.kind).toBe('preflight');
    expect(printInvoiceHtmlPdf).not.toHaveBeenCalled();
  });

  it('returns success when underlying render succeeds', async () => {
    (printInvoiceHtmlPdf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: new Blob(['x']),
      filename: 'invoice-INV-001.pdf',
      config: {} as never,
      durationMs: 12,
      warnings: [],
    });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useExportPdf(), { wrapper: wrapper(client) });

    let out: { filename: string } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync({ data: validData });
    });
    expect(out?.filename).toBe('invoice-INV-001.pdf');
  });

  it('wraps render failures as ExportPdfError(render)', async () => {
    (printInvoiceHtmlPdf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      errorCode: 'timeout',
      message: 'مهلة التوليد انتهت',
    });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useExportPdf(), { wrapper: wrapper(client) });

    await act(async () => {
      try {
        await result.current.mutateAsync({ data: validData });
      } catch {
        /* expected */
      }
    });
    expect(result.current.error?.kind).toBe('render');
    expect(result.current.error?.code).toBe('timeout');
  });
});
