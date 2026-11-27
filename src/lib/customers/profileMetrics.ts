/** Pure metrics for the v19 customer profile. All values come from real rows. */
export interface MetricInvoice {
  id: string;
  total_amount: number | null;
  paid_amount: number | null;
  due_date: string | null;
  created_at: string;
  status?: string | null;
  payment_status?: string | null;
}

const DAY = 86400000;
const r2 = (v: number) => Math.round(v * 100) / 100;

export function invoiceRemaining(inv: MetricInvoice): number {
  if (inv.status === 'cancelled') return 0;
  return r2(Math.max(0, Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)));
}

/** credit use % = outstanding dues ÷ credit limit; null when no limit is set. */
export function creditUsePercent(outstanding: number, creditLimit: number | null | undefined): number | null {
  const limit = Number(creditLimit ?? 0);
  if (!(limit > 0)) return null;
  return Math.round((Math.max(0, outstanding) / limit) * 100);
}

/** Days past due (due date, or issue date when no due date). 0 when not yet due. */
export function overdueDays(inv: MetricInvoice, now: number = Date.now()): number {
  const ref = new Date(inv.due_date ?? inv.created_at).getTime();
  return Math.max(0, Math.floor((now - ref) / DAY));
}

export interface ProfileMetrics {
  outstanding: number;
  overdueAmount: number;
  openCount: number;
  oldestOverdueDays: number;
  oldestOpenAgeDays: number;
  over60Amount: number;
  totalDealings: number;
  paid: number;
  buckets: { label: string; amount: number }[];
}

export function computeProfileMetrics(invoices: MetricInvoice[], now: number = Date.now()): ProfileMetrics {
  let outstanding = 0, overdueAmount = 0, openCount = 0, oldestOverdueDays = 0, oldestOpenAgeDays = 0, over60 = 0, total = 0, paid = 0;
  const b = [0, 0, 0, 0];
  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue;
    total += Number(inv.total_amount ?? 0);
    paid += Math.min(Number(inv.paid_amount ?? 0), Number(inv.total_amount ?? 0));
    const rem = invoiceRemaining(inv);
    if (rem <= 0) continue;
    openCount++;
    outstanding += rem;
    const age = Math.max(0, Math.floor((now - new Date(inv.created_at).getTime()) / DAY));
    oldestOpenAgeDays = Math.max(oldestOpenAgeDays, age);
    const od = overdueDays(inv, now);
    if (od > 0) { overdueAmount += rem; oldestOverdueDays = Math.max(oldestOverdueDays, od); }
    if (od > 60) over60 += rem;
    b[od <= 30 ? 0 : od <= 60 ? 1 : od <= 90 ? 2 : 3] += rem;
  }
  return {
    outstanding: r2(outstanding), overdueAmount: r2(overdueAmount), openCount, oldestOverdueDays, oldestOpenAgeDays,
    over60Amount: r2(over60), totalDealings: r2(total), paid: r2(paid),
    buckets: [
      { label: '0-30', amount: r2(b[0]) }, { label: '31-60', amount: r2(b[1]) },
      { label: '61-90', amount: r2(b[2]) }, { label: '+90', amount: r2(b[3]) },
    ],
  };
}

export function buildSummarySentence(args: {
  name: string; outstanding: number; openCount: number;
  lastPayment?: { amount: number; date: string } | null; oldestOverdueDays: number;
  fmt: (n: number) => string;
}): string {
  const parts = [`${args.name} مدين بـ ${args.fmt(args.outstanding)} على ${args.openCount} فواتير.`];
  if (args.lastPayment) parts.push(`آخر دفعة ${args.fmt(args.lastPayment.amount)} يوم ${args.lastPayment.date}.`);
  else parts.push('لا توجد دفعات مسجلة.');
  if (args.oldestOverdueDays > 0) parts.push(`أقدم دين متأخر ${args.oldestOverdueDays} يوم.`);
  return parts.join(' ');
}
