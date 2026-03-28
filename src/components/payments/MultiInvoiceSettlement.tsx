import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Receipt } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedCustomerId?: string;
}

export default function MultiInvoiceSettlement({ open, onOpenChange, onSuccess, preselectedCustomerId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-settlement'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').eq('is_active', true).order('name');
      return data || [];
    },
    enabled: open,
  });

  const { data: openInvoices = [] } = useQuery({
    queryKey: ['open-invoices-settlement', customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount, payment_status, due_date')
        .eq('customer_id', customerId)
        .in('payment_status', ['pending', 'partial'])
        .order('due_date', { ascending: true, nullsFirst: false });
      return data || [];
    },
    enabled: !!customerId && open,
  });

  const distribution = useMemo(() => {
    const amount = parseFloat(totalAmount) || 0;
    let remaining = amount;
    const result: { invoiceId: string; invoiceNumber: string; allocated: number; balance: number }[] = [];

    // Sort: selected first, then by due_date
    const sorted = [...openInvoices].sort((a, b) => {
      const aSelected = selectedInvoices.has(a.id) ? 0 : 1;
      const bSelected = selectedInvoices.has(b.id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return 0;
    });

    for (const inv of sorted) {
      if (remaining <= 0) break;
      if (selectedInvoices.size > 0 && !selectedInvoices.has(inv.id)) continue;
      
      const balance = Number(inv.total_amount) - Number(inv.paid_amount || 0);
      const allocated = Math.min(remaining, balance);
      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        allocated,
        balance,
      });
      remaining -= allocated;
    }
    return { allocations: result, remaining };
  }, [totalAmount, openInvoices, selectedInvoices]);

  const settleMutation = useMutation({
    mutationFn: async () => {
      const { data: tenantData } = await supabase.rpc('get_current_tenant');

      for (const alloc of distribution.allocations) {
        if (alloc.allocated <= 0) continue;
        const { error } = await supabase.from('payments').insert({
          customer_id: customerId,
          invoice_id: alloc.invoiceId,
          amount: alloc.allocated,
          payment_method: paymentMethod as 'cash' | 'bank_transfer' | 'credit' | 'advance_payment' | 'installment',
          payment_number: '',
          created_by: user?.id,
          tenant_id: tenantData,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'تم تسوية الفواتير بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: 'خطأ في عملية التسوية', variant: 'destructive' });
    },
  });

  const toggleInvoice = (id: string) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalBalance = openInvoices.reduce((s, inv) => s + (Number(inv.total_amount) - Number(inv.paid_amount || 0)), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            تسوية فواتير متعددة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>العميل *</Label>
            <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setSelectedInvoices(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>المبلغ الإجمالي *</Label>
              <Input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit">آجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {customerId && openInvoices.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>الفواتير المفتوحة ({openInvoices.length})</Label>
                <Badge variant="outline">إجمالي: {totalBalance.toLocaleString()} ج.م</Badge>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto border rounded-lg p-2">
                {openInvoices.map(inv => {
                  const balance = Number(inv.total_amount) - Number(inv.paid_amount || 0);
                  const allocation = distribution.allocations.find(a => a.invoiceId === inv.id);
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedInvoices.size === 0 || selectedInvoices.has(inv.id)}
                        onCheckedChange={() => toggleInvoice(inv.id)}
                      />
                      <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          متبقي: {balance.toLocaleString()} ج.م
                          {inv.due_date && ` • استحقاق: ${new Date(inv.due_date).toLocaleDateString('ar-EG')}`}
                        </p>
                      </div>
                      {allocation && (
                        <Badge variant="default" className="bg-success/10 text-success shrink-0">
                          {allocation.allocated.toLocaleString()} ج.م
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {distribution.remaining > 0 && parseFloat(totalAmount) > 0 && (
                <p className="text-xs text-warning mt-2">
                  متبقي غير موزع: {distribution.remaining.toLocaleString()} ج.م (سيُسجل كرصيد للعميل)
                </p>
              )}
            </div>
          )}

          {customerId && openInvoices.length === 0 && (
            <p className="text-center text-muted-foreground py-4">لا توجد فواتير مفتوحة لهذا العميل</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            onClick={() => settleMutation.mutate()}
            disabled={!customerId || distribution.allocations.length === 0 || settleMutation.isPending}
          >
            {settleMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            تسوية {distribution.allocations.length} فاتورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
