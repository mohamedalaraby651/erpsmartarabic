import React, { memo, useState } from 'react';
import { Phone, MapPin, ShoppingCart, CreditCard, Edit2, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'لوجستية', other: 'أخرى',
};

const getBalanceColor = (balance: number, creditLimit: number) => {
  if (balance <= 0) return 'text-emerald-600 dark:text-emerald-400';
  if (creditLimit > 0 && balance >= creditLimit * 0.5) return 'text-destructive';
  if (balance > 0) return 'text-amber-600 dark:text-amber-400';
  return '';
};

interface SupplierListRowProps {
  supplier: Supplier;
  onNavigate: (id: string) => void;
  onEdit?: (supplier: Supplier) => void;
  onNewOrder?: (id: string) => void;
  onNewPayment?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string, checked: boolean) => void;
}

const SupplierListRowInner = ({
  supplier, onNavigate, onEdit, onNewOrder, onNewPayment,
  isSelected, onToggleSelect,
}: SupplierListRowProps) => {
  const [hovered, setHovered] = useState(false);
  const balance = Number(supplier.current_balance || 0);
  const creditLimit = Number(supplier.credit_limit || 0);
  const isActive = supplier.is_active !== false;
  const balanceColor = getBalanceColor(balance, creditLimit);
  const initials = supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      onClick={() => onNavigate(supplier.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex items-center gap-3 px-3 py-3 border-s-[3px] rounded-lg cursor-pointer transition-all duration-150 group',
        'border border-transparent hover:border-border hover:bg-accent/50 hover:shadow-sm',
        'border-s-primary/30',
        !isActive && 'opacity-60',
      )}
    >
      {onToggleSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(supplier.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
      )}

      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
          <span className={cn('h-2 w-2 rounded-full shrink-0', isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {supplier.contact_person && <span className="text-[11px] text-muted-foreground truncate">{supplier.contact_person}</span>}
          {supplier.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{categoryLabels[supplier.category] || supplier.category}</Badge>
          )}
        </div>
      </div>

      {supplier.phone && (
        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0" dir="ltr">
          <Phone className="h-3 w-3" />{supplier.phone}
        </div>
      )}

      {supplier.governorate && (
        <div className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <MapPin className="h-3 w-3" />{supplier.governorate}
        </div>
      )}

      <div className="text-left shrink-0 w-24">
        <p className={cn('font-bold text-sm tabular-nums', balanceColor)}>{balance.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">ج.م</p>
      </div>

      <div className={cn('flex items-center gap-1 transition-opacity duration-150', hovered ? 'opacity-100' : 'opacity-0')}>
        {onNewOrder && (
          <button onClick={(e) => { e.stopPropagation(); onNewOrder(supplier.id); }} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="أمر شراء">
            <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        )}
        {onNewPayment && (
          <button onClick={(e) => { e.stopPropagation(); onNewPayment(supplier.id); }} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="دفعة">
            <CreditCard className="h-3.5 w-3.5" />
          </button>
        )}
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(supplier); }} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="تعديل">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const SupplierListRow = memo(SupplierListRowInner);
