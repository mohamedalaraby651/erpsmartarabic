import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface PreflightIssueLike {
  field: string;
  message: string;
}

interface PdfPreflightAlertProps {
  /** Either preflight issues array, or a generic error message string. */
  errors?: PreflightIssueLike[];
  message?: string;
  title?: string;
}

/**
 * Displays preflight / export failures with full RTL Arabic formatting.
 * Used by `useExportPdf` and the sandbox page; the field list helps users
 * pinpoint exactly which invoice fragment is malformed instead of seeing
 * a corrupted PDF.
 */
export function PdfPreflightAlert({
  errors,
  message,
  title = 'تعذّر توليد ملف PDF',
}: PdfPreflightAlertProps) {
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  return (
    <Alert variant="destructive" dir="rtl" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message ? <p className="mb-2">{message}</p> : null}
        {hasErrors ? (
          <ul className="list-disc pr-5 space-y-1 text-sm">
            {errors!.slice(0, 8).map((e, i) => (
              <li key={`${e.field}-${i}`}>
                <span className="font-mono text-xs opacity-80">{e.field}</span>
                {': '}
                <span>{e.message}</span>
              </li>
            ))}
            {errors!.length > 8 ? (
              <li className="opacity-70">…و {errors!.length - 8} أخطاء أخرى</li>
            ) : null}
          </ul>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
