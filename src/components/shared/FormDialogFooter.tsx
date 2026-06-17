import { memo } from "react";
import { Button } from "@/components/ui/button";

interface FormDialogFooterProps {
  isEditing: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  /** Override the default submit label. */
  submitLabel?: string;
  /** Override the default submitting label. */
  submittingLabel?: string;
  /** Override the default cancel label. */
  cancelLabel?: string;
  /** Additional disable condition (e.g. server validation in progress). */
  disabled?: boolean;
}

/**
 * Unified dialog footer for forms standardized via `useFormDialog`.
 *
 * - 44px touch target (min-h-11).
 * - Deterministic label: "جاري الحفظ..." → "تحديث"/"إضافة".
 * - No business logic.
 */
function FormDialogFooter({
  isEditing,
  isSubmitting,
  onCancel,
  submitLabel,
  submittingLabel = "جاري الحفظ...",
  cancelLabel = "إلغاء",
  disabled = false,
}: FormDialogFooterProps) {
  const finalSubmitLabel = submitLabel ?? (isEditing ? "تحديث" : "إضافة");

  return (
    <div className="flex justify-end gap-3 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="min-h-11"
        disabled={isSubmitting}
      >
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={isSubmitting || disabled} className="min-h-11">
        {isSubmitting ? submittingLabel : finalSubmitLabel}
      </Button>
    </div>
  );
}

export default memo(FormDialogFooter);
