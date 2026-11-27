import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Pencil, Phone, MessageCircle, Wallet, Handshake, FilePlus2 } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import type { Customer } from "@/lib/customerConstants";
import { fmtDate } from "./methods";

const TYPE_AR: Record<string, string> = { individual: 'فرد', company: 'شركة', farm: 'مزرعة' };

interface Props {
  customer: Customer & { code?: string | null };
  hasOverdue: boolean;
  forceOpen?: boolean;
  onEdit: () => void; onPay: () => void; onPromise: () => void; onNewInvoice: () => void; onWhatsApp: () => void;
}

export function CustomerProfileCard({ customer, hasOverdue, forceOpen, onEdit, onPay, onPromise, onNewInvoice, onWhatsApp }: Props) {
  const [open, setOpen] = useState(false);
  const expanded = open || forceOpen;
  const address = [customer.governorate, customer.city].filter(Boolean).join(' - ') || '—';
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'الكود', value: customer.code || '—' },
    { label: 'الهاتف', value: customer.phone ? (
      <span className="inline-flex items-center gap-2" dir="ltr">
        {customer.phone}
        <a href={`tel:${customer.phone}`} aria-label="اتصال" className="text-primary"><Phone className="h-4 w-4" /></a>
        <button type="button" onClick={onWhatsApp} aria-label="واتساب" className="text-emerald-600 no-print"><MessageCircle className="h-4 w-4" /></button>
      </span>) : '—' },
    { label: 'البريد', value: customer.email || '—' },
    { label: 'العنوان', value: address },
    { label: 'الحد الائتماني', value: Number(customer.credit_limit ?? 0) > 0 ? formatEGP(Number(customer.credit_limit)) : '—' },
    { label: 'الرقم الضريبي', value: customer.tax_number || '—' },
  ];
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs print-card" aria-label="بطاقة العميل">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {customer.name?.trim().charAt(0) || '؟'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{customer.name}</h1>
              <Badge variant={customer.is_active === false ? 'secondary' : 'default'}>{customer.is_active === false ? 'غير نشط' : 'نشط'}</Badge>
              {customer.vip_level && customer.vip_level !== 'regular' && <Badge className="bg-amber-500 text-white">VIP</Badge>}
              {customer.customer_type && <Badge variant="outline">{TYPE_AR[customer.customer_type] ?? customer.customer_type}</Badge>}
              {hasOverdue && <Badge variant="destructive">عليه متأخرات</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              عميل منذ {fmtDate(customer.created_at)}{customer.contact_person ? ` · مسؤول الحساب: ${customer.contact_person}` : ''}
            </p>
            <div className="mt-2 flex items-center gap-1 no-print">
              <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={!!expanded}>
                {expanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onEdit} aria-label="تعديل العميل"><Pencil className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button onClick={onPay} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Wallet className="h-4 w-4" />تسجيل دفعة</Button>
          <Button variant="outline" onClick={onPromise}><Handshake className="h-4 w-4" />وعد سداد</Button>
          <Button variant="outline" onClick={onNewInvoice}><FilePlus2 className="h-4 w-4" />فاتورة جديدة</Button>
        </div>
      </div>
      {expanded && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-3 lg:grid-cols-6">
          {fields.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="truncate text-sm font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
