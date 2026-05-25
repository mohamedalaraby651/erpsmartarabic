/**
 * DocumentRenderProfile — الكيان الجذر لإعدادات تصيير المستندات.
 * هو الـ Source of Truth الواحد الذي يُغذّي: DB + Preview + Engine.
 */
import { type PdfLayout, DEFAULT_LAYOUT, validateLayout } from '../value-objects/PdfLayout';
import { type PdfTypography, DEFAULT_TYPOGRAPHY, validateTypography } from '../value-objects/PdfTypography';
import { type PdfBranding, DEFAULT_BRANDING, validateBranding } from '../value-objects/PdfBranding';
import { type PdfWatermark, DEFAULT_WATERMARK, validateWatermark } from '../value-objects/PdfWatermark';

export type ProfileScope =
  | 'global'
  | 'invoice'
  | 'quotation'
  | 'purchase_order'
  | 'delivery_note'
  | 'statement';

export const ALL_SCOPES: ProfileScope[] = [
  'global', 'invoice', 'quotation', 'purchase_order', 'delivery_note', 'statement',
];

export interface HeaderConfig {
  enabled: boolean;
  height: number;       // mm
  html?: string;
  showOnFirstPage: boolean;
}

export interface FooterConfig {
  enabled: boolean;
  height: number;
  html?: string;
  showPageNumbers: boolean;
  pageNumberFormat: 'x/y' | 'page-x-of-y' | 'x';
}

export interface DocumentRenderProfile {
  id?: string;
  tenantId?: string;
  scopeType: ProfileScope;
  scopeId?: string | null;
  version: number;
  isActive: boolean;
  layout: PdfLayout;
  typography: PdfTypography;
  branding: PdfBranding;
  watermark: PdfWatermark;
  header: HeaderConfig;
  footer: FooterConfig;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_HEADER: HeaderConfig = Object.freeze({
  enabled: false,
  height: 20,
  showOnFirstPage: true,
});

export const DEFAULT_FOOTER: FooterConfig = Object.freeze({
  enabled: false,
  height: 18,
  showPageNumbers: true,
  pageNumberFormat: 'x/y',
});

export function createDefaultProfile(scope: ProfileScope = 'global'): DocumentRenderProfile {
  return {
    scopeType: scope,
    scopeId: null,
    version: 1,
    isActive: true,
    layout: { ...DEFAULT_LAYOUT, margins: { ...DEFAULT_LAYOUT.margins } },
    typography: { ...DEFAULT_TYPOGRAPHY, fallbackChain: [...DEFAULT_TYPOGRAPHY.fallbackChain] },
    branding: { ...DEFAULT_BRANDING },
    watermark: { ...DEFAULT_WATERMARK },
    header: { ...DEFAULT_HEADER },
    footer: { ...DEFAULT_FOOTER },
  };
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProfile(p: DocumentRenderProfile): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const issue of validateLayout(p.layout)) {
    (issue.severity === 'error' ? errors : warnings).push(`[layout.${issue.field}] ${issue.message}`);
  }
  for (const issue of validateTypography(p.typography)) {
    (issue.severity === 'error' ? errors : warnings).push(`[typography.${String(issue.field)}] ${issue.message}`);
  }
  for (const issue of validateBranding(p.branding)) {
    (issue.severity === 'error' ? errors : warnings).push(`[branding.${String(issue.field)}] ${issue.message}`);
  }
  for (const issue of validateWatermark(p.watermark)) {
    (issue.severity === 'error' ? errors : warnings).push(`[watermark.${String(issue.field)}] ${issue.message}`);
  }

  if (p.header.height < 0 || p.header.height > 60) {
    errors.push('[header.height] ارتفاع الرأس خارج النطاق المسموح (0-60mm)');
  }
  if (p.footer.height < 0 || p.footer.height > 60) {
    errors.push('[footer.height] ارتفاع التذييل خارج النطاق المسموح (0-60mm)');
  }

  return { valid: errors.length === 0, errors, warnings };
}
