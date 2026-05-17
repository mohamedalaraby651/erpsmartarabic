import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Plus, Clock, Check, FileText, ArrowLeft, AlarmClock, CalendarClock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { customerRelationsRepo } from "@/lib/repositories/customerRelationsRepo";
import SharedEmptyState from "@/components/shared/SharedEmptyState";
import { cn } from "@/lib/utils";
import { tooltips } from "@/lib/uiCopy";

interface CustomerReminderDialogProps {
  customerId: string;
}

const recurrenceLabel = (r: string | null | undefined) =>
  r === 'daily' ? 'يومي' : r === 'weekly' ? 'أسبوعي' : r === 'monthly' ? 'شهري' : null;

export default function CustomerReminderSection({ customerId }: CustomerReminderDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string>('');

  const { data: reminders = [] } = useQuery({
    queryKey: ['customer-reminders', customerId],
    queryFn: () => customerRelationsRepo.findReminders(customerId),
    staleTime: 30000,
  });

  const resetForm = () => {
    setEditingId(null);
    setReminderDate('');
    setReminderNote('');
    setRecurrence('none');
    setLinkedInvoiceId('');
  };

  useEffect(() => {
    if (!dialogOpen) resetForm();
  }, [dialogOpen]);

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
      queryClient.invalidateQueries({ queryKey: ['customer-upcoming-reminders', customerId] });
      toast.success('تم إضافة التذكير');
      setDialogOpen(false);
    },
    onError: () => toast.error('فشل إضافة التذكير'),
  });

  const editMutation = useMutation({
    mutationFn: () => customerRelationsRepo.updateReminder(editingId!, {
      reminder_date: reminderDate,
      note: reminderNote.trim(),
      recurrence: recurrence !== 'none' ? recurrence : null,
      updated_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-upcoming-reminders', customerId] });
      toast.success('تم تحديث التذكير');
      setDialogOpen(false);
    },
    onError: () => toast.error('فشل تحديث التذكير'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      customerRelationsRepo.updateReminder(id, { is_completed: completed, updated_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reminders', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-upcoming-reminders', customerId] });
    },
  });

  const openEdit = (r: typeof reminders[number]) => {
    setEditingId(r.id);
    // reminder_date is a timestamp; use first 10 chars for date input
    setReminderDate((r.reminder_date || '').slice(0, 10));
    setReminderNote(r.note || '');
    setRecurrence(r.recurrence || 'none');
    setLinkedInvoiceId(r.linked_invoice_id || '');
    setDialogOpen(true);
  };

  const { overdue, today, upcoming, completed } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const overdue: typeof reminders = [];
    const today: typeof reminders = [];
    const upcoming: typeof reminders = [];
    const completed: typeof reminders = [];
    for (const r of reminders) {
      if (r.is_completed) { completed.push(r); continue; }
      const d = new Date(r.reminder_date);
      if (d < startOfToday) overdue.push(r);
      else if (d < endOfToday) today.push(r);
      else upcoming.push(r);
    }
    overdue.sort((a, b) => +new Date(a.reminder_date) - +new Date(b.reminder_date));
    today.sort((a, b) => +new Date(a.reminder_date) - +new Date(b.reminder_date));
    upcoming.sort((a, b) => +new Date(a.reminder_date) - +new Date(b.reminder_date));
    return { overdue, today, upcoming, completed };
  }, [reminders]);

  const pendingCount = overdue.length + today.length + upcoming.length;

  const renderReminder = (r: typeof reminders[number], group: 'overdue' | 'today' | 'upcoming') => {
    const date = new Date(r.reminder_date);
    const tone =
      group === 'overdue' ? 'border-destructive/40 bg-destructive/5'
      : group === 'today' ? 'border-warning/40 bg-warning/5'
      : 'border-border bg-background';
    const dateClass =
      group === 'overdue' ? 'text-destructive font-medium'
      : group === 'today' ? 'text-warning font-medium'
      : 'text-muted-foreground';
    const rec = recurrenceLabel(r.recurrence);

    return (
      <div key={r.id} className={cn("flex items-start gap-3 p-3 border rounded-lg", tone)}>
        <Checkbox
          checked={false}
          onCheckedChange={() => toggleMutation.mutate({ id: r.id, completed: true })}
          className="mt-0.5"
          aria-label="وضع علامة كمكتمل"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm break-words">{r.note}</p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className={cn("text-xs", dateClass)}>
              {date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            {group === 'overdue' && <Badge variant="destructive" className="text-[10px] h-4">متأخر</Badge>}
            {group === 'today' && <Badge className="text-[10px] h-4 bg-warning text-warning-foreground hover:bg-warning">اليوم</Badge>}
            {rec && <Badge variant="outline" className="text-[10px] h-4">{rec}</Badge>}
            {r.linked_invoice_id && (
              <Badge variant="secondary" className="text-[10px] h-4 gap-1">
                <FileText className="h-2.5 w-2.5" />مرتبط بفاتورة
              </Badge>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {r.linked_invoice_id ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => navigate(`/invoices/${r.linked_invoice_id}`)}
                aria-label="فتح الفاتورة المرتبطة"
              >
                <FileText className="h-3.5 w-3.5" />
                فتح الفاتورة
                <ArrowLeft className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => toggleMutation.mutate({ id: r.id, completed: true })}
                aria-label="متابعة وإغلاق التذكير"
              >
                <Check className="h-3.5 w-3.5" />
                تمت المتابعة
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1"
              onClick={() => openEdit(r)}
              aria-label="تعديل التذكير"
            >
              <Pencil className="h-3.5 w-3.5" />
              تعديل
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const isEditing = editingId !== null;
  const submitMutation = isEditing ? editMutation : addMutation;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          التذكيرات ({pendingCount})
        </CardTitle>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="min-h-9">
          <Plus className="h-4 w-4 ml-2" />
          تذكير جديد
        </Button>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <SharedEmptyState
            icon={Bell}
            title="لا توجد تذكيرات بعد"
            description="أضف تذكيراً للاتصال أو متابعة فاتورة أو مهمة قادمة لهذا العميل."
            action={{
              label: 'إنشاء أول تذكير',
              onClick: () => { resetForm(); setDialogOpen(true); },
              icon: <Plus className="h-4 w-4" />,
            }}
            className="py-10"
          />
        ) : pendingCount === 0 ? (
          <SharedEmptyState
            icon={Check}
            title="كل التذكيرات مكتملة"
            description="لا توجد تذكيرات معلقة حالياً. أحسنت!"
            action={{
              label: 'إضافة تذكير جديد',
              onClick: () => { resetForm(); setDialogOpen(true); },
              icon: <Plus className="h-4 w-4" />,
            }}
            className="py-10"
          />
        ) : (
          <div className="space-y-4">
            {overdue.length > 0 && (
              <section aria-labelledby="reminders-overdue">
                <h4 id="reminders-overdue" className="flex items-center gap-1.5 text-xs font-semibold text-destructive mb-2">
                  <AlarmClock className="h-3.5 w-3.5" />
                  متأخرة ({overdue.length})
                </h4>
                <div className="space-y-2">{overdue.map(r => renderReminder(r, 'overdue'))}</div>
              </section>
            )}
            {today.length > 0 && (
              <section aria-labelledby="reminders-today">
                <h4 id="reminders-today" className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-2">
                  <Clock className="h-3.5 w-3.5" />
                  اليوم ({today.length})
                </h4>
                <div className="space-y-2">{today.map(r => renderReminder(r, 'today'))}</div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section aria-labelledby="reminders-upcoming">
                <h4 id="reminders-upcoming" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                  <CalendarClock className="h-3.5 w-3.5" />
                  قادمة ({upcoming.length})
                </h4>
                <div className="space-y-2">{upcoming.map(r => renderReminder(r, 'upcoming'))}</div>
              </section>
            )}
          </div>
        )}

        {completed.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              مكتملة ({completed.length})
            </summary>
            <div className="space-y-2 mt-2">
              {completed.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 border rounded-lg opacity-60">
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggleMutation.mutate({ id: r.id, completed: false })}
                    className="mt-0.5"
                    aria-label="إعادة فتح التذكير"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through break-words">{r.note}</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" />
                      {new Date(r.reminder_date).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>

      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{isEditing ? 'تعديل التذكير' : 'إضافة تذكير جديد'}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
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
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!reminderDate || !reminderNote.trim() || submitMutation.isPending}
            >
              {submitMutation.isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'حفظ'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </Card>
  );
}
