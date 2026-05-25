/**
 * TemplateComposer — Wave B / Item 4.
 *
 * Centralised, slot-based assembler for PDF document templates. The four
 * concrete templates (Invoice / Quotation / PurchaseOrder / Statement)
 * still own their domain markup, but everything that used to be copy-
 * pasted between them — typography CSS, watermark CSS + overlay div,
 * RTL/z-index stacking — is composed here in one place.
 *
 * Two entry points:
 *
 *   1. `composeDocumentBody({ rootClass, headerSlot, bodySlot, … })`
 *      A slot-based builder for new templates. Each slot is a raw HTML
 *      string; the composer wraps them in a `<section class="…">` so
 *      the root-level z-index/position rules apply uniformly.
 *
 *   2. `composeRenderPayload({ html, bodyCss, config, … })`
 *      Consumed by `print*HtmlPdf.ts`. Merges template CSS + typography
 *      rules + watermark CSS, and prepends the fixed-position watermark
 *      image layer when the profile enables it. Returns `{ html, css }`
 *      ready to hand to `HtmlPdfEngine`.
 *
 * Strict invariants:
 *   - Output direction is always RTL (the engine itself sets dir="rtl"
 *     on the container — the composer never overrides).
 *   - Bidi marker stripping happens in the individual templates' `esc()`
 *     before they hand strings to the composer.
 *   - Watermark layer is always rendered behind document content via
 *     `z-index: 0` (shared layer) vs `> *` content (z-index: 1).
 */
import type { PdfConfig } from '../config/pdfConfigSchema';
import { buildTypographyRulesCss } from '../arabic/typographyRules';
import { buildWatermarkImageCss, withWatermarkImage } from './watermarkImage';

// ---------------------------------------------------------------------------
// Slot-based body composer
// ---------------------------------------------------------------------------

export interface DocumentBodySlots {
  /** Root-level CSS class (e.g. `invoice`, `quotation`, `purchase-order`). */
  rootClass: string;
  /** Document header (company block, doc title, meta). Required. */
  headerSlot: string;
  /** Main body — usually the customer block + line-items table. Required. */
  bodySlot: string;
  /** Totals / aggregates table. Optional. */
  summarySlot?: string;
  /** Notes, terms, signatures, stamps. Optional. */
  footerSlot?: string;
}

/**
 * Assemble a slotted body. Templates that opt into the slot pattern can
 * call this instead of hand-writing the wrapping `<section>` element;
 * existing templates that already produce their own `<section>` keep
 * working unchanged.
 */
export function composeDocumentBody(slots: DocumentBodySlots): string {
  const parts = [
    slots.headerSlot,
    slots.bodySlot,
    slots.summarySlot ?? '',
    slots.footerSlot ?? '',
  ].filter(Boolean);
  return `<section class="${slots.rootClass}">\n${parts.join('\n')}\n</section>`;
}

// ---------------------------------------------------------------------------
// Render-payload composer (used by the four print*HtmlPdf entry points)
// ---------------------------------------------------------------------------

export interface ComposeRenderPayloadInput {
  /** Already-rendered template body HTML (output of `render*Html(data)`). */
  html: string;
  /** Template-specific CSS (output of `*_HTML_CSS`). */
  bodyCss: string;
  /** Resolved PDF config (from `buildPdfConfig`). */
  config: PdfConfig;
  /** Optional tashkeel detection result for typography rules. */
  hasTashkeel?: boolean;
}

export interface ComposedRenderPayload {
  html: string;
  css: string;
}

/**
 * Combine typography + body + watermark CSS, and prepend the watermark
 * overlay div when enabled. Returns the exact `{ html, css }` shape the
 * `HtmlPdfEngine` payload expects, eliminating the duplicated wm-wiring
 * code in `printInvoiceHtmlPdf`, `printQuotationHtmlPdf`, etc.
 */
export function composeRenderPayload(
  input: ComposeRenderPayloadInput,
): ComposedRenderPayload {
  const { html, bodyCss, config, hasTashkeel } = input;
  const typoCss = buildTypographyRulesCss(config, {
    hasTashkeel: !!hasTashkeel,
    descenderSafe: true,
  });
  const wm = config.watermark;
  const wmCss = wm.enabled && wm.imageUrl
    ? buildWatermarkImageCss({
        imageUrl: wm.imageUrl,
        opacity: wm.opacity,
        rotation: wm.rotation,
        tiled: wm.tiled,
      })
    : '';
  const css = `${typoCss}\n${bodyCss}\n${wmCss}`;
  const composedHtml = withWatermarkImage(
    html,
    wm.enabled ? wm.imageUrl : undefined,
    !!wm.tiled,
  );
  return { html: composedHtml, css };
}
