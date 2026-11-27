import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorHandler";

interface PromiseProps {
  open: boolean; onOpenChange: (v: boolean) => void; defaultAmount: number;
  onSubmit: (v: { promised_date: string; amount: number; notes: string | null }) => Promise<unknown>;
}
export function PromiseDialog({ open, onOpenChange, defaultAmount, onSubmit }: PromiseProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(''); const [amount, setAmount] = useState(''); const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const amt = Math.round(Number(amount || defaultAmount) * 100) / 100;
    if (!date || !(amt > 0)) { toast({ title: 'أدخل التاريخ ومبلغًا أكبر من صفر', variant: 'destructive' }); return; }
    setBusy(true);
    try { await onSubmit({ promised_date: date, amount: amt, notes: notes.trim() || null }); toast({ title: 'تم تسجيل وعد السداد' }); onOpenChange(false); setDate(''); setAmount(''); setNotes(''); }
    catch (e) { toast({ title: 'تعذر الحفظ', description: getSafeErrorMessage(e), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تسجيل وعد سداد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="pp-date">تاريخ الوعد</Label><Input id="pp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label htmlFor="pp-amount">المبلغ</Label><Input id="pp-amount" type="number" min="0" step="0.01" placeholder={String(defaultAmount)} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label htmlFor="pp-notes">ملاحظات</Label><Textarea id="pp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>حفظ الوعد</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ContactProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSubmit: (v: { name: string; role: string | null; phone: string | null; email: string | null; is_primary: boolean }) => Promise<unknown>;
}
export function ContactDialog({ open, onOpenChange, onSubmit }: ContactProps) {
  const { toast } = useToast();
  const [f, setF] = useState({ name: '', role: '', phone: '', email: '', is_primary: false });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim()) { toast({ title: 'الاسم مطلوب', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await onSubmit({ name: f.name.trim(), role: f.role.trim() || null, phone: f.phone.trim() || null, email: f.email.trim() || null, is_primary: f.is_primary });
      toast({ title: 'تمت إضافة جهة الاتصال' }); onOpenChange(false); setF({ name: '', role: '', phone: '', email: '', is_primary: false });
    } catch (e) { toast({ title: 'تعذر الحفظ', description: getSafeErrorMessage(e), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة جهة اتصال</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(['name', 'role', 'phone', 'email'] as const).map((k) => (
            <div key={k}><Label htmlFor={`cc-${k}`}>{{ name: 'الاسم', role: 'الصفة', phone: 'الهاتف', email: 'البريد' }[k]}</Label>
              <Input id={`cc-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
          ))}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.is_primary} onCheckedChange={(v) => setF({ ...f, is_primary: !!v })} />جهة الاتصال الرئيسية</label>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>حفظ</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
