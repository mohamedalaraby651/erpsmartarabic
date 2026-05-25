import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LAYOUT,
  validateLayout,
  isLayoutValid,
  withMargins,
  type PdfLayout,
} from './PdfLayout';

describe('PdfLayout', () => {
  it('الإعدادات الافتراضية صالحة', () => {
    expect(isLayoutValid(DEFAULT_LAYOUT)).toBe(true);
  });

  it('يرفض حجم صفحة غير مدعوم', () => {
    const layout = { ...DEFAULT_LAYOUT, pageSize: 'B5' as unknown as PdfLayout['pageSize'] };
    const issues = validateLayout(layout);
    expect(issues.some((i) => i.field === 'pageSize' && i.severity === 'error')).toBe(true);
  });

  it('يحذّر من الهوامش الأقل من 8mm', () => {
    const layout = withMargins(DEFAULT_LAYOUT, { top: 6 });
    const issues = validateLayout(layout);
    expect(issues.find((i) => i.field === 'top')?.severity).toBe('warning');
  });

  it('يرفض الهوامش الأقل من 5mm', () => {
    const layout = withMargins(DEFAULT_LAYOUT, { top: 2 });
    expect(isLayoutValid(layout)).toBe(false);
  });

  it('يرفض هوامش > 100mm', () => {
    const layout = withMargins(DEFAULT_LAYOUT, { left: 150 });
    expect(isLayoutValid(layout)).toBe(false);
  });

  it('withMargins لا يطفر على الكائن الأصلي', () => {
    const original = { ...DEFAULT_LAYOUT, margins: { ...DEFAULT_LAYOUT.margins } };
    withMargins(original, { top: 50 });
    expect(original.margins.top).toBe(DEFAULT_LAYOUT.margins.top);
  });
});
