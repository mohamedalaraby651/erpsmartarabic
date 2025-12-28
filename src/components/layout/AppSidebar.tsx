import { useState, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  ChevronDown,
  Factory,
  Receipt,
  CreditCard,
  FolderTree,
  ClipboardList,
  Moon,
  Sun,
  BarChart3,
  Bell,
  CheckSquare,
  Shield,
  Search,
  Wallet,
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'المخزون والمشتريات',
    icon: Warehouse,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    items: [
      { title: 'المنتجات', icon: Package, href: '/products', roles: ['admin', 'warehouse'] },
      { title: 'التصنيفات', icon: FolderTree, href: '/categories', roles: ['admin', 'warehouse'] },
      { title: 'المخزون', icon: Warehouse, href: '/inventory', roles: ['admin', 'warehouse'] },
      { title: 'الموردين', icon: Truck, href: '/suppliers', roles: ['admin', 'warehouse'] },
      { title: 'أوامر الشراء', icon: ClipboardList, href: '/purchase-orders', roles: ['admin', 'warehouse'] },
      { title: 'مدفوعات الموردين', icon: Wallet, href: '/supplier-payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    title: 'المبيعات والتحصيل',
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'العملاء', icon: Users, href: '/customers', roles: ['admin', 'sales'] },
      { title: 'عروض الأسعار', icon: FileText, href: '/quotations', roles: ['admin', 'sales'] },
      { title: 'أوامر البيع', icon: ShoppingCart, href: '/sales-orders', roles: ['admin', 'sales'] },
      { title: 'الفواتير', icon: Receipt, href: '/invoices', roles: ['admin', 'sales', 'accountant'] },
      { title: 'التحصيل', icon: CreditCard, href: '/payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    title: 'الموارد البشرية',
    icon: Users,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    items: [
      { title: 'الموظفين', icon: Users, href: '/employees', roles: ['admin', 'hr'] },
    ],
  },
  {
    title: 'التقارير والإعدادات',
    icon: BarChart3,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10',
    items: [
      { title: 'التقارير', icon: BarChart3, href: '/reports', roles: ['admin', 'accountant'] },
      { title: 'المهام', icon: CheckSquare, href: '/tasks' },
      { title: 'الإشعارات', icon: Bell, href: '/notifications' },
      { title: 'الإعدادات', icon: Settings, href: '/settings' },
    ],
  },
  {
    title: 'إدارة النظام',
    icon: Shield,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    items: [
      { title: 'إدارة الأدوار', icon: Shield, href: '/admin/roles', roles: ['admin'] },
      { title: 'إدارة الصلاحيات', icon: Shield, href: '/admin/permissions', roles: ['admin'] },
      { title: 'تخصيص الأقسام', icon: Settings, href: '/admin/customizations', roles: ['admin'] },
      { title: 'إدارة المستخدمين', icon: Users, href: '/admin/users', roles: ['admin'] },
      { title: 'إعدادات النظام', icon: Settings, href: '/admin/system-settings', roles: ['admin'] },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

function AppSidebar({ collapsed, onToggle, isDark, onThemeToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(['المخزون والمشتريات', 'المبيعات والتحصيل']);

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filterItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.roles) return true;
      if (!userRole) return false;
      return item.roles.includes(userRole);
    });
  };

  const isItemActive = (href: string) => location.pathname === href;
  const isSectionActive = (items: NavItem[]) => items.some(item => isItemActive(item.href));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 h-screen border-l bg-sidebar transition-all duration-300',
          collapsed ? 'w-[70px]' : 'w-[280px]'
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

          {/* Search Button */}
          {!collapsed && (
            <div className="px-3 pt-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10 text-muted-foreground"
                onClick={() => handleNavigation('/search')}
              >
                <Search className="h-4 w-4" />
                البحث الشامل...
              </Button>
            </div>
          )}
          {collapsed && (
            <div className="px-3 pt-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full h-10"
                    onClick={() => handleNavigation('/search')}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">البحث الشامل</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Dashboard Link */}
          <div className="px-3 pt-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isItemActive('/') ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn(
                      'w-full h-11',
                      isItemActive('/') && 'bg-primary/10 text-primary hover:bg-primary/15'
                    )}
                    onClick={() => handleNavigation('/')}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">لوحة التحكم</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant={isItemActive('/') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-11',
                  isItemActive('/') && 'bg-primary/10 text-primary hover:bg-primary/15'
                )}
                onClick={() => handleNavigation('/')}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span>لوحة التحكم</span>
              </Button>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-2">
              {navSections.map((section) => {
                const filteredItems = filterItems(section.items);
                if (filteredItems.length === 0) return null;

                const SectionIcon = section.icon;
                const isOpen = openSections.includes(section.title);
                const hasActiveItem = isSectionActive(filteredItems);

                if (collapsed) {
                  return (
                    <div key={section.title} className="space-y-1">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isItemActive(item.href);
                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                size="icon"
                                className={cn(
                                  'w-full h-10',
                                  isActive && `${section.bgColor} ${section.color}`
                                )}
                                onClick={() => handleNavigation(item.href)}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">{item.title}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <Collapsible
                    key={section.title}
                    open={isOpen}
                    onOpenChange={() => toggleSection(section.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-between h-10 px-3',
                          hasActiveItem && section.color
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1 rounded', section.bgColor)}>
                            <SectionIcon className={cn('h-4 w-4', section.color)} />
                          </div>
                          <span className="font-medium text-sm">{section.title}</span>
                        </div>
                        <ChevronDown className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-1 pr-4">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isItemActive(item.href);
                        return (
                          <Button
                            key={item.href}
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full justify-start gap-3 h-9 text-sm',
                              isActive && `${section.bgColor} ${section.color}`
                            )}
                            onClick={() => handleNavigation(item.href)}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
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
                    className="w-full h-10"
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
                className="w-full justify-start gap-3 h-10"
                onClick={onThemeToggle}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
              </Button>
            )}

            {/* Logout */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
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

export default memo(AppSidebar);
