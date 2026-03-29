import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Phone, MapPin, FileText, MessageSquare, DollarSign, Edit, Trash2 } from "lucide-react";
import CustomerAvatar from "./CustomerAvatar";
import { cn } from "@/lib/utils";
import { vipColors, vipLabels } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomerGridCardProps {
  customer: Customer;
  onClick: () => void;
  onNewInvoice?: () => void;
  onWhatsApp?: () => void;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  showSelect?: boolean;
}

const CustomerGridCardInner = ({
  customer,
  onClick,
  onNewInvoice,
  onWhatsApp,
  isSelected,
  onSelect,
  showSelect,
}: CustomerGridCardProps) => {
  const balance = Number(customer.current_balance || 0);
  const creditLimit = Number(customer.credit_limit || 0);
  const creditUsage = creditLimit > 0 ? Math.min((balance / creditLimit) * 100, 100) : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group relative",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {showSelect && (
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={(c) => onSelect?.(!!c)} />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center gap-3">
          <CustomerAvatar
            name={customer.name}
            imageUrl={customer.image_url}
            customerType={customer.customer_type}
            size="lg"
          />
          <div className="min-w-0 w-full">
            <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
            <Badge className={cn("mt-1 text-[10px]", vipColors[customer.vip_level as keyof typeof vipColors])}>
              <Crown className="h-2.5 w-2.5 ml-0.5" />
              {vipLabels[customer.vip_level as keyof typeof vipLabels]}
            </Badge>
          </div>

          <div className="w-full space-y-1.5 text-xs text-muted-foreground">
            {customer.phone && (
              <div className="flex items-center gap-1.5 justify-center">
                <Phone className="h-3 w-3" />
                <span dir="ltr">{customer.phone}</span>
              </div>
            )}
            {customer.governorate && (
              <div className="flex items-center gap-1.5 justify-center">
                <MapPin className="h-3 w-3" />
                <span>{customer.governorate}</span>
              </div>
            )}
          </div>

          {/* Balance */}
          <div className="w-full pt-2 border-t">
            <div className="flex items-center justify-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              <span className={cn("font-bold text-sm", balance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                {balance.toLocaleString()} ج.م
              </span>
            </div>
            {creditLimit > 0 && creditUsage > 40 && (
              <Progress value={creditUsage} className="h-1 mt-1.5" />
            )}
          </div>

          {/* Quick Actions — always visible on mobile, hover on desktop */}
          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {onNewInvoice && (
              <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:h-7 md:w-7 md:min-h-0 md:min-w-0" onClick={onNewInvoice} title="فاتورة جديدة">
                <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 text-primary" />
              </Button>
            )}
            {onWhatsApp && customer.phone && (
              <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:h-7 md:w-7 md:min-h-0 md:min-w-0" onClick={onWhatsApp} title="واتساب">
                <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5 text-emerald-600" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CustomerGridCard = memo(CustomerGridCardInner);
export default CustomerGridCard;
