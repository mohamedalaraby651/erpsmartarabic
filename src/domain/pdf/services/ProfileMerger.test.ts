import { describe, it, expect } from 'vitest';
import { mergeProfiles, pickProfileForScope } from './ProfileMerger';
import { createDefaultProfile } from '../entities/DocumentRenderProfile';

describe('ProfileMerger', () => {
  it('يعيد global إذا لم يوجد scoped', () => {
    const global = createDefaultProfile('global');
    expect(mergeProfiles(global, null)).toBe(global);
  });

  it('scoped.layout يتجاوز global.layout', () => {
    const global = createDefaultProfile('global');
    const invoice = createDefaultProfile('invoice');
    invoice.layout = { ...invoice.layout, orientation: 'landscape' };
    const merged = mergeProfiles(global, invoice);
    expect(merged.layout.orientation).toBe('landscape');
    expect(merged.scopeType).toBe('invoice');
  });

  it('branding يُدمج حقلاً بحقل (لا استبدال كلي)', () => {
    const global = createDefaultProfile('global');
    global.branding.companyName = 'الشركة العالمية';
    const invoice = createDefaultProfile('invoice');
    invoice.branding.primaryColor = '#ff0000';
    const merged = mergeProfiles(global, invoice);
    expect(merged.branding.companyName).toBe('الشركة العالمية');
    expect(merged.branding.primaryColor).toBe('#ff0000');
  });

  it('pickProfileForScope: يجد scoped و global', () => {
    const global = createDefaultProfile('global');
    const invoice = createDefaultProfile('invoice');
    const result = pickProfileForScope([global, invoice], 'invoice');
    expect(result.global).toBe(global);
    expect(result.scoped).toBe(invoice);
  });

  it('pickProfileForScope: يتجاهل غير النشط', () => {
    const global = createDefaultProfile('global');
    const invoice = { ...createDefaultProfile('invoice'), isActive: false };
    const result = pickProfileForScope([global, invoice], 'invoice');
    expect(result.scoped).toBeUndefined();
  });
});
