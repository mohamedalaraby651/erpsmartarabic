import { memo, useMemo, useState, useEffect, forwardRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { useSidebarCounts, type SidebarCounts } from '@/hooks/useSidebarCounts';
import { cn } from '@/lib/utils';
import { prefetchByPath, prefetchGroup } from '@/lib/prefetch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Layers,
  LogOut,
  Moon,
  Sun,
  Settings,
  Shield,
  Search,
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Warehouse,
  Truck,
  Receipt,
  CreditCard,
  FolderTree,
  ClipboardList,
  BarChart3,
  Bell,
  CheckSquare,
  Wallet,
  Star,
  Plus,
  Briefcase,
  RefreshCw,
  X,
  ChevronLeft,
  DollarSign,
} from 'lucide-react';
import { TenantSelector } from '@/components/tenant';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  countKey?: string;
  countColor?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: NavItem[];
}

// الهيكل الجديد: 4 أقسام رئيسية
const navSections: NavSection[] = [
  {
    id: 'sales',
    title: 'المبيعات والعملاء',
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'العملاء', icon: Users, href: '/customers', roles: ['admin', 'sales'] },
      { title: 'عروض الأسعار', icon: FileText, href: '/quotations', roles: ['admin', 'sales'] },
      { title: 'أوامر البيع', icon: ShoppingCart, href: '/sales-orders', roles: ['admin', 'sales'], countKey: 'pendingSalesOrders', countColor: 'bg-amber-500' },
      { title: 'الفواتير', icon: Receipt, href: '/invoices', roles: ['admin', 'sales', 'accountant'], countKey: 'pendingInvoices', countColor: 'bg-destructive' },
      { title: 'التحصيل', icon: CreditCard, href: '/payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'inventory',
    title: 'المخزون والمشتريات',
    icon: Warehouse,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    items: [
      { title: 'المنتجات', icon: Package, href: '/products', roles: ['admin', 'warehouse'] },
      { title: 'التصنيفات', icon: FolderTree, href: '/categories', roles: ['admin', 'warehouse'] },
      { title: 'المخزون', icon: Warehouse, href: '/inventory', roles: ['admin', 'warehouse'], countKey: 'lowStockAlerts', countColor: 'bg-amber-500' },
      { title: 'الموردين', icon: Truck, href: '/suppliers', roles: ['admin', 'warehouse'] },
      { title: 'أوامر الشراء', icon: ClipboardList, href: '/purchase-orders', roles: ['admin', 'warehouse'] },
    ],
  },
  {
    id: 'finance',
    title: 'المالية',
    icon: DollarSign,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    items: [
      { title: 'الخزينة', icon: Wallet, href: '/treasury', roles: ['admin', 'accountant'] },
      { title: 'المصروفات', icon: Receipt, href: '/expenses', roles: ['admin', 'accountant'] },
      { title: 'مدفوعات الموردين', icon: Wallet, href: '/supplier-payments', roles: ['admin', 'accountant'] },
      { title: 'التقارير', icon: BarChart3, href: '/reports', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'system',
    title: 'النظام',
    icon: Settings,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10',
    items: [
      { title: 'الموظفين', icon: Briefcase, href: '/employees', roles: ['admin', 'hr'] },
      { title: 'المهام', icon: CheckSquare, href: '/tasks', countKey: 'openTasks', countColor: 'bg-emerald-500' },
      { title: 'الإشعارات', icon: Bell, href: '/notifications', countKey: 'unreadNotifications', countColor: 'bg-blue-500' },
      { title: 'حالة المزامنة', icon: RefreshCw, href: '/sync' },
      { title: 'الإعدادات', icon: Settings, href: '/settings' },
    ],
  },
];

const quickActions = [
  { title: 'فاتورة', icon: Receipt, href: '/invoices?action=new&t=' + Date.now(), color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  { title: 'عميل', icon: Users, href: '/customers?action=new&t=' + Date.now(), color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  { title: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders?action=new&t=' + Date.now(), color: 'text-violet-600', bgColor: 'bg-violet-500/10' },
  { title: 'منتج', icon: Package, href: '/products?action=new&t=' + Date.now(), color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
];

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

const MobileDrawer = forwardRef<HTMLDivElement, MobileDrawerProps>(function MobileDrawer({
  open,
  onOpenChange,
  isDark,
  onThemeToggle,
}, ref) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavoritePages();
  const { data: counts } = useSidebarCounts(open);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const handleNavigation = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  // Opening the drawer is a strong signal the user is about to navigate
  // somewhere. Pre-warm the most likely destinations (sales + inventory)
  // while the open animation is still running — by the time they tap an
  // item, the chunk is usually already in cache.
  useEffect(() => {
    if (!open) return;
    prefetchGroup('sales');
    prefetchGroup('inventory');
  }, [open]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    onOpenChange(false);
  };

  const isAdmin = userRole === 'admin';

  const filterItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.roles) return true;
      if (!userRole) return false;
      return item.roles.includes(userRole);
    });
  };

  const isActive = (href: string) => location.pathname === href;

  const getCount = (item: NavItem) => {
    if (!item.countKey || !counts) return undefined;
    return counts[item.countKey as keyof typeof counts];
  };

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return navSections;
    
    const query = searchQuery.toLowerCase();
    return navSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.title.toLowerCase().includes(query)
      ),
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  const handleSearchClear = () => {
    setSearchQuery('');
    setIsSearchActive(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px] p-0">
        <SheetHeader className="p-3 border-b bg-gradient-to-l from-primary/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-md shadow-primary/20">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-right text-sm bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">نظرة</SheetTitle>
              <p className="text-[10px] text-muted-foreground">نظام إدارة الأعمال</p>
            </div>
          </div>
        </SheetHeader>

        {/* Tenant Selector */}
        <div className="p-3 border-b">
          <TenantSelector />
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-3 space-y-3">
            {/* Search - Click to activate */}
            {!isSearchActive && !searchQuery ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-9 bg-muted/50 border-transparent text-muted-foreground text-sm"
                onClick={() => setIsSearchActive(true)}
              >
                <Search className="h-3.5 w-3.5" />
                <span>ابحث في القائمة...</span>
              </Button>
            ) : (
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في القائمة..."
                  className="pr-8 pl-8 h-9 bg-background text-sm"
                  autoFocus
                  onBlur={() => {
                    if (!searchQuery.trim()) {
                      setIsSearchActive(false);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={handleSearchClear}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Quick Actions */}
            {!searchQuery && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Plus className="h-2.5 w-2.5" />
                  <span>إنشاء سريع</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.title}
                        variant="ghost"
                        className={cn(
                          'flex-col h-auto py-2 gap-1',
                          action.bgColor,
                          action.color
                        )}
                        onClick={() => handleNavigation(action.href)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px]">{action.title}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Favorites */}
            {!searchQuery && favorites.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>المفضلة</span>
                </div>
                <div className="space-y-1">
                  {favorites.map((fav) => (
                    <div key={fav.href} className="flex items-center gap-1">
                      <Button
                        variant={isActive(fav.href) ? 'secondary' : 'ghost'}
                        className={cn(
                          'flex-1 justify-start gap-2 h-9',
                          isActive(fav.href) && 'bg-amber-500/10 text-amber-600'
                        )}
                        onClick={() => handleNavigation(fav.href)}
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-sm truncate">{fav.title}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFavorite(fav.href)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard */}
            {!searchQuery && (
              <Button
                variant={isActive('/') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-11',
                  isActive('/') && 'bg-primary/10 text-primary'
                )}
                onClick={() => handleNavigation('/')}
              >
                <LayoutDashboard className="h-5 w-5" />
                لوحة التحكم
              </Button>
            )}

            <Separator />

            {/* Navigation Sections */}
            {filteredSections.map((section) => {
              const filteredItems = filterItems(section.items);
              if (filteredItems.length === 0) return null;

              const SectionIcon = section.icon;

              return (
                <div key={section.id}>
                  <div className={cn('flex items-center gap-2 mb-2', section.color)}>
                    <div className={cn('p-1.5 rounded', section.bgColor)}>
                      <SectionIcon className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                  </div>
                  <div className="space-y-1">
                    {filteredItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      const count = getCount(item);
                      const favorite = isFavorite(item.href);

                      return (
                        <div key={item.href} className="flex items-center gap-1 group">
                          <Button
                            variant={active ? 'secondary' : 'ghost'}
                            className={cn(
                              'flex-1 justify-start gap-3 h-10',
                              active && `${section.bgColor} ${section.color}`
                            )}
                            onClick={() => handleNavigation(item.href)}
                            onTouchStart={() => prefetchByPath(item.href)}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1 text-right">{item.title}</span>
                            {count !== undefined && count > 0 && (
                              <Badge
                                className={cn(
                                  'text-[10px] h-5 min-w-[20px]',
                                  item.countColor,
                                  'text-white'
                                )}
                              >
                                {count > 99 ? '99+' : count}
                              </Badge>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity',
                              favorite && 'opacity-100'
                            )}
                            onClick={() => toggleFavorite(item.href, item.title)}
                          >
                            <Star
                              className={cn(
                                'h-3.5 w-3.5',
                                favorite
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-muted-foreground'
                              )}
                            />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Admin Link - Separate Button */}
            {isAdmin && !searchQuery && (
              <>
                <Separator />
                <Button
                  variant={location.pathname.startsWith('/admin') ? 'secondary' : 'outline'}
                  className={cn(
                    'w-full justify-start gap-2.5 h-9 border-purple-200 dark:border-purple-800 text-sm',
                    location.pathname.startsWith('/admin') && 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  )}
                  onClick={() => handleNavigation('/admin/dashboard')}
                >
                  <div className="p-1 rounded bg-purple-500/10">
                    <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="flex-1 text-right">إدارة النظام</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-2.5 space-y-1.5">
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={onThemeToggle}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {isDark ? 'فاتح' : 'داكن'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="h-3.5 w-3.5" />
              الإعدادات
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5 ml-1.5" />
            تسجيل الخروج
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

MobileDrawer.displayName = 'MobileDrawer';

export default memo(MobileDrawer);
