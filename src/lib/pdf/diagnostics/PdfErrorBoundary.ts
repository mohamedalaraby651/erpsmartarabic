/**
 * PDF Error Boundary (Wave 16).
 *
 * Wraps any render function with a timeout, memory measurement, and
 * structured Result type. Errors are classified into stable codes so
 * UIs can show actionable Arabic messages without inspecting stacks.
 */
export type PdfErrorCode =
  | 'timeout'
  | 'font-load'
  | 'asset-load'
  | 'dom-unavailable'
  | 'engine-missing'
  | 'invalid-payload'
  | 'oom'
  | 'unknown';

export interface PdfError {
  code: PdfErrorCode;
  message: string;
  cause?: unknown;
}

export type PdfBoundaryResult<T> =
  | { ok: true; value: T; durationMs: number; memDeltaMb?: number }
  | { ok: false; error: PdfError; durationMs: number; memDeltaMb?: number };

export interface SafeRenderOptions {
  timeoutMs?: number;
  onTelemetry?: (record: SafeRenderTelemetry) => void;
}

export interface SafeRenderTelemetry {
  ok: boolean;
  durationMs: number;
  memDeltaMb?: number;
  errorCode?: PdfErrorCode;
  errorMessage?: string;
}

type PerfMemory = { usedJSHeapSize: number };

function readMemoryMb(): number | undefined {
  const mem = (performance as unknown as { memory?: PerfMemory }).memory;
  return mem ? mem.usedJSHeapSize / (1024 * 1024) : undefined;
}

export function classifyPdfError(err: unknown): PdfError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { code: 'timeout', message: 'انتهت مهلة توليد الملف', cause: err };
  }
  if (lower.includes('font')) {
    return { code: 'font-load', message: 'تعذّر تحميل الخط العربي', cause: err };
  }
  if (lower.includes('html2pdf') || lower.includes('jspdf')) {
    return { code: 'engine-missing', message: 'محرك التوليد غير متاح', cause: err };
  }
  if (lower.includes('dom') || lower.includes('document')) {
    return { code: 'dom-unavailable', message: 'بيئة العرض غير مدعومة', cause: err };
  }
  if (lower.includes('invalid payload') || lower.includes('missing')) {
    return { code: 'invalid-payload', message: 'بيانات الإدخال غير صالحة', cause: err };
  }
  if (lower.includes('heap') || lower.includes('memory')) {
    return { code: 'oom', message: 'ذاكرة غير كافية لإكمال التوليد', cause: err };
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return { code: 'asset-load', message: 'تعذّر تحميل أحد الأصول الخارجية', cause: err };
  }
  return { code: 'unknown', message: msg || 'خطأ غير معروف', cause: err };
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`render timed out after ${ms}ms`)), ms),
  );
}

/**
 * Run a render function inside an error boundary. Never throws; always
 * returns a Result the caller can branch on.
 */
export async function safeRender<T>(
  fn: () => Promise<T>,
  opts: SafeRenderOptions = {},
): Promise<PdfBoundaryResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const startMem = readMemoryMb();
  const t0 = performance.now();
  try {
    const value = await Promise.race([fn(), timeoutPromise(timeoutMs)]);
    const durationMs = performance.now() - t0;
    const endMem = readMemoryMb();
    const memDeltaMb = startMem != null && endMem != null ? endMem - startMem : undefined;
    opts.onTelemetry?.({ ok: true, durationMs, memDeltaMb });
    return { ok: true, value, durationMs, memDeltaMb };
  } catch (e) {
    const durationMs = performance.now() - t0;
    const error = classifyPdfError(e);
    const endMem = readMemoryMb();
    const memDeltaMb = startMem != null && endMem != null ? endMem - startMem : undefined;
    opts.onTelemetry?.({
      ok: false,
      durationMs,
      memDeltaMb,
      errorCode: error.code,
      errorMessage: error.message,
    });
    return { ok: false, error, durationMs, memDeltaMb };
  }
}
