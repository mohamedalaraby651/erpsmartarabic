import { describe, it, expect } from 'vitest';
import {
  buildPdfConfig,
  tryBuildPdfConfig,
  toPageConfig,
  typographyToCssVars,
} from './pdfConfigSchema';

describe('pdfConfigSchema', () => {
  it('produces full defaults from empty input', () => {
    const cfg = buildPdfConfig();
    expect(cfg.page.size).toBe('A4');
    expect(cfg.page.orientation).toBe('portrait');
    expect(cfg.page.margins).toEqual({ top: 15, right: 12, bottom: 15, left: 12 });
    expect(cfg.typography.fontKey).toBe('cairo');
    expect(cfg.typography.lineHeight).toBeGreaterThanOrEqual(1.6);
    expect(cfg.behavior.scale).toBe(2);
  });

  it('merges partial overrides', () => {
    const cfg = buildPdfConfig({
      page: { size: 'A3', orientation: 'landscape', margins: { top: 5, right: 5, bottom: 5, left: 5 } },
      typography: { fontKey: 'amiri', baseFontSizePx: 14, lineHeight: 2, letterSpacing: 0 },
    });
    expect(cfg.page.size).toBe('A3');
    expect(cfg.page.orientation).toBe('landscape');
    expect(cfg.typography.fontKey).toBe('amiri');
    expect(cfg.typography.baseFontSizePx).toBe(14);
  });

  it('accepts custom page dimensions', () => {
    const cfg = buildPdfConfig({
      page: { size: { width: 200, height: 280, unit: 'mm' } },
    });
    expect(typeof cfg.page.size).toBe('object');
  });

  it('rejects invalid font key', () => {
    const r = tryBuildPdfConfig({ typography: { fontKey: 'comic-sans' } });
    expect(r.success).toBe(false);
  });

  it('rejects out-of-range margins', () => {
    const r = tryBuildPdfConfig({ page: { margins: { top: 200, right: 0, bottom: 0, left: 0 } } });
    expect(r.success).toBe(false);
  });

  it('toPageConfig maps standard size', () => {
    const cfg = buildPdfConfig({ page: { size: 'A5', orientation: 'landscape' } });
    expect(toPageConfig(cfg)).toEqual({
      size: 'A5',
      orientation: 'landscape',
      margins: expect.any(Object),
    });
  });

  it('toPageConfig falls back to A3/A4 for custom sizes', () => {
    const big = buildPdfConfig({ page: { size: { width: 400, height: 500 } } });
    expect(toPageConfig(big).size).toBe('A3');
    const small = buildPdfConfig({ page: { size: { width: 150, height: 200 } } });
    expect(toPageConfig(small).size).toBe('A4');
  });

  it('typographyToCssVars emits CSS variables', () => {
    const cfg = buildPdfConfig({ typography: { fontKey: 'cairo', baseFontSizePx: 13, lineHeight: 1.8, letterSpacing: 0.3 } });
    const css = typographyToCssVars(cfg);
    expect(css).toContain('--pdf-base-fs:13px');
    expect(css).toContain('--pdf-lh:1.8');
    expect(css).toContain('--pdf-tracking:0.3px');
  });
});
