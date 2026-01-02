/**
 * Error Handler Utility
 * Maps technical database/API errors to user-friendly Arabic messages
 * Prevents information leakage about database schema
 */

// PostgreSQL error codes to user-friendly messages
const POSTGRES_ERROR_MAP: Record<string, string> = {
  '23505': 'هذا السجل موجود بالفعل',
  '23503': 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى',
  '23502': 'يرجى ملء جميع الحقول المطلوبة',
  '23514': 'القيمة المدخلة غير صالحة',
  '22001': 'النص المدخل طويل جداً',
  '22003': 'الرقم المدخل خارج النطاق المسموح',
  '42501': 'ليس لديك صلاحية لإجراء هذه العملية',
  '42P01': 'حدث خطأ في النظام',
  '28000': 'فشل التحقق من الهوية',
  '28P01': 'بيانات الدخول غير صحيحة',
  '40001': 'حدث تعارض، يرجى المحاولة مرة أخرى',
  '40P01': 'حدث خطأ، يرجى المحاولة مرة أخرى',
  '57014': 'انتهت مهلة العملية',
};

// Common error patterns to user-friendly messages
const ERROR_PATTERN_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /duplicate key/i, message: 'هذا السجل موجود بالفعل' },
  { pattern: /foreign key/i, message: 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى' },
  { pattern: /not-null/i, message: 'يرجى ملء جميع الحقول المطلوبة' },
  { pattern: /permission denied/i, message: 'ليس لديك صلاحية لإجراء هذه العملية' },
  { pattern: /network/i, message: 'حدث خطأ في الاتصال بالشبكة' },
  { pattern: /timeout/i, message: 'انتهت مهلة العملية، يرجى المحاولة مرة أخرى' },
  { pattern: /unauthorized/i, message: 'يرجى تسجيل الدخول أولاً' },
  { pattern: /invalid.*token/i, message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى' },
  { pattern: /row-level security/i, message: 'ليس لديك صلاحية لإجراء هذه العملية' },
];

// Default safe error message
const DEFAULT_ERROR_MESSAGE = 'حدث خطأ، يرجى المحاولة مرة أخرى';

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Converts a technical error to a user-friendly message
 * Never exposes database schema, table names, or constraint details
 */
export function getSafeErrorMessage(error: unknown): string {
  if (!error) {
    return DEFAULT_ERROR_MESSAGE;
  }

  // Handle Supabase/PostgreSQL errors with codes
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as SupabaseError;
    
    // Check for PostgreSQL error code
    if (supabaseError.code && POSTGRES_ERROR_MAP[supabaseError.code]) {
      return POSTGRES_ERROR_MAP[supabaseError.code];
    }

    // Check error message against patterns
    const message = supabaseError.message || '';
    for (const { pattern, message: safeMessage } of ERROR_PATTERN_MAP) {
      if (pattern.test(message)) {
        return safeMessage;
      }
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    for (const { pattern, message: safeMessage } of ERROR_PATTERN_MAP) {
      if (pattern.test(error)) {
        return safeMessage;
      }
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    for (const { pattern, message: safeMessage } of ERROR_PATTERN_MAP) {
      if (pattern.test(error.message)) {
        return safeMessage;
      }
    }
  }

  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Logs error details in development mode only
 * Safe to use - never exposes errors to users
 */
export function logErrorSafely(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
}

/**
 * Helper for handling errors in mutation handlers
 * Usage:
 * onError: (error) => handleMutationError(error, toast)
 */
export function handleMutationError(
  error: unknown,
  toast: (options: { title: string; description: string; variant: 'destructive' }) => void
): void {
  logErrorSafely('Mutation error', error);
  toast({
    title: 'حدث خطأ',
    description: getSafeErrorMessage(error),
    variant: 'destructive',
  });
}
