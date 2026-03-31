import React, { memo } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Phone, MapPin, DollarSign } from "lucide-react";
import CustomerAvatar from "./CustomerAvatar";
import { CustomerActionMenu } from "./CustomerActionMenu";
import { cn } from "@/lib/utils";
import { vipColors, vipLabels, getBalanceColor } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomerGridCardProps {
  customer: Customer;
  onClick: () => void;
  onNewInvoice?: () => void;
  onWhatsApp?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  showSelect?: boolean;
  isDeleting?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const CustomerGridCardInner = ({
  customer,
  onClick,
  onNewInvoice,
  onWhatsApp,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  showSelect,
  isDeleting,
  onMouseEnter,
  onMouseLeave,
}: CustomerGridCardProps) => {
  const balance = Number(customer.current_balance || 0);
  const creditLimit = Number(customer.credit_limit || 0);
  const creditUsage = creditLimit > 0 ? Math.min((balance / creditLimit) * 100, 100) : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group relative bg-gradient-to-b from-primary/5 to-transparent",
        isSelected && "ring-2 ring-primary",
        isDeleting && "opacity-60 pointer-events-none",
        customer.is_active === false && "opacity-60",
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isDeleting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-destructive" />
        </div>
      )}
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
            shape="rounded-square"
            vipBorder={customer.vip_level}
          />
          <div className="min-w-0 w-full">
            <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
            <Badge className={cn("mt-1 text-[10px]", vipColors[customer.vip_level as keyof typeof vipColors])}>
              <Crown className="h-2.5 w-2.5 ml-0.5" />
              {vipLabels[customer.vip_level as keyof typeof vipLabels]}
            </Badge>
            {customer.is_active === false && (
              <Badge variant="outline" className="mt-1 text-[10px] text-muted-foreground">غير نشط</Badge>
            )}
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
              <span className={cn("font-bold text-sm", getBalanceColor(balance, creditLimit))}>
                {balance.toLocaleString()} ج.م
              </span>
            </div>
            {creditLimit > 0 && (
              <Progress value={creditUsage} className="h-1 mt-1.5" />
            )}
          </div>

          {/* Quick Actions — always visible on mobile, hover on desktop */}
          <div onClick={(e) => e.stopPropagation()}>
            <CustomerActionMenu
              customer={customer}
              variant="grid"
              canEdit={!!onEdit}
              canDelete={!!onDelete}
              onView={onClick}
              onEdit={() => onEdit?.()}
              onDelete={() => onDelete?.()}
              onNewInvoice={onNewInvoice}
              onWhatsApp={onWhatsApp}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CustomerGridCard = memo(CustomerGridCardInner);
export default CustomerGridCard;
