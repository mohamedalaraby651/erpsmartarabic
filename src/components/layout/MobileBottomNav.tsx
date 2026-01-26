import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Receipt, ShoppingCart, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  color?: string;
  bgColor?: string;
}

const quickNavItems: NavItem[] = [
  {
    title: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'العملاء',
    icon: Users,
    href: '/customers',
    roles: ['admin', 'sales'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'المنتجات',
    icon: Package,
    href: '/products',
    roles: ['admin', 'warehouse'],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  {
    title: 'المبيعات',
    icon: ShoppingCart,
    href: '/sales-orders',
    roles: ['admin', 'sales'],
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
  {
    title: 'الفواتير',
    icon: Receipt,
    href: '/invoices',
    roles: ['admin', 'sales', 'accountant'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
];

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const filteredItems = quickNavItems.filter(item => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  }).slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 py-2 rounded-full transition-all duration-300 active:scale-95',
                isActive 
                  ? `${item.color} ${item.bgColor} px-3 min-w-fit` 
                  : 'text-muted-foreground hover:text-foreground px-2'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-transform flex-shrink-0',
                isActive && 'scale-105'
              )} />
              
              {/* Title appears only for active item - beside the icon */}
              <span className={cn(
                'text-xs font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden',
                isActive 
                  ? 'max-w-[70px] opacity-100' 
                  : 'max-w-0 opacity-0'
              )}>
                {item.title}
              </span>
            </button>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={onMenuOpen}
          className="flex items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-all active:scale-95 rounded-full"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
