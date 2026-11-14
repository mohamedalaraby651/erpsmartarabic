import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type Props = ComponentPropsWithoutRef<typeof SheetContent>;

/** Side drawer on desktop, bottom sheet on mobile (decision 347). */
export const ResponsiveSheetContent = forwardRef<ElementRef<typeof SheetContent>, Props>(
  ({ side = 'left', className, ...props }, ref) => {
    const isMobile = useIsMobile();
    if (isMobile) {
      return (
        <SheetContent ref={ref} side="bottom" className={cn('max-h-[85vh] w-full overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]', className?.replace(/\b(sm:)?w-\[[^\]]+\]|\bw-full\b/g, ''))} {...props} />
      );
    }
    return <SheetContent ref={ref} side={side} className={className} {...props} />;
  },
);
ResponsiveSheetContent.displayName = 'ResponsiveSheetContent';
