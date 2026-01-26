import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShareableDocument {
  documentNumber: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  currency?: string;
  documentType: 'invoice' | 'quotation' | 'sales_order' | 'purchase_order';
  dueDate?: string | null;
  validUntil?: string | null;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

const documentLabels: Record<string, string> = {
  invoice: 'فاتورة',
  quotation: 'عرض سعر',
  sales_order: 'أمر بيع',
  purchase_order: 'أمر شراء',
};

export function useWhatsAppShare() {
  const { toast } = useToast();

  const formatPhoneNumber = useCallback((phone: string): string => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Egyptian numbers
    if (cleaned.startsWith('0')) {
      cleaned = '20' + cleaned.substring(1);
    }
    
    // Add country code if missing
    if (!cleaned.startsWith('20') && cleaned.length === 10) {
      cleaned = '20' + cleaned;
    }
    
    return cleaned;
  }, []);

  const formatMessage = useCallback((document: ShareableDocument): string => {
    const label = documentLabels[document.documentType];
    const currency = document.currency || 'ج.م';
    
    let message = `🧾 *${label} رقم: ${document.documentNumber}*\n\n`;
    message += `👤 العميل: ${document.customerName}\n`;
    message += `💰 الإجمالي: ${document.totalAmount.toLocaleString('ar-EG')} ${currency}\n`;
    
    if (document.dueDate) {
      message += `📅 تاريخ الاستحقاق: ${new Date(document.dueDate).toLocaleDateString('ar-EG')}\n`;
    }
    
    if (document.validUntil) {
      message += `⏰ صالح حتى: ${new Date(document.validUntil).toLocaleDateString('ar-EG')}\n`;
    }
    
    if (document.items && document.items.length > 0) {
      message += `\n📦 *تفاصيل المنتجات:*\n`;
      document.items.slice(0, 5).forEach((item, index) => {
        message += `${index + 1}. ${item.name} × ${item.quantity} = ${item.price.toLocaleString('ar-EG')} ${currency}\n`;
      });
      if (document.items.length > 5) {
        message += `... و${document.items.length - 5} منتجات أخرى\n`;
      }
    }
    
    message += `\n✨ شكراً لتعاملكم معنا!`;
    
    return message;
  }, []);

  const shareViaWhatsApp = useCallback((document: ShareableDocument) => {
    if (!document.customerPhone) {
      toast({
        title: 'لا يوجد رقم هاتف',
        description: 'يرجى إضافة رقم هاتف للعميل أولاً',
        variant: 'destructive',
      });
      return false;
    }

    const phone = formatPhoneNumber(document.customerPhone);
    const message = formatMessage(document);
    const encodedMessage = encodeURIComponent(message);
    
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'تم فتح واتساب',
      description: 'سيتم إرسال الرسالة للعميل',
    });
    
    return true;
  }, [formatPhoneNumber, formatMessage, toast]);

  const shareWithCustomMessage = useCallback((phone: string, message: string) => {
    if (!phone) {
      toast({
        title: 'لا يوجد رقم هاتف',
        variant: 'destructive',
      });
      return false;
    }

    const formattedPhone = formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
    
    return true;
  }, [formatPhoneNumber, toast]);

  return {
    shareViaWhatsApp,
    shareWithCustomMessage,
    formatMessage,
    formatPhoneNumber,
  };
}
