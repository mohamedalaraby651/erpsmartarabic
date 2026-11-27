export const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: 'نقدي', bank_transfer: 'تحويل بنكي', credit: 'آجل', installment: 'تقسيط', advance_payment: 'دفعة مقدمة',
};
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('ar-EG') : '—');
