import { MessageSquare } from "lucide-react";
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
    <div className="flex items-center justify-between gap-3 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground shadow-xs print-card">
      <p className="min-w-0 text-[13px] leading-6"><span className="font-bold">ملخص نظرة: </span>{sentence}</p>
      {outstanding > 0 && (
        <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-bold text-primary shadow-xs hover:bg-card/90 no-print"
          onClick={() => openWhatsApp(phone, reminderText(name, outstanding))}>
          <MessageSquare className="h-3.5 w-3.5" />ذكّره بالسداد · رسالة جاهزة
        </button>
      )}
    </div>
  );
}
