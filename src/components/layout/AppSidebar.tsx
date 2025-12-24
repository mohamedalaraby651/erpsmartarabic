import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Warehouse,
  Truck,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Factory,
  Receipt,
  CreditCard,
  FolderTree,
  ClipboardList,
  Bell,
  Moon,
  Sun,
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'لوحة التحكم',
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
    title: 'التصنيفات',
    icon: FolderTree,
    href: '/categories',
    roles: ['admin', 'warehouse'],
  },
  {
    title: 'عروض الأسعار',
    icon: FileText,
    href: '/quotations',
    roles: ['admin', 'sales'],
  },
  {
    title: 'أوامر البيع',
    icon: ShoppingCart,
    href: '/sales-orders',
    roles: ['admin', 'sales'],
  },
  {
    title: 'الفواتير',
    icon: Receipt,
    href: '/invoices',
    roles: ['admin', 'sales', 'accountant'],
  },
  {
    title: 'التحصيل',
    icon: CreditCard,
    href: '/payments',
    roles: ['admin', 'accountant'],
  },
  {
    title: 'المخزون',
    icon: Warehouse,
    href: '/inventory',
    roles: ['admin', 'warehouse'],
  },
  {
    title: 'الموردين',
    icon: Truck,
    href: '/suppliers',
    roles: ['admin', 'warehouse'],
  },
  {
    title: 'أوامر الشراء',
    icon: ClipboardList,
    href: '/purchase-orders',
    roles: ['admin', 'warehouse'],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export default function AppSidebar({ collapsed, onToggle, isDark, onThemeToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 h-screen border-l bg-sidebar transition-all duration-300',
          collapsed ? 'w-[70px]' : 'w-[260px]'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            'flex items-center border-b border-sidebar-border p-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Factory className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-bold text-sidebar-foreground">معدات الدواجن</h1>
                  <p className="text-xs text-muted-foreground">نظام الإدارة</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Factory className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          size="icon"
                          className={cn(
                            'w-full h-11',
                            isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                          )}
                          onClick={() => handleNavigation(item.href)}
                        >
                          <Icon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="font-medium">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-11',
                      isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                    )}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            {/* Theme Toggle */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-11"
                    onClick={onThemeToggle}
                  >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11"
                onClick={onThemeToggle}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
              </Button>
            )}

            {/* Settings */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-11"
                    onClick={() => handleNavigation('/settings')}
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">الإعدادات</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11"
                onClick={() => handleNavigation('/settings')}
              >
                <Settings className="h-5 w-5" />
                <span>الإعدادات</span>
              </Button>
            )}

            {/* Logout */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">تسجيل الخروج</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                <span>تسجيل الخروج</span>
              </Button>
            )}

            {/* Collapse Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="w-full h-9 mt-2"
              onClick={onToggle}
            >
              {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
