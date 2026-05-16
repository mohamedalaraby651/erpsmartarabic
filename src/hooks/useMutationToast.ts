import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
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
  /** If true, suppress the success toast (still shows error). Useful when caller wants custom UI. */
  silentSuccess?: boolean;
}

/**
 * useMutationToast — unified success/error toast helpers for mutations.
 *
 * Standardizes the "every mutation must produce feedback" rule from the audit.
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
    errorTitle = 'حدث خطأ',
    errorDescription,
    silentSuccess = false,
  } = options;

  const onSuccess = useCallback(() => {
    if (silentSuccess) return;
    toast({
      title: successTitle,
      description: successDescription,
    });
  }, [successTitle, successDescription, silentSuccess]);

  const onError = useCallback(
    (error: unknown) => {
      const description = errorDescription ?? getSafeErrorMessage(error);
      toast({
        title: errorTitle,
        description,
        variant: 'destructive',
      });
    },
    [errorTitle, errorDescription]
  );

  return { onSuccess, onError };
}

export default useMutationToast;
