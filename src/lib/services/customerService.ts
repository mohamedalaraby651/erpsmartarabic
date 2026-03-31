/**
 * Customer Domain Service Layer
 * Centralized business logic for customer operations.
 * Hooks and components should delegate business rules here.
 */

import { customerRepository } from "@/lib/repositories/customerRepository";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

// ============================================
// Permission Checks
// ============================================

/** Server-side check: can user delete a customer? */
export async function canDeleteCustomer(): Promise<boolean> {
  return verifyPermissionOnServer('customers', 'delete');
}

/** Server-side check: can user modify a customer? */
export async function canModifyCustomer(): Promise<boolean> {
  return verifyPermissionOnServer('customers', 'edit');
}

// ============================================
// Validation
// ============================================

/** Check if customer has open invoices preventing deletion */
export async function validateBeforeDelete(customerId: string): Promise<{ canDelete: boolean; reason?: string }> {
  const count = await customerRepository.countOpenInvoices(customerId);

  if (count > 0) {
    return {
      canDelete: false,
      reason: `لا يمكن حذف العميل — لديه ${count} فاتورة غير مسددة`,
    };
  }

  return { canDelete: true };
}

/** Batch validate delete — returns blocked customers with open invoices */
export async function validateBatchDelete(ids: string[]): Promise<{ canDelete: boolean; reason?: string }> {
  const blocked = await customerRepository.batchValidateDelete(ids);
  if (blocked && blocked.length > 0) {
    const names = blocked
      .map(b => `${b.customer_name} (${b.open_invoice_count} فاتورة)`)
      .join('، ');
    return {
      canDelete: false,
      reason: `لا يمكن حذف العملاء التالية لوجود فواتير مفتوحة: ${names}`,
    };
  }
  return { canDelete: true };
}

// ============================================
// Business Calculations
// ============================================

interface CustomerHealthMetrics {
  dso: number | null;
  clv: number;
  paymentRatio: number;
  avgInvoiceValue: number;
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
}

/** Calculate customer financial health metrics */
export function calculateCustomerHealth(
  invoices: Invoice[],
  payments: Payment[]
): CustomerHealthMetrics {
  const totalPurchases = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPayments = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
  const paymentRatio = totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0;
  const avgInvoiceValue = invoices.length > 0 ? totalPurchases / invoices.length : 0;

  // DSO — uses due_date (fallback to created_at) vs actual payment dates
  const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
  let dso: number | null = null;

  if (paidInvoices.length > 0 && payments.length > 0) {
    const paymentDatesByInvoice = new Map<string, string>();
    for (const payment of payments) {
      const invId = payment.invoice_id;
      if (!invId) continue;
      const existing = paymentDatesByInvoice.get(invId);
      if (!existing || payment.payment_date > existing) {
        paymentDatesByInvoice.set(invId, payment.payment_date);
      }
    }

    let totalDays = 0;
    let count = 0;
    for (const inv of paidInvoices) {
      const paidAt = paymentDatesByInvoice.get(inv.id);
      if (!paidAt) continue;
      const referenceDate = new Date(inv.due_date || inv.created_at).getTime();
      const paid = new Date(paidAt).getTime();
      totalDays += Math.max(0, (paid - referenceDate) / (1000 * 60 * 60 * 24));
      count++;
    }
    dso = count > 0 ? Math.round(totalDays / count) : null;
  }

  const totalOutstanding = Math.round((totalPurchases - totalPayments) * 100) / 100;

  return {
    dso,
    clv: totalPurchases,
    paymentRatio,
    avgInvoiceValue,
    totalPurchases,
    totalPayments,
    totalOutstanding,
  };
}

// ============================================
// Export
// ============================================

/** Export all customers to Excel file with Arabic headers */
export async function exportCustomersToExcel(): Promise<void> {
  const toastId = 'export-all';
  try {
    const { toast: sonnerToast } = await import('sonner');
    sonnerToast.loading('جاري تحميل بيانات جميع العملاء...', { id: toastId });

    const result = await customerRepository.exportAll();
    const data = result.data;
    if (!data || data.length === 0) {
      sonnerToast.error('لا توجد بيانات للتصدير', { id: toastId });
      return;
    }

    if (result.isPartial) {
      sonnerToast.warning(`تم تصدير أول ${data.length.toLocaleString()} عميل فقط. للتصدير الكامل تواصل مع المسؤول.`, { id: toastId, duration: 8000 });
    }

    sonnerToast.loading(`جاري تصدير ${data.length} عميل...`, { id: toastId });

    const XLSX = await import('xlsx');
    const headers: Record<string, string> = {
      name: 'الاسم', phone: 'الهاتف', phone2: 'هاتف 2', email: 'البريد',
      customer_type: 'النوع', vip_level: 'مستوى VIP',
      current_balance: 'الرصيد', credit_limit: 'حد الائتمان',
      governorate: 'المحافظة', city: 'المدينة',
      contact_person: 'المسؤول', contact_person_role: 'منصب المسؤول',
      discount_percentage: 'نسبة الخصم %', payment_terms_days: 'شروط الدفع (أيام)',
      preferred_payment_method: 'طريقة الدفع المفضلة',
      tax_number: 'الرقم الضريبي', notes: 'ملاحظات',
      is_active: 'نشط', created_at: 'تاريخ الإنشاء',
    };
    const exportData = data.map(row => {
      const mapped: Record<string, unknown> = {};
      Object.keys(headers).forEach(key => {
        mapped[headers[key]] = (row as Record<string, unknown>)[key];
      });
      return mapped;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = Object.values(headers).map(h => ({ wch: Math.max(h.length, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
    XLSX.writeFile(wb, `customers_all_${new Date().toISOString().slice(0, 10)}.xlsx`);

    sonnerToast.success(`تم تصدير ${data.length} عميل بنجاح`, { id: toastId });
  } catch {
    const { toast: sonnerToast } = await import('sonner');
    sonnerToast.error('حدث خطأ أثناء التصدير', { id: toastId });
  }
}
