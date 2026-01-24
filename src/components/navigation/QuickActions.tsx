import { Plus, FileText, Users, Package, Receipt, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuickAction {
  title: string;
  icon: React.ElementType;
  href: string;
  action?: string;
  roles?: string[];
  color?: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'عميل جديد',
    icon: Users,
    href: '/customers',
    action: 'new',
    roles: ['admin', 'sales'],
    color: 'text-blue-600',
  },
  {
    title: 'منتج جديد',
    icon: Package,
    href: '/products',
    action: 'new',
    roles: ['admin', 'warehouse'],
    color: 'text-emerald-600',
  },
  {
    title: 'عرض سعر',
    icon: FileText,
    href: '/quotations',
    action: 'new',
    roles: ['admin', 'sales'],
    color: 'text-blue-600',
  },
  {
    title: 'أمر بيع',
    icon: ShoppingCart,
    href: '/sales-orders',
    action: 'new',
    roles: ['admin', 'sales'],
    color: 'text-blue-600',
  },
  {
    title: 'فاتورة جديدة',
    icon: Receipt,
    href: '/invoices',
    action: 'new',
    roles: ['admin', 'sales', 'accountant'],
    color: 'text-blue-600',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const filteredActions = quickActions.filter(action => {
    if (!action.roles) return true;
    if (!userRole) return false;
    return action.roles.includes(userRole);
  });

  const handleAction = (action: QuickAction) => {
    // Navigate with action param to trigger new dialog
    const url = action.action ? `${action.href}?action=${action.action}` : action.href;
    navigate(url);
  };

  if (filteredActions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">إضافة سريعة</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>إضافة سريعة</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filteredActions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.href + action.action}
              onClick={() => handleAction(action)}
              className="gap-3 cursor-pointer"
            >
              <Icon className={`h-4 w-4 ${action.color}`} />
              {action.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
