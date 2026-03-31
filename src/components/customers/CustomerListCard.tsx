import React, { memo, useState, useCallback, useRef } from 'react';
import { Phone, MapPin, DollarSign, Eye, FileText, CreditCard, ChevronDown, Crown, TrendingUp, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  alertCount?: number;
  hasErrorAlert?: boolean;
}

const vipBorderAccent: Record<string, string> = {
  regular: 'border-s-border',
  silver: 'border-s-zinc-400 dark:border-s-zinc-500',
  gold: 'border-s-amber-500 dark:border-s-amber-400',
  platinum: 'border-s-purple-500 dark:border-s-purple-400',
};

const vipPillStyle: Record<string, string> = {
  silver: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
};

function getCreditBarColor(usage: number): string {
  if (usage < 50) return 'bg-emerald-500';
  if (usage < 80) return 'bg-amber-500';
  return 'bg-destructive';
}

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
        'overflow-hidden border-s-[3px] transition-all duration-200 active:scale-[0.98] shadow-sm',
        vipBorderAccent[customer.vip_level] || vipBorderAccent.regular,
        !isActive && 'opacity-60',
        isSelected && 'ring-2 ring-primary bg-primary/5',
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
        className="p-4 cursor-pointer select-none"
        {...longPress}
      >
        {/* Header row: Avatar + Name + Balance */}
        <div className="flex items-start gap-3">
          <CustomerAvatar
            name={customer.name}
            imageUrl={customer.image_url}
            customerType={customer.customer_type}
            size="md"
            shape="rounded-square"
            vipBorder={customer.vip_level}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm truncate">{customer.name}</h3>
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )} />
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">
                    {typeLabels[customer.customer_type] || customer.customer_type}
                  </span>
                  {customer.vip_level !== 'regular' && (
                    <span className={cn(
                      'inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      vipPillStyle[customer.vip_level],
                    )}>
                      <Crown className="h-2.5 w-2.5" />
                      {vipLabels[customer.vip_level]}
                    </span>
                  )}
                </div>
              </div>
              {/* Balance on top right */}
              <div className="text-left shrink-0">
                <p className={cn('font-bold text-sm tabular-nums', balanceColor)}>
                  {balance.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">ج.م</p>
              </div>
            </div>
            {/* Location & phone */}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
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
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground/50 transition-transform shrink-0 mt-1',
            expanded && 'rotate-180',
          )} />
        </div>

        {/* Credit bar */}
        {creditLimit > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getCreditBarColor(creditUsage))}
                style={{ width: `${creditUsage}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{Math.round(creditUsage)}%</span>
          </div>
        )}

        {/* Expanded content */}
        <div className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? 'max-h-[350px] opacity-100 mt-3' : 'max-h-0 opacity-0',
        )}>
          <div className="border-t border-border/40 pt-3 animate-fade-in space-y-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10 dark:from-destructive/10 dark:to-destructive/20 p-3 text-center">
                <p className={cn('text-base font-bold tabular-nums', balanceColor)}>{balance.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">مستحق</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-3 text-center">
                <p className="text-base font-bold tabular-nums">{totalPurchases.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">مشتريات</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/10 dark:to-emerald-500/20 p-3 text-center">
                <p className={cn(
                  'text-base font-bold tabular-nums',
                  paymentRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : paymentRatio >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                )}>
                  {paymentRatio}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">نسبة السداد</p>
              </div>
            </div>

            {/* Last activity */}
            {(customer.last_activity_at || customer.last_transaction_date) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>آخر نشاط: {new Date(customer.last_activity_at || customer.last_transaction_date!).toLocaleDateString('ar-EG')}</span>
                {invoiceCount > 0 && (
                  <span className="mr-auto flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {invoiceCount} فاتورة
                  </span>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                className="flex-1 min-h-11 text-xs font-medium shadow-sm"
                onClick={(e) => { e.stopPropagation(); onNavigate(customer.id); }}
              >
                <Eye className="h-4 w-4 ml-1.5" /> عرض التفاصيل
              </Button>
              {onNewInvoice && (
                <Button
                  variant="outline"
                  className="flex-1 min-h-11 text-xs font-medium"
                  onClick={(e) => { e.stopPropagation(); onNewInvoice(customer.id); }}
                >
                  <FileText className="h-4 w-4 ml-1.5" /> فاتورة
                </Button>
              )}
              {onNewPayment && (
                <Button
                  variant="outline"
                  className="flex-1 min-h-11 text-xs font-medium"
                  onClick={(e) => { e.stopPropagation(); onNewPayment(customer.id); }}
                >
                  <CreditCard className="h-4 w-4 ml-1.5" /> دفعة
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
