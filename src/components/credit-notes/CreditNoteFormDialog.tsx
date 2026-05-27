import { useEffect, useMemo, useState } from 'react';
import {
  useInvoicesForCreditNote,
  useInvoiceItemsForCredit,
  useInvoiceItemReturnsSummary,
  useCreateCreditNoteDraft,
} from '@/hooks/credit-notes';
import { useQuery } from '@tanstack/react-query';
import { creditNoteRepository } from '@/lib/repositories/creditNoteRepository';
import { mapRepoError } from '@/lib/repositories/_base';
import { useAuth } from '@/hooks/useAuth';
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

interface InvoiceItemRow {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: { name: string; sku?: string | null } | null;
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
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<ReturnLine[]>([]);

  // Apply prefill on open
  useEffect(() => {
    if (open && prefillCustomerId) {
      setCustomerId(prefillCustomerId);
      setInvoiceId('');
    }
  }, [open, prefillCustomerId]);

  const { data: customers = [] } = useQuery({
    queryKey: ['credit-customers-select'],
    queryFn: () => creditNoteRepository.listCustomersForSelect(),
    enabled: open,
  });

  const { data: invoices = [] } = useInvoicesForCreditNote(customerId, open);

  const { data: invoiceItems = [], isLoading: loadingItems } = useInvoiceItemsForCredit(invoiceId, open);

  const { data: returnsMap = {} } = useInvoiceItemReturnsSummary(invoiceId, open);

  // Build return-lines whenever invoice items / returns summary change
  useEffect(() => {
    if (!invoiceItems.length) { setLines([]); return; }
    setLines(invoiceItems.map((it) => {
      const summary = returnsMap[it.id];
      const confirmed = summary?.confirmed ?? 0;
      const draftReserved = summary?.draft ?? 0;
      const returnable = summary?.remaining ?? Math.max(0, Number(it.quantity) - confirmed);
      return {
        invoice_item_id: it.id,
        product_id: it.product_id,
        product_name: it.products?.name ?? '—',
        product_sku: it.products?.sku ?? undefined,
        unit_price: Number(it.unit_price),
        original_qty: Number(it.quantity),
        already_returned: confirmed,
        draft_reserved: draftReserved,
        returnable,
        selected: false,
        return_qty: returnable,
        requested_qty: returnable,
        error: undefined as string | undefined,
      };
    }));
  }, [invoiceItems, returnsMap]);

  const totalAmount = useMemo(
    () => round2(lines.filter(l => l.selected && !l.error).reduce((s, l) => s + l.unit_price * l.return_qty, 0)),
    [lines],
  );

  const selectedLines = useMemo(() => lines.filter(l => l.selected), [lines]);
  const linesWithErrors = useMemo(() => selectedLines.filter(l => l.error), [selectedLines]);
  const hasSelection = selectedLines.some(l => l.return_qty > 0);
  const hasErrors = linesWithErrors.length > 0;

  const validateQty = (line: ReturnLine, requested: number): string | undefined => {
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

  const updateLine = (id: string, patch: Partial<ReturnLine>) =>
    setLines(prev => prev.map(l => {
      if (l.invoice_item_id !== id) return l;
      const merged = { ...l, ...patch };
      if ('requested_qty' in patch || 'selected' in patch) {
        const requested = Number(merged.requested_qty);
        const err = merged.selected ? validateQty(merged, requested) : undefined;
        merged.error = err;
        merged.return_qty = err ? 0 : requested;
      }
      return merged;
    }));

  const createDraftMutation = useCreateCreditNoteDraft();

  const submitDraft = () => {
    const selected = lines.filter(l => l.selected && l.return_qty > 0 && !l.error);
    if (linesWithErrors.length > 0) {
      const first = linesWithErrors[0];
      toast({
        title: 'خطأ في إنشاء إشعار الإرجاع',
        description: `${first.product_name}: ${first.error}`,
        variant: 'destructive',
      });
      return;
    }
    if (selected.length === 0) {
      toast({
        title: 'خطأ في إنشاء إشعار الإرجاع',
        description: 'اختر بنداً واحداً على الأقل بكمية صالحة',
        variant: 'destructive',
      });
      return;
    }

    createDraftMutation.mutate(
      {
        invoiceId,
        customerId,
        reason: reason || null,
        totalAmount,
        userId: user?.id ?? null,
        items: selected.map(l => ({
          invoice_item_id: l.invoice_item_id,
          product_id: l.product_id,
          quantity: l.return_qty,
          unit_price: l.unit_price,
        })),
      },
      {
        onSuccess: () => {
          toast({ title: 'تم إنشاء إشعار الإرجاع بنجاح' });
          resetForm();
          onOpenChange(false);
          onSuccess();
        },
        onError: (err: unknown) => {
          const mapped = mapRepoError(err, 'حدث خطأ غير متوقع');
          const raw: string = (mapped as Error)?.message ?? 'حدث خطأ غير متوقع';
          const description = parseDbOverdraw(raw, {
            resolveProduct: (itemId) => {
              const l = lines.find(x => x.invoice_item_id === itemId);
              return l ? { name: l.product_name, sku: l.product_sku } : undefined;
            },
          }) ?? raw;
          toast({
            title: 'خطأ في إنشاء إشعار الإرجاع',
            description,
            variant: 'destructive',
          });
        },
      },
    );
  };

  const createMutation = {
    mutate: submitDraft,
    isPending: createDraftMutation.isPending,
  };

  const resetForm = () => {
    setCustomerId('');
    setInvoiceId('');
    setReason('');
    setLines([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إشعار إرجاع جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>العميل *</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setInvoiceId(''); }}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
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
                  {invoices.map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {Number(inv.total_amount).toLocaleString()} ج.م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items table */}
          {invoiceId && (
            <div className="border rounded-md">
              <div className="px-3 py-2 border-b bg-muted/40 text-sm font-medium">
                بنود الفاتورة ({lines.length})
              </div>

              {loadingItems ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <Loader2 className="h-5 w-5 animate-spin inline ml-2" />
                  جارِ التحميل…
                </div>
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
                          disabled={disabled}
                          onCheckedChange={(v) => updateLine(l.invoice_item_id, { selected: !!v })}
                          className="mt-1"
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
                                  className={`h-8 w-24 ${l.error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!customerId || !invoiceId || !hasSelection || hasErrors || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            إنشاء إشعار إرجاع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
