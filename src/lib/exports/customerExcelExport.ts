import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

interface CustomerExportData {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: { credit_note_number: string; amount: number; status: string; created_at: string; reason: string | null }[];
}

export async function exportCustomerToExcel({ customer, invoices, payments, creditNotes }: CustomerExportData) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customer Info
  const info = [
    ['بيانات العميل'],
    ['الاسم', customer.name],
    ['الهاتف', customer.phone || ''],
    ['البريد', customer.email || ''],
    ['النوع', customer.customer_type],
    ['المدينة', customer.city || ''],
    ['المحافظة', customer.governorate || ''],
    ['الرصيد الحالي', customer.current_balance || 0],
    ['حد الائتمان', customer.credit_limit || 0],
    ['تصنيف VIP', customer.vip_level],
    ['تاريخ الإنشاء', customer.created_at],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'بيانات العميل');

  // Sheet 2: Invoices
  const invHeaders = ['رقم الفاتورة', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'تاريخ الاستحقاق'];
  const invRows = invoices.map(i => [
    i.invoice_number, i.created_at?.split('T')[0],
    Number(i.total_amount), Number(i.paid_amount || 0),
    Number(i.total_amount) - Number(i.paid_amount || 0),
    i.payment_status, i.due_date || '',
  ]);
  const wsInv = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows]);
  wsInv['!cols'] = invHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsInv, 'الفواتير');

  // Sheet 3: Payments
  const payHeaders = ['رقم الدفعة', 'التاريخ', 'المبلغ', 'طريقة الدفع', 'ملاحظات'];
  const payRows = payments.map(p => [
    p.payment_number, p.payment_date?.split('T')[0],
    Number(p.amount), p.payment_method, p.notes || '',
  ]);
  const wsPay = XLSX.utils.aoa_to_sheet([payHeaders, ...payRows]);
  wsPay['!cols'] = payHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsPay, 'المدفوعات');

  // Sheet 4: Credit Notes
  if (creditNotes.length > 0) {
    const cnHeaders = ['رقم الإشعار', 'التاريخ', 'المبلغ', 'الحالة', 'السبب'];
    const cnRows = creditNotes.map(cn => [
      cn.credit_note_number, cn.created_at?.split('T')[0],
      Number(cn.amount), cn.status, cn.reason || '',
    ]);
    const wsCn = XLSX.utils.aoa_to_sheet([cnHeaders, ...cnRows]);
    wsCn['!cols'] = cnHeaders.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, wsCn, 'إشعارات دائنة');
  }

  // Sheet 5: Aging Summary
  const now = new Date();
  const aging: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  invoices.filter(i => i.payment_status !== 'paid').forEach(inv => {
    const rem = Number(inv.total_amount) - Number(inv.paid_amount || 0);
    if (rem <= 0) return;
    const ref = inv.due_date || inv.created_at;
    const days = Math.floor((now.getTime() - new Date(ref).getTime()) / 86400000);
    if (days <= 30) aging['0-30'] += rem;
    else if (days <= 60) aging['31-60'] += rem;
    else if (days <= 90) aging['61-90'] += rem;
    else aging['90+'] += rem;
  });
  const agingSheet = XLSX.utils.aoa_to_sheet([
    ['أعمار الديون'],
    ['الفترة', 'المبلغ'],
    ['0-30 يوم', Math.round(aging['0-30'])],
    ['31-60 يوم', Math.round(aging['31-60'])],
    ['61-90 يوم', Math.round(aging['61-90'])],
    ['90+ يوم', Math.round(aging['90+'])],
    ['الإجمالي', Math.round(Object.values(aging).reduce((s, v) => s + v, 0))],
  ]);
  agingSheet['!cols'] = [{ wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, agingSheet, 'أعمار الديون');

  const fileName = `عميل_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
