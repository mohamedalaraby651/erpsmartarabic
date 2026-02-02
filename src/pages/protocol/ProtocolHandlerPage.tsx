import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Link2, AlertCircle } from 'lucide-react';

interface ProtocolAction {
  type: string;
  value: string;
  redirect: string;
}

/**
 * Handles custom protocol URLs like:
 * - web+erp://action/value
 * - web+invoice://INV-001
 * - web+customer://customer-id
 * - web+product://product-id
 */
export default function ProtocolHandlerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [action, setAction] = useState<ProtocolAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const parseProtocolAction = () => {
      const actionParam = searchParams.get('action');
      
      if (!actionParam) {
        setError('لم يتم تحديد إجراء');
        setIsProcessing(false);
        return;
      }

      try {
        // Parse the protocol URL format: protocol://value
        // The action param contains everything after the protocol://
        const decodedAction = decodeURIComponent(actionParam);
        
        // Determine action type based on content
        let protocolAction: ProtocolAction;

        if (decodedAction.startsWith('invoice/') || decodedAction.match(/^INV-\d+/)) {
          const invoiceNumber = decodedAction.replace('invoice/', '');
          protocolAction = {
            type: 'invoice',
            value: invoiceNumber,
            redirect: `/invoices?number=${invoiceNumber}`,
          };
        } else if (decodedAction.startsWith('customer/')) {
          const customerId = decodedAction.replace('customer/', '');
          protocolAction = {
            type: 'customer',
            value: customerId,
            redirect: `/customers/${customerId}`,
          };
        } else if (decodedAction.startsWith('product/')) {
          const productId = decodedAction.replace('product/', '');
          protocolAction = {
            type: 'product',
            value: productId,
            redirect: `/products/${productId}`,
          };
        } else if (decodedAction.startsWith('order/')) {
          const orderId = decodedAction.replace('order/', '');
          protocolAction = {
            type: 'order',
            value: orderId,
            redirect: `/sales-orders/${orderId}`,
          };
        } else if (decodedAction.startsWith('new/')) {
          const entityType = decodedAction.replace('new/', '');
          protocolAction = {
            type: 'new',
            value: entityType,
            redirect: `/${entityType}?action=new`,
          };
        } else {
          // Generic action - try to use as path
          protocolAction = {
            type: 'generic',
            value: decodedAction,
            redirect: `/${decodedAction}`,
          };
        }

        setAction(protocolAction);
        
        // Auto-redirect after a brief delay
        setTimeout(() => {
          navigate(protocolAction.redirect);
        }, 500);

      } catch (err) {
        console.error('[Protocol Handler] Error parsing action:', err);
        setError('فشل في تحليل الرابط');
        setIsProcessing(false);
      }
    };

    parseProtocolAction();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium mb-2">خطأ في معالجة الرابط</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {isProcessing ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">جاري معالجة الرابط...</p>
              {action && (
                <p className="text-muted-foreground">
                  جاري الانتقال إلى {action.type === 'invoice' ? 'الفاتورة' : 
                                     action.type === 'customer' ? 'العميل' :
                                     action.type === 'product' ? 'المنتج' :
                                     action.type === 'order' ? 'الطلب' : 'الصفحة'}...
                </p>
              )}
            </>
          ) : (
            <>
              <Link2 className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">رابط مخصص</p>
              <p className="text-muted-foreground mb-4">
                {action?.value || 'معالجة الرابط'}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
