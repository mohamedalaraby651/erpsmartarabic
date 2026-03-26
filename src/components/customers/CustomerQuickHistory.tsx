import { Badge } from '@/components/ui/badge';
import { EntityLink } from '@/components/shared/EntityLink';
import { FileText, CreditCard } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
}

interface CustomerQuickHistoryProps {
  invoices: Invoice[];
  payments: Payment[];
}

const statusLabels: Record<string, string> = {
  paid: 'مدفوع',
  partial: 'جزئي',
  pending: 'معلق',
  overdue: 'متأخر',
};

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  partial: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pending: 'bg-muted text-muted-foreground',
  overdue: 'bg-destructive/10 text-destructive',
};

const CustomerQuickHistory = ({ invoices, payments }: CustomerQuickHistoryProps) => {
  const lastInvoices = invoices.slice(0, 3);
  const lastPayment = payments[0];

  if (lastInvoices.length === 0 && !lastPayment) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {lastInvoices.map((inv) => (
        <div key={inv.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border">
          <FileText className="h-3 w-3 text-muted-foreground" />
          <EntityLink type="invoice" id={inv.id} className="text-xs">
            {inv.invoice_number}
          </EntityLink>
          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${statusColors[inv.payment_status] || ''}`}>
            {statusLabels[inv.payment_status] || inv.payment_status}
          </Badge>
        </div>
      ))}
      {lastPayment && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/20">
          <CreditCard className="h-3 w-3 text-emerald-600" />
          <span className="text-muted-foreground">آخر دفعة:</span>
          <span className="font-medium">{Number(lastPayment.amount).toLocaleString()} ج.م</span>
          <span className="text-muted-foreground">
            {new Date(lastPayment.payment_date).toLocaleDateString('ar-EG')}
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomerQuickHistory;
