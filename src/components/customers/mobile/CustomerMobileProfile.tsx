import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Crown, FileText, Printer, Phone, MessageSquare, MapPin,
  Target, MoreHorizontal, Copy, Check,
  Edit, Wallet, Globe, ShoppingCart, Receipt, UserCheck, UserX,
} from "lucide-react";
import CustomerAvatar from "@/components/customers/shared/CustomerAvatar";
import ImageUpload from "@/components/shared/ImageUpload";
import { CustomerKPICards } from "@/components/customers/details/CustomerKPICards";
import { vipColors, vipLabels } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

interface CustomerMobileProfileProps {
  customer: Customer;
  customerId: string;
  onEdit: () => void;
  onNewInvoice: () => void;
  onStatement: () => void;
  onWhatsApp: () => void;
  onImageUpdate: (url: string | null) => void;
  currentBalance?: number;
  balanceIsDebit?: boolean;
  creditLimit?: number;
  creditUsagePercent?: number;
  totalOutstanding?: number;
  paymentRatio?: number;
  totalPurchases?: number;
  invoices?: Invoice[];
  payments?: Payment[];
  onNewPayment?: () => void;
  onNewQuotation?: () => void;
  onNewOrder?: () => void;
  onNewCreditNote?: () => void;
  onToggleActive?: () => void;
}

export const CustomerMobileProfile = memo(function CustomerMobileProfile({
  customer, customerId, onEdit, onNewInvoice, onStatement, onWhatsApp, onImageUpdate,
  currentBalance = 0, balanceIsDebit = false, creditLimit, creditUsagePercent, totalOutstanding = 0, paymentRatio = 0, totalPurchases = 0, invoices = [], payments = [],
  onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote, onToggleActive,
}: CustomerMobileProfileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
      <CardContent className="p-5">
        {/* Avatar + VIP centered */}
        <div className="flex flex-col items-center text-center gap-3 mb-4">
          <div className="relative">
            <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="lg" />
            <div className="absolute -bottom-1 -left-1">
              <ImageUpload currentImageUrl={customer.image_url} onImageUploaded={(url) => onImageUpdate(url)} onImageRemoved={() => onImageUpdate(null)} bucket="customer-images" folder={customerId} showAvatar={false} />
            </div>
            <Badge className={`absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 ${vipColors[customer.vip_level] || vipColors.regular}`}>
              <Crown className="h-2.5 w-2.5 ml-0.5" />
              {vipLabels[customer.vip_level] || vipLabels.regular}
            </Badge>
          </div>

          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <p className="text-sm text-muted-foreground">
              {customer.customer_type === 'company' ? 'شركة' : customer.customer_type === 'farm' ? 'مزرعة' : 'فرد'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              {onToggleActive ? (
                <button
                  onClick={onToggleActive}
                  aria-label={customer.is_active ? "تعطيل العميل" : "تفعيل العميل"}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer min-h-7",
                    "transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    customer.is_active
                      ? "bg-success/10 text-success hover:bg-success/15"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {customer.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                  {customer.is_active ? "نشط" : "غير نشط"}
                  <span className="sr-only">{customer.is_active ? "العميل نشط حالياً — اضغط للتعطيل" : "العميل غير نشط — اضغط للتفعيل"}</span>
                </button>
              ) : (
                <Badge variant={customer.is_active ? "default" : "secondary"} className="text-xs px-3 py-1">
                  {customer.is_active ? "نشط" : "غير نشط"}
                  <span className="sr-only">{customer.is_active ? "حالة العميل: نشط" : "حالة العميل: غير نشط"}</span>
                </Badge>
              )}
            </div>
          </div>

          {(customer.governorate || customer.city) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {customer.governorate}{customer.city && ` - ${customer.city}`}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="mb-4">
          <CustomerKPICards
            currentBalance={currentBalance}
            balanceIsDebit={balanceIsDebit}
            totalOutstanding={totalOutstanding}
            totalPurchases={totalPurchases}
            invoices={invoices}
            payments={payments}
            compact
          />
          {/* Credit usage indicator — only when there's an actual credit limit */}
          {creditLimit != null && creditLimit > 0 && creditUsagePercent != null && (() => {
            const available = Math.round((creditLimit - currentBalance) * 100) / 100;
            const tone = creditUsagePercent > 90
              ? { text: 'text-destructive', bar: 'bg-destructive' }
              : creditUsagePercent > 70
                ? { text: 'text-warning', bar: 'bg-warning' }
                : { text: 'text-success', bar: 'bg-success' };
            return (
              <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border text-xs" role="meter" aria-valuenow={creditUsagePercent} aria-valuemin={0} aria-valuemax={100} aria-label={`استخدام حد الائتمان ${creditUsagePercent.toFixed(0)}%`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    حد الائتمان: {creditLimit.toLocaleString()} ج.م
                  </span>
                  <span className={cn("font-bold tabular-nums", tone.text)}>
                    {creditUsagePercent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", tone.bar)}
                    style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-muted-foreground">المتاح للسحب</span>
                  <span className={cn("font-semibold tabular-nums", available > 0 ? 'text-success' : 'text-destructive')}>
                    {available.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Primary actions FIRST */}
        <div className="flex gap-2 mb-2">
          <Button size="sm" className="flex-1 min-h-11" onClick={onNewInvoice} aria-label="إنشاء فاتورة جديدة">
            <FileText className="h-4 w-4 ml-1.5" />فاتورة جديدة
          </Button>
          {onNewPayment && (
            <Button size="sm" variant="secondary" className="flex-1 min-h-11" onClick={onNewPayment} aria-label="تسجيل دفعة جديدة">
              <Wallet className="h-4 w-4 ml-1.5" />دفعة
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1 min-h-11" onClick={onStatement} aria-label="عرض كشف الحساب">
            <Printer className="h-4 w-4 ml-1.5" />كشف
          </Button>
        </div>

        {/* Secondary: contact + more */}
        <div className="flex gap-2">
          {customer.phone ? (
            <>
              <Button variant="outline" size="sm" className="flex-1 min-h-11 text-xs" asChild aria-label={`اتصال بـ ${customer.phone}`}>
                <a href={`tel:${customer.phone}`}>
                  <Phone className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />اتصال
                </a>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 min-h-11 text-xs border-emerald-200 dark:border-emerald-800" onClick={onWhatsApp} aria-label="فتح محادثة واتساب">
                <MessageSquare className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />واتساب
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11 shrink-0"
                aria-label="نسخ رقم الهاتف"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(customer.phone!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch { /* clipboard unavailable */ }
                }}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 min-h-11 text-xs" onClick={onEdit} aria-label="إضافة رقم هاتف">
              <Phone className="h-3.5 w-3.5 ml-1 text-muted-foreground" />إضافة رقم هاتف
            </Button>
          )}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="خيارات إضافية">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>إجراءات سريعة</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 mt-4 pb-4">
                <SheetAction icon={Edit} label="تعديل البيانات" onClick={() => { setSheetOpen(false); onEdit(); }} />
                {onNewQuotation && <SheetAction icon={Globe} label="عرض سعر" onClick={() => { setSheetOpen(false); onNewQuotation(); }} />}
                {onNewOrder && <SheetAction icon={ShoppingCart} label="أمر بيع" onClick={() => { setSheetOpen(false); onNewOrder(); }} />}
                {onNewCreditNote && <SheetAction icon={Receipt} label="إشعار دائن" onClick={() => { setSheetOpen(false); onNewCreditNote(); }} />}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
});


function SheetAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="h-14 flex-col gap-1" onClick={onClick} aria-label={label}>
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}
