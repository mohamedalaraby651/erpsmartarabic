/**
 * Repository Base Contract
 * ------------------------------------------------------------
 * كل ما يخص الوصول لقاعدة البيانات يجب أن يمرّ عبر طبقة الـ
 * repositories. هذا الملف يوفّر:
 *
 *  - أنواع موحّدة للترقيم/الفرز/الفلترة (RepoListParams/RepoListResult).
 *  - BaseRepository<T, F, S> كعقد مرجعي للـ CRUD.
 *  - mapRepoError: تحويل أخطاء Postgres إلى رسائل عربية موحّدة.
 *  - buildRange: مساعد لتحويل (page,pageSize) إلى range(from,to).
 *
 * ملاحظات:
 *  - tenant_id يُحقن تلقائياً عبر RLS؛ الـ repos لا تتعامل معه يدوياً
 *    إلا في RPCs خاصة (انظر useTenant.ts و SECURITY DEFINER).
 *  - الـ Zod parsing مسؤولية كل repo (مثال: customerRepository).
 */

import type { PostgrestError } from "@supabase/supabase-js";

// ============================================
// Common types
// ============================================

export interface RepoSort<K extends string = string> {
  key: K;
  direction: "asc" | "desc" | null;
}

export interface RepoPagination {
  page: number;
  pageSize: number;
}

export interface RepoListParams<F = unknown, K extends string = string> {
  filters?: F;
  sort?: RepoSort<K>;
  pagination?: RepoPagination;
}

export interface RepoListResult<T> {
  data: T[];
  count: number;
}

export interface BaseRepository<T, F = unknown, S extends string = string> {
  findAll(params: RepoListParams<F, S>): Promise<RepoListResult<T>>;
  findById(id: string): Promise<T | null>;
  create(payload: Partial<T>): Promise<T>;
  update(id: string, payload: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}

// ============================================
// Helpers
// ============================================

export function buildRange(pagination?: RepoPagination): { from: number; to: number } | null {
  if (!pagination) return null;
  const from = Math.max(0, (pagination.page - 1) * pagination.pageSize);
  const to = from + pagination.pageSize - 1;
  return { from, to };
}

const ARABIC_ERRORS: Record<string, string> = {
  PGRST116: "السجل غير موجود.",
  "23505": "السجل موجود مسبقاً (تكرار).",
  "23503": "لا يمكن إتمام العملية: يوجد سجلات مرتبطة.",
  "23514": "البيانات لا تطابق قواعد التحقق.",
  "42501": "غير مصرّح بهذه العملية.",
  "P0001": "العملية مرفوضة من قبل قواعد العمل.",
};

/**
 * يحوّل خطأ Supabase/Postgres إلى Error برسالة عربية موحّدة،
 * مع الحفاظ على الأصل في `.cause` لأغراض التتبع.
 */
export function mapRepoError(err: unknown, fallback = "تعذّر إتمام العملية."): Error {
  if (!err) return new Error(fallback);
  const pgErr = err as Partial<PostgrestError> & { message?: string; code?: string };
  const arabic = pgErr.code ? ARABIC_ERRORS[pgErr.code] : undefined;
  const message = arabic ?? pgErr.message ?? fallback;
  const wrapped = new Error(message);
  (wrapped as Error & { cause?: unknown }).cause = err;
  return wrapped;
}

/**
 * Wrapper موحّد لاستدعاءات Supabase التي تُرجع { data, error }.
 * يرمي Error عربياً عند الفشل ويعيد data عند النجاح.
 */
export async function unwrap<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  fallback?: string,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw mapRepoError(error, fallback);
  return data as T;
}
