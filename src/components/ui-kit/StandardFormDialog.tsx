import { ReactNode, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FullScreenForm } from '@/components/mobile/FullScreenForm';
import { AdaptiveContainer } from '@/components/mobile/AdaptiveContainer';
import { cn } from '@/lib/utils';

interface FormStep {
  title: string;
  content: ReactNode;
}

interface StandardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Form content for simple (non-wizard) forms */
  children?: ReactNode;
  /** Wizard steps — if provided, renders multi-step form on mobile */
  steps?: FormStep[];
  /** Current wizard step index */
  activeStep?: number;
  onNext?: () => void;
  onPrev?: () => void;
  /** Progress percentage (0–100) */
  progress?: number;
  /** Called on form submit (wraps handleSubmit) */
  onSubmit: (e?: FormEvent) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  /** Max width class for desktop dialog */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Extra desktop content after form (e.g. validation section) */
  desktopFooter?: ReactNode;
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

/**
 * StandardFormDialog — unified form dialog for all modules.
 * 
 * Renders a desktop Dialog and mobile FullScreenForm (with optional wizard).
 * Replaces the repeated pattern of:
 *   AdaptiveContainer + Dialog + FullScreenForm + useFormWizard
 */
export function StandardFormDialog({
  open,
  onOpenChange,
  title,
  children,
  steps,
  activeStep = 0,
  onNext,
  onPrev,
  progress,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'حفظ',
  cancelLabel = 'إلغاء',
  maxWidth = '2xl',
  desktopFooter,
  className,
}: StandardFormDialogProps) {
  const isWizard = steps && steps.length > 0;

  // Desktop: always a standard Dialog with form
  const desktopForm = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthMap[maxWidth], 'max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          {isWizard
            ? steps.map((step, i) => (
                <div key={i}>{step.content}</div>
              ))
            : children}
          {desktopFooter || (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الحفظ...' : submitLabel}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );

  // Mobile: FullScreenForm (wizard or simple)
  const mobileForm = isWizard ? (
    <FullScreenForm
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      steps={steps}
      activeStep={activeStep}
      onNext={onNext}
      onPrev={onPrev}
      onSubmit={onSubmit}
      progress={progress}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
    />
  ) : (
    <FullScreenForm
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 min-h-11" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="submit" className="flex-1 min-h-11" disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? 'جاري الحفظ...' : submitLabel}
          </Button>
        </div>
      }
    >
      {children}
    </FullScreenForm>
  );

  return <AdaptiveContainer desktop={desktopForm} mobile={mobileForm} />;
}
