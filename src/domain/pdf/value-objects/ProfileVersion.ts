/**
 * ProfileVersion — قواعد ترقيم الإصدارات للحماية من الكتابة المتزامنة
 * (optimistic locking). يبدأ من 1 ويزيد بمقدار 1 لكل حفظ ناجح.
 */

export interface VersionedRecord {
  version: number;
  updatedAt?: string | Date;
  updatedBy?: string | null;
}

export class VersionConflictError extends Error {
  readonly code = 'VERSION_CONFLICT';
  constructor(
    readonly expected: number,
    readonly actual: number,
    message?: string,
  ) {
    super(
      message ??
        `تعارض في الإصدار: المتوقع ${expected} والفعلي ${actual}. ` +
          'قام مستخدم آخر بتعديل هذه الإعدادات. أعد التحميل ثم حاول مرة أخرى.',
    );
    this.name = 'VersionConflictError';
  }
}

export function nextVersion(current: number): number {
  if (!Number.isFinite(current) || current < 1) return 1;
  return Math.floor(current) + 1;
}

export function assertVersionMatch(expected: number, actual: number): void {
  if (expected !== actual) {
    throw new VersionConflictError(expected, actual);
  }
}

export function isNewerVersion(a: VersionedRecord, b: VersionedRecord): boolean {
  return a.version > b.version;
}
