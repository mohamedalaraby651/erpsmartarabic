import { Button } from '@/components/ui/button';
import { ShoppingCart, CreditCard, Printer, Edit, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

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
        <Button onClick={onCreatePurchaseOrder} size="sm" className="gap-2"><ShoppingCart className="h-4 w-4" />أمر شراء</Button>
        <Button onClick={onRecordPayment} variant="outline" size="sm" className="gap-2"><CreditCard className="h-4 w-4" />دفعة</Button>
        <Button onClick={onPrintStatement} variant="outline" size="sm" className="gap-2" disabled={isPrintingStatement}>
          {isPrintingStatement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}كشف حساب
        </Button>
        <Button onClick={onEdit} variant="ghost" size="sm" className="gap-2"><Edit className="h-4 w-4" />تعديل</Button>
      </div>
      {(hasPrev || hasNext) && (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={onPrev}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={onNext}><ChevronLeft className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
};

export default SupplierHeroActions;
