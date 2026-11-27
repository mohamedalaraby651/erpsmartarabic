import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { formatEGP } from "@/lib/format/money";
import { buildSummarySentence } from "@/lib/customers/profileMetrics";
import { fmtDate } from "./methods";

interface Props {
  name: string; phone?: string | null; outstanding: number; openCount: number; oldestOverdueDays: number;
  lastPayment: { amount: number; payment_date: string } | null;
}

export function reminderText(name: string, outstanding: number) {
  return `السيد/ ${name}، نود تذكيركم بأن المستحق عليكم ${formatEGP(outstanding)}. نرجو السداد في أقرب وقت. شكرًا لكم.`;
}

export function openWhatsApp(phone: string | null | undefined, text: string) {
  const p = phone?.replace(/\D/g, '');
  const url = p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}

export function CustomerSummaryBanner({ name, phone, outstanding, openCount, oldestOverdueDays, lastPayment }: Props) {
  const sentence = buildSummarySentence({
    name, outstanding, openCount, oldestOverdueDays, fmt: (n) => formatEGP(n),
    lastPayment: lastPayment ? { amount: Number(lastPayment.amount), date: fmtDate(lastPayment.payment_date) } : null,
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white print-card">
      <p className="min-w-0 text-sm"><span className="font-bold">ملخص نظرة: </span>{sentence}</p>
      {outstanding > 0 && (
        <Button size="sm" variant="secondary" className="rounded-full no-print" onClick={() => openWhatsApp(phone, reminderText(name, outstanding))}>
          <MessageCircle className="h-4 w-4" />تذكيره بالسداد · رسالة جاهزة
        </Button>
      )}
    </div>
  );
}
