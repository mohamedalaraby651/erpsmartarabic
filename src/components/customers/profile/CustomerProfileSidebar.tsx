import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Plus, MessageCircle, Printer, RotateCcw } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import type { CustomerProfileV19 } from "@/hooks/customers/useCustomerProfileV19";
import { PAYMENT_METHOD_AR, fmtDate } from "./methods";
import { cn } from "@/lib/utils";

type Width = 'narrow' | 'medium' | 'wide';
const CARD_IDS = ['balance', 'aging', 'promise', 'payments', 'contacts'] as const;
type CardId = typeof CARD_IDS[number];
const PREF_KEY = 'customer-profile-sidebar-v19';
export const SIDEBAR_WIDTH: Record<Width, string> = { narrow: 'lg:w-72', medium: 'lg:w-80', wide: 'lg:w-96' };

function usePrefs() {
  const [width, setWidth] = useState<Width>('medium');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (s.width) setWidth(s.width); if (s.closed) setClosed(s.closed); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ width, closed })); } catch { /* ignore */ } }, [width, closed]);
  return { width, setWidth, closed, setClosed };
}

function Card({ id, title, extra, closed, toggle, children }: { id: CardId; title: string; extra?: React.ReactNode; closed: boolean; toggle: (id: CardId) => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card print-card">
      <button type="button" onClick={() => toggle(id)} aria-expanded={!closed} className="flex w-full items-center justify-between gap-2 p-3 text-start">
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">{extra}{closed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</span>
      </button>
      {!closed && <div className="border-t p-3">{children}</div>}
    </section>
  );
}

function Donut({ paid, remaining }: { paid: number; remaining: number }) {
  const total = paid + remaining; const r = 42; const c = 2 * Math.PI * r;
  const paidLen = total > 0 ? (paid / total) * c : 0;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32" role="img" aria-label="مدفوع ومتبقي">
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--destructive))" strokeOpacity={total > 0 ? 0.85 : 0.15} strokeWidth="12" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(5 150 105)" strokeWidth="12" strokeDasharray={`${paidLen} ${c}`} transform="rotate(-90 50 50)" />
    </svg>
  );
}

interface Props {
  profile: CustomerProfileV19; customerName: string; phone?: string | null; creditLimit: number;
  forceOpen?: boolean; onWidth: (w: string) => void;
  onAddPromise: () => void; onAddContact: () => void; onRemind: () => void;
}

export function CustomerProfileSidebar({ profile, customerName, phone, creditLimit, forceOpen, onWidth, onAddPromise, onAddContact, onRemind }: Props) {
  const { width, setWidth, closed, setClosed } = usePrefs();
  const [openPay, setOpenPay] = useState<string | null>(null);
  useEffect(() => { onWidth(SIDEBAR_WIDTH[width]); }, [width, onWidth]);
  const isClosed = (id: CardId) => !forceOpen && !!closed[id];
  const toggle = (id: CardId) => setClosed((s) => ({ ...s, [id]: !s[id] }));
  const m = profile.metrics;
  const oldest = profile.invoices.filter((i) => i.status !== 'cancelled' && Number(i.total_amount) - Number(i.paid_amount ?? 0) > 0)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const promise = profile.activePromise;

  return (
    <aside className="space-y-3" aria-label="ملخص جانبي">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-muted/40 p-2 text-xs no-print">
        <span className="font-semibold">تخصيص العرض</span>
        {(['narrow', 'medium', 'wide'] as Width[]).map((w) => (
          <Button key={w} size="sm" variant={width === w ? 'default' : 'ghost'} className="h-7 px-2" onClick={() => setWidth(w)}>
            {{ narrow: 'ضيق', medium: 'متوسط', wide: 'عريض' }[w]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setClosed(Object.fromEntries(CARD_IDS.map((i) => [i, true])))}>طي الكل</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setClosed({})}>فتح الكل</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setClosed({}); setWidth('medium'); }}><RotateCcw className="h-3 w-3" />إعادة ضبط</Button>
      </div>

      <Card id="balance" title="الرصيد في لمحة" closed={isClosed('balance')} toggle={toggle}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Donut paid={m.paid} remaining={m.outstanding} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold">{formatEGP(m.outstanding)}</span>
              <span className="text-[10px] text-muted-foreground">مستحق</span>
              {m.overdueAmount > 0 && <span className="text-[10px] text-destructive">منه {formatEGP(m.overdueAmount)} متأخر</span>}
            </div>
          </div>
          <ul className="space-y-1 text-xs">
            <li><span className="inline-block h-2 w-2 rounded-full bg-emerald-600" /> مدفوع: {formatEGP(m.paid)}</li>
            <li><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> متبقي: {formatEGP(m.outstanding)}</li>
            <li>إجمالي التعامل: {formatEGP(m.totalDealings)}</li>
          </ul>
        </div>
        <div className="mt-3 space-y-1 text-xs">
          {profile.creditUse === null ? <p className="text-muted-foreground">لا يوجد حد ائتماني محدد</p> : (
            <>
              <div className="flex justify-between"><span>استخدام الحد الائتماني</span><span className="font-bold">{profile.creditUse}%</span></div>
              <Progress value={Math.min(100, profile.creditUse)} aria-label="استخدام الحد الائتماني" />
              <p className="text-muted-foreground">المتاح: {formatEGP(Math.max(0, creditLimit - m.outstanding))} من {formatEGP(creditLimit)}</p>
            </>
          )}
        </div>
      </Card>

      <Card id="aging" title="أعمار الديون" closed={isClosed('aging')} toggle={toggle}
        extra={m.over60Amount > 0 ? <Badge variant="destructive">{formatEGP(m.over60Amount)} فوق 60 يوم</Badge> : null}>
        <p className="mb-2 text-xs text-muted-foreground">أقدم فاتورة: {oldest ? `${m.oldestOpenAgeDays} يوم (${oldest.invoice_number})` : '—'}</p>
        <div className="grid grid-cols-4 gap-1 text-center text-xs">
          {m.buckets.map((b) => (
            <div key={b.label} className="rounded-md bg-muted p-1.5"><div className="text-muted-foreground">{b.label}</div><div className="font-semibold">{formatEGP(b.amount)}</div></div>
          ))}
        </div>
      </Card>

      <Card id="promise" title="وعد السداد" closed={isClosed('promise')} toggle={toggle}
        extra={<Badge variant={promise ? 'default' : 'secondary'}>{promise ? 'وعد قائم' : 'لا يوجد وعد قائم'}</Badge>}>
        {promise ? (
          <div className="space-y-2 text-sm">
            <p>وعد بسداد <b>{formatEGP(Number(promise.amount))}</b> يوم {fmtDate(promise.promised_date)}</p>
            {promise.notes && <p className="text-xs text-muted-foreground">{promise.notes}</p>}
            <div className="flex flex-wrap gap-1 no-print">
              <Button size="sm" variant="outline" onClick={() => profile.setPromiseStatus.mutate({ id: promise.id, status: 'kept' })}>تم الوفاء</Button>
              <Button size="sm" variant="outline" onClick={() => profile.setPromiseStatus.mutate({ id: promise.id, status: 'broken' })}>لم يُوفَ</Button>
              <Button size="sm" variant="ghost" onClick={() => profile.setPromiseStatus.mutate({ id: promise.id, status: 'cancelled' })}>إلغاء</Button>
            </div>
          </div>
        ) : <p className="text-xs text-muted-foreground">لم يسجل العميل أي وعد بالسداد.</p>}
        <div className="mt-2 flex flex-wrap gap-1 no-print">
          <Button size="sm" onClick={onAddPromise}><Plus className="h-3 w-3" />تسجيل وعد</Button>
          <Button size="sm" variant="outline" onClick={onRemind}><MessageCircle className="h-3 w-3" />تذكير بالرسالة الجاهزة</Button>
        </div>
      </Card>

      <Card id="payments" title="أحدث المدفوعات" closed={isClosed('payments')} toggle={toggle}>
        {profile.payments.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد مدفوعات</p> : (
          <ul className="space-y-2">
            {profile.payments.slice(0, 5).map((p) => (
              <li key={p.id} className="rounded-md border">
                <button type="button" className="flex w-full items-center justify-between p-2 text-sm" onClick={() => setOpenPay(openPay === p.id ? null : p.id)} aria-expanded={openPay === p.id}>
                  <span>{fmtDate(p.payment_date)}</span><span className="font-semibold text-emerald-700">{formatEGP(Number(p.amount))}</span>
                </button>
                {(openPay === p.id || forceOpen) && (
                  <div className="space-y-1 border-t p-2 text-xs">
                    <p>رقم الإيصال: <b>{p.payment_number}</b></p>
                    <p>العميل: {customerName}</p>
                    <p>الطريقة: {PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method}</p>
                    <p>الفاتورة: {p.invoices?.invoice_number ?? '—'}</p>
                    {p.reference_number && <p>المرجع: {p.reference_number}</p>}
                    <Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}><Printer className="h-3 w-3" />طباعة</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="contacts" title={`جهات الاتصال (${profile.contacts.length})`} closed={isClosed('contacts')} toggle={toggle}>
        {profile.contacts.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد جهات اتصال</p> : (
          <ul className="space-y-1 text-sm">
            {profile.contacts.map((c) => (
              <li key={c.id} className={cn("flex justify-between gap-2", c.is_primary && "font-semibold")}>
                <span className="truncate">{c.name}{c.role ? ` · ${c.role}` : ''}{c.is_primary ? ' (رئيسي)' : ''}</span>
                {c.phone && <a href={`tel:${c.phone}`} dir="ltr" className="shrink-0 text-xs text-primary">{c.phone}</a>}
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" variant="outline" className="mt-2 no-print" onClick={onAddContact}><Plus className="h-3 w-3" />إضافة</Button>
      </Card>
    </aside>
  );
}
