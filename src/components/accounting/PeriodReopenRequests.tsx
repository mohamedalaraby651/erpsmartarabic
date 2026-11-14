import { useState } from 'react';
import { useFiscalPeriods, useOpenFiscalPeriod } from '@/hooks/accounting/useFiscalPeriods';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UnlockKeyhole, Loader2 } from 'lucide-react';

export function PeriodReopenRequests() {
  const { data: periods = [], isLoading, error } = useFiscalPeriods();
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const mutation = useOpenFiscalPeriod();
  const closed = periods.filter((p) => p.is_closed);
  return <section className="space-y-3 border-b pb-5">
    <h2 className="text-lg font-semibold">فتح فترة مقفلة</h2>
    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : error ? <p className="text-destructive">تعذّر تحميل الفترات المالية</p> : closed.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد فترات مقفلة</p> : closed.map((period) => <div key={period.id} className="flex items-center justify-between gap-3 border-b py-3">
      <span>{period.name}</span>
      <Button variant="outline" onClick={() => { setPeriodId(period.id); setReason(''); }}><UnlockKeyhole className="h-4 w-4 me-2" />طلب فتح</Button>
    </div>)}
    <Dialog open={periodId !== null} onOpenChange={(open) => { if (!open && !mutation.isPending) setPeriodId(null); }}>
      <DialogContent><DialogHeader><DialogTitle>طلب فتح الفترة</DialogTitle></DialogHeader>
        <Label htmlFor="period-reopen-reason">سبب طلب الفتح</Label>
        <Textarea id="period-reopen-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={() => setPeriodId(null)}>إلغاء</Button><Button disabled={!reason.trim() || mutation.isPending} onClick={() => {
          if (!periodId) return;
          mutation.mutate({ id: periodId, reason }, { onSuccess: () => setPeriodId(null) });
        }}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}إرسال الطلب</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}