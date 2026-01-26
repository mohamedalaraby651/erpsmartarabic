import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useWhatsAppShare } from '@/hooks/useWhatsAppShare';
import { cn } from '@/lib/utils';

interface WhatsAppShareButtonProps {
  documentNumber: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  documentType: 'invoice' | 'quotation' | 'sales_order' | 'purchase_order';
  dueDate?: string | null;
  validUntil?: string | null;
  items?: Array<{ name: string; quantity: number; price: number }>;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export const WhatsAppShareButton = React.memo(function WhatsAppShareButton({
  documentNumber,
  customerName,
  customerPhone,
  totalAmount,
  documentType,
  dueDate,
  validUntil,
  items,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
}: WhatsAppShareButtonProps) {
  const { shareViaWhatsApp } = useWhatsAppShare();

  const handleShare = () => {
    shareViaWhatsApp({
      documentNumber,
      customerName,
      customerPhone,
      totalAmount,
      documentType,
      dueDate,
      validUntil,
      items,
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={cn('gap-2', className)}
      disabled={!customerPhone}
      title={!customerPhone ? 'لا يوجد رقم هاتف للعميل' : 'مشاركة عبر واتساب'}
    >
      <MessageCircle className="h-4 w-4 text-green-500" />
      {showLabel && <span>واتساب</span>}
    </Button>
  );
});
