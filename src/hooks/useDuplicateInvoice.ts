import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceRepository } from '@/lib/repositories/invoiceRepository';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';


export function useDuplicateInvoice() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const mutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const original = await invoiceRepository.findById(invoiceId);
      if (!original) throw new Error('الفاتورة الأصلية غير موجودة');

      const items = await invoiceRepository.findItems(invoiceId);

      const newInvoice = await invoiceRepository.create({
        customer_id: original.customer_id,
        invoice_number: generateInvoiceNumber(),
        payment_method: original.payment_method,
        notes: original.notes
          ? `نسخة من ${original.invoice_number} - ${original.notes}`
          : `نسخة من ${original.invoice_number}`,
        subtotal: original.subtotal,
        discount_amount: original.discount_amount,
        tax_amount: original.tax_amount,
        total_amount: original.total_amount,
        status: 'pending',
        payment_status: 'pending',
        approval_status: 'draft',
        paid_amount: 0,
        created_by: user?.id || null,
      });

      if (items.length > 0) {
        await invoiceRepository.bulkInsertItems(
          items.map((item) => ({
            invoice_id: newInvoice.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage,
            total_price: item.total_price,
          })),
        );
      }

      return newInvoice;
    },

    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'تم نسخ الفاتورة بنجاح',
        description: `تم إنشاء فاتورة جديدة برقم ${newInvoice.invoice_number}`,
      });
    },
    onError: (error) => {
      logErrorSafely('DuplicateInvoice', error);
      toast({
        title: 'خطأ في نسخ الفاتورة',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const duplicate = useCallback((invoiceId: string) => {
    mutation.mutate(invoiceId);
  }, [mutation]);

  return { duplicate, isDuplicating: mutation.isPending, newInvoice: mutation.data };
}
