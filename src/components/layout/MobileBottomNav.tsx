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
}

const quickNavItems: NavItem[] = [
  {
    title: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/',
    color: 'text-primary',
  },
  {
    title: 'العملاء',
    icon: Users,
    href: '/customers',
    roles: ['admin', 'sales'],
    color: 'text-blue-600',
  },
  {
    title: 'المنتجات',
    icon: Package,
    href: '/products',
    roles: ['admin', 'warehouse'],
    color: 'text-emerald-600',
  },
  {
    title: 'المبيعات',
    icon: ShoppingCart,
    href: '/sales-orders',
    roles: ['admin', 'sales'],
    color: 'text-orange-600',
  },
  {
    title: 'الفواتير',
    icon: Receipt,
    href: '/invoices',
    roles: ['admin', 'sales', 'accountant'],
    color: 'text-purple-600',
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
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95',
                isActive 
                  ? item.color 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all duration-200',
                isActive && 'bg-primary/10 scale-110'
              )}>
                <Icon className={cn(
                  'h-5 w-5 transition-transform',
                  isActive && 'scale-105'
                )} />
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all',
                isActive && 'font-semibold scale-105'
              )}>
                {item.title}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-current" />
              )}
            </button>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={onMenuOpen}
          className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-all active:scale-95"
        >
          <div className="p-1.5 rounded-xl">
            <MoreHorizontal className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">المزيد</span>
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
