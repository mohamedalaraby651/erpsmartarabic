import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface UseDeleteConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface UseDeleteConfirmReturn {
  /** Call to open confirmation for a specific ID */
  requestDelete: (id: string) => void;
  /** The ID currently pending confirmation (null if closed) */
  pendingId: string | null;
  /** Call inside the mutation's onSuccess/onSettled to close */
  reset: () => void;
  /** Render this component wherever needed — it's a self-contained AlertDialog */
  ConfirmDialog: React.FC<{
    onConfirm: (id: string) => void;
    isDeleting?: boolean;
  }>;
}

/**
 * useDeleteConfirm — standardized delete confirmation pattern.
 *
 * Replaces scattered AlertDialog state management across the codebase.
 *
 * Usage:
 * ```tsx
 * const { requestDelete, reset, ConfirmDialog } = useDeleteConfirm();
 * // In the table row: onClick={() => requestDelete(item.id)}
 * // Render once: <ConfirmDialog onConfirm={handleDelete} isDeleting={isPending} />
 * ```
 */
export function useDeleteConfirm(options: UseDeleteConfirmOptions = {}): UseDeleteConfirmReturn {
  const {
    title = 'تأكيد الحذف',
    description = 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmLabel = 'حذف',
    cancelLabel = 'إلغاء',
  } = options;

  const [pendingId, setPendingId] = useState<string | null>(null);

  const requestDelete = useCallback((id: string) => {
    setPendingId(id);
  }, []);

  const reset = useCallback(() => {
    setPendingId(null);
  }, []);

  const ConfirmDialog: React.FC<{
    onConfirm: (id: string) => void;
    isDeleting?: boolean;
  }> = ({ onConfirm, isDeleting = false }) => (
    <AlertDialog open={!!pendingId} onOpenChange={(open) => !open && reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingId) onConfirm(pendingId);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestDelete, pendingId, reset, ConfirmDialog };
}
