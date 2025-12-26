import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

const SupplierPaymentDialog = ({ open, onOpenChange, supplier }: SupplierPaymentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-payment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, current_balance')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !supplier,
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState(supplier?.id || '');

  const generatePaymentNumber = () => {
    return `SP-${Date.now().toString().slice(-8)}`;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const supplierId = supplier?.id || selectedSupplierId;
      if (!supplierId) throw new Error('يجب اختيار المورد');

      // Note: This will need the supplier_payments table to be created first
      // For now, we just update the supplier balance directly
      const amount = parseFloat(formData.amount);
      
      // Get current supplier balance
      const { data: currentSupplier, error: fetchError } = await supabase
        .from('suppliers')
        .select('current_balance')
        .eq('id', supplierId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newBalance = (currentSupplier?.current_balance || 0) - amount;
      
      // Update supplier balance
      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ current_balance: newBalance })
        .eq('id', supplierId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier'] });
      toast({ title: "تم تسجيل الدفعة بنجاح" });
      onOpenChange(false);
      setFormData({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast({ title: "حدث خطأ أثناء تسجيل الدفعة", variant: "destructive" });
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة للمورد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {!supplier && (
            <div>
              <Label htmlFor="supplier">المورد</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (رصيد: {(s.current_balance || 0).toLocaleString()} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {supplier && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{supplier.name}</p>
              <p className="text-sm text-muted-foreground">
                الرصيد الحالي: {(supplier.current_balance || 0).toLocaleString()} ج.م
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="amount">المبلغ</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="أدخل المبلغ"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit">آجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment_date">تاريخ الدفع</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reference_number">رقم المرجع</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="رقم الشيك أو التحويل (اختياري)"
            />
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="ملاحظات إضافية (اختياري)"
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierPaymentDialog;
