import type { IPdfEngine, PdfRenderContext, PdfRenderResult } from '../engine/IPdfEngine';
import { jsPdfEngine, type JsPdfDocumentPayload } from '../engine/JsPdfEngine';
import { DEFAULT_PAGE_CONFIG, type PageConfig } from '../config/PageConfig';
import { DEFAULT_THEME, mergeTheme, type PdfTheme } from '../config/ThemeConfig';
import { buildDocFilename } from '../utils/filename';

/**
 * Maps a document type (the same string used throughout the app — invoice,
 * quotation, sales_order, purchase_order, payment_receipt, expense_receipt,
 * credit_note) to a concrete engine + default page/theme config.
 *
 * The registry is the single entry point for the v2 stack: callers ask
 * for `renderDocument('invoice', data)` and never reach into a specific
 * engine. This is what unlocks future swaps (HtmlPdfEngine for templates
 * that need rich CSS, edge-function engine for bulk exports).
 */
export type SupportedDocType =
  | 'invoice'
  | 'quotation'
  | 'sales_order'
  | 'purchase_order'
  | 'payment_receipt'
  | 'expense_receipt'
  | 'credit_note';

export interface TemplateBinding {
  docType: SupportedDocType;
  engine: IPdfEngine;
  page: PageConfig;
  theme: PdfTheme;
  filename: (data: Record<string, unknown>) => string;
}

function defaultFilename(prefix: string) {
  return (data: Record<string, unknown>) => {
    const num =
      (data['invoice_number'] as string) ||
      (data['quotation_number'] as string) ||
      (data['order_number'] as string) ||
      (data['number'] as string) ||
      'document';
    return buildDocFilename(prefix, num);
  };
}

const _registry = new Map<SupportedDocType, TemplateBinding>();

function register(binding: TemplateBinding): void {
  _registry.set(binding.docType, binding);
}

// Seed with the legacy engine — every document type currently renders
// through `pdfGenerator.ts` until the v2 templates land.
const SEED: SupportedDocType[] = [
  'invoice',
  'quotation',
  'sales_order',
  'purchase_order',
  'payment_receipt',
  'expense_receipt',
  'credit_note',
];
SEED.forEach((docType) =>
  register({
    docType,
    engine: jsPdfEngine,
    page: DEFAULT_PAGE_CONFIG,
    theme: DEFAULT_THEME,
    filename: defaultFilename(docType),
  }),
);

export function getTemplate(docType: SupportedDocType): TemplateBinding {
  const b = _registry.get(docType);
  if (!b) throw new Error(`No PDF template registered for "${docType}"`);
  return b;
}

export function listTemplates(): SupportedDocType[] {
  return Array.from(_registry.keys());
}

/** Override a binding (used by tests + future per-tenant customization). */
export function overrideTemplate(
  docType: SupportedDocType,
  patch: Partial<Omit<TemplateBinding, 'docType'>>,
): void {
  const current = getTemplate(docType);
  register({
    ...current,
    ...patch,
    theme: patch.theme ? mergeTheme(patch.theme) : current.theme,
    docType,
  });
}

/** Top-level convenience: validate → pick engine → render. */
export async function renderDocument(
  docType: SupportedDocType,
  data: Record<string, unknown> & { items?: unknown[] },
): Promise<PdfRenderResult> {
  const binding = getTemplate(docType);
  const ctx: PdfRenderContext = { page: binding.page, theme: binding.theme };
  const payload: JsPdfDocumentPayload = { documentType: docType, data };
  return binding.engine.render(ctx, payload, binding.filename(data));
}
