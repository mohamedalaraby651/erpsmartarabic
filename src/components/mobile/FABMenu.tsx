import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, X, Users, Package, FileText, ShoppingCart, Truck, Receipt, 
  ClipboardList, Wallet, CircleDollarSign, CheckSquare, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { haptics } from '@/lib/haptics';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FABMenuProps {
  actions?: FABAction[];
  defaultAction?: () => void;
  className?: string;
  pageContext?: string;
}

export function FABMenu({ actions, defaultAction, className, pageContext }: FABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine context from location if not provided
  const context = pageContext || location.pathname.split('/')[1] || 'dashboard';

  const menuActions = useMemo(() => {
    if (actions) return actions;

    // Context-aware actions
    switch (context) {
      case 'customers':
        return [
          {
            icon: <Users className="h-5 w-5" />,
            label: 'عميل جديد',
            onClick: () => navigate('/customers?action=new'),
            color: 'bg-purple-500 hover:bg-purple-600',
          },
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'فاتورة للعميل',
            onClick: () => navigate('/invoices?action=new'),
            color: 'bg-blue-500 hover:bg-blue-600',
          },
        ];
      case 'products':
        return [
          {
            icon: <Package className="h-5 w-5" />,
            label: 'منتج جديد',
            onClick: () => navigate('/products?action=new'),
            color: 'bg-green-500 hover:bg-green-600',
          },
          {
            icon: <Layers className="h-5 w-5" />,
            label: 'تصنيف جديد',
            onClick: () => navigate('/categories?action=new'),
            color: 'bg-violet-500 hover:bg-violet-600',
          },
        ];
      case 'invoices':
        return [
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'فاتورة جديدة',
            onClick: () => navigate('/invoices?action=new'),
            color: 'bg-blue-500 hover:bg-blue-600',
          },
          {
            icon: <Receipt className="h-5 w-5" />,
            label: 'تسجيل دفعة',
            onClick: () => navigate('/payments?action=new'),
            color: 'bg-emerald-500 hover:bg-emerald-600',
          },
        ];
      case 'quotations':
        return [
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'عرض سعر جديد',
            onClick: () => navigate('/quotations?action=new'),
            color: 'bg-amber-500 hover:bg-amber-600',
          },
          {
            icon: <ShoppingCart className="h-5 w-5" />,
            label: 'أمر بيع',
            onClick: () => navigate('/sales-orders?action=new'),
            color: 'bg-orange-500 hover:bg-orange-600',
          },
        ];
      case 'suppliers':
        return [
          {
            icon: <Truck className="h-5 w-5" />,
            label: 'مورد جديد',
            onClick: () => navigate('/suppliers?action=new'),
            color: 'bg-indigo-500 hover:bg-indigo-600',
          },
          {
            icon: <ClipboardList className="h-5 w-5" />,
            label: 'أمر شراء',
            onClick: () => navigate('/purchase-orders?action=new'),
            color: 'bg-orange-500 hover:bg-orange-600',
          },
        ];
      case 'sales-orders':
        return [
          {
            icon: <ShoppingCart className="h-5 w-5" />,
            label: 'أمر بيع جديد',
            onClick: () => navigate('/sales-orders?action=new'),
            color: 'bg-orange-500 hover:bg-orange-600',
          },
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'تحويل لفاتورة',
            onClick: () => navigate('/invoices?action=new'),
            color: 'bg-blue-500 hover:bg-blue-600',
          },
        ];
      case 'purchase-orders':
        return [
          {
            icon: <ClipboardList className="h-5 w-5" />,
            label: 'أمر شراء جديد',
            onClick: () => navigate('/purchase-orders?action=new'),
            color: 'bg-cyan-500 hover:bg-cyan-600',
          },
          {
            icon: <Truck className="h-5 w-5" />,
            label: 'مورد جديد',
            onClick: () => navigate('/suppliers?action=new'),
            color: 'bg-indigo-500 hover:bg-indigo-600',
          },
        ];
      case 'payments':
        return [
          {
            icon: <Receipt className="h-5 w-5" />,
            label: 'تسجيل دفعة',
            onClick: () => navigate('/payments?action=new'),
            color: 'bg-emerald-500 hover:bg-emerald-600',
          },
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'فاتورة جديدة',
            onClick: () => navigate('/invoices?action=new'),
            color: 'bg-blue-500 hover:bg-blue-600',
          },
        ];
      case 'treasury':
        return [
          {
            icon: <Wallet className="h-5 w-5" />,
            label: 'صندوق جديد',
            onClick: () => navigate('/treasury?action=new'),
            color: 'bg-primary hover:bg-primary/90',
          },
          {
            icon: <CircleDollarSign className="h-5 w-5" />,
            label: 'مصروف جديد',
            onClick: () => navigate('/expenses?action=new'),
            color: 'bg-rose-500 hover:bg-rose-600',
          },
        ];
      case 'expenses':
        return [
          {
            icon: <CircleDollarSign className="h-5 w-5" />,
            label: 'مصروف جديد',
            onClick: () => navigate('/expenses?action=new'),
            color: 'bg-rose-500 hover:bg-rose-600',
          },
          {
            icon: <Wallet className="h-5 w-5" />,
            label: 'الخزينة',
            onClick: () => navigate('/treasury'),
            color: 'bg-primary hover:bg-primary/90',
          },
        ];
      case 'employees':
        return [
          {
            icon: <Users className="h-5 w-5" />,
            label: 'موظف جديد',
            onClick: () => navigate('/employees?action=new'),
            color: 'bg-indigo-500 hover:bg-indigo-600',
          },
        ];
      case 'tasks':
        return [
          {
            icon: <CheckSquare className="h-5 w-5" />,
            label: 'مهمة جديدة',
            onClick: () => navigate('/tasks?action=new'),
            color: 'bg-violet-500 hover:bg-violet-600',
          },
        ];
      case 'categories':
        return [
          {
            icon: <Layers className="h-5 w-5" />,
            label: 'تصنيف جديد',
            onClick: () => navigate('/categories?action=new'),
            color: 'bg-amber-500 hover:bg-amber-600',
          },
        ];
      case 'inventory':
        return [
          {
            icon: <Package className="h-5 w-5" />,
            label: 'حركة مخزون',
            onClick: () => navigate('/inventory'),
            color: 'bg-green-500 hover:bg-green-600',
          },
          {
            icon: <ClipboardList className="h-5 w-5" />,
            label: 'أمر شراء',
            onClick: () => navigate('/purchase-orders?action=new'),
            color: 'bg-cyan-500 hover:bg-cyan-600',
          },
        ];
      default:
        // Default dashboard actions
        return [
          {
            icon: <Users className="h-5 w-5" />,
            label: 'عميل جديد',
            onClick: () => navigate('/customers?action=new'),
            color: 'bg-purple-500 hover:bg-purple-600',
          },
          {
            icon: <Package className="h-5 w-5" />,
            label: 'منتج جديد',
            onClick: () => navigate('/products?action=new'),
            color: 'bg-green-500 hover:bg-green-600',
          },
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'فاتورة جديدة',
            onClick: () => navigate('/invoices?action=new'),
            color: 'bg-blue-500 hover:bg-blue-600',
          },
          {
            icon: <ShoppingCart className="h-5 w-5" />,
            label: 'أمر بيع',
            onClick: () => navigate('/sales-orders?action=new'),
            color: 'bg-orange-500 hover:bg-orange-600',
          },
        ];
    }
  }, [actions, context, navigate]);

  const handleMainClick = () => {
    haptics.light();
    if (defaultAction) {
      defaultAction();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action: FABAction) => {
    haptics.medium();
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn('fixed bottom-20 left-4 z-40 md:hidden', className)}>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action buttons */}
      <div
        className={cn(
          'absolute bottom-16 left-0 flex flex-col-reverse gap-3 transition-all duration-300 z-50',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {menuActions.map((action, index) => (
          <div
            key={index}
            className="flex items-center gap-3 animate-scale-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="bg-card text-card-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap border">
              {action.label}
            </span>
            <Button
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg text-white transition-transform active:scale-95',
                action.color || 'bg-primary hover:bg-primary/90'
              )}
              onClick={() => handleActionClick(action)}
            >
              {action.icon}
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all duration-300 z-50 active:scale-95',
          isOpen && 'rotate-45 bg-destructive hover:bg-destructive/90'
        )}
        onClick={handleMainClick}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}