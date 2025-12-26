import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X, Users, Package, FileText, ShoppingCart, UserPlus, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
}

const defaultActions: FABAction[] = [
  {
    icon: <Users className="h-5 w-5" />,
    label: 'عميل جديد',
    onClick: () => {},
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    icon: <Package className="h-5 w-5" />,
    label: 'منتج جديد',
    onClick: () => {},
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    icon: <FileText className="h-5 w-5" />,
    label: 'فاتورة جديدة',
    onClick: () => {},
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    icon: <ShoppingCart className="h-5 w-5" />,
    label: 'أمر بيع جديد',
    onClick: () => {},
    color: 'bg-orange-500 hover:bg-orange-600',
  },
];

export function FABMenu({ actions, defaultAction, className }: FABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuActions = actions || [
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

  const handleMainClick = () => {
    if (defaultAction) {
      defaultAction();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn('fixed bottom-20 left-4 z-40 md:hidden', className)}>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
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
            <span className="bg-card text-card-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              {action.label}
            </span>
            <Button
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg text-white',
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
          'h-14 w-14 rounded-full shadow-lg transition-transform duration-300 z-50',
          isOpen && 'rotate-45'
        )}
        onClick={handleMainClick}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
