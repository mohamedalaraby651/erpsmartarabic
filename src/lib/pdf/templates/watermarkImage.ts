/**
 * Shared watermark-image helpers used by all PDF templates
 * (Invoice / Quotation / PurchaseOrder / Statement).
 *
 * Keeping a single source of truth ensures that fixed-positioning,
 * opacity, scaling, rotation and tiling behave identically across
 * every document type — and that future tweaks land in one place.
 */

/** Base CSS rules — append once to every template's CSS string. */
export const WATERMARK_IMAGE_BASE_CSS = `
.pdf-watermark-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
.pdf-watermark-bg.tiled { background-repeat: repeat; background-size: auto; }
`;

/**
 * Build a per-document override CSS for the watermark image: applies
 * the resolved signed URL, opacity, rotation and scale.
 */
export function buildWatermarkImageCss(opts: {
  imageUrl?: string;
  opacity?: number;
  rotation?: number;
  scale?: number;
  tiled?: boolean;
}): string {
  if (!opts.imageUrl) return '';
  const opacity = Math.max(0, Math.min(1, opts.opacity ?? 0.08));
  const rotation = opts.rotation ?? 0;
  const scale = Math.max(0.1, Math.min(3, opts.scale ?? 1));
  const tiledSize = opts.tiled ? `${Math.round(20 * scale)}%` : `${Math.round(50 * scale)}%`;
  return `
.pdf-watermark-bg {
  background-image: url("${opts.imageUrl.replace(/"/g, '&quot;')}");
  opacity: ${opacity};
  transform: rotate(${rotation}deg);
  background-size: ${tiledSize};
}
`;
}

/** Prepend the fixed-position watermark layer to a rendered HTML string. */
export function withWatermarkImage(
  html: string,
  imageUrl: string | undefined,
  tiled: boolean,
): string {
  if (!imageUrl) return html;
  const cls = tiled ? 'pdf-watermark-bg tiled' : 'pdf-watermark-bg';
  return `<div class="${cls}" aria-hidden="true"></div>${html}`;
}
