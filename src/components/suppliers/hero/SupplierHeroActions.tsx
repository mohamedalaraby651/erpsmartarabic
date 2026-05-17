import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShoppingCart, CreditCard, Printer, Edit, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { tooltips } from '@/lib/uiCopy';

interface SupplierHeroActionsProps {
  onEdit: () => void;
  onCreatePurchaseOrder: () => void;
  onRecordPayment: () => void;
  onPrintStatement: () => void;
  isPrintingStatement?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const SupplierHeroActions = ({
  onEdit, onCreatePurchaseOrder, onRecordPayment,
  onPrintStatement, isPrintingStatement = false,
  onPrev, onNext, hasPrev, hasNext,
}: SupplierHeroActionsProps) => {
  return (
    <div className="flex flex-col gap-3 lg:self-start shrink-0">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreatePurchaseOrder} size="sm" className="gap-2" aria-label={tooltips.newPurchaseOrder}><ShoppingCart className="h-4 w-4" />أمر شراء</Button>
        <Button onClick={onRecordPayment} variant="outline" size="sm" className="gap-2" aria-label={tooltips.newPayment}><CreditCard className="h-4 w-4" />دفعة</Button>
        <Button onClick={onPrintStatement} variant="outline" size="sm" className="gap-2" disabled={isPrintingStatement} aria-label={tooltips.printSupplierStatement}>
          {isPrintingStatement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}كشف حساب
        </Button>
        <Button onClick={onEdit} variant="ghost" size="sm" className="gap-2" aria-label={tooltips.editSupplier}><Edit className="h-4 w-4" />تعديل</Button>
      </div>
      {(hasPrev || hasNext) && (
        <div className="flex items-center gap-2 justify-end">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={onPrev} aria-label={tooltips.prevSupplier}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{tooltips.prevSupplier}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={onNext} aria-label={tooltips.nextSupplier}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{tooltips.nextSupplier}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default SupplierHeroActions;
