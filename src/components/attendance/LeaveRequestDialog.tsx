import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function LeaveRequestDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-leave-select'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, full_name, employee_number')
        .eq('employment_status', 'active').order('full_name');
      return data || [];
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: tenantData } = await supabase.rpc('get_current_tenant');
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
        tenant_id: tenantData,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم تقديم طلب الإجازة بنجاح' });
      resetForm();
      onOpenChange(false);
      onSuccess();
    },
    onError: () => toast({ title: 'خطأ في تقديم الطلب', variant: 'destructive' }),
  });

  const resetForm = () => { setEmployeeId(''); setLeaveType('annual'); setStartDate(''); setEndDate(''); setReason(''); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>طلب إجازة جديد</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>الموظف *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_number})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>نوع الإجازة</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">سنوية</SelectItem>
                <SelectItem value="sick">مرضية</SelectItem>
                <SelectItem value="unpaid">بدون راتب</SelectItem>
                <SelectItem value="emergency">طارئة</SelectItem>
                <SelectItem value="maternity">أمومة</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>من تاريخ *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>إلى تاريخ *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>السبب</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب الإجازة..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => mutation.mutate()}
            disabled={!employeeId || !startDate || !endDate || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            تقديم الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
