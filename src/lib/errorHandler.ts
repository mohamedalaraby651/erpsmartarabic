/**
 * Enhanced Error Handler Utility
 * Maps technical database/API errors to user-friendly Arabic messages with context
 * Prevents information leakage about database schema
 */

import type { ReactNode } from 'react';

// Contextual error interface
interface ContextualError {
  userMessage: string;
  field?: string;
  action?: string;
  errorCode?: string;
}

// PostgreSQL error codes to contextual messages
const POSTGRES_ERROR_MAP: Record<string, ContextualError> = {
  '23505': {
    userMessage: 'هذا السجل موجود بالفعل',
    action: 'تحقق من البيانات المدخلة أو عدّل السجل الموجود',
  },
  '23503': {
    userMessage: 'لا يمكن حذف هذا السجل',
    action: 'يجب حذف السجلات المرتبطة به أولاً',
  },
  '23502': {
    userMessage: 'يوجد حقل مطلوب فارغ',
    action: 'يرجى ملء جميع الحقول المطلوبة (*)',
  },
  '23514': {
    userMessage: 'القيمة المدخلة غير صالحة',
    action: 'تحقق من صحة البيانات المدخلة',
  },
  '22001': {
    userMessage: 'النص المدخل طويل جداً',
    action: 'يرجى تقصير النص المدخل',
  },
  '22003': {
    userMessage: 'الرقم المدخل خارج النطاق المسموح',
    action: 'أدخل رقماً ضمن الحدود المسموحة',
  },
  '42501': {
    userMessage: 'ليس لديك صلاحية لإجراء هذه العملية',
    action: 'تواصل مع مسؤول النظام لطلب الصلاحية',
  },
  '42P01': {
    userMessage: 'حدث خطأ في النظام',
    action: 'يرجى المحاولة مرة أخرى أو التواصل مع الدعم',
  },
  '28000': {
    userMessage: 'فشل التحقق من الهوية',
    action: 'يرجى تسجيل الدخول مرة أخرى',
  },
  '28P01': {
    userMessage: 'بيانات الدخول غير صحيحة',
    action: 'تحقق من البريد الإلكتروني وكلمة المرور',
  },
  '40001': {
    userMessage: 'حدث تعارض في البيانات',
    action: 'يرجى المحاولة مرة أخرى',
  },
  '40P01': {
    userMessage: 'حدث خطأ مؤقت',
    action: 'يرجى المحاولة مرة أخرى',
  },
  '57014': {
    userMessage: 'انتهت مهلة العملية',
    action: 'يرجى المحاولة مرة أخرى',
  },
};

// Common error patterns to contextual messages
const ERROR_PATTERN_MAP: Array<{ pattern: RegExp; error: ContextualError }> = [
  { 
    pattern: /duplicate key/i, 
    error: { 
      userMessage: 'هذا السجل موجود بالفعل',
      action: 'استخدم بيانات مختلفة أو عدّل السجل الموجود',
    } 
  },
  { 
    pattern: /foreign key/i, 
    error: { 
      userMessage: 'لا يمكن حذف هذا السجل',
      action: 'يجب حذف السجلات المرتبطة به أولاً',
    } 
  },
  { 
    pattern: /not-null/i, 
    error: { 
      userMessage: 'يوجد حقل مطلوب فارغ',
      action: 'يرجى ملء جميع الحقول المطلوبة',
    } 
  },
  { 
    pattern: /permission denied/i, 
    error: { 
      userMessage: 'ليس لديك صلاحية لإجراء هذه العملية',
      action: 'تواصل مع مسؤول النظام',
    } 
  },
  { 
    pattern: /network|fetch|cors/i, 
    error: { 
      userMessage: 'حدث خطأ في الاتصال بالشبكة',
      action: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى',
    } 
  },
  { 
    pattern: /timeout/i, 
    error: { 
      userMessage: 'انتهت مهلة العملية',
      action: 'يرجى المحاولة مرة أخرى',
    } 
  },
  { 
    pattern: /unauthorized|401/i, 
    error: { 
      userMessage: 'يرجى تسجيل الدخول أولاً',
      action: 'انتقل لصفحة تسجيل الدخول',
    } 
  },
  { 
    pattern: /invalid.*token|jwt/i, 
    error: { 
      userMessage: 'انتهت صلاحية الجلسة',
      action: 'يرجى تسجيل الدخول مرة أخرى',
    } 
  },
  { 
    pattern: /row-level security|rls/i, 
    error: { 
      userMessage: 'ليس لديك صلاحية لإجراء هذه العملية',
      action: 'تواصل مع مسؤول النظام لطلب الصلاحية',
    } 
  },
  { 
    pattern: /يجب إضافة منتج/i, 
    error: { 
      userMessage: 'يجب إضافة منتج واحد على الأقل',
      action: 'اضغط على "إضافة منتج" وأضف منتجًا للقائمة',
    } 
  },
  { 
    pattern: /يجب اختيار/i, 
    error: { 
      userMessage: 'يجب اختيار قيمة من القائمة',
      action: 'اختر قيمة من القائمة المنسدلة',
    } 
  },
];

// Default safe error
const DEFAULT_ERROR: ContextualError = {
  userMessage: 'حدث خطأ',
  action: 'يرجى المحاولة مرة أخرى',
};

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Parse error and extract contextual information
 */
function parseError(error: unknown): ContextualError {
  if (!error) {
    return DEFAULT_ERROR;
  }

  // Handle Error instances with custom messages (from throw new Error())
  if (error instanceof Error && error.message) {
    // Check if it's a user-friendly message (Arabic text)
    if (/[\u0600-\u06FF]/.test(error.message)) {
      // Check patterns first
      for (const { pattern, error: contextError } of ERROR_PATTERN_MAP) {
        if (pattern.test(error.message)) {
          return contextError;
        }
      }
      // If it's Arabic but no pattern, use the message directly
      return { userMessage: error.message, action: 'يرجى المحاولة مرة أخرى' };
    }
    // Check English patterns
    for (const { pattern, error: contextError } of ERROR_PATTERN_MAP) {
      if (pattern.test(error.message)) {
        return contextError;
      }
    }
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
    for (const { pattern, error: contextError } of ERROR_PATTERN_MAP) {
      if (pattern.test(message)) {
        return contextError;
      }
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    for (const { pattern, error: contextError } of ERROR_PATTERN_MAP) {
      if (pattern.test(error)) {
        return contextError;
      }
    }
    // If it's Arabic, use directly
    if (/[\u0600-\u06FF]/.test(error)) {
      return { userMessage: error, action: 'يرجى المحاولة مرة أخرى' };
    }
  }

  return DEFAULT_ERROR;
}

/**
 * Converts a technical error to a user-friendly message (simple version)
 * Never exposes database schema, table names, or constraint details
 */
export function getSafeErrorMessage(error: unknown): string {
  const contextError = parseError(error);
  return contextError.userMessage;
}

/**
 * Get detailed error with action suggestion
 */
export function getDetailedErrorMessage(
  error: unknown,
  context?: { operation?: string; entity?: string }
): ContextualError {
  const baseError = parseError(error);

  // Add entity context to message
  if (context?.entity) {
    baseError.userMessage = baseError.userMessage.replace('السجل', context.entity);
  }

  return baseError;
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
 * Toast function type for mutation error handler
 */
type ToastFunction = (options: { 
  title: string; 
  description?: string | ReactNode; 
  variant?: 'default' | 'destructive' 
}) => void;

/**
 * Helper for handling errors in mutation handlers (legacy support)
 * Usage: onError: (error) => handleMutationError(error, toast)
 */
export function handleMutationError(
  error: unknown,
  toast: ToastFunction
): void {
  logErrorSafely('Mutation error', error);
  const errorInfo = parseError(error);
  
  toast({
    title: 'حدث خطأ',
    description: errorInfo.action 
      ? `${errorInfo.userMessage}\n💡 ${errorInfo.action}`
      : errorInfo.userMessage,
    variant: 'destructive',
  });
}

/**
 * Enhanced mutation error handler with context
 * Usage: onError: (error) => handleMutationErrorWithContext(error, toast, { operation: 'إنشاء', entity: 'الفاتورة' })
 */
export function handleMutationErrorWithContext(
  error: unknown,
  toast: ToastFunction,
  context: { operation: string; entity: string }
): void {
  logErrorSafely(`${context.operation} ${context.entity}`, error);
  const errorInfo = getDetailedErrorMessage(error, context);
  
  toast({
    title: `خطأ في ${context.operation} ${context.entity}`,
    description: errorInfo.action 
      ? `${errorInfo.userMessage} - ${errorInfo.action}`
      : errorInfo.userMessage,
    variant: 'destructive',
  });
}
