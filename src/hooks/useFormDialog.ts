/**
 * useFormDialog — Dialog-bound Form Lifecycle Abstraction (Phase 1B foundation).
 *
 * Constraints (do NOT relax without architecture review):
 *  - State + lifecycle only. NO toasts, NO dialog close, NO navigation inside the hook.
 *  - All UI side-effects flow through callbacks (`onSuccess` / `onError` / `onSettled`).
 *  - Deterministic lifecycle: INIT → VALIDATE → SUBMIT → MUTATE → RESULT → RESET/CLOSE.
 *  - Generic; zero implicit `any`.
 *
 * See: docs/architecture/useFormDialog.md
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

export interface UseFormDialogOptions<
  TValues extends FieldValues,
  TEntity,
  TPayload = unknown,
> {
  /** Zod schema for validation. Required — no inline rules allowed. */
  schema: ZodType<TValues>;
  /** The entity being edited; `null`/`undefined` means create mode. */
  entity: TEntity | null | undefined;
  /** Map an entity (or `null`) to RHF form values. Called on init and on entity change. */
  toValues: (entity: TEntity | null | undefined) => TValues;
  /** Map validated form values to the payload sent to `mutationFn`. */
  toPayload: (values: TValues) => TPayload;
  /** The mutation function. Throws on failure. */
  mutationFn: (
    payload: TPayload,
    ctx: { isEditing: boolean },
  ) => Promise<void> | Promise<unknown>;
  /** Success callback — owner does toast + close. */
  onSuccess?: (ctx: { isEditing: boolean }) => void;
  /** Error callback — owner does toast. Error is whatever `mutationFn` threw. */
  onError?: (error: unknown) => void;
  /** Settled callback — fires after success or error. */
  onSettled?: () => void;
}

export interface UseFormDialogReturn<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  isEditing: boolean;
  isSubmitting: boolean;
  /** `onSubmit` handler ready to pass to `<form onSubmit={...}>`. */
  submit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  /** Reset to current entity's values (or defaults). */
  reset: () => void;
}

export function useFormDialog<
  TValues extends FieldValues,
  TEntity,
  TPayload = unknown,
>(
  options: UseFormDialogOptions<TValues, TEntity, TPayload>,
): UseFormDialogReturn<TValues> {
  const {
    schema,
    entity,
    toValues,
    toPayload,
    mutationFn,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const isEditing = entity != null;
  const initialValues = toValues(entity);

  const form = useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues as DefaultValues<TValues>,
  });

  // Stable refs to avoid effect churn on consumer-supplied callbacks.
  const toValuesRef = useRef(toValues);
  toValuesRef.current = toValues;

  // Re-sync form values when the entity changes (replaces manual useEffect(reset)).
  useEffect(() => {
    form.reset(toValuesRef.current(entity) as DefaultValues<TValues>);
    // We only want to re-run when the entity identity changes, not on every form/callback change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    (e?: React.BaseSyntheticEvent) =>
      form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        try {
          const payload = toPayload(values);
          await mutationFn(payload, { isEditing });
          onSuccess?.({ isEditing });
        } catch (error) {
          onError?.(error);
        } finally {
          setIsSubmitting(false);
          onSettled?.();
        }
      })(e),
    [form, toPayload, mutationFn, isEditing, onSuccess, onError, onSettled],
  );

  const reset = useCallback(() => {
    form.reset(toValuesRef.current(entity) as DefaultValues<TValues>);
  }, [form, entity]);

  return { form, isEditing, isSubmitting, submit, reset };
}

export default useFormDialog;
