import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullScreenFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FullScreenForm({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: FullScreenFormProps) {
  const isMobile = useIsMobile();

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
            <div className="flex items-center justify-between p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="touch-target"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 smooth-scroll">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 border-t bg-background p-4 safe-area-bottom">
              {footer}
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {children}
        </div>
        {footer && (
          <div className="flex-shrink-0 border-t pt-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
