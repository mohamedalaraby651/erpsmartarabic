import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Receipt, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
}

const quickNavItems: NavItem[] = [
  {
    title: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'العملاء',
    icon: Users,
    href: '/customers',
    roles: ['admin', 'sales'],
  },
  {
    title: 'المنتجات',
    icon: Package,
    href: '/products',
    roles: ['admin', 'warehouse'],
  },
  {
    title: 'الفواتير',
    icon: Receipt,
    href: '/invoices',
    roles: ['admin', 'sales', 'accountant'],
  },
];

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

export default function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const filteredItems = quickNavItems.filter(item => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  }).slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </button>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">المزيد</span>
        </button>
      </div>
    </nav>
  );
}
