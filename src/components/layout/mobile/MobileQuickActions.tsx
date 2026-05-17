import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Receipt,
  Users,
  ShoppingCart,
  Package,
  Plus,
} from 'lucide-react';

const quickActions = [
  { title: 'فاتورة', icon: Receipt, href: '/invoices?action=new&t=' + Date.now(), color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  { title: 'عميل', icon: Users, href: '/customers?action=new&t=' + Date.now(), color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  { title: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders?action=new&t=' + Date.now(), color: 'text-violet-600', bgColor: 'bg-violet-500/10' },
  { title: 'منتج', icon: Package, href: '/products?action=new&t=' + Date.now(), color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
];

interface MobileQuickActionsProps {
  onNavigate: (href: string) => void;
}

export function MobileQuickActions({ onNavigate }: MobileQuickActionsProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Plus className="h-2.5 w-2.5" />
        <span>إنشاء سريع</span>
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-4 gap-1.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Tooltip key={action.title}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-col h-auto py-2 gap-1',
                      action.bgColor,
                      action.color
                    )}
                    onClick={() => onNavigate(action.href)}
                    aria-label={`إنشاء ${action.title} جديد`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[9px]">{action.title}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">إنشاء {action.title} جديد</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
