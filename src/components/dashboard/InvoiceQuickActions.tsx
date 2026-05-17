import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, Printer, BellPlus, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useQuickActionSize, getQuickActionClasses } from '@/hooks/useQuickActionSize';
import { cn } from '@/lib/utils';
import { tooltips } from '@/lib/uiCopy';

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: string;
  dueDate: string | null;
  createdAt: string;
}

const fmt = (n: number) => `${n.toLocaleString('ar-EG')} ج.م`;

function statusMeta(status: string) {
  if (status === 'paid') return { label: 'مدفوع', variant: 'default' as const };
  if (status === 'partial') return { label: 'جزئي', variant: 'secondary' as const };
  return { label: 'معلق', variant: 'destructive' as const };
}

export const InvoiceQuickActions = memo(function InvoiceQuickActions(props: Props) {
  const {
    invoiceId, invoiceNumber, customerId, customerName,
    totalAmount, amountPaid, paymentStatus, dueDate, createdAt,
  } = props;

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [reminderDate, setReminderDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [reminderNote, setReminderNote] = useState(
    `متابعة فاتورة ${invoiceNumber} – ${customerName}`,
  );

  const remaining = Math.max(0, totalAmount - (amountPaid || 0));
  const meta = statusMeta(paymentStatus);

  const stop = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const handlePrint = useCallback(async (e: React.MouseEvent) => {
    stop(e);
    setPrinting(true);
    try {
      const [{ data: invoice }, { data: items }] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customers(name, phone, email, address)')
          .eq('id', invoiceId)
          .maybeSingle(),
        supabase
          .from('invoice_items')
          .select('*, products(name, unit)')
          .eq('invoice_id', invoiceId),
      ]);
      if (!invoice) throw new Error('فاتورة غير موجودة');
      const { generateDocumentPDF } = await import('@/lib/pdfGeneratorLazy');
      await generateDocumentPDF('invoice', { ...invoice, items: items || [] });
      toast({ title: 'تم إنشاء ملف PDF' });
    } catch (err: any) {
      toast({ title: 'تعذرت الطباعة', description: err?.message, variant: 'destructive' });
    } finally {
      setPrinting(false);
    }
  }, [invoiceId, toast]);

  const handleSaveReminder = useCallback(async () => {
    if (!user || !tenantId) {
      toast({ title: 'لا توجد جلسة نشطة', variant: 'destructive' });
      return;
    }
    if (!reminderNote.trim()) {
      toast({ title: 'يرجى إدخال نص التذكير', variant: 'destructive' });
      return;
    }
    setSavingReminder(true);
    try {
      const { error } = await supabase.from('customer_reminders').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        linked_invoice_id: invoiceId,
        created_by: user.id,
        reminder_date: reminderDate,
        note: reminderNote.trim(),
      });
      if (error) throw error;
      toast({ title: 'تم إنشاء التذكير' });
      setReminderOpen(false);
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
    } catch (err: any) {
      toast({ title: 'فشل حفظ التذكير', description: err?.message, variant: 'destructive' });
    } finally {
      setSavingReminder(false);
    }
  }, [user, tenantId, customerId, invoiceId, reminderDate, reminderNote, toast, queryClient]);

  const { size: qaSize } = useQuickActionSize();
  const qa = getQuickActionClasses(qaSize);

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className={cn('flex items-center shrink-0', qa.gap)} onClick={stop}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { stop(e); setDetailsOpen(true); }}
                aria-label={tooltips.viewInvoiceDetails}
                className={cn(
                  'inline-flex items-center justify-center rounded-full bg-primary/10 text-primary active:scale-90 transition-transform hover:bg-primary/15',
                  qa.button,
                )}
              >
                <Eye className={qa.icon} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{tooltips.viewInvoiceDetails}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing}
                aria-label={tooltips.printInvoicePdf}
                className={cn(
                  'inline-flex items-center justify-center rounded-full bg-muted text-foreground active:scale-90 transition-transform hover:bg-accent disabled:opacity-50',
                  qa.button,
                )}
              >
                {printing ? <Loader2 className={cn(qa.icon, 'animate-spin')} /> : <Printer className={qa.icon} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{tooltips.printInvoicePdf}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { stop(e); setReminderOpen(true); }}
                aria-label={remaining > 0 ? tooltips.remindOverdue : tooltips.remindGeneric}
                className={cn(
                  'inline-flex items-center justify-center rounded-full active:scale-90 transition-transform',
                  qa.button,
                  remaining > 0
                    ? 'bg-warning/15 text-warning hover:bg-warning/25'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                <BellPlus className={qa.icon} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {remaining > 0 ? tooltips.remindOverdue : tooltips.remindGeneric}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Details Sheet — no full page navigation */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="text-right">
            <SheetTitle className="text-base flex items-center gap-2">
              فاتورة {invoiceNumber}
              <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
            </SheetTitle>
            <SheetDescription className="text-xs">{customerName}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">الإجمالي</p>
              <p className="text-base font-bold tabular-nums mt-1">{fmt(totalAmount)}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">المدفوع</p>
              <p className="text-base font-bold tabular-nums mt-1 text-success">{fmt(amountPaid || 0)}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">المتبقي</p>
              <p className={cn('text-base font-bold tabular-nums mt-1', remaining > 0 ? 'text-destructive' : 'text-success')}>
                {fmt(remaining)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">الاستحقاق</p>
              <p className="text-sm font-semibold mt-1">
                {dueDate ? new Date(dueDate).toLocaleDateString('ar-EG') : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                أُنشئت {new Date(createdAt).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>

          <SheetFooter className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing} className="gap-1.5">
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setDetailsOpen(false); setReminderOpen(true); }} className="gap-1.5">
              <BellPlus className="h-4 w-4" />
              تذكير
            </Button>
            <Button size="sm" onClick={() => navigate(`/invoices/${invoiceId}`)} className="gap-1.5">
              <ExternalLink className="h-4 w-4" />
              فتح
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-sm" onClick={stop}>
          <DialogHeader>
            <DialogTitle className="text-base">تذكير لفاتورة {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reminder-date" className="text-xs">تاريخ التذكير</Label>
              <Input
                id="reminder-date"
                type="date"
                value={reminderDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setReminderDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminder-note" className="text-xs">الملاحظة</Label>
              <Textarea
                id="reminder-note"
                rows={3}
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="مثال: الاتصال بالعميل لمتابعة السداد"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setReminderOpen(false)} disabled={savingReminder}>
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSaveReminder} disabled={savingReminder}>
              {savingReminder && <Loader2 className="h-4 w-4 animate-spin ml-1.5" />}
              حفظ التذكير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
