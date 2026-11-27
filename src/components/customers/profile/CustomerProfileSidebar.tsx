import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronLeft, Plus, MessageCircle, Printer, RotateCcw, SlidersHorizontal, PieChart, Clock, CalendarClock, CreditCard, Users, PanelLeft, Pencil, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import type { CustomerProfileV19 } from "@/hooks/customers/useCustomerProfileV19";
import { PAYMENT_METHOD_AR, fmtDate } from "./methods";
import { Pill, TintedIcon, cardCls, type Tone } from "./ui";
import { cn } from "@/lib/utils";

type Width = 'narrow' | 'medium' | 'wide';
const CARD_IDS = ['balance', 'aging', 'promise', 'payments', 'contacts'] as const;
type CardId = typeof CARD_IDS[number];
const CARD_META: Record<CardId, { icon: LucideIcon; tone: Tone; title: string }> = {
  balance: { icon: PieChart, tone: 'success', title: 'الرصيد في لمحة' },
  aging: { icon: Clock, tone: 'destructive', title: 'أعمار الديون' },
  promise: { icon: CalendarClock, tone: 'warning', title: 'وعد السداد' },
  payments: { icon: CreditCard, tone: 'primary', title: 'أحدث المدفوعات' },
  contacts: { icon: Users, tone: 'violet', title: 'جهات الاتصال' },
};
const PREF_KEY = 'customer-profile-sidebar-v19';
export const SIDEBAR_WIDTH: Record<Width, string> = { narrow: 'lg:w-72', medium: 'lg:w-[22rem]', wide: 'lg:w-96' };

function usePrefs() {
  const [width, setWidth] = useState<Width>('medium');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [iconBar, setIconBar] = useState(false);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (s.width) setWidth(s.width); if (s.closed) setClosed(s.closed); if (s.iconBar) setIconBar(true); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ width, closed, iconBar })); } catch { /* ignore */ } }, [width, closed, iconBar]);
  return { width, setWidth, closed, setClosed, iconBar, setIconBar };
}

function Card({ id, title, extra, action, closed, toggle, children }: { id: CardId; title?: string; extra?: React.ReactNode; action?: React.ReactNode; closed: boolean; toggle: (id: CardId) => void; children: React.ReactNode }) {
  const meta = CARD_META[id];
  return (
    <section className={cn(cardCls, "p-3")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TintedIcon icon={meta.icon} tone={meta.tone} />
          <h3 className="truncate text-[15px] font-bold">{title ?? meta.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {extra}{action}
          <button type="button" onClick={() => toggle(id)} aria-expanded={!closed} aria-label={`${closed ? 'فتح' : 'طي'} ${meta.title}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted no-print">
            {closed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {!closed && <div className="mt-3">{children}</div>}
    </section>
  );
}

function Donut({ paid, overdue, pending }: { paid: number; overdue: number; pending: number }) {
  const total = paid + overdue + pending; const r = 40; const c = 2 * Math.PI * r;
  const segs = [{ v: paid, cls: 'stroke-success' }, { v: overdue, cls: 'stroke-destructive' }, { v: pending, cls: 'stroke-warning' }];
  let off = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label="مدفوع ومتأخر ومستحق">
      <circle cx="50" cy="50" r={r} fill="none" className="stroke-muted" strokeWidth="11" />
      {total > 0 && segs.map((s, i) => {
        const len = (s.v / total) * c; const el = <circle key={i} cx="50" cy="50" r={r} fill="none" className={s.cls} strokeWidth="11" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />;
        off += len; return el;
      })}
    </svg>
  );
}

interface Props {
  profile: CustomerProfileV19; customerName: string; creditLimit: number;
  forceOpen?: boolean; onWidth: (w: string) => void;
  onAddPromise: () => void; onAddContact: () => void; onRemind: () => void; onViewPayments: () => void; onEditPayment: () => void;
}

export function CustomerProfileSidebar({ profile, customerName, creditLimit, forceOpen, onWidth, onAddPromise, onAddContact, onRemind, onViewPayments, onEditPayment }: Props) {
  const { width, setWidth, closed, setClosed, iconBar, setIconBar } = usePrefs();
  const [openPay, setOpenPay] = useState<string | null | undefined>(undefined);
  const icons = iconBar && !forceOpen;
  useEffect(() => { onWidth(icons ? 'lg:w-16' : SIDEBAR_WIDTH[width]); }, [width, icons, onWidth]);
  const isClosed = (id: CardId) => !forceOpen && !!closed[id];
  const toggle = (id: CardId) => setClosed((s) => ({ ...s, [id]: !s[id] }));
  const m = profile.metrics;
  const promise = profile.activePromise;
  const firstPay = profile.payments[0]?.id ?? null;
  const expandedPay = openPay === undefined ? firstPay : openPay;
  const primary = profile.contacts.find((c) => c.is_primary) ?? profile.contacts[0];
  const pending = Math.max(0, Math.round((m.outstanding - m.overdueAmount) * 100) / 100);

  if (icons) {
    return (
      <aside className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-2 lg:sticky lg:top-4" aria-label="ملخص جانبي">
        <button type="button" onClick={() => setIconBar(false)} aria-label="إظهار العمود كاملًا" className="rounded-lg p-1 hover:bg-muted"><TintedIcon icon={SlidersHorizontal} tone="primary" /></button>
        {CARD_IDS.map((id) => (
          <button key={id} type="button" title={CARD_META[id].title} aria-label={CARD_META[id].title} className="rounded-lg p-1 hover:bg-muted"
            onClick={() => { setIconBar(false); setClosed((s) => ({ ...s, [id]: false })); }}>
            <TintedIcon icon={CARD_META[id].icon} tone={CARD_META[id].tone} />
          </button>
        ))}
      </aside>
    );
  }

  const seg = 'h-6 rounded-full px-2.5 text-[11px] font-semibold';
  const chip = 'inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold hover:bg-muted';

  return (
    <aside className="space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pe-1" aria-label="ملخص جانبي">
      <section className={cn(cardCls, "space-y-2 p-3 no-print")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><TintedIcon icon={SlidersHorizontal} tone="primary" /><h3 className="text-[15px] font-bold">تخصيص العرض</h3></div>
          <div className="flex rounded-full bg-muted p-0.5" role="group" aria-label="عرض العمود">
            {(['narrow', 'medium', 'wide'] as Width[]).map((w) => (
              <button key={w} type="button" aria-pressed={width === w} onClick={() => setWidth(w)}
                className={cn(seg, width === w ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground')}>
                {{ narrow: 'ضيق', medium: 'متوسط', wide: 'عريض' }[w]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip} onClick={() => setClosed(Object.fromEntries(CARD_IDS.map((i) => [i, true])))}><ChevronDown className="h-3 w-3" />طي الكل</button>
          <button type="button" className={chip} onClick={() => setClosed({})}><ChevronUp className="h-3 w-3" />فتح الكل</button>
          <button type="button" className={chip} onClick={() => { setClosed({}); setWidth('medium'); setIconBar(false); }}><RotateCcw className="h-3 w-3" />إعادة ضبط</button>
          <button type="button" className={chip} onClick={() => setIconBar(true)}><PanelLeft className="h-3 w-3" />شريط أيقونات</button>
        </div>
      </section>

      <Card id="balance" closed={isClosed('balance')} toggle={toggle}>
        <div className="flex items-center justify-between gap-3">
          <ul className="flex-1 space-y-2 text-[13px]">
            <li className="flex justify-between gap-2"><span>• مدفوع</span><b className="text-success">{formatEGP(m.paid)}</b></li>
            <li className="flex justify-between gap-2"><span>• متبقي</span><b className="text-destructive">{formatEGP(m.outstanding)}</b></li>
            <li className="flex justify-between gap-2"><span>• إجمالي التعامل</span><b className="text-primary">{formatEGP(m.totalDealings)}</b></li>
          </ul>
          <div className="relative shrink-0">
            <Donut paid={m.paid} overdue={m.overdueAmount} pending={pending} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
              <span className="text-lg font-bold text-destructive">{formatEGP(m.outstanding).replace(/\s*ج\.م\.?/, '')}</span>
              <span className="text-[10px] font-semibold text-destructive">ج.م مستحق</span>
              {m.overdueAmount > 0 && <span className="text-[10px] font-semibold text-destructive">منه {formatEGP(m.overdueAmount)} متأخر</span>}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
          {profile.creditUse === null ? <p>لا يوجد حد ائتماني محدد</p> : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="استخدام الحد الائتماني" aria-valuenow={profile.creditUse} aria-valuemin={0} aria-valuemax={100}>
                <div className={cn("h-full rounded-full", profile.creditUse >= 90 ? 'bg-destructive' : 'bg-success')} style={{ width: `${Math.min(100, profile.creditUse)}%` }} />
              </div>
              <div className="flex justify-between"><span>الحد الائتماني</span><span>مستخدم {profile.creditUse}% · {formatEGP(m.outstanding)} من {formatEGP(creditLimit)}</span></div>
              <p className="flex gap-1.5 rounded-lg border border-success/20 bg-success/5 p-2 text-foreground/80">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <span>المتاح من الحد الائتماني {formatEGP(Math.max(0, creditLimit - m.outstanding))}. الحد محسوب على المستحق وليس إجمالي التعامل.</span>
              </p>
            </>
          )}
        </div>
      </Card>

      <Card id="aging" closed={isClosed('aging')} toggle={toggle}
        extra={m.openCount > 0 ? <span className="font-bold">أقدم فاتورة: {m.oldestOpenAgeDays} يوم</span> : null}>
        {m.openCount === 0 ? <p className="text-xs text-muted-foreground">لا توجد ديون مفتوحة</p> : (
          <p className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
            أقدم فاتورة {m.oldestOpenAgeDays} يوم · <b className="text-destructive">{formatEGP(m.over60Amount)}</b> فوق 60 يوم
          </p>
        )}
      </Card>

      <Card id="promise" closed={isClosed('promise')} toggle={toggle}
        extra={<Pill tone={promise ? 'warning' : 'muted'}>{promise ? 'وعد قائم' : 'لا يوجد وعد قائم'}</Pill>}>
        {promise ? (
          <div className="space-y-2 text-[13px]">
            <p>وعد بسداد <b>{formatEGP(Number(promise.amount))}</b> يوم {fmtDate(promise.promised_date)}</p>
            {promise.notes && <p className="text-xs text-muted-foreground">{promise.notes}</p>}
            <div className="flex flex-wrap gap-1 no-print">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => profile.setPromiseStatus.mutate({ id: promise.id, status: 'kept' })}>تم الوفاء</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => profile.setPromiseStatus.mutate({ id: promise.id, status: 'broken' })}>لم يُوفَ</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => profile.setPromiseStatus.mutate({ id: promise.id, status: 'cancelled' })}>إلغاء</Button>
            </div>
          </div>
        ) : <p className="text-[13px] text-muted-foreground">لا يوجد وعد سداد قائم لهذا العميل</p>}
        <div className="mt-2 flex flex-wrap gap-2 no-print">
          <button type="button" onClick={onAddPromise} className="inline-flex h-8 items-center gap-1 rounded-full border-2 border-warning px-3 text-xs font-bold text-warning hover:bg-warning/10"><Plus className="h-3 w-3" />تسجيل وعد</button>
          <button type="button" onClick={onRemind} className="inline-flex h-8 items-center gap-1 rounded-full border-2 border-success px-3 text-xs font-bold text-success hover:bg-success/10"><MessageCircle className="h-3 w-3" />تذكير بالرسالة الجاهزة</button>
        </div>
      </Card>

      <Card id="payments" closed={isClosed('payments')} toggle={toggle}
        action={<button type="button" onClick={onViewPayments} className="font-bold text-primary hover:underline no-print">عرض الكل</button>}>
        {profile.payments.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد مدفوعات</p> : (
          <ul className="space-y-2">
            {profile.payments.slice(0, 5).map((p) => {
              const isOpen = expandedPay === p.id || !!forceOpen;
              const method = PAYMENT_METHOD_AR[p.payment_method] ?? p.payment_method;
              return (
                <li key={p.id} className={cn("rounded-xl border", isOpen ? "border-primary shadow-xs" : "border-border")}>
                  <button type="button" className="flex w-full items-center justify-between gap-2 p-3 text-start" onClick={() => setOpenPay(isOpen ? null : p.id)} aria-expanded={isOpen}>
                    <span className="min-w-0"><span className="block text-[13px] font-semibold">{method}</span><span className="text-[11px] text-muted-foreground">{fmtDate(p.payment_date)}</span></span>
                    <span className="flex items-center gap-3"><b className="text-[13px] text-success">{formatEGP(Number(p.amount))}</b>{isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-border p-3 text-xs">
                      <dl className="space-y-1.5">
                        <div className="flex justify-between"><dt className="text-muted-foreground">رقم الإيصال</dt><dd className="font-bold">{p.payment_number}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">الفاتورة</dt><dd className="font-bold text-primary">{p.invoices?.invoice_number ?? '—'}</dd></div>
                        {p.reference_number && <div className="flex justify-between"><dt className="text-muted-foreground">المرجع</dt><dd className="font-bold">{p.reference_number}</dd></div>}
                        {p.notes && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">ملاحظة</dt><dd className="truncate font-bold">{p.notes}</dd></div>}
                      </dl>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-dashed border-border-strong p-2.5 text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">إيصال {p.payment_number}</span><span className="text-start font-bold text-foreground">{formatEGP(Number(p.amount))}</span>
                        <span>العميل</span><span>{customerName}</span>
                        <span>التاريخ</span><span>{fmtDate(p.payment_date)}</span>
                        <span>طريقة الدفع</span><span>{method}</span>
                      </div>
                      <div className="flex gap-1.5 no-print">
                        <button type="button" className={chip} onClick={() => window.print()}><Printer className="h-3 w-3" />طباعة</button>
                        <button type="button" className={chip} onClick={() => window.print()}>PDF</button>
                        <button type="button" className={chip} onClick={onEditPayment}><Pencil className="h-3 w-3" />تعديل</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card id="contacts" title={`جهات الاتصال (${profile.contacts.length})`} closed={isClosed('contacts')} toggle={toggle}
        action={<button type="button" onClick={onAddContact} className="inline-flex items-center gap-0.5 font-bold text-primary hover:underline no-print"><Plus className="h-3 w-3" />إضافة</button>}>
        <p className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs text-muted-foreground">
          {profile.contacts.length === 0 ? 'لا توجد جهات اتصال' : `${profile.contacts.length} جهات · الرئيسي: ${primary?.name ?? '—'}`}
        </p>
        {forceOpen && profile.contacts.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">{profile.contacts.map((c) => <li key={c.id}>{c.name}{c.role ? ` · ${c.role}` : ''}{c.phone ? ` · ${c.phone}` : ''}</li>)}</ul>
        )}
      </Card>
    </aside>
  );
}
