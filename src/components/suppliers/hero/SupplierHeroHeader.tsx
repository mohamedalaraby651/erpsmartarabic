import type { Database } from '@/integrations/supabase/types';
import SupplierHeroIdentity from './SupplierHeroIdentity';
import SupplierHeroActions from './SupplierHeroActions';
import SupplierKPICards from './SupplierKPICards';
import SupplierQuickHistory from './SupplierQuickHistory';

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierHeroHeaderProps {
  supplier: Supplier;
  onEdit: () => void;
  onCreatePurchaseOrder: () => void;
  onRecordPayment: () => void;
  onPrintStatement: () => void;
  isPrintingStatement?: boolean;
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
  orderCount: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const SupplierHeroHeader = ({
  supplier, onEdit, onCreatePurchaseOrder, onRecordPayment,
  onPrintStatement, isPrintingStatement = false,
  totalPurchases, totalPayments, totalOutstanding, orderCount,
  onPrev, onNext, hasPrev, hasNext,
}: SupplierHeroHeaderProps) => {
  return (
    <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-background rounded-xl border p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <SupplierHeroIdentity supplier={supplier} />
        <SupplierHeroActions
          onEdit={onEdit}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onRecordPayment={onRecordPayment}
          onPrintStatement={onPrintStatement}
          isPrintingStatement={isPrintingStatement}
          onPrev={onPrev} onNext={onNext}
          hasPrev={hasPrev} hasNext={hasNext}
        />
      </div>

      <SupplierKPICards
        supplierId={supplier.id}
        totalPurchases={totalPurchases}
        totalPayments={totalPayments}
        totalOutstanding={totalOutstanding}
        orderCount={orderCount}
      />

      <div className="mt-3">
        <SupplierQuickHistory supplierId={supplier.id} />
      </div>
    </div>
  );
};

export default SupplierHeroHeader;
