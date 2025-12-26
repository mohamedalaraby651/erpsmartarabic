import { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  onApply: () => void;
  onReset: () => void;
  activeFiltersCount?: number;
  className?: string;
}

export function FilterDrawer({
  open,
  onOpenChange,
  title = 'الفلاتر',
  children,
  onApply,
  onReset,
  activeFiltersCount = 0,
  className,
}: FilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className={cn('w-80 flex flex-col p-0', className)}>
        <SheetHeader className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            {activeFiltersCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {activeFiltersCount} فلتر نشط
              </span>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {children}
          </div>
        </ScrollArea>

        <SheetFooter className="flex-shrink-0 border-t p-4">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onReset();
              }}
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              إعادة تعيين
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onApply();
                onOpenChange(false);
              }}
            >
              <Check className="h-4 w-4 ml-2" />
              تطبيق
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Filter Section Component
interface FilterSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FilterSection({ title, children, className }: FilterSectionProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}
