import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Crown, FileText, Printer, Phone, MessageSquare, MapPin,
  MoreHorizontal, Copy, Check, AlertTriangle, Bell,
  Edit, Wallet, Globe, ShoppingCart, Receipt, UserCheck, UserX, Target,
} from "lucide-react";
import CustomerAvatar from "@/components/customers/shared/CustomerAvatar";
import ImageUpload from "@/components/shared/ImageUpload";
import { CustomerKPICards } from "@/components/customers/details/CustomerKPICards";
import { vipColors, vipLabels } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

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
  onChangeVip?: (level: string) => void;
  /** عدد الفواتير المتأخرة — لإظهار شريط "إرسال تذكير" */
  overdueCount?: number;
  /** فتح قسم التذكيرات */
  onOpenReminders?: () => void;
}

export const CustomerMobileProfile = memo(function CustomerMobileProfile({
  customer, customerId, onEdit, onNewInvoice, onStatement, onWhatsApp, onImageUpdate,
  currentBalance = 0, balanceIsDebit = false, creditLimit, creditUsagePercent,
  totalOutstanding = 0, totalPurchases = 0, invoices = [], payments = [],
  onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote, onToggleActive, onChangeVip,
  overdueCount = 0, onOpenReminders,
}: CustomerMobileProfileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [vipSheetOpen, setVipSheetOpen] = useState(false);
  const [creditSheetOpen, setCreditSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const vipLongPress = useLongPress({
    onLongPress: () => { if (onChangeVip) { haptics.medium(); setVipSheetOpen(true); } },
    delay: 450,
  });

  const customerTypeLabel =
    customer.customer_type === 'company' ? 'شركة' :
    customer.customer_type === 'farm' ? 'مزرعة' : 'فرد';

  const creditTone =
    creditUsagePercent != null && creditUsagePercent > 90 ? 'bg-destructive' :
    creditUsagePercent != null && creditUsagePercent > 70 ? 'bg-warning' : 'bg-success';

  const handleCopyPhone = async () => {
    if (!customer.phone) return;
    try {
      await navigator.clipboard.writeText(customer.phone);
      setCopied(true);
      toast.success("تم نسخ الرقم", { description: customer.phone });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("تعذّر نسخ الرقم");
    }
  };

  return (
    <Card className="border-0 shadow-md bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
      <CardContent className="p-3.5">
        {/* === Compact horizontal hero === */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <CustomerAvatar
              name={customer.name}
              imageUrl={customer.image_url}
              customerType={customer.customer_type}
              size="md"
            />
            <div className="absolute -bottom-1 -left-1 scale-75 origin-bottom-left">
              <ImageUpload
                currentImageUrl={customer.image_url}
                onImageUploaded={(url) => onImageUpdate(url)}
                onImageRemoved={() => onImageUpdate(null)}
                bucket="customer-images"
                folder={customerId}
                showAvatar={false}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base font-bold leading-tight truncate">{customer.name}</h1>
              {onChangeVip ? (
                <button
                  type="button"
                  {...vipLongPress}
                  aria-label={`المستوى: ${vipLabels[customer.vip_level] || vipLabels.regular} — اضغط مطولاً للتغيير`}
                  className={cn(
                    "inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md font-medium",
                    vipColors[customer.vip_level] || vipColors.regular,
                  )}
                >
                  <Crown className="h-2.5 w-2.5 ml-0.5" />
                  {vipLabels[customer.vip_level] || vipLabels.regular}
                </button>
              ) : (
                <Badge className={cn("text-[9px] px-1.5 py-0.5", vipColors[customer.vip_level] || vipColors.regular)}>
                  <Crown className="h-2.5 w-2.5 ml-0.5" />
                  {vipLabels[customer.vip_level] || vipLabels.regular}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-foreground/75 flex-wrap">
              <span>{customerTypeLabel}</span>
              {(customer.governorate || customer.city) && (
                <>
                  <span className="text-muted-foreground/60" aria-hidden>·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" aria-hidden />
                    {[customer.governorate, customer.city].filter(Boolean).join(' - ')}
                  </span>
                </>
              )}
            </div>

            {/* Status pill — inline + small */}
            <div className="mt-1.5">
              {onToggleActive ? (
                <button
                  onClick={() => { onToggleActive(); toast.success(customer.is_active ? "تم تعطيل العميل" : "تم تفعيل العميل"); }}
                  aria-pressed={!!customer.is_active}
                  aria-label={customer.is_active ? "العميل نشط — اضغط للتعطيل" : "العميل غير نشط — اضغط للتفعيل"}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold min-h-7 cursor-pointer",
                    "transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    customer.is_active ? "bg-success/15 text-success" : "bg-muted text-foreground/80",
                  )}
                >
                  {customer.is_active ? <UserCheck className="h-3 w-3" aria-hidden /> : <UserX className="h-3 w-3" aria-hidden />}
                  {customer.is_active ? "نشط" : "غير نشط"}
                </button>
              ) : (
                <Badge variant={customer.is_active ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                  {customer.is_active ? "نشط" : "غير نشط"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* === Credit bar (thin, tappable for details) === */}
        {creditLimit != null && creditLimit > 0 && creditUsagePercent != null && (
          <button
            type="button"
            onClick={() => setCreditSheetOpen(true)}
            className="mt-3 w-full text-right group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            aria-label={`حد الائتمان مستخدَم بنسبة ${creditUsagePercent.toFixed(0)} بالمئة من ${creditLimit.toLocaleString()} جنيه — اضغط للتفاصيل`}
          >
            <div className="flex items-center justify-between text-[11px] text-foreground/75 mb-1">
              <span className="inline-flex items-center gap-1">
                <Target className="h-2.5 w-2.5" aria-hidden />
                حد الائتمان
              </span>
              <span className={cn(
                "font-bold tabular-nums",
                creditUsagePercent > 90 ? "text-destructive" :
                creditUsagePercent > 70 ? "text-warning" : "text-success",
              )}>
                {creditUsagePercent.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(creditUsagePercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="نسبة استخدام حد الائتمان"
            >
              <div
                className={cn("h-full rounded-full transition-all", creditTone)}
                style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
              />
            </div>
          </button>
        )}

        {/* === KPIs (compact, 2 cols) === */}
        <div className="mt-3">
          <CustomerKPICards
            currentBalance={currentBalance}
            balanceIsDebit={balanceIsDebit}
            totalOutstanding={totalOutstanding}
            totalPurchases={totalPurchases}
            invoices={invoices}
            payments={payments}
            compact
          />
        </div>

        {/* === Overdue → reminder contextual bar === */}
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={onOpenReminders}
            className="mt-2.5 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs min-h-11 active:scale-[0.99] transition-transform"
            aria-label={`${overdueCount} فواتير متأخرة — افتح التذكيرات`}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount} {overdueCount === 1 ? 'فاتورة متأخرة' : 'فواتير متأخرة'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium">
              <Bell className="h-3 w-3" />
              إرسال تذكير
            </span>
          </button>
        )}

        {/* === Single action row (4 buttons max) === */}
        <div className="flex gap-1.5 mt-3">
          <Button size="sm" className="flex-1 min-h-11 px-2 text-xs" onClick={onNewInvoice} aria-label="فاتورة جديدة">
            <FileText className="h-4 w-4 ml-1" />فاتورة
          </Button>
          {onNewPayment && (
            <Button size="sm" variant="secondary" className="flex-1 min-h-11 px-2 text-xs" onClick={onNewPayment} aria-label="تسجيل دفعة">
              <Wallet className="h-4 w-4 ml-1" />دفعة
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1 min-h-11 px-2 text-xs" onClick={onStatement} aria-label="كشف الحساب">
            <Printer className="h-4 w-4 ml-1" />كشف
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="إجراءات إضافية">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>إجراءات سريعة</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2.5 mt-4 pb-4">
                {customer.phone && (
                  <SheetAction icon={Phone} label="اتصال" onClick={() => { setSheetOpen(false); window.open(`tel:${customer.phone}`); }} tone="success" />
                )}
                {customer.phone && (
                  <SheetAction icon={MessageSquare} label="واتساب" onClick={() => { setSheetOpen(false); onWhatsApp(); }} tone="success" />
                )}
                {customer.phone && (
                  <SheetAction icon={copied ? Check : Copy} label={copied ? "تم النسخ" : "نسخ الرقم"} onClick={() => { handleCopyPhone(); setSheetOpen(false); }} />
                )}
                <SheetAction icon={Edit} label="تعديل" onClick={() => { setSheetOpen(false); onEdit(); }} />
                {onNewQuotation && <SheetAction icon={Globe} label="عرض سعر" onClick={() => { setSheetOpen(false); onNewQuotation(); }} />}
                {onNewOrder && <SheetAction icon={ShoppingCart} label="أمر بيع" onClick={() => { setSheetOpen(false); onNewOrder(); }} />}
                {onNewCreditNote && <SheetAction icon={Receipt} label="إشعار دائن" onClick={() => { setSheetOpen(false); onNewCreditNote(); }} />}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>

      {/* VIP level changer */}
      {onChangeVip && (
        <Sheet open={vipSheetOpen} onOpenChange={setVipSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>تغيير مستوى العميل</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 mt-4 pb-4">
              {Object.keys(vipLabels).map((level) => (
                <Button
                  key={level}
                  variant={customer.vip_level === level ? "default" : "outline"}
                  className="h-12"
                  onClick={() => { onChangeVip(level); setVipSheetOpen(false); toast.success(`تم تغيير المستوى إلى ${vipLabels[level]}`); }}
                >
                  <Crown className="h-4 w-4 ml-2" />
                  {vipLabels[level]}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Credit details sheet */}
      {creditLimit != null && creditLimit > 0 && (
        <Sheet open={creditSheetOpen} onOpenChange={setCreditSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>تفاصيل حد الائتمان</SheetTitle>
            </SheetHeader>
            <div className="space-y-3 mt-4 pb-4 text-sm">
              <Row label="الحد الكلي" value={`${creditLimit.toLocaleString()} ج.م`} />
              <Row label="الرصيد الحالي" value={`${currentBalance.toLocaleString()} ج.م`} valueClass={balanceIsDebit ? "text-destructive" : "text-success"} />
              <Row
                label="المتاح للسحب"
                value={`${Math.round((creditLimit - currentBalance) * 100) / 100} ج.م`}
                valueClass={(creditLimit - currentBalance) > 0 ? "text-success" : "text-destructive"}
              />
              {creditUsagePercent != null && creditUsagePercent > 90 && (
                <Button className="w-full mt-2" onClick={() => { setCreditSheetOpen(false); onEdit(); }}>
                  مراجعة / تعديل الحد
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
});

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}

function SheetAction({
  icon: Icon, label, onClick, tone,
}: { icon: React.ElementType; label: string; onClick: () => void; tone?: 'success' }) {
  return (
    <Button
      variant="outline"
      className={cn("h-16 flex-col gap-1 px-1", tone === 'success' && "border-success/30")}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className={cn("h-5 w-5", tone === 'success' && "text-success")} />
      <span className="text-[11px]">{label}</span>
    </Button>
  );
}
