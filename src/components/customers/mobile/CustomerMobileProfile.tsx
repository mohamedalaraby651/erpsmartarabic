import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Crown, FileText, Printer, Phone, MessageSquare, MapPin,
  CreditCard, Target, Percent, TrendingUp, MoreHorizontal,
  Edit, Wallet, Globe, ShoppingCart, Receipt, UserCheck, UserX,
  ArrowRight, ArrowLeft,
} from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import ImageUpload from "@/components/shared/ImageUpload";
import { CustomerKPICards } from "@/components/customers/CustomerKPICards";
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
  // Navigation
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // Embedded stats
  currentBalance?: number;
  balanceIsDebit?: boolean;
  creditLimit?: number;
  creditUsagePercent?: number;
  totalOutstanding?: number;
  paymentRatio?: number;
  totalPurchases?: number;
  invoices?: Invoice[];
  payments?: Payment[];
  // Quick actions
  onNewPayment?: () => void;
  onNewQuotation?: () => void;
  onNewOrder?: () => void;
  onNewCreditNote?: () => void;
  onToggleActive?: () => void;
}

export const CustomerMobileProfile = memo(function CustomerMobileProfile({
  customer, customerId, onEdit, onNewInvoice, onStatement, onWhatsApp, onImageUpdate,
  onPrev, onNext, hasPrev, hasNext,
  currentBalance = 0, balanceIsDebit = false, totalOutstanding = 0, paymentRatio = 0, totalPurchases = 0, invoices = [], payments = [],
  onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote, onToggleActive,
}: CustomerMobileProfileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
      <CardContent className="p-5">
        {/* Navigation arrows */}
        {(hasPrev || hasNext) && (
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={onPrev} className="min-h-11 min-w-11">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" disabled={!hasNext} onClick={onNext} className="min-h-11 min-w-11">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Avatar + VIP centered */}
        <div className="flex flex-col items-center text-center gap-3 mb-4">
          <div className="relative">
            <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="xl" />
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
            <div className="flex items-center justify-center gap-2 mt-1">
              {onToggleActive ? (
                <button onClick={onToggleActive} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer", customer.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {customer.is_active ? <UserCheck className="h-2.5 w-2.5" /> : <UserX className="h-2.5 w-2.5" />}
                  {customer.is_active ? "نشط" : "غير نشط"}
                </button>
              ) : (
                <Badge variant={customer.is_active ? "default" : "secondary"} className="text-[10px]">
                  {customer.is_active ? "نشط" : "غير نشط"}
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
        </div>

        {/* Quick contact buttons */}
        <div className="flex gap-2 mb-4">
          {customer.phone && (
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" asChild>
              <a href={`tel:${customer.phone}`}>
                <Phone className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />اتصال
              </a>
            </Button>
          )}
          {customer.phone && (
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs border-emerald-200 dark:border-emerald-800" onClick={onWhatsApp}>
              <MessageSquare className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />واتساب
            </Button>
          )}
        </div>

        {/* Action buttons: primary + "more" sheet */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-10" onClick={onNewInvoice}>
            <FileText className="h-4 w-4 ml-1.5" />فاتورة جديدة
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-10" onClick={onStatement}>
            <Printer className="h-4 w-4 ml-1.5" />كشف حساب
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>إجراءات سريعة</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 mt-4 pb-4">
                <SheetAction icon={Edit} label="تعديل البيانات" onClick={() => { setSheetOpen(false); onEdit(); }} />
                {onNewPayment && <SheetAction icon={Wallet} label="تسجيل دفعة" onClick={() => { setSheetOpen(false); onNewPayment(); }} />}
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

function MiniStat({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="text-center min-w-0">
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", color)} />
      <p className={cn("text-xs font-bold leading-tight", color)}>{value}</p>
      <p className="text-[9px] text-muted-foreground truncate">{label}</p>
    </div>
  );
}

function SheetAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="h-14 flex-col gap-1" onClick={onClick}>
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}
