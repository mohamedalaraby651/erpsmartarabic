/**
 * Unified PDF configuration schema (Wave 15).
 *
 * Single source of truth for page setup, typography, header/footer,
 * watermark and branding options. Validated via Zod so callers crashing
 * on invalid input fail loudly instead of producing broken PDFs.
 *
 * Backwards-compatible with existing `PageConfig` — `toPageConfig()`
 * derives the legacy shape from a full `PdfConfig`.
 */
import { z } from 'zod';
import { AVAILABLE_FONTS, type PdfFontKey } from '@/lib/arabicFont';
import {
  type PageConfig,
  type PageMargins,
  PAPER_DIMENSIONS_MM,
} from './PageConfig';

const fontKeys = AVAILABLE_FONTS.map((f) => f.key) as [PdfFontKey, ...PdfFontKey[]];

export const paperSizeSchema = z.union([
  z.enum(['A3', 'A4', 'A5', 'Letter', 'Legal']),
  z.object({
    width: z.number().positive().max(2000),
    height: z.number().positive().max(2000),
    unit: z.enum(['mm', 'pt']).default('mm'),
  }),
]);

export const marginsSchema = z.object({
  top: z.number().min(0).max(100).default(15),
  right: z.number().min(0).max(100).default(12),
  bottom: z.number().min(0).max(100).default(15),
  left: z.number().min(0).max(100).default(12),
});

export const typographySchema = z.object({
  fontKey: z.enum(fontKeys).default('cairo' as PdfFontKey),
  baseFontSizePx: z.number().min(8).max(24).default(12),
  /** Larger than usual to fit Arabic descenders + tashkeel. */
  lineHeight: z.number().min(1).max(3).default(1.7),
  letterSpacing: z.number().min(-2).max(4).default(0),
});

export const headerFooterSchema = z.object({
  enabled: z.boolean().default(false),
  height: z.number().min(0).max(60).default(20),
  html: z.string().max(8000).optional(),
  logoUrl: z.string().url().optional(),
  showOnFirstPage: z.boolean().default(true),
});

export const pageNumbersSchema = z.object({
  enabled: z.boolean().default(true),
  format: z.enum(['x/y', 'page-x-of-y', 'x']).default('x/y'),
  position: z.enum(['footer-left', 'footer-center', 'footer-right']).default('footer-center'),
});

export const watermarkSchema = z.object({
  enabled: z.boolean().default(false),
  text: z.string().max(120).optional(),
  imageUrl: z.string().url().optional(),
  opacity: z.number().min(0).max(1).default(0.08),
  rotation: z.number().min(-180).max(180).default(-30),
  tiled: z.boolean().default(false),
});

export const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/).default('#111111'),
  secondaryColor: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/).default('#f1f1f2'),
  companyName: z.string().max(200).optional(),
  taxNumber: z.string().max(40).optional(),
});

export const behaviorSchema = z.object({
  embedFonts: z.boolean().default(true),
  compressImages: z.boolean().default(true),
  jpegQuality: z.number().min(0.5).max(1).default(0.92),
  scale: z.number().min(1).max(4).default(2),
});

export const pdfConfigSchema = z.object({
  page: z.object({
    size: paperSizeSchema.default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    margins: marginsSchema.default({ top: 15, right: 12, bottom: 15, left: 12 }),
  }).default({}),
  typography: typographySchema.default({
    fontKey: 'cairo' as PdfFontKey,
    baseFontSizePx: 12,
    lineHeight: 1.7,
    letterSpacing: 0,
  }),
  header: headerFooterSchema.default({ enabled: false, height: 20, showOnFirstPage: true }),
  footer: headerFooterSchema.default({ enabled: false, height: 18, showOnFirstPage: true }),
  pageNumbers: pageNumbersSchema.default({
    enabled: true,
    format: 'x/y',
    position: 'footer-center',
  }),
  watermark: watermarkSchema.default({
    enabled: false,
    opacity: 0.08,
    rotation: -30,
    tiled: false,
  }),
  branding: brandingSchema.default({
    primaryColor: '#111111',
    secondaryColor: '#f1f1f2',
  }),
  behavior: behaviorSchema.default({
    embedFonts: true,
    compressImages: true,
    jpegQuality: 0.92,
    scale: 2,
  }),
});

export type PdfConfig = z.infer<typeof pdfConfigSchema>;
export type PdfConfigInput = z.input<typeof pdfConfigSchema>;

/** Build a fully-defaulted config, optionally merging partial overrides. */
export function buildPdfConfig(partial?: PdfConfigInput): PdfConfig {
  return pdfConfigSchema.parse(partial ?? {});
}

/** Safe parse: returns errors instead of throwing. */
export function tryBuildPdfConfig(partial?: unknown) {
  return pdfConfigSchema.safeParse(partial ?? {});
}

/** Derive the legacy `PageConfig` shape used by existing engines. */
export function toPageConfig(cfg: PdfConfig): PageConfig {
  const size = cfg.page.size;
  if (typeof size === 'string') {
    return {
      size,
      orientation: cfg.page.orientation,
      margins: cfg.page.margins as PageMargins,
    };
  }
  // Custom size — fall back to nearest A-series for legacy compatibility.
  // The HtmlPdfEngine reads format directly so this is informational.
  const a4 = PAPER_DIMENSIONS_MM.A4;
  return {
    size: size.width > a4.width ? 'A3' : 'A4',
    orientation: cfg.page.orientation,
    margins: cfg.page.margins as PageMargins,
  };
}

/** Convert typography to CSS variables for template injection. */
export function typographyToCssVars(cfg: PdfConfig): string {
  const t = cfg.typography;
  return `:root{--pdf-base-fs:${t.baseFontSizePx}px;--pdf-lh:${t.lineHeight};--pdf-tracking:${t.letterSpacing}px;}`;
}
