import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil, Phone, MessageCircle, Banknote, CalendarClock, FileText } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import type { Customer } from "@/lib/customerConstants";
import { fmtDate } from "./methods";
import { Pill, TintedIcon, cardCls } from "./ui";
import { cn } from "@/lib/utils";

const TYPE_AR: Record<string, string> = { individual: 'فرد', company: 'شركة', farm: 'مزرعة' };

interface Props {
  customer: Customer & { code?: string | null };
  hasOverdue: boolean;
  forceOpen?: boolean;
  onEdit: () => void; onPay: () => void; onPromise: () => void; onNewInvoice: () => void; onWhatsApp: () => void;
}

export function CustomerProfileCard({ customer, hasOverdue, forceOpen, onEdit, onPay, onPromise, onNewInvoice, onWhatsApp }: Props) {
  const [open, setOpen] = useState(false);
  const expanded = !!(open || forceOpen);
  const address = [customer.governorate, customer.city].filter(Boolean).join(' · ') || '—';

  const pills = (
    <div className="flex flex-wrap items-center gap-1">
      {customer.is_active === false ? <Pill>غير نشط</Pill> : <Pill tone="success">نشط</Pill>}
      {customer.vip_level && customer.vip_level !== 'regular' && <Pill tone="violet">VIP</Pill>}
      {customer.customer_type && <Pill tone="primary">{TYPE_AR[customer.customer_type] ?? customer.customer_type}</Pill>}
      {hasOverdue && <Pill tone="destructive">عليه متأخرات</Pill>}
    </div>
  );
  const meta = (
    <p className="text-xs text-muted-foreground">
      عميل منذ {fmtDate(customer.created_at)}
      {customer.contact_person && <> · مسؤول الحساب: <b className="text-foreground">{customer.contact_person}</b></>}
    </p>
  );
  const avatar = (big: boolean) => (
    <div className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary", big ? "h-16 w-16 text-3xl" : "h-12 w-12 text-2xl")}>
      {customer.name?.trim().charAt(0) || '؟'}
    </div>
  );
  const editFold = (
    <div className="flex flex-col items-center gap-1.5 no-print">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="تعديل العميل"><Pencil className="h-3.5 w-3.5" /></Button>
      <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => setOpen((v) => !v)} aria-expanded={expanded}>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
      </Button>
    </div>
  );
  const actions = (
    <div className="flex flex-wrap gap-2 no-print">
      <Button onClick={onPay} className="h-9 rounded-full bg-success px-4 text-success-foreground hover:bg-success/90">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-success-foreground/20"><Banknote className="h-3.5 w-3.5" /></span>تسجيل دفعة
      </Button>
      <Button variant="outline" onClick={onPromise} className="h-9 rounded-full px-4"><TintedIcon icon={CalendarClock} tone="warning" size="sm" />وعد سداد</Button>
      <Button variant="outline" onClick={onNewInvoice} className="h-9 rounded-full px-4"><TintedIcon icon={FileText} tone="primary" size="sm" />فاتورة جديدة</Button>
    </div>
  );

  if (!expanded) {
    return (
      <section className={cn(cardCls, "p-4")} aria-label="بطاقة العميل">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <div className="flex min-w-0 items-center gap-3">
              {avatar(true)}
              <div className="min-w-0 space-y-1">
                <h1 className="truncate text-[28px] font-bold leading-9">{customer.name}</h1>
                {pills}{meta}
              </div>
            </div>
            {editFold}
          </div>
          {actions}
        </div>
      </section>
    );
  }

  const box = (label: string, value: React.ReactNode, extra?: React.ReactNode) => (
    <div className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{value}</span>
      {extra}
    </div>
  );
  const phoneExtra = customer.phone ? (
    <span className="flex shrink-0 gap-1 no-print">
      <a href={`tel:${customer.phone}`} aria-label="اتصال" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary/10"><Phone className="h-3.5 w-3.5" /></a>
      <button type="button" onClick={onWhatsApp} aria-label="واتساب" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success text-success-foreground hover:bg-success/90"><MessageCircle className="h-3.5 w-3.5" /></button>
    </span>
  ) : undefined;

  return (
    <section className={cn(cardCls, "p-3")} aria-label="بطاقة العميل">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div className="flex min-w-0 items-start gap-3">
              {avatar(false)}
              <div className="min-w-0 space-y-1">
                <h1 className="truncate text-xl font-bold">{customer.name}</h1>
                {pills}{meta}
              </div>
            </div>
            {editFold}
          </div>
          {actions}
        </div>
        <dl className="grid grid-cols-2 content-start gap-2">
          {box('الهاتف', <span dir="ltr">{customer.phone || '—'}</span>, phoneExtra)}
          {box('الكود', customer.code || '—')}
          {box('البريد', customer.email || '—')}
          {box('الحد الائتماني', Number(customer.credit_limit ?? 0) > 0 ? formatEGP(Number(customer.credit_limit)) : '—')}
          {box('العنوان', address)}
          {box('الرقم الضريبي', customer.tax_number || '—')}
        </dl>
      </div>
    </section>
  );
}
