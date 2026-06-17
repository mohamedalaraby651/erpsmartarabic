import { memo } from "react";
import type { FieldError } from "react-hook-form";

interface FormFieldErrorProps {
  error?: FieldError | { message?: string } | undefined;
  id?: string;
}

/**
 * Unified inline error renderer for form fields driven by react-hook-form + zod.
 * Use alongside `useFormDialog` for visual consistency.
 */
function FormFieldError({ error, id }: FormFieldErrorProps) {
  if (!error?.message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive mt-1">
      {String(error.message)}
    </p>
  );
}

export default memo(FormFieldError);
