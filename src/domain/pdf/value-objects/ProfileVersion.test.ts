import { describe, it, expect } from 'vitest';
import {
  nextVersion,
  assertVersionMatch,
  VersionConflictError,
  isNewerVersion,
} from './ProfileVersion';

describe('ProfileVersion', () => {
  it('nextVersion: 1 -> 2', () => {
    expect(nextVersion(1)).toBe(2);
  });

  it('nextVersion: قيم غير صالحة تعود إلى 1', () => {
    expect(nextVersion(0)).toBe(1);
    expect(nextVersion(NaN)).toBe(1);
    expect(nextVersion(-5)).toBe(1);
  });

  it('assertVersionMatch: يمر عند التطابق', () => {
    expect(() => assertVersionMatch(3, 3)).not.toThrow();
  });

  it('assertVersionMatch: يرمي VersionConflictError عند الاختلاف', () => {
    expect(() => assertVersionMatch(3, 4)).toThrow(VersionConflictError);
  });

  it('isNewerVersion يقارن الإصدارات', () => {
    expect(isNewerVersion({ version: 5 }, { version: 4 })).toBe(true);
    expect(isNewerVersion({ version: 4 }, { version: 5 })).toBe(false);
  });
});
