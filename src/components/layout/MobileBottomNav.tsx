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
  activeColor?: string;
}

const quickNavItems: NavItem[] = [
  {
    title: 'الرئيسية',
    icon: LayoutDashboard,
    href: '/',
    color: 'text-primary',
    bgColor: 'bg-primary/15',
    activeColor: 'shadow-primary/20',
  },
  {
    title: 'العملاء',
    icon: Users,
    href: '/customers',
    roles: ['admin', 'sales'],
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/15',
    activeColor: 'shadow-blue-500/20',
  },
  {
    title: 'المنتجات',
    icon: Package,
    href: '/products',
    roles: ['admin', 'warehouse'],
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    activeColor: 'shadow-emerald-500/20',
  },
  {
    title: 'المبيعات',
    icon: ShoppingCart,
    href: '/sales-orders',
    roles: ['admin', 'sales'],
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/15',
    activeColor: 'shadow-orange-500/20',
  },
  {
    title: 'الفواتير',
    icon: Receipt,
    href: '/invoices',
    roles: ['admin', 'sales', 'accountant'],
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/15',
    activeColor: 'shadow-purple-500/20',
  },
];

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

// Enhanced Ripple Effect Component with dynamic sizing
interface RippleProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
}

function RippleEffect({ x, y, size = 40, color }: RippleProps) {
  return (
    <span
      className={cn(
        "absolute rounded-full opacity-30 animate-ripple-fast pointer-events-none",
        color || "bg-current"
      )}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
      }}
    />
  );
}

function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [ripple, setRipple] = useState<{ x: number; y: number; size: number; key: number; color?: string } | null>(null);

  const handleNavClick = useCallback((item: NavItem, e: React.MouseEvent<HTMLButtonElement>) => {
    // Haptic feedback
    haptics.light();
    
    // Ripple effect - dynamic size based on button
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rippleSize = Math.min(rect.width, rect.height) * 0.7;
    
    setRipple({ x, y, size: rippleSize, key: Date.now(), color: item.bgColor?.replace('/15', '/40') });
    
    // Clear ripple after animation - faster
    setTimeout(() => setRipple(null), 350);
    
    // Navigate
    navigate(item.href);
  }, [navigate]);

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    haptics.medium();
    
    // Ripple effect for menu button - dynamic size
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rippleSize = Math.min(rect.width, rect.height) * 0.7;
    
    setRipple({ x, y, size: rippleSize, key: Date.now() });
    setTimeout(() => setRipple(null), 350);
    
    onMenuOpen();
  }, [onMenuOpen]);

  const filteredItems = quickNavItems.filter(item => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  }).slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-sm border-t border-border/50 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] md:hidden safe-area-bottom-compact">
      <div className="flex items-center justify-around h-14 px-1.5">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={(e) => handleNavClick(item, e)}
              className={cn(
                'relative flex items-center justify-center gap-1 py-1.5 rounded-2xl transition-all duration-200 overflow-hidden touch-target',
                isActive 
                  ? `${item.color} ${item.bgColor} px-3 min-w-fit shadow-md ${item.activeColor}` 
                  : 'text-muted-foreground hover:text-foreground px-2.5 active:scale-95'
              )}
            >
              {/* Ripple container */}
              {ripple && (
                <RippleEffect x={ripple.x} y={ripple.y} size={ripple.size} color={ripple.color} />
              )}
              
              <Icon className={cn(
                'h-[18px] w-[18px] transition-all duration-200 flex-shrink-0',
                isActive && 'scale-105'
              )} />
              
              {/* Title appears only for active item - beside the icon */}
              <span className={cn(
                'text-[11px] font-bold transition-all duration-200 whitespace-nowrap overflow-hidden',
                isActive 
                  ? 'max-w-[70px] opacity-100' 
                  : 'max-w-0 opacity-0'
              )}>
                {item.title}
              </span>
              
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-80" />
              )}
            </button>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={handleMenuOpen}
          className="relative flex items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 rounded-2xl overflow-hidden touch-target hover:bg-muted/50"
        >
          {ripple && (
            <RippleEffect x={ripple.x} y={ripple.y} size={ripple.size} />
          )}
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
