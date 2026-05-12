import { memo, useCallback, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Eye, CreditCard, Share2, Undo2, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLongPress } from "@/hooks/useLongPress";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  remaining: number;
  onQuickPay?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

/** Long-press on a mobile invoice card → quick contextual actions. */
export const InvoiceLongPressSheet = memo(function InvoiceLongPressSheet({
  invoiceId, invoiceNumber, remaining, onQuickPay, children, className,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);

  const trigger = useCallback(() => {
    haptics.medium();
    setOpen(true);
    setPressing(false);
  }, []);

  const handlers = useLongPress({
    onLongPress: trigger,
    onStart: () => setPressing(true),
    onCancel: () => setPressing(false),
    delay: 500,
  });

  const close = () => setOpen(false);

  const share = async () => {
    const url = `${window.location.origin}/invoices/${invoiceId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `فاتورة ${invoiceNumber}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "تم النسخ", description: "تم نسخ رابط الفاتورة" });
      }
    } catch { /* user cancelled */ }
    close();
  };

  return (
    <>
      <div
        {...handlers}
        className={cn(
          "touch-none select-none transition-transform duration-150",
          pressing && "scale-[0.985]",
          className,
        )}
      >
        {children}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <SheetHeader className="text-right">
            <SheetTitle className="text-base">فاتورة {invoiceNumber}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2">
            {remaining > 0 && onQuickPay && (
              <Button
                variant="default"
                className="justify-start gap-2 min-h-12"
                onClick={() => { onQuickPay(invoiceId); close(); }}
              >
                <CreditCard className="h-4 w-4" />
                سداد سريع
                <span className="ms-auto text-xs opacity-80">{remaining.toLocaleString()} ج.م</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="justify-start gap-2 min-h-12"
              onClick={() => { navigate(`/invoices/${invoiceId}`); close(); }}
            >
              <Eye className="h-4 w-4" /> عرض التفاصيل
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 min-h-12"
              onClick={share}
            >
              <Share2 className="h-4 w-4" /> مشاركة الرابط
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 min-h-12"
              onClick={() => { window.print(); close(); }}
            >
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 min-h-12 text-amber-600 dark:text-amber-400"
              onClick={() => {
                navigate(`/credit-notes`, { state: { prefillInvoiceId: invoiceId } });
                close();
              }}
            >
              <Undo2 className="h-4 w-4" /> تحويل لإشعار دائن
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
