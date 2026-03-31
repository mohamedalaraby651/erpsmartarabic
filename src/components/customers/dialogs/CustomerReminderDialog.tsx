import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Plus, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { customerRelationsRepo } from "@/lib/repositories/customerRelationsRepo";

interface CustomerReminderDialogProps {
  customerId: string;
}

export default function CustomerReminderSection({ customerId }: CustomerReminderDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string>('');

  const { data: reminders = [] } = useQuery({
    queryKey: ['customer-reminders', customerId],
    queryFn: () => customerRelationsRepo.findReminders(customerId),
    staleTime: 30000,
  });

  const addMutation = useMutation({
    mutationFn: () => customerRelationsRepo.createReminder({
      customer_id: customerId,
      reminder_date: reminderDate,
      note: reminderNote.trim(),
      created_by: user?.id || '',
      recurrence: recurrence !== 'none' ? recurrence : null,
      linked_invoice_id: linkedInvoiceId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders', customerId] });
      toast.success('تم إضافة التذكير');
      setDialogOpen(false);
      setReminderDate('');
      setReminderNote('');
      setRecurrence('none');
      setLinkedInvoiceId('');
    },
    onError: () => toast.error('فشل إضافة التذكير'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      customerRelationsRepo.updateReminder(id, { is_completed: completed, updated_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders', customerId] });
    },
  });

  const pending = reminders.filter(r => !r.is_completed);
  const completed = reminders.filter(r => r.is_completed);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          التذكيرات ({pending.length})
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          تذكير جديد
        </Button>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد تذكيرات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => {
              const isOverdue = new Date(r.reminder_date) < new Date();
              return (
                <div key={r.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox checked={false} onCheckedChange={() => toggleMutation.mutate({ id: r.id, completed: true })} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{r.note}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {new Date(r.reminder_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      {isOverdue && <Badge variant="destructive" className="text-[10px] h-4">متأخر</Badge>}
                      {r.recurrence && <Badge variant="outline" className="text-[10px] h-4">{r.recurrence === 'daily' ? 'يومي' : r.recurrence === 'weekly' ? 'أسبوعي' : 'شهري'}</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
            {completed.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">مكتملة ({completed.length})</summary>
                <div className="space-y-2 mt-2">
                  {completed.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 p-3 border rounded-lg opacity-60">
                      <Checkbox checked={true} onCheckedChange={() => toggleMutation.mutate({ id: r.id, completed: false })} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through">{r.note}</p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {new Date(r.reminder_date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تذكير جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">تاريخ التذكير</label>
              <Input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">الملاحظة</label>
              <Textarea value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} placeholder="مثال: الاتصال لمتابعة عرض السعر..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">التكرار</label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="none">بدون تكرار</option>
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!reminderDate || !reminderNote.trim() || addMutation.isPending}>
              {addMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
