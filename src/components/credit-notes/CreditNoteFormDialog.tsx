import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreditNoteFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-select'],
    queryFn: async () => {
      const { data } = await supabase.from('customers_safe').select('id, name').eq('is_active', true).order('name');
      return data || [];
    },
    enabled: open,
  });

  // Fetch invoices for selected customer
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-for-credit', customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId && open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: tenantData } = await supabase.rpc('get_current_tenant');
      
      const { error } = await supabase.from('credit_notes').insert({
        invoice_id: invoiceId,
        customer_id: customerId,
        amount: parseFloat(amount),
        reason: reason || null,
        credit_note_number: '',
        created_by: user?.id,
        tenant_id: tenantData,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم إنشاء إشعار الإرجاع بنجاح' });
      resetForm();
      onOpenChange(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: 'خطأ في إنشاء إشعار الإرجاع', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setCustomerId('');
    setInvoiceId('');
    setAmount('');
    setReason('');
  };

  const selectedInvoice = invoices.find(i => i.id === invoiceId);
  const maxAmount = selectedInvoice ? Number(selectedInvoice.total_amount) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إشعار إرجاع جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>العميل *</Label>
            <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setInvoiceId(''); setAmount(''); }}>
              <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الفاتورة *</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger>
              <SelectContent>
                {invoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {Number(inv.total_amount).toLocaleString()} ج.م
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المبلغ * {maxAmount > 0 && <span className="text-muted-foreground">(أقصى: {maxAmount.toLocaleString()})</span>}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={maxAmount}
              min={0}
              placeholder="0"
            />
          </div>
          <div>
            <Label>سبب الإرجاع</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أدخل سبب الإرجاع..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!customerId || !invoiceId || !amount || parseFloat(amount) <= 0 || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            إنشاء إشعار إرجاع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
