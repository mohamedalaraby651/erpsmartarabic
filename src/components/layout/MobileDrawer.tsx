import { memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { cn } from '@/lib/utils';
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
  Factory,
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
  UserCircle,
  RefreshCw,
  Paperclip,
  X,
} from 'lucide-react';
import { useState } from 'react';

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
  color: string;
  bgColor: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: 'daily-operations',
    title: 'العمليات اليومية',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'العملاء', icon: Users, href: '/customers', roles: ['admin', 'sales'] },
      { title: 'الفواتير', icon: Receipt, href: '/invoices', roles: ['admin', 'sales', 'accountant'], countKey: 'pendingInvoices', countColor: 'bg-destructive' },
      { title: 'أوامر البيع', icon: ShoppingCart, href: '/sales-orders', roles: ['admin', 'sales'], countKey: 'pendingSalesOrders', countColor: 'bg-amber-500' },
      { title: 'عروض الأسعار', icon: FileText, href: '/quotations', roles: ['admin', 'sales'] },
      { title: 'التحصيل', icon: CreditCard, href: '/payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'inventory',
    title: 'المخزون والمشتريات',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    items: [
      { title: 'المنتجات', icon: Package, href: '/products', roles: ['admin', 'warehouse'] },
      { title: 'التصنيفات', icon: FolderTree, href: '/categories', roles: ['admin', 'warehouse'] },
      { title: 'المخزون', icon: Warehouse, href: '/inventory', roles: ['admin', 'warehouse'], countKey: 'lowStockAlerts', countColor: 'bg-amber-500' },
      { title: 'الموردين', icon: Truck, href: '/suppliers', roles: ['admin', 'warehouse'] },
      { title: 'أوامر الشراء', icon: ClipboardList, href: '/purchase-orders', roles: ['admin', 'warehouse'] },
      { title: 'مدفوعات الموردين', icon: Wallet, href: '/supplier-payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'hr',
    title: 'الموارد البشرية',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    items: [
      { title: 'الموظفين', icon: Briefcase, href: '/employees', roles: ['admin', 'hr'] },
    ],
  },
  {
    id: 'system',
    title: 'النظام والإعدادات',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10',
    items: [
      { title: 'التقارير', icon: BarChart3, href: '/reports', roles: ['admin', 'accountant'] },
      { title: 'المهام', icon: CheckSquare, href: '/tasks', countKey: 'openTasks', countColor: 'bg-emerald-500' },
      { title: 'الإشعارات', icon: Bell, href: '/notifications', countKey: 'unreadNotifications', countColor: 'bg-blue-500' },
      { title: 'حالة المزامنة', icon: RefreshCw, href: '/sync' },
      { title: 'الإعدادات', icon: Settings, href: '/settings' },
      { title: 'ملفي الشخصي', icon: UserCircle, href: '/profile' },
    ],
  },
];

const adminItems: NavItem[] = [
  { title: 'لوحة الإدارة', icon: LayoutDashboard, href: '/admin/dashboard', roles: ['admin'] },
  { title: 'إدارة المرفقات', icon: Paperclip, href: '/attachments', roles: ['admin'] },
  { title: 'إدارة الأدوار', icon: Shield, href: '/admin/roles', roles: ['admin'] },
  { title: 'إدارة الصلاحيات', icon: Shield, href: '/admin/permissions', roles: ['admin'] },
  { title: 'تخصيص الأقسام', icon: Settings, href: '/admin/customizations', roles: ['admin'] },
  { title: 'إدارة المستخدمين', icon: Users, href: '/admin/users', roles: ['admin'] },
  { title: 'سجل النشاطات', icon: BarChart3, href: '/admin/activity-log', roles: ['admin'] },
  { title: 'الحدود المالية', icon: CreditCard, href: '/admin/role-limits', roles: ['admin'] },
  { title: 'إعدادات النظام', icon: Settings, href: '/admin/system-settings', roles: ['admin'] },
];

const quickActions = [
  { title: 'فاتورة', icon: Receipt, href: '/invoices?action=create', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  { title: 'عميل', icon: Users, href: '/customers?action=create', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  { title: 'أمر بيع', icon: ShoppingCart, href: '/sales-orders?action=create', color: 'text-violet-600', bgColor: 'bg-violet-500/10' },
  { title: 'منتج', icon: Package, href: '/products?action=create', color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
];

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

function MobileDrawer({
  open,
  onOpenChange,
  isDark,
  onThemeToggle,
}: MobileDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavoritePages();
  const { data: counts } = useSidebarCounts();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigation = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] p-0">
        <SheetHeader className="p-4 border-b bg-gradient-to-l from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Factory className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-right">معدات الدواجن</SheetTitle>
              <p className="text-xs text-muted-foreground">نظام الإدارة</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في القائمة..."
                className="pr-9 pl-9 h-10 bg-muted/50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Quick Actions */}
            {!searchQuery && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Plus className="h-3 w-3" />
                  <span>إنشاء سريع</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.href}
                        variant="ghost"
                        className={cn(
                          'flex-col h-auto py-3 gap-1.5',
                          action.bgColor,
                          action.color
                        )}
                        onClick={() => handleNavigation(action.href)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px]">{action.title}</span>
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

              return (
                <div key={section.id}>
                  <div className={cn('flex items-center gap-2 mb-2', section.color)}>
                    <div className={cn('p-1 rounded', section.bgColor)}>
                      <div className="h-3 w-3" />
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

            {/* Admin Section */}
            {isAdmin && !searchQuery && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                    <div className="p-1 rounded bg-purple-500/10">
                      <Shield className="h-3 w-3" />
                    </div>
                    <h3 className="text-sm font-semibold">إدارة النظام</h3>
                  </div>
                  <div className="space-y-1">
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Button
                          key={item.href}
                          variant={active ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3 h-9',
                            active && 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          )}
                          onClick={() => handleNavigation(item.href)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10"
              onClick={onThemeToggle}
            >
              {isDark ? <Sun className="h-4 w-4 ml-2" /> : <Moon className="h-4 w-4 ml-2" />}
              {isDark ? 'فاتح' : 'داكن'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="h-4 w-4 ml-2" />
              الإعدادات
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full h-10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default memo(MobileDrawer);
