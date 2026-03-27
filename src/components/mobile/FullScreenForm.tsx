import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormStep {
  title: string;
  content: ReactNode;
}

interface FullScreenFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Optional wizard steps — if provided, renders as multi-step wizard */
  steps?: FormStep[];
  /** Current active step index (controlled externally via useFormWizard) */
  activeStep?: number;
  /** Called when user clicks Next */
  onNext?: () => void;
  /** Called when user clicks Previous */
  onPrev?: () => void;
  /** Called when user clicks Submit on last step */
  onSubmit?: () => void;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Custom submit button label */
  submitLabel?: string;
}

export function FullScreenForm({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
  steps,
  activeStep = 0,
  onNext,
  onPrev,
  onSubmit,
  progress,
  isSubmitting,
  submitLabel = 'حفظ',
}: FullScreenFormProps) {
  const isMobile = useIsMobile();

  const isWizard = steps && steps.length > 0;
  const isLastStep = isWizard && activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;

  const wizardFooter = isWizard ? (
    <div className="space-y-3">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === activeStep ? 'w-6 bg-primary' : i < activeStep ? 'w-3 bg-primary/50' : 'w-3 bg-muted-foreground/20',
            )}
          />
        ))}
      </div>
      {/* Action buttons */}
      <div className="flex gap-3">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-11"
            onClick={onPrev}
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            السابق
          </Button>
        )}
        {isFirstStep && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-11"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
        )}
        {isLastStep ? (
          <Button
            type="submit"
            className="flex-1 min-h-11"
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? 'جاري الحفظ...' : submitLabel}
            <Check className="h-4 w-4 mr-2" />
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 min-h-11"
            onClick={onNext}
          >
            التالي
            <ArrowRight className="h-4 w-4 mr-2" />
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const currentContent = isWizard ? steps[activeStep]?.content : children;
  const currentTitle = isWizard ? `${title} — ${steps[activeStep]?.title}` : title;
  const renderedFooter = isWizard ? wizardFooter : footer;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            'h-[95vh] flex flex-col p-0 rounded-t-xl',
            className
          )}
        >
          {/* Header */}
          <SheetHeader className="flex-shrink-0 border-b bg-background sticky top-0 z-10">
            {isWizard && progress !== undefined && (
              <Progress value={progress} className="h-1 rounded-none" />
            )}
            <div className="flex items-center justify-between p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="min-h-11 min-w-11"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <SheetTitle className="text-lg font-semibold">{currentTitle}</SheetTitle>
              <div className="w-10" />
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 smooth-scroll">
            {currentContent}
          </div>

          {/* Footer */}
          {renderedFooter && (
            <div className="flex-shrink-0 border-t bg-background p-4 safe-area-bottom">
              {renderedFooter}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Regular dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl max-h-[85vh] flex flex-col', className)}>
        <DialogHeader>
          <DialogTitle>{currentTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {currentContent}
        </div>
        {renderedFooter && (
          <div className="flex-shrink-0 border-t pt-4">
            {renderedFooter}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
