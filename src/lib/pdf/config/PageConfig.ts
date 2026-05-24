/**
 * Page configuration for the v2 PDF engine.
 * Pure values — no jsPDF / DOM dependencies, safe to import anywhere.
 */
export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageConfig {
  size: PaperSize;
  orientation: PaperOrientation;
  margins: PageMargins;
}

/** Dimensions in millimetres (jsPDF unit). */
export const PAPER_DIMENSIONS_MM: Record<PaperSize, { width: number; height: number }> = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
};

export const DEFAULT_MARGINS: PageMargins = { top: 15, right: 12, bottom: 15, left: 12 };

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  size: 'A4',
  orientation: 'portrait',
  margins: DEFAULT_MARGINS,
};

export function resolvePageSize(cfg: PageConfig): { width: number; height: number } {
  const base = PAPER_DIMENSIONS_MM[cfg.size];
  return cfg.orientation === 'landscape'
    ? { width: base.height, height: base.width }
    : base;
}
