import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WATERMARK,
  validateWatermark,
  isWatermarkValid,
} from './PdfWatermark';

describe('PdfWatermark', () => {
  it('معطل افتراضياً وصالح', () => {
    expect(isWatermarkValid(DEFAULT_WATERMARK)).toBe(true);
  });

  it('يرفض علامة نصية بدون نص', () => {
    const wm = { ...DEFAULT_WATERMARK, enabled: true, type: 'text' as const, text: '' };
    expect(isWatermarkValid(wm)).toBe(false);
  });

  it('يقبل علامة نصية مع نص', () => {
    const wm = { ...DEFAULT_WATERMARK, enabled: true, text: 'سري' };
    expect(isWatermarkValid(wm)).toBe(true);
  });

  it('يرفض علامة صورية بدون asset', () => {
    const wm = { ...DEFAULT_WATERMARK, enabled: true, type: 'image' as const, imageAssetId: null };
    expect(isWatermarkValid(wm)).toBe(false);
  });

  it('يحذّر من شفافية عالية', () => {
    const wm = { ...DEFAULT_WATERMARK, enabled: true, text: 'X', opacity: 0.6 };
    const issues = validateWatermark(wm);
    expect(issues.find((i) => i.field === 'opacity')?.severity).toBe('warning');
  });

  it('يرفض دوران خارج النطاق', () => {
    const wm = { ...DEFAULT_WATERMARK, enabled: true, text: 'X', rotation: 200 };
    expect(isWatermarkValid(wm)).toBe(false);
  });

  it('يرفض موضعاً غير صالح', () => {
    const wm = {
      ...DEFAULT_WATERMARK,
      enabled: true,
      text: 'X',
      position: 'middle' as unknown as typeof DEFAULT_WATERMARK.position,
    };
    expect(isWatermarkValid(wm)).toBe(false);
  });
});
