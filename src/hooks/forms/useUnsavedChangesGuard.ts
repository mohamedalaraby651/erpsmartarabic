import { useCallback, useEffect, useState } from 'react';

/**
 * Leave-protection for forms with unsaved data (decision 287).
 * - Browser tab close / reload → native beforeunload prompt.
 * - Closing the form → `requestClose()` opens a confirm dialog when dirty.
 */
export function useUnsavedChangesGuard(isDirty: boolean, close: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);
  const requestClose = useCallback(() => {
    if (isDirty) setConfirmOpen(true); else close();
  }, [isDirty, close]);
  const confirmLeave = useCallback(() => { setConfirmOpen(false); close(); }, [close]);
  return { confirmOpen, setConfirmOpen, requestClose, confirmLeave };
}
