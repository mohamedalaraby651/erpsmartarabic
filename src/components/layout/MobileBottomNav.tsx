import { memo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Receipt, ShoppingCart, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';

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

// Ripple Effect Component
function RippleEffect({ x, y }: { x: number; y: number }) {
  return (
    <span
      className="absolute rounded-full bg-current opacity-20 animate-ripple pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 40,
        height: 40,
        marginLeft: -20,
        marginTop: -20,
      }}
    />
  );
}

function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);

  const handleNavClick = useCallback((href: string, e: React.MouseEvent<HTMLButtonElement>) => {
    // Haptic feedback
    haptics.light();
    
    // Ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, key: Date.now() });
    
    // Clear ripple after animation
    setTimeout(() => setRipple(null), 500);
    
    // Navigate
    navigate(href);
  }, [navigate]);

  const handleMenuOpen = useCallback(() => {
    haptics.light();
    onMenuOpen();
  }, [onMenuOpen]);

  const filteredItems = quickNavItems.filter(item => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  }).slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={(e) => handleNavClick(item.href, e)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 py-2 rounded-full transition-all duration-300 overflow-hidden',
                isActive 
                  ? `${item.color} ${item.bgColor} px-3 min-w-fit shadow-sm` 
                  : 'text-muted-foreground hover:text-foreground px-2 active:bg-muted/50'
              )}
            >
              {/* Ripple container */}
              {ripple && (
                <RippleEffect x={ripple.x} y={ripple.y} />
              )}
              
              <Icon className={cn(
                'h-5 w-5 transition-all duration-300 flex-shrink-0',
                isActive && 'scale-110'
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
              
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60" />
              )}
            </button>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={handleMenuOpen}
          className="relative flex items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-all active:bg-muted/50 rounded-full overflow-hidden"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
