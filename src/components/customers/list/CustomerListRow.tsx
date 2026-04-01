import React, { memo, useState } from 'react';
import { Phone, MapPin, FileText, CreditCard, Crown, MessageCircle, Edit2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerAvatar from '@/components/customers/shared/CustomerAvatar';
import { cn } from '@/lib/utils';
import { vipLabels, typeLabels, getBalanceColor } from '@/lib/customerConstants';
import type { Customer } from '@/lib/customerConstants';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerListRowProps {
  customer: Customer;
  onNavigate: (id: string) => void;
  onEdit?: (customer: Customer) => void;
  onNewInvoice?: (id: string) => void;
  onNewPayment?: (id: string) => void;
  onWhatsApp?: (phone: string) => void;
  onRowHover?: (id: string) => void;
  onRowLeave?: () => void;
  visibleColumns?: string[];
  alertCount?: number;
  hasErrorAlert?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string, checked: boolean) => void;
}

const vipBorderAccent: Record<string, string> = {
  regular: 'border-s-transparent',
  silver: 'border-s-muted-foreground/40',
  gold: 'border-s-amber-500 dark:border-s-amber-400',
  platinum: 'border-s-purple-500 dark:border-s-purple-400',
};

const vipPillStyle: Record<string, string> = {
  silver: 'bg-muted text-muted-foreground',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
};

const DEFAULT_COLUMNS = ['name', 'type', 'vip', 'phone', 'governorate', 'balance', 'status'];

const CustomerListRowInner = ({
  customer, onNavigate, onEdit, onNewInvoice, onNewPayment, onWhatsApp,
  onRowHover, onRowLeave, visibleColumns, alertCount, hasErrorAlert,
  isSelected, onToggleSelect,
}: CustomerListRowProps) => {
  const [hovered, setHovered] = useState(false);
  const balance = Number(customer.current_balance || 0);
  const creditLimit = Number(customer.credit_limit || 0);
  const isActive = customer.is_active !== false;
  const balanceColor = getBalanceColor(balance, creditLimit);
  const cols = visibleColumns || DEFAULT_COLUMNS;

  const isVisible = (key: string) => cols.includes(key);

  const handleMouseEnter = () => {
    setHovered(true);
    onRowHover?.(customer.id);
  };
  const handleMouseLeave = () => {
    setHovered(false);
    onRowLeave?.();
  };

  return (
    <div
      onClick={() => onNavigate(customer.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'flex items-center gap-3 px-3 py-3 border-s-[3px] rounded-lg cursor-pointer transition-all duration-150 group',
        'border border-transparent hover:border-border hover:bg-accent/50 hover:shadow-sm',
        vipBorderAccent[customer.vip_level] || vipBorderAccent.regular,
        !isActive && 'opacity-60',
        hasErrorAlert && 'bg-destructive/5',
      )}
    >
      {/* Bulk selection checkbox */}
      {onToggleSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onToggleSelect(customer.id, !!checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
      )}

      {/* Avatar — always visible */}
      <CustomerAvatar
        name={customer.name}
        imageUrl={customer.image_url}
        customerType={customer.customer_type}
        size="sm"
        shape="circle"
        className="shrink-0"
      />

      {/* Name + type + VIP */}
      {isVisible('name') && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
            {alertCount && alertCount > 0 ? (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold px-1">
                {alertCount}
              </span>
            ) : null}
            {isVisible('status') && (
              <span className={cn(
                'h-2 w-2 rounded-full shrink-0',
                isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )} />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isVisible('type') && (
              <span className="text-[11px] text-muted-foreground">
                {typeLabels[customer.customer_type] || customer.customer_type}
              </span>
            )}
            {isVisible('vip') && customer.vip_level !== 'regular' && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                vipPillStyle[customer.vip_level],
              )}>
                <Crown className="h-2.5 w-2.5" />
                {vipLabels[customer.vip_level]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Phone */}
      {isVisible('phone') && customer.phone && (
        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0" dir="ltr">
          <Phone className="h-3 w-3" />
          {customer.phone}
        </div>
      )}

      {/* Governorate */}
      {isVisible('governorate') && customer.governorate && (
        <div className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <MapPin className="h-3 w-3" />
          {customer.governorate}
        </div>
      )}

      {/* Credit Limit */}
      {isVisible('credit_limit') && (
        <div className="hidden xl:block text-xs text-muted-foreground shrink-0 w-20 text-left tabular-nums">
          {creditLimit > 0 ? creditLimit.toLocaleString() : '—'}
        </div>
      )}

      {/* Last Activity */}
      {isVisible('last_activity') && (
        <div className="hidden xl:block text-[11px] text-muted-foreground shrink-0 w-24">
          {customer.last_activity_at
            ? format(new Date(customer.last_activity_at), 'd MMM yyyy', { locale: ar })
            : '—'}
        </div>
      )}

      {/* Total Purchases */}
      {isVisible('purchases') && (
        <div className="hidden xl:block text-xs text-muted-foreground shrink-0 w-24 text-left tabular-nums">
          {Number(customer.total_purchases_cached || 0).toLocaleString()}
        </div>
      )}

      {/* Payment Ratio */}
      {isVisible('payment_ratio') && (
        <div className="hidden xl:block text-xs shrink-0 w-16 text-left tabular-nums">
          {(() => {
            const tp = Number(customer.total_purchases_cached || 0);
            const ratio = tp > 0 ? Math.round(((tp - balance) / tp) * 100) : 100;
            return (
              <span className={cn(
                ratio >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                ratio >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
              )}>
                {ratio}%
              </span>
            );
          })()}
        </div>
      )}

      {/* Created At */}
      {isVisible('created_at') && (
        <div className="hidden xl:block text-[11px] text-muted-foreground shrink-0 w-24">
          {format(new Date(customer.created_at), 'd MMM yyyy', { locale: ar })}
        </div>
      )}

      {/* Balance */}
      {isVisible('balance') && (
        <div className="text-left shrink-0 w-24">
          <p className={cn('font-bold text-sm tabular-nums', balanceColor)}>
            {balance.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">ج.م</p>
        </div>
      )}

      {/* Hover actions */}
      <div className={cn(
        'flex items-center gap-1 transition-opacity duration-150',
        hovered ? 'opacity-100' : 'opacity-0',
      )}>
        {onNewInvoice && (
          <button
            onClick={(e) => { e.stopPropagation(); onNewInvoice(customer.id); }}
            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="فاتورة جديدة"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
        )}
        {onNewPayment && (
          <button
            onClick={(e) => { e.stopPropagation(); onNewPayment(customer.id); }}
            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="دفعة جديدة"
          >
            <CreditCard className="h-3.5 w-3.5" />
          </button>
        )}
        {customer.phone && onWhatsApp && (
          <button
            onClick={(e) => { e.stopPropagation(); onWhatsApp(customer.phone!); }}
            className="p-1.5 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
            title="واتساب"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="تعديل"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const CustomerListRow = memo(CustomerListRowInner);
