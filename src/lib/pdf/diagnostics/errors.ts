/**
 * Typed error classes for the PDF pipeline.
 * Caught at the UnifiedExportMenu / pdfGenerator boundary and surfaced
 * to users via Arabic toast messages.
 */
export class PdfValidationError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[]) {
    super(message);
    this.name = 'PdfValidationError';
    this.issues = issues;
  }
}

export class PdfEngineError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PdfEngineError';
    this.cause = cause;
  }
}

export class PdfFontLoadError extends Error {
  readonly fontKey: string;
  constructor(fontKey: string, message: string) {
    super(message);
    this.name = 'PdfFontLoadError';
    this.fontKey = fontKey;
  }
}

export class PdfTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`PDF generation exceeded ${timeoutMs}ms`);
    this.name = 'PdfTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export function isPdfError(e: unknown): e is PdfValidationError | PdfEngineError | PdfFontLoadError | PdfTimeoutError {
  return (
    e instanceof PdfValidationError ||
    e instanceof PdfEngineError ||
    e instanceof PdfFontLoadError ||
    e instanceof PdfTimeoutError
  );
}

/** Arabic-localized user-facing message for any PDF error. */
export function toArabicErrorMessage(e: unknown): string {
  if (e instanceof PdfValidationError) {
    return `بيانات غير صالحة للتصدير: ${e.issues.slice(0, 3).join('، ')}`;
  }
  if (e instanceof PdfFontLoadError) {
    return 'تعذّر تحميل الخط، تم استخدام الخط الاحتياطي.';
  }
  if (e instanceof PdfTimeoutError) {
    return 'استغرق إنشاء الملف وقتًا طويلًا. حاول مجددًا أو قلّل حجم البيانات.';
  }
  if (e instanceof PdfEngineError) {
    return 'تعذّر إنشاء الملف. تحقّق من البيانات وحاول مجددًا.';
  }
  return 'حدث خطأ غير متوقع أثناء التصدير.';
}
