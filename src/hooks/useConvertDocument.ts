import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';

type ConvertType = 'quotation-to-order' | 'order-to-invoice' | 'quotation-to-invoice';

export function useConvertDocument() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const generateNumber = (prefix: string) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}${month}-${random}`;
  };

  const mutation = useMutation({
    mutationFn: async ({ type, sourceId }: { type: ConvertType; sourceId: string }) => {
      if (type === 'quotation-to-order') {
        // Fetch quotation + items
        const { data: quotation, error: qErr } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', sourceId)
          .single();
        if (qErr) throw qErr;

        const { data: items, error: iErr } = await supabase
          .from('quotation_items')
          .select('*')
          .eq('quotation_id', sourceId);
        if (iErr) throw iErr;

        // Create sales order
        const { data: order, error: oErr } = await supabase
          .from('sales_orders')
          .insert({
            customer_id: quotation.customer_id,
            order_number: generateNumber('SO'),
            quotation_id: sourceId,
            status: 'draft',
            subtotal: quotation.subtotal,
            discount_amount: quotation.discount_amount,
            tax_amount: quotation.tax_amount,
            total_amount: quotation.total_amount,
            notes: quotation.notes,
            created_by: user?.id || null,
          })
          .select()
          .single();
        if (oErr) throw oErr;

        // Copy items
        if (items && items.length > 0) {
          const orderItems = items.map((item) => ({
            order_id: order.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage,
            total_price: item.total_price,
          }));
          const { error: copyErr } = await supabase.from('sales_order_items').insert(orderItems);
          if (copyErr) throw copyErr;
        }

        return { type: 'order' as const, id: order.id, number: order.order_number };

      } else if (type === 'order-to-invoice' || type === 'quotation-to-invoice') {
        let customerId: string;
        let sourceItems: Array<{ product_id: string; variant_id: string | null; quantity: number; unit_price: number; discount_percentage: number | null; total_price: number }>;
        let subtotal: number;
        let discountAmount: number;
        let taxAmount: number;
        let totalAmount: number;
        let notes: string | null;

        if (type === 'order-to-invoice') {
          const { data: order, error: oErr } = await supabase
            .from('sales_orders')
            .select('*')
            .eq('id', sourceId)
            .single();
          if (oErr) throw oErr;

          const { data: items, error: iErr } = await supabase
            .from('sales_order_items')
            .select('*')
            .eq('order_id', sourceId);
          if (iErr) throw iErr;

          customerId = order.customer_id;
          subtotal = Number(order.subtotal);
          discountAmount = Number(order.discount_amount);
          taxAmount = Number(order.tax_amount);
          totalAmount = Number(order.total_amount);
          notes = order.notes;
          sourceItems = (items || []).map((i) => ({
            product_id: i.product_id,
            variant_id: i.variant_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount_percentage: i.discount_percentage,
            total_price: i.total_price,
          }));
        } else {
          const { data: quotation, error: qErr } = await supabase
            .from('quotations')
            .select('*')
            .eq('id', sourceId)
            .single();
          if (qErr) throw qErr;

          const { data: items, error: iErr } = await supabase
            .from('quotation_items')
            .select('*')
            .eq('quotation_id', sourceId);
          if (iErr) throw iErr;

          customerId = quotation.customer_id;
          subtotal = Number(quotation.subtotal);
          discountAmount = Number(quotation.discount_amount);
          taxAmount = Number(quotation.tax_amount);
          totalAmount = Number(quotation.total_amount);
          notes = quotation.notes;
          sourceItems = (items || []).map((i) => ({
            product_id: i.product_id,
            variant_id: i.variant_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount_percentage: i.discount_percentage,
            total_price: i.total_price,
          }));
        }

        // Create invoice
        const { data: invoice, error: invErr } = await supabase
          .from('invoices')
          .insert({
            customer_id: customerId,
            invoice_number: generateNumber('INV'),
            payment_method: 'cash',
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            notes,
            status: 'pending',
            payment_status: 'pending',
            approval_status: 'draft',
            created_by: user?.id || null,
          })
          .select()
          .single();
        if (invErr) throw invErr;

        // Copy items
        if (sourceItems.length > 0) {
          const invoiceItems = sourceItems.map((item) => ({
            invoice_id: invoice.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage,
            total_price: item.total_price,
          }));
          const { error: copyErr } = await supabase.from('invoice_items').insert(invoiceItems);
          if (copyErr) throw copyErr;
        }

        return { type: 'invoice' as const, id: invoice.id, number: invoice.invoice_number };
      }

      throw new Error('نوع تحويل غير معروف');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });

      const labels = {
        order: 'أمر البيع',
        invoice: 'الفاتورة',
      };

      toast({
        title: `تم إنشاء ${labels[result.type]} بنجاح`,
        description: `رقم ${result.number}`,
      });

      if (result.type === 'order') {
        navigate(`/sales-orders/${result.id}`);
      } else {
        navigate(`/invoices/${result.id}`);
      }
    },
    onError: (error) => {
      logErrorSafely('ConvertDocument', error);
      toast({
        title: 'خطأ في التحويل',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const convert = useCallback((type: ConvertType, sourceId: string) => {
    mutation.mutate({ type, sourceId });
  }, [mutation]);

  return { convert, isConverting: mutation.isPending };
}
