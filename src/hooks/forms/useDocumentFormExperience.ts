import { useMemo } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useSaveShortcut } from './useSaveShortcut';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

/** Local drafts are scoped by tenant, user and document; never grant posting authority. */
export function useDocumentFormExperience<T extends FieldValues, L>({ form, lines, restoreLines, documentKey, open, busy, submit, close, linesDirty = false }: {
  form: UseFormReturn<T>;
  lines: L;
  restoreLines: (lines: L) => void;
  documentKey: string;
  open: boolean;
  busy: boolean;
  submit: () => Promise<void>;
  close: () => void;
  linesDirty?: boolean;
}) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const values = form.watch();
  const data = useMemo(() => ({ values, lines }), [values, lines]);
  const draft = useFormDraft({
    key: `${tenantId}:${user?.id}:${documentKey}`,
    data,
    enabled: open && !!user && !!tenantId,
    autoSave: form.formState.isDirty || linesDirty,
  });
  const guard = useUnsavedChangesGuard(open && (form.formState.isDirty || linesDirty), close);
  const save = async () => {
    if (busy) return;
    await submit();
    if (!form.formState.isValid) {
      requestAnimationFrame(() => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"][data-state="open"]');
        const invalid = dialog?.querySelector<HTMLElement>('[aria-invalid="true"]');
        invalid?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        invalid?.focus({ preventScroll: true });
      });
    }
  };
  useSaveShortcut(() => { if (!guard.confirmOpen) void save(); }, open && !busy && !guard.confirmOpen);
  return {
    ...guard,
    ...draft,
    save,
    onOpenChange: (next: boolean) => { if (!next && !busy) guard.requestClose(); },
    restore: () => {
      const saved = draft.restoreDraft();
      if (!saved) return;
      form.reset(saved.values, { keepDefaultValues: true });
      restoreLines(saved.lines);
    },
  };
}