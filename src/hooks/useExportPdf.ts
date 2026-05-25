/**
 * Unified React Query hook for v2 PDF exports (Phase 1).
 *
 * Wraps `preflightInvoice` + `printInvoiceHtmlPdf` in a `useMutation`
 * so UI components get:
 *   - a `mutate()` to trigger the export
 *   - `isPending` for spinners
 *   - structured `error` (PreflightError | RenderError) for <PdfPreflightAlert>
 *
 * The hook never throws raw `Error` instances — failures are normalized
 * into `ExportPdfError` so consumers can switch on `kind`.
 */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { preflightInvoice } from '@/lib/pdf/diagnostics/preflightValidator';
import { printInvoiceHtmlPdf, type PrintInvoicePdfOptions, type PrintInvoicePdfSuccess } from '@/lib/pdf/printInvoiceHtmlPdf';
import type { InvoiceHtmlData } from '@/lib/pdf/templates/InvoiceHtmlTemplate';

export type ExportPdfErrorKind = 'preflight' | 'render';

export class ExportPdfError extends Error {
  kind: ExportPdfErrorKind;
  errors?: { field: string; message: string }[];
  code?: string;

  constructor(opts: {
    kind: ExportPdfErrorKind;
    message: string;
    errors?: { field: string; message: string }[];
    code?: string;
  }) {
    super(opts.message);
    this.name = 'ExportPdfError';
    this.kind = opts.kind;
    this.errors = opts.errors;
    this.code = opts.code;
  }
}

export interface UseExportPdfVariables {
  data: InvoiceHtmlData;
  options?: PrintInvoicePdfOptions;
}

export type UseExportPdfOptions = Omit<
  UseMutationOptions<PrintInvoicePdfSuccess, ExportPdfError, UseExportPdfVariables>,
  'mutationFn'
>;

async function exportPdf({ data, options }: UseExportPdfVariables): Promise<PrintInvoicePdfSuccess> {
  // 1. Preflight (cheap, runs before the heavy bundle is loaded).
  const pf = preflightInvoice(data);
  if (!pf.valid) {
    throw new ExportPdfError({
      kind: 'preflight',
      message: 'بيانات الفاتورة غير صالحة — لم يتم بدء التوليد.',
      errors: pf.errors.map((e) => ({ field: e.field, message: e.message })),
    });
  }

  // Extra tenant-level checks beyond Zod schema.
  const tenantId = (data as unknown as { tenant_id?: string }).tenant_id;
  if (tenantId != null && typeof tenantId !== 'string') {
    throw new ExportPdfError({
      kind: 'preflight',
      message: 'معرّف المستأجر (tenant_id) غير صالح.',
      errors: [{ field: 'tenant_id', message: 'يجب أن يكون نصاً' }],
    });
  }

  // 2. Render under safeRender boundary.
  const result = await printInvoiceHtmlPdf(pf.sanitized, options);
  if (result.ok) return result;

  throw new ExportPdfError({
    kind: 'render',
    message: result.message,
    code: result.errorCode,
  });
}

export function useExportPdf(options?: UseExportPdfOptions) {
  return useMutation<PrintInvoicePdfSuccess, ExportPdfError, UseExportPdfVariables>({
    mutationFn: exportPdf,
    ...options,
  });
}
