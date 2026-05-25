import { describe, it, expect } from 'vitest';
import { diffProfiles, labelForPath } from './ProfileDiff';
import { createDefaultProfile } from '../entities/DocumentRenderProfile';

describe('ProfileDiff', () => {
  it('لا تغييرات بين Profile وذاته', () => {
    const p = createDefaultProfile();
    const diff = diffProfiles(p, p);
    expect(diff.changes).toHaveLength(0);
  });

  it('يلتقط تغيير الهامش بمسار صحيح', () => {
    const before = createDefaultProfile();
    const after = createDefaultProfile();
    after.layout.margins.top = 25;
    const diff = diffProfiles(before, after);
    expect(diff.changes).toContainEqual({
      path: 'layout.margins.top',
      before: 15,
      after: 25,
    });
  });

  it('يتجاهل version/updatedAt/updatedBy', () => {
    const before = createDefaultProfile();
    const after = { ...createDefaultProfile(), version: 99, updatedBy: 'user-x' };
    const diff = diffProfiles(before, after);
    expect(diff.changes.find((c) => c.path === 'version')).toBeUndefined();
    expect(diff.changes.find((c) => c.path === 'updatedBy')).toBeUndefined();
  });

  it('يلتقط تغيير watermark.enabled', () => {
    const before = createDefaultProfile();
    const after = createDefaultProfile();
    after.watermark.enabled = true;
    after.watermark.text = 'سري';
    const diff = diffProfiles(before, after);
    const paths = diff.changes.map((c) => c.path);
    expect(paths).toContain('watermark.enabled');
    expect(paths).toContain('watermark.text');
  });

  it('labelForPath: يرجع التسمية العربية', () => {
    expect(labelForPath('layout.pageSize')).toBe('حجم الصفحة');
    expect(labelForPath('branding.primaryColor')).toBe('اللون الأساسي');
  });

  it('labelForPath: يرجع المسار كما هو للحقول غير المعرَّفة', () => {
    expect(labelForPath('custom.unknown')).toBe('custom.unknown');
  });
});
