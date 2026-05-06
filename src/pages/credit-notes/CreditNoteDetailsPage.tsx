import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, CheckCircle, XCircle, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CREDIT_NOTE_STATUS_LABELS } from './types';

export default function CreditNoteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const qc = useQueryClient();

  const canManage = userRole === 'admin' || userRole === 'accountant';

  const { data: cn, isLoading } = useQuery({
    queryKey: ['credit-note', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*, customers(id, name, phone), invoices(id, invoice_number, total_amount, paid_amount)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['credit-note-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_note_items')
        .select('*, products(name, sku), invoice_items:invoice_item_id(id, quantity, unit_price)')
        .eq('credit_note_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: journal } = useQuery({
    queryKey: ['credit-note-journal', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('journals')
        .select('id, journal_number, journal_date, description, is_posted')
        .eq('source_type', 'credit_note')
        .eq('source_id', id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['credit-note', id] });
    qc.invalidateQueries({ queryKey: ['credit-note-journal', id] });
    qc.invalidateQueries({ queryKey: ['credit-notes'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  const confirmMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('confirm_credit_note', { p_credit_note_id: id! });
      if (error) throw error;
      return data;
    },
    onSuccess: (res: any) => {
      const journalOk = res?.journal?.success;
      const stockOk = res?.stock?.success;
      toast({
        title: 'تم تأكيد المرتجع',
        description: `قيد محاسبي: ${journalOk ? 'تم ✓' : 'فشل'} • مخزون: ${stockOk ? 'تم ✓' : 'تخطّى'}`,
      });
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'فشل التأكيد', description: e.message, variant: 'destructive' }),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cancel_credit_note', { p_credit_note_id: id! });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم إلغاء المرتجع', description: 'تم عكس الرصيد والقيد المحاسبي' });
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'فشل الإلغاء', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!cn) {
    return <div className="text-center py-12 text-muted-foreground">المرتجع غير موجود</div>;
  }

  const statusVariant = cn.status === 'confirmed' ? 'default' : cn.status === 'cancelled' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/credit-notes')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">مرتجع #{cn.credit_note_number}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(cn.created_at).toLocaleDateString('ar-EG', { dateStyle: 'long' })}
            </p>
          </div>
          <Badge variant={statusVariant} className="text-sm">
            {CREDIT_NOTE_STATUS_LABELS[cn.status] || cn.status}
          </Badge>
        </div>

        {canManage && cn.status === 'draft' && (
          <div className="flex gap-2">
            <Button onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              {confirmMut.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <CheckCircle className="h-4 w-4 ml-2" />}
              تأكيد المرتجع
            </Button>
          </div>
        )}
        {canManage && cn.status !== 'cancelled' && (
          <Button variant="outline" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
            {cancelMut.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <XCircle className="h-4 w-4 ml-2" />}
            إلغاء المرتجع
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">العميل</CardTitle></CardHeader>
          <CardContent>
            <Link to={`/customers/${cn.customers?.id}`} className="font-bold hover:text-primary">
              {cn.customers?.name || '—'}
            </Link>
            {cn.customers?.phone && <p className="text-xs text-muted-foreground mt-1">{cn.customers.phone}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">الفاتورة الأصلية</CardTitle></CardHeader>
          <CardContent>
            {cn.invoices ? (
              <Link to={`/invoices/${cn.invoices.id}`} className="font-bold hover:text-primary flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {cn.invoices.invoice_number}
              </Link>
            ) : '—'}
            {cn.invoices && (
              <p className="text-xs text-muted-foreground mt-1">
                إجمالي: {Number(cn.invoices.total_amount).toLocaleString()} ج.م
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">قيمة المرتجع</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{Number(cn.amount).toLocaleString()} ج.م</p>
          </CardContent>
        </Card>
      </div>

      {/* Reason */}
      {cn.reason && (
        <Card>
          <CardHeader><CardTitle className="text-base">سبب الإرجاع</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{cn.reason}</p></CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">بنود المرتجع ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-warning/10 p-3 rounded-md">
              <AlertTriangle className="h-4 w-4 text-warning" />
              لا توجد بنود تفصيلية — لن يتم إرجاع المخزون عند التأكيد، فقط القيد المالي.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((it: any) => {
                const origQty = it.invoice_items?.quantity;
                const linked  = !!it.invoice_item_id;
                return (
                  <div key={it.id} className="py-3 flex items-center justify-between text-sm gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{it.products?.name || '—'}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {it.products?.sku && (
                          <span className="text-xs text-muted-foreground">SKU: {it.products.sku}</span>
                        )}
                        {linked && origQty != null && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success">
                            مرتبط ببند فاتورة • أصل: {origQty}
                          </span>
                        )}
                        {!linked && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                            غير مرتبط
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p>{it.quantity} × {Number(it.unit_price).toLocaleString()}</p>
                      <p className="font-bold">{Number(it.total_price).toLocaleString()} ج.م</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journal */}
      <Card>
        <CardHeader><CardTitle className="text-base">القيد المحاسبي</CardTitle></CardHeader>
        <CardContent>
          {journal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">رقم القيد</span>
                <span className="font-mono">{journal.journal_number}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الحالة</span>
                <Badge variant={journal.is_posted ? 'default' : 'secondary'}>
                  {journal.is_posted ? 'مُرحّل ✓' : 'مسودة'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">التاريخ</span>
                <span>{new Date(journal.journal_date).toLocaleDateString('ar-EG')}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">{journal.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لم يتم إنشاء قيد محاسبي بعد. سيتم إنشاؤه تلقائياً عند تأكيد المرتجع.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
