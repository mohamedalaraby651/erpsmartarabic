/**
 * Global mutation feedback (OPA-UX-001).
 *
 * Rule enforced here: every data-writing action produces a real user-visible
 * message — success or failure — without each call site having to remember.
 *
 * How it works:
 *  • Error: the MutationCache error handler shows an Arabic error toast unless
 *    the mutation declares its own `onError` (that call site already reports)
 *    or opts out with `meta.silentError`.
 *  • Success: a toast is shown using `meta.successMessage` when provided,
 *    otherwise a generic Arabic confirmation. Background/auto-save mutations
 *    opt out with `meta.silentSuccess`.
 *
 * Presentation only — no business logic, no data access.
 */
import { toast } from 'sonner';
import type { Mutation } from '@tanstack/react-query';
import { getSafeErrorMessage } from '@/lib/errorHandler';

export interface MutationFeedbackMeta {
  /** Arabic success message for this action. */
  successMessage?: string;
  /** Arabic error title; the safe error text becomes the description. */
  errorMessage?: string;
  /** Background/auto-save action: no success toast. */
  silentSuccess?: boolean;
  /** Error already surfaced inline (e.g. inside a form): no error toast. */
  silentError?: boolean;
}

const DEFAULT_SUCCESS = 'تم تنفيذ العملية بنجاح';
const DEFAULT_ERROR = 'تعذّر إتمام العملية';

type AnyMutation = Mutation<unknown, unknown, unknown, unknown>;

function metaOf(mutation: AnyMutation): MutationFeedbackMeta {
  return (mutation?.options?.meta ?? {}) as MutationFeedbackMeta;
}

/**
 * Shown after a successful mutation that declares `meta.successMessage`.
 * Opt-in on purpose: call sites that already show their own success toast
 * must not produce a second one.
 */
export function notifyMutationSuccess(mutation: AnyMutation): void {
  const meta = metaOf(mutation);
  if (meta.silentSuccess || !meta.successMessage) return;
  toast.success(meta.successMessage || DEFAULT_SUCCESS);
}

/** Shown after a failed mutation, unless the call site reports it itself. */
export function notifyMutationError(error: unknown, mutation: AnyMutation): void {
  const meta = metaOf(mutation);
  if (meta.silentError) return;
  // A local onError means the call site already shows its own message.
  if (typeof mutation?.options?.onError === 'function') return;
  toast.error(meta.errorMessage ?? DEFAULT_ERROR, {
    description: getSafeErrorMessage(error),
  });
}
