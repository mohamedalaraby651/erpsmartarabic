import { useCallback } from 'react';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorHandler';

interface MutationToastOptions {
  /** Title shown on success (Arabic). */
  successTitle?: string;
  /** Optional description on success. */
  successDescription?: string;
  /** Title shown on error (Arabic). Defaults to a generic phrase. */
  errorTitle?: string;
  /** Optional override for the error description; otherwise extracted from the error. */
  errorDescription?: string;
  /** If true, suppress the success toast (still shows error). */
  silentSuccess?: boolean;
}

/**
 * useMutationToast — unified success/error toast helpers for mutations.
 *
 * Standardizes the "every mutation must produce feedback" rule from the audit.
 * Built on sonner to match project convention (all existing mutations use sonner).
 *
 * Usage:
 * ```tsx
 * const { onSuccess, onError } = useMutationToast({ successTitle: 'تم حفظ العميل' });
 * useMutation({ mutationFn, onSuccess, onError });
 * ```
 */
export function useMutationToast(options: MutationToastOptions = {}) {
  const {
    successTitle = 'تم بنجاح',
    successDescription,
    errorTitle,
    errorDescription,
    silentSuccess = false,
  } = options;

  const onSuccess = useCallback(() => {
    if (silentSuccess) return;
    if (successDescription) {
      toast.success(successTitle, { description: successDescription });
    } else {
      toast.success(successTitle);
    }
  }, [successTitle, successDescription, silentSuccess]);

  const onError = useCallback(
    (error: unknown) => {
      const description = errorDescription ?? getSafeErrorMessage(error);
      if (errorTitle) {
        toast.error(errorTitle, { description });
      } else {
        toast.error(description);
      }
    },
    [errorTitle, errorDescription]
  );

  return { onSuccess, onError };
}

export default useMutationToast;
