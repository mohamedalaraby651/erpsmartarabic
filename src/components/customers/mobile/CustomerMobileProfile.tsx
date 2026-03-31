import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, FileText, Printer, Phone, MessageSquare, MapPin, CreditCard, Target, Percent, TrendingUp } from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import ImageUpload from "@/components/shared/ImageUpload";
import { vipColors, vipLabels } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import { cn } from "@/lib/utils";

interface CustomerMobileProfileProps {
  customer: Customer;
  customerId: string;
  onEdit: () => void;
  onNewInvoice: () => void;
  onStatement: () => void;
  onWhatsApp: () => void;
  onImageUpdate: (url: string | null) => void;
  // Embedded stats
  currentBalance?: number;
  balanceIsDebit?: boolean;
  creditLimit?: number;
  creditUsagePercent?: number;
  totalOutstanding?: number;
  paymentRatio?: number;
  totalPurchases?: number;
}

export const CustomerMobileProfile = memo(function CustomerMobileProfile({
  customer, customerId, onEdit, onNewInvoice, onStatement, onWhatsApp, onImageUpdate,
  currentBalance = 0, balanceIsDebit = false, creditLimit = 0, creditUsagePercent = 0,
  totalOutstanding = 0, paymentRatio = 0, totalPurchases = 0,
}: CustomerMobileProfileProps) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
      <CardContent className="p-5">
        {/* Avatar + VIP centered */}
        <div className="flex flex-col items-center text-center gap-3 mb-4">
          <div className="relative">
            <CustomerAvatar
              name={customer.name}
              imageUrl={customer.image_url}
              customerType={customer.customer_type}
              size="xl"
            />
            <div className="absolute -bottom-1 -left-1">
              <ImageUpload
                currentImageUrl={customer.image_url}
                onImageUploaded={(url) => onImageUpdate(url)}
                onImageRemoved={() => onImageUpdate(null)}
                bucket="customer-images"
                folder={customerId}
                showAvatar={false}
              />
            </div>
            {/* VIP badge on top-right */}
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
              <Badge variant={customer.is_active ? "default" : "secondary"} className="text-[10px]">
                {customer.is_active ? "نشط" : "غير نشط"}
              </Badge>
            </div>
          </div>

          {/* Location */}
          {(customer.governorate || customer.city) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {customer.governorate}{customer.city && ` - ${customer.city}`}
            </div>
          )}
        </div>

        {/* Embedded Mini Stats — 4 compact stats in a row */}
        <div className="grid grid-cols-4 gap-2 mb-4 p-2.5 rounded-lg bg-muted/30 border">
          <MiniStat
            icon={CreditCard}
            label="الرصيد"
            value={`${currentBalance.toLocaleString()}`}
            color={balanceIsDebit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}
          />
          <MiniStat
            icon={Target}
            label="المستحق"
            value={`${totalOutstanding.toLocaleString()}`}
            color={totalOutstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}
          />
          <MiniStat
            icon={Percent}
            label="السداد"
            value={`${paymentRatio.toFixed(0)}%`}
            color={paymentRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : paymentRatio >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}
          />
          <MiniStat
            icon={TrendingUp}
            label="المشتريات"
            value={`${totalPurchases >= 1000 ? `${(totalPurchases / 1000).toFixed(0)}K` : totalPurchases.toLocaleString()}`}
            color="text-primary"
          />
        </div>

        {/* Quick contact buttons */}
        <div className="flex gap-2 mb-4">
          {customer.phone && (
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" asChild>
              <a href={`tel:${customer.phone}`}>
                <Phone className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />
                اتصال
              </a>
            </Button>
          )}
          {customer.phone && (
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs border-emerald-200 dark:border-emerald-800" onClick={onWhatsApp}>
              <MessageSquare className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />
              واتساب
            </Button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-10" onClick={onNewInvoice}>
            <FileText className="h-4 w-4 ml-1.5" />
            فاتورة جديدة
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-10" onClick={onStatement}>
            <Printer className="h-4 w-4 ml-1.5" />
            كشف حساب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

function MiniStat({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center min-w-0">
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", color)} />
      <p className={cn("text-xs font-bold leading-tight", color)}>{value}</p>
      <p className="text-[9px] text-muted-foreground truncate">{label}</p>
    </div>
  );
}
