import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
}

interface NavSection {
  title: string;
  color: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'المخزون والمشتريات',
    color: 'text-emerald-600 dark:text-emerald-400',
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
    color: 'text-blue-600 dark:text-blue-400',
    items: [
      { title: 'العملاء', icon: Users, href: '/customers', roles: ['admin', 'sales'] },
      { title: 'عروض الأسعار', icon: FileText, href: '/quotations', roles: ['admin', 'sales'] },
      { title: 'أوامر البيع', icon: ShoppingCart, href: '/sales-orders', roles: ['admin', 'sales'] },
      { title: 'الفواتير', icon: Receipt, href: '/invoices', roles: ['admin', 'sales', 'accountant'] },
      { title: 'التحصيل', icon: CreditCard, href: '/payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    title: 'التقارير والإعدادات',
    color: 'text-slate-600 dark:text-slate-400',
    items: [
      { title: 'التقارير', icon: BarChart3, href: '/reports', roles: ['admin', 'accountant'] },
      { title: 'المهام', icon: CheckSquare, href: '/tasks' },
      { title: 'الإشعارات', icon: Bell, href: '/notifications' },
    ],
  },
];

const adminItems: NavItem[] = [
  { title: 'إدارة الأدوار', icon: Shield, href: '/admin/roles', roles: ['admin'] },
  { title: 'إدارة الصلاحيات', icon: Shield, href: '/admin/permissions', roles: ['admin'] },
  { title: 'تخصيص الأقسام', icon: Settings, href: '/admin/customizations', roles: ['admin'] },
  { title: 'إدارة المستخدمين', icon: Users, href: '/admin/users', roles: ['admin'] },
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Factory className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-right">معدات الدواجن</SheetTitle>
              <p className="text-xs text-muted-foreground">نظام الإدارة</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-4">
            {/* Search Button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigation('/search')}
            >
              <Search className="h-4 w-4" />
              البحث الشامل
            </Button>

            {/* Dashboard */}
            <Button
              variant={isActive('/') ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                isActive('/') && 'bg-primary/10 text-primary'
              )}
              onClick={() => handleNavigation('/')}
            >
              <LayoutDashboard className="h-4 w-4" />
              لوحة التحكم
            </Button>

            <Separator />

            {/* Navigation Sections */}
            {navSections.map((section) => {
              const filteredItems = filterItems(section.items);
              if (filteredItems.length === 0) return null;

              return (
                <div key={section.title}>
                  <h3 className={cn('text-sm font-semibold mb-2', section.color)}>
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {filteredItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Button
                          key={item.href}
                          variant={active ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3',
                            active && 'bg-primary/10 text-primary'
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
              );
            })}

            {/* Admin Section */}
            {isAdmin && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      إدارة النظام
                    </div>
                  </h3>
                  <div className="space-y-1">
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Button
                          key={item.href}
                          variant={active ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3',
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
              className="flex-1"
              onClick={onThemeToggle}
            >
              {isDark ? <Sun className="h-4 w-4 ml-2" /> : <Moon className="h-4 w-4 ml-2" />}
              {isDark ? 'فاتح' : 'داكن'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="h-4 w-4 ml-2" />
              الإعدادات
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
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
