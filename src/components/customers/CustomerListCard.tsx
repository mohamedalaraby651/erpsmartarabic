import React, { memo, useState, useCallback, useRef } from 'react';
import { Phone, MapPin, DollarSign, Eye, FileText, CreditCard, ChevronDown, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import CustomerAvatar from './CustomerAvatar';
import { cn } from '@/lib/utils';
import { vipColors, vipLabels, typeLabels, getBalanceColor } from '@/lib/customerConstants';
import type { Customer } from '@/lib/customerConstants';
import { useLongPress } from '@/hooks/useLongPress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomerListCardProps {
  customer: Customer;
  onNavigate: (id: string) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (id: string) => void;
  onNewInvoice?: (id: string) => void;
  onNewPayment?: (id: string) => void;
  animationDelay?: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  selectionMode?: boolean;
}

const vipBorderAccent: Record<string, string> = {
  regular: 'border-s-muted-foreground/30',
  silver: 'border-s-zinc-400 dark:border-s-zinc-500',
  gold: 'border-s-amber-500 dark:border-s-amber-400',
  platinum: 'border-s-purple-500 dark:border-s-purple-400',
};

const CustomerListCardInner = ({
  customer,
  onNavigate,
  onEdit,
  onDelete,
  onNewInvoice,
  onNewPayment,
  animationDelay = 0,
  isSelected,
  onSelect,
  selectionMode,
}: CustomerListCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const balance = Number(customer.current_balance || 0);
  const creditLimit = Number(customer.credit_limit || 0);
  const creditUsage = creditLimit > 0 ? Math.min((balance / creditLimit) * 100, 100) : 0;
  const totalPurchases = Number(customer.total_purchases_cached || 0);
  const invoiceCount = Number(customer.invoice_count_cached || 0);
  const paymentRatio = totalPurchases > 0 ? Math.round(((totalPurchases - balance) / totalPurchases) * 100) : 100;
  const isActive = customer.is_active !== false;
  const balanceColor = getBalanceColor(balance, creditLimit);

  const handleToggle = useCallback(() => {
    if (selectionMode) {
      onSelect?.(customer.id);
      return;
    }
    setExpanded(prev => !prev);
  }, [selectionMode, onSelect, customer.id]);

  const longPress = useLongPress({
    onLongPress: () => {
      if (!selectionMode) {
        setMenuOpen(true);
      } else {
        onSelect?.(customer.id);
      }
    },
    onPress: handleToggle,
    delay: 500,
  });

  return (
    <Card
      className={cn(
        'overflow-hidden border-s-4 transition-all duration-200 active:scale-[0.98]',
        'bg-gradient-to-b from-primary/5 to-transparent',
        vipBorderAccent[customer.vip_level] || vipBorderAccent.regular,
        !isActive && 'opacity-60',
        isSelected && 'ring-2 ring-primary',
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button ref={menuTriggerRef} className="sr-only" tabIndex={-1}>menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px]">
          <DropdownMenuItem onClick={() => onNavigate(customer.id)}>
            <Eye className="h-4 w-4 ml-2" /> عرض التفاصيل
          </DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(customer)}>
              <FileText className="h-4 w-4 ml-2" /> تعديل
            </DropdownMenuItem>
          )}
          {onNewInvoice && (
            <DropdownMenuItem onClick={() => onNewInvoice(customer.id)}>
              <FileText className="h-4 w-4 ml-2" /> فاتورة جديدة
            </DropdownMenuItem>
          )}
          {onNewPayment && (
            <DropdownMenuItem onClick={() => onNewPayment(customer.id)}>
              <CreditCard className="h-4 w-4 ml-2" /> دفعة جديدة
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(customer.id)}>
              حذف
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        className="p-3 cursor-pointer select-none"
        {...longPress}
      >
        {/* Collapsed content */}
        <div className="flex items-start gap-3">
          <CustomerAvatar
            name={customer.name}
            imageUrl={customer.image_url}
            customerType={customer.customer_type}
            size="sm"
            shape="rounded-square"
            vipBorder={customer.vip_level}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
                <span className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                )} />
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                expanded && 'rotate-180',
              )} />
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {typeLabels[customer.customer_type] || customer.customer_type}
              </span>
              {customer.vip_level !== 'regular' && (
                <Badge className={cn('text-[10px] px-1.5 py-0', vipColors[customer.vip_level])}>
                  <Crown className="h-2.5 w-2.5 ml-0.5" />
                  {vipLabels[customer.vip_level]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {customer.governorate && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{customer.governorate}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1" dir="ltr">
                  <Phone className="h-3 w-3" />{customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={cn('font-bold text-sm', balanceColor)}>
              {balance.toLocaleString()} ج.م
            </span>
          </div>
          {creditLimit > 0 && (
            <div className="flex items-center gap-2 flex-1 max-w-[120px] mr-3">
              <Progress value={creditUsage} className="h-1.5" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{Math.round(creditUsage)}%</span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        <div className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? 'max-h-[300px] opacity-100 mt-3' : 'max-h-0 opacity-0',
        )}>
          <div className="border-t border-border/50 pt-3 animate-fade-in">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className={cn('text-sm font-bold', balanceColor)}>{balance.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">مستحق</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-sm font-bold">{totalPurchases.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">مشتريات</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className={cn('text-sm font-bold', paymentRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : paymentRatio >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
                  {paymentRatio}%
                </p>
                <p className="text-[10px] text-muted-foreground">نسبة السداد</p>
              </div>
            </div>

            {/* Last activity */}
            {(customer.last_activity_at || customer.last_transaction_date) && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>آخر نشاط: {new Date(customer.last_activity_at || customer.last_transaction_date!).toLocaleDateString('ar-EG')}</span>
                {invoiceCount > 0 && <span className="mr-auto">{invoiceCount} فاتورة</span>}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); onNavigate(customer.id); }}>
                <Eye className="h-3 w-3 ml-1" /> عرض
              </Button>
              {onNewInvoice && (
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); onNewInvoice(customer.id); }}>
                  <FileText className="h-3 w-3 ml-1" /> فاتورة
                </Button>
              )}
              {onNewPayment && (
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); onNewPayment(customer.id); }}>
                  <CreditCard className="h-3 w-3 ml-1" /> دفعة
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const CustomerListCard = memo(CustomerListCardInner);
export default CustomerListCard;
