import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useInvoicesForCreditNote,
  useInvoiceItemsForCredit,
  useInvoiceItemReturnsSummary,
  useCreateCreditNoteDraft,
  useRefreshCreditNoteReferences,
} from '@/hooks/credit-notes';
import { useQuery } from '@tanstack/react-query';
import { creditNoteRepository } from '@/application/queries/credit-notes';
import { mapRepoError } from '@/lib/repositories/_base';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { useFormDialog } from '@/hooks/useFormDialog';
import { useDocumentFormExperience } from '@/hooks/forms/useDocumentFormExperience';
import { DraftRestoreBanner } from '@/components/shared/forms/DraftRestoreBanner';
import { UnsavedChangesDialog } from '@/components/shared/forms/UnsavedChangesDialog';
import { readReturnSelection, reconcileReturnSelection, type ReturnSelection } from '@/lib/credit-notes/draftSelection';
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogFooter as DialogFooter,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  formatReturnOverdraw,
  formatInvalidQty,
  parseDbOverdraw,
} from '@/lib/credit-notes/overdrawMessages';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Prefill the customer when opening the dialog (e.g. from a customer profile) */
  prefillCustomerId?: string;
}

interface ReturnLine {
  invoice_item_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  unit_price: number;
  original_qty: number;
  already_returned: number;
  draft_reserved: number;
  returnable: number;
  selected: boolean;
  return_qty: number;
  requested_qty: number;
  error?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function CreditNoteFormDialog({ open, onOpenChange, onSuccess, prefillCustomerId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [restoring, setRestoring] = useState(false);
  const restorationGeneration = useRef(0);
  const initializedInvoice = useRef('');
  const selection = useRef<ReturnSelection[]>([]);
  const refreshReferences = useRefreshCreditNoteReferences();
  const createDraftMutation = useCreateCreditNoteDraft();
  const { form, submit, isSubmitting, reset: resetHeader } = useFormDialog({
    schema: z.object({ customerId: z.string().min(1, 'اختر العميل'), invoiceId: z.string().min(1, 'اختر الفاتورة'), reason: z.string() }),
    entity: prefillCustomerId || null,
    toValues: () => ({ customerId: prefillCustomerId || '', invoiceId: '', reason: '' }),
    toPayload: values => values,
    mutationFn: async () => { await submitDraft(); },
    onSuccess: () => {
      toast({ title: 'تم إنشاء إشعار الإرجاع بنجاح' });
      experience.clearDraft(); resetForm(); onOpenChange(false); onSuccess();
    },
    onError: (err: unknown) => {
      const mapped = mapRepoError(err, 'حدث خطأ غير متوقع');
      const raw = mapped.message;
      const description = parseDbOverdraw(raw, { resolveProduct: itemId => {
        const line = lines.find(item => item.invoice_item_id === itemId);
        return line ? { name: line.product_name, sku: line.product_sku } : undefined;
      } }) ?? raw;
      toast({ title: 'خطأ في إنشاء إشعار الإرجاع', description, variant: 'destructive' });
    },
  });
  const customerId = form.watch('customerId');
  const invoiceId = form.watch('invoiceId');
  const reason = form.watch('reason');
  const setCustomerId = (value: string) => form.setValue('customerId', value, { shouldDirty: true, shouldValidate: true });
  const setInvoiceId = (value: string) => {
    restorationGeneration.current += 1;
    selection.current = [];
    initializedInvoice.current = '';
    setLines([]);
    form.setValue('invoiceId', value, { shouldDirty: true, shouldValidate: true });
  };
  const setReason = (value: string) => form.setValue('reason', value, { shouldDirty: true });

  const { data: customers = [] } = useQuery({
    queryKey: ['credit-customers-select'],
    queryFn: () => creditNoteRepository.listCustomersForSelect(),
    enabled: open,
  });

  const { data: invoices = [], refetch: refetchInvoices, isFetching: fetchingInvoices, isError: invoicesError } = useInvoicesForCreditNote(customerId, open);

  const { data: invoiceItems = [], isFetching: loadingItems, isError: itemsError, refetch: refetchItems } = useInvoiceItemsForCredit(invoiceId, open);

  const { data: returnsMap, isFetching: loadingReturns, isError: returnsError, refetch: refetchReturns } = useInvoiceItemReturnsSummary(invoiceId, open);

  const readsBusy = fetchingInvoices || loadingItems || loadingReturns || restoring;
  const readsFailed = invoicesError || itemsError || returnsError;
  const busy = isSubmitting || createDraftMutation.isPending || restoring;
  const intent = useMemo(() => lines.map(line => ({ invoice_item_id: line.invoice_item_id, selected: line.selected, requested_qty: Number.isFinite(line.requested_qty) ? line.requested_qty : 0 })), [lines]);
  const applyFresh = (items: Parameters<typeof reconcileReturnSelection>[0], summary: Parameters<typeof reconcileReturnSelection>[1], choices: ReturnSelection[]) =>
    reconcileReturnSelection(items, summary, choices).map(line => {
      const error = line.selected ? validateQty(line, line.requested_qty) : undefined;
      return { ...line, error, return_qty: error ? 0 : line.requested_qty };
    });

  useEffect(() => {
    if (!open || !invoiceId || readsBusy || readsFailed || !returnsMap) return;
    if (initializedInvoice.current !== invoiceId) selection.current = [];
    setLines(applyFresh(invoiceItems, returnsMap, selection.current));
    initializedInvoice.current = invoiceId;
  }, [open, invoiceId, invoiceItems, returnsMap, readsBusy, readsFailed]);

  const experience = useDocumentFormExperience({
    form, lines: intent, documentKey: `credit_note_new:${prefillCustomerId || 'all'}`,
    open, busy, submit,
    linesDirty: lines.some(line => line.selected),
    close: () => { resetForm(); onOpenChange(false); },
    restoreLines: async saved => {
      const generation = ++restorationGeneration.current;
      const wantedInvoice = form.getValues('invoiceId');
      const wantedCustomer = form.getValues('customerId');
      const choices = readReturnSelection(saved);
      initializedInvoice.current = wantedInvoice;
      selection.current = choices;
      setLines([]);
      setRestoring(true);
      // Let the query hooks subscribe before invalidating even a same-invoice cache.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (generation !== restorationGeneration.current) { setRestoring(false); return; }
      await refreshReferences(wantedCustomer, wantedInvoice);
      setRestoring(false);
    },
  });

  const totalAmount = useMemo(
    () => round2(lines.filter(l => l.selected && !l.error).reduce((s, l) => s + l.unit_price * l.return_qty, 0)),
    [lines],
  );

  const selectedLines = useMemo(() => lines.filter(l => l.selected), [lines]);
  const linesWithErrors = useMemo(() => selectedLines.filter(l => l.error), [selectedLines]);
  const hasSelection = selectedLines.some(l => l.return_qty > 0);
  const hasErrors = linesWithErrors.length > 0;

  function validateQty(line: Pick<ReturnLine, 'returnable' | 'product_name' | 'product_sku' | 'original_qty' | 'already_returned'>, requested: number): string | undefined {
    if (Number.isNaN(requested)) return formatInvalidQty('nan');
    if (requested < 0) return formatInvalidQty('negative');
    if (line.returnable === 0) return formatInvalidQty('none-available');
    if (requested === 0) return formatInvalidQty('zero');
    if (requested > line.returnable) {
      return formatReturnOverdraw({
        productName: line.product_name,
        productSku: line.product_sku,
        requested,
        available: line.returnable,
        originalQty: line.original_qty,
        alreadyReturned: line.already_returned,
        source: 'client',
      });
    }
    return undefined;
  };

  const updateLine = (id: string, patch: Partial<ReturnLine>) => setLines(prev => {
    const next = prev.map(line => {
      if (line.invoice_item_id !== id) return line;
      const merged = { ...line, ...patch };
      merged.error = merged.selected ? validateQty(merged, Number(merged.requested_qty)) : undefined;
      merged.return_qty = merged.error ? 0 : Number(merged.requested_qty);
      return merged;
    });
    selection.current = next.map(line => ({ invoice_item_id: line.invoice_item_id, selected: line.selected, requested_qty: line.requested_qty }));
    return next;
  });

  const submitDraft = async () => {
    if (readsBusy || readsFailed) throw new Error('انتظر اكتمال تحميل بيانات الفاتورة');
    const [currentInvoices, currentItems, currentReturns] = await Promise.all([refetchInvoices(), refetchItems(), refetchReturns()]);
    if (currentInvoices.error || currentItems.error || currentReturns.error || !currentItems.data || !currentReturns.data) {
      throw new Error('تعذر التحقق من كميات الإرجاع الحالية؛ حاول مرة أخرى');
    }
    if (!currentInvoices.data?.some(invoice => invoice.id === invoiceId)) throw new Error('الفاتورة لم تعد متاحة لهذا العميل');
    const fresh = applyFresh(currentItems.data, currentReturns.data, selection.current);
    setLines(fresh);
    const invalid = fresh.find(line => line.selected && line.error);
    if (invalid) {
      requestAnimationFrame(() => document.getElementById(`return-qty-${invalid.invoice_item_id}`)?.focus());
      throw new Error(`${invalid.product_name}: ${invalid.error}`);
    }
    const selected = fresh.filter(line => line.selected && line.return_qty > 0 && !line.error);
    if (!selected.length) throw new Error('اختر بنداً واحداً على الأقل بكمية صالحة');
    await createDraftMutation.mutateAsync({
      invoiceId, customerId, reason: reason || null,
      totalAmount: round2(selected.reduce((sum, line) => sum + line.unit_price * line.return_qty, 0)),
      userId: user?.id ?? null,
      items: selected.map(line => ({ invoice_item_id: line.invoice_item_id, product_id: line.product_id, quantity: line.return_qty, unit_price: line.unit_price })),
    });
  };

  const resetForm = () => {
    restorationGeneration.current += 1;
    initializedInvoice.current = '';
    selection.current = [];
    resetHeader(); setLines([]);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={experience.onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إشعار إرجاع جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {experience.hasDraft && <DraftRestoreBanner onRestore={experience.restore} onDiscard={experience.clearDraft} />}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>العميل *</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setInvoiceId(''); }}>
                <SelectTrigger aria-label="العميل" aria-invalid={!!form.formState.errors.customerId} disabled={busy}><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customerId && <p role="alert" className="text-sm text-destructive">{form.formState.errors.customerId.message}</p>}
            </div>
            <div>
              <Label>الفاتورة *</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId} disabled={!customerId}>
                <SelectTrigger aria-label="الفاتورة" aria-invalid={!!form.formState.errors.invoiceId} disabled={busy}><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger>
                <SelectContent>
                  {invoices.map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {Number(inv.total_amount).toLocaleString()} ج.م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.invoiceId && <p role="alert" className="text-sm text-destructive">{form.formState.errors.invoiceId.message}</p>}
            </div>
          </div>

          {/* Items table */}
          {invoiceId && (
            <div className="border rounded-md">
              <div className="px-3 py-2 border-b bg-muted/40 text-sm font-medium">
                بنود الفاتورة ({lines.length})
              </div>

              {readsBusy ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <Loader2 className="h-5 w-5 animate-spin inline ml-2" />
                  جارِ التحميل…
                </div>
              ) : readsFailed ? (
                <div role="alert" className="p-3 text-destructive text-sm">تعذر تحميل بيانات الفاتورة؛ أعد فتح المستند للمحاولة مجددًا.</div>
              ) : lines.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">لا توجد بنود</div>
              ) : (
                <div className="divide-y">
                  {lines.map((l) => {
                    const disabled = l.returnable <= 0;
                    return (
                      <div key={l.invoice_item_id} className="p-3 flex items-start gap-3">
                        <Checkbox
                          checked={l.selected}
                          disabled={disabled || readsBusy || busy}
                          onCheckedChange={(v) => updateLine(l.invoice_item_id, { selected: !!v })}
                          aria-label={`اختيار ${l.product_name}`} className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {l.product_name}
                              {l.product_sku && (
                                <span className="text-xs text-muted-foreground font-normal mr-1">({l.product_sku})</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Number(l.unit_price).toLocaleString()} × {l.original_qty}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            مُرتجع سابقاً (مؤكد): {l.already_returned} • متاح للإرجاع:{' '}
                            <span className={l.returnable === 0 ? 'text-destructive' : 'text-success font-medium'}>
                              {l.returnable}
                            </span>
                          </div>
                          {l.draft_reserved > 0 && (
                            <div className="text-xs text-warning mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              يوجد {l.draft_reserved} كمية محجوزة في مسودات إشعارات أخرى — قد تتعارض عند التأكيد.
                            </div>
                          )}
                          {l.selected && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-xs">كمية الإرجاع:</Label>
                                <Input
                                  type="number"
                                  id={`return-qty-${l.invoice_item_id}`}
                                  aria-label={`كمية إرجاع ${l.product_name}`}
                                  disabled={busy || readsBusy}
                                  className={`min-h-11 w-24 ${l.error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                  value={l.requested_qty}
                                  min={0}
                                  step="0.01"
                                  aria-invalid={!!l.error}
                                  aria-describedby={l.error ? `qty-error-${l.invoice_item_id}` : undefined}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const v = raw === '' ? NaN : Number(raw);
                                    updateLine(l.invoice_item_id, { requested_qty: v });
                                  }}
                                  onBlur={(e) => {
                                    // Normalize on blur: empty → 0, then re-run validation with the same inline message
                                    const raw = e.target.value.trim();
                                    const v = raw === '' || Number.isNaN(Number(raw)) ? 0 : Number(raw);
                                    updateLine(l.invoice_item_id, { requested_qty: v });
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  من أصل {l.returnable} متاح
                                </span>
                                {!l.error && (
                                  <span className="text-xs text-muted-foreground">
                                    = {round2(l.unit_price * l.return_qty).toLocaleString()} ج.م
                                  </span>
                                )}
                              </div>
                              {l.error && (
                                <div
                                  id={`qty-error-${l.invoice_item_id}`}
                                  role="alert"
                                  className="flex items-start gap-1.5 text-xs text-destructive"
                                >
                                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                  <span>{l.error}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasSelection && (
                <div className="px-3 py-2 border-t bg-muted/40 flex items-center justify-between">
                  <span className="text-sm font-medium">إجمالي المرتجع</span>
                  <span className="text-base font-bold">{totalAmount.toLocaleString()} ج.م</span>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>سبب الإرجاع</Label>
            <Textarea
              value={reason}
              aria-label="سبب الإرجاع"
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أدخل سبب الإرجاع…"
              rows={2}
            />
          </div>

          {invoiceId && lines.every(l => l.returnable === 0) && lines.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 text-warning text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>تم إرجاع جميع كميات هذه الفاتورة بالفعل.</span>
            </div>
          )}

          {hasErrors && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <div className="font-medium">
                  لا يمكن الحفظ — يوجد {linesWithErrors.length} بند(بنود) بكمية غير صالحة:
                </div>
                <ul className="list-disc pr-4 space-y-0.5">
                  {linesWithErrors.map(l => (
                    <li key={l.invoice_item_id} className="text-xs">
                      <span className="font-medium">{l.product_name}</span>: {l.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={experience.requestClose}>إلغاء</Button>
          <Button
            className="min-h-11"
            onClick={() => void experience.save()}
            disabled={busy || readsBusy || readsFailed}
          >
            {busy && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            {busy ? 'جارٍ الحفظ…' : 'إنشاء إشعار إرجاع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog open={experience.confirmOpen} onOpenChange={experience.setConfirmOpen} onConfirm={experience.confirmLeave} />
    </>
  );
}
