import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Users, ShoppingCart, FileText, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface QuickAction {
  title: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  roles?: string[];
}

const quickActions: QuickAction[] = [
  {
    title: 'فاتورة جديدة',
    icon: Receipt,
    href: '/invoices?action=new',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    roles: ['admin', 'sales', 'accountant'],
  },
  {
    title: 'عميل جديد',
    icon: Users,
    href: '/customers?action=new',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    roles: ['admin', 'sales'],
  },
  {
    title: 'أمر بيع',
    icon: ShoppingCart,
    href: '/sales-orders?action=new',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/20',
    roles: ['admin', 'sales'],
  },
  {
    title: 'عرض سعر',
    icon: FileText,
    href: '/quotations?action=new',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    roles: ['admin', 'sales'],
  },
  {
    title: 'منتج جديد',
    icon: Package,
    href: '/products?action=new',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/20',
    roles: ['admin', 'warehouse'],
  },
  {
    title: 'أمر شراء',
    icon: Truck,
    href: '/purchase-orders?action=new',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    roles: ['admin', 'warehouse'],
  },
];

interface QuickActionsProps {
  collapsed?: boolean;
}

function QuickActions({ collapsed = false }: QuickActionsProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const filteredActions = quickActions.filter(action => {
    if (!action.roles) return true;
    if (!userRole) return false;
    return action.roles.includes(userRole);
  });

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1">
        {filteredActions.slice(0, 3).map((action) => {
          const Icon = action.icon;
          return (
            <Tooltip key={action.href}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-9 w-full', action.bgColor, action.color)}
                  onClick={() => navigate(action.href)}
                >
                  <Plus className="h-3 w-3 absolute top-1 left-1" />
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{action.title}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">إنشاء سريع</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {filteredActions.map((action) => {
          const Icon = action.icon;
          return (
            <Tooltip key={action.href}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'flex-col h-auto py-2 px-1.5 gap-1',
                    action.bgColor,
                    action.color,
                    'border border-transparent hover:border-current/20'
                  )}
                  onClick={() => navigate(action.href)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] leading-tight truncate w-full text-center">
                    {action.title.split(' ')[0]}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{action.title}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export default memo(QuickActions);
