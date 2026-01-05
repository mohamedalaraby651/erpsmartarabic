import { useState, memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { useSidebarSearch } from '@/hooks/useSidebarSearch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import SidebarSearch from '@/components/sidebar/SidebarSearch';
import QuickActions from '@/components/sidebar/QuickActions';
import FavoritesSection from '@/components/sidebar/FavoritesSection';
import NavItemWithBadge from '@/components/sidebar/NavItemWithBadge';
import DraggableNavSection from '@/components/sidebar/DraggableNavSection';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
  Moon,
  Sun,
  BarChart3,
  Bell,
  CheckSquare,
  Shield,
  Search,
  Wallet,
  Briefcase,
  UserCircle,
  RefreshCw,
  Paperclip,
  RotateCcw,
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  countKey?: keyof ReturnType<typeof useSidebarCounts>['data'];
  countColor?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: NavItem[];
}

const defaultNavSections: NavSection[] = [
  {
    id: 'daily-operations',
    title: 'العمليات اليومية',
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    items: [
      { title: 'العملاء', icon: Users, href: '/customers', roles: ['admin', 'sales'] },
      { title: 'الفواتير', icon: Receipt, href: '/invoices', roles: ['admin', 'sales', 'accountant'], countKey: 'pendingInvoices', countColor: 'destructive' },
      { title: 'أوامر البيع', icon: ShoppingCart, href: '/sales-orders', roles: ['admin', 'sales'], countKey: 'pendingSalesOrders', countColor: 'warning' },
      { title: 'عروض الأسعار', icon: FileText, href: '/quotations', roles: ['admin', 'sales'], countKey: 'pendingQuotations', countColor: 'info' },
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
      { title: 'المخزون', icon: Warehouse, href: '/inventory', roles: ['admin', 'warehouse'], countKey: 'lowStockAlerts', countColor: 'warning' },
      { title: 'الموردين', icon: Truck, href: '/suppliers', roles: ['admin', 'warehouse'] },
      { title: 'أوامر الشراء', icon: ClipboardList, href: '/purchase-orders', roles: ['admin', 'warehouse'], countKey: 'pendingPurchaseOrders', countColor: 'info' },
      { title: 'مدفوعات الموردين', icon: Wallet, href: '/supplier-payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'hr',
    title: 'الموارد البشرية',
    icon: Briefcase,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    items: [
      { title: 'الموظفين', icon: Briefcase, href: '/employees', roles: ['admin', 'hr'] },
    ],
  },
  {
    id: 'system',
    title: 'النظام والإعدادات',
    icon: Settings,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10',
    items: [
      { title: 'التقارير', icon: BarChart3, href: '/reports', roles: ['admin', 'accountant'] },
      { title: 'المهام', icon: CheckSquare, href: '/tasks', countKey: 'openTasks', countColor: 'success' },
      { title: 'الإشعارات', icon: Bell, href: '/notifications', countKey: 'unreadNotifications', countColor: 'info' },
      { title: 'حالة المزامنة', icon: RefreshCw, href: '/sync' },
      { title: 'الإعدادات', icon: Settings, href: '/settings' },
      { title: 'ملفي الشخصي', icon: UserCircle, href: '/profile' },
    ],
  },
  {
    id: 'admin',
    title: 'إدارة النظام',
    icon: Shield,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    items: [
      { title: 'لوحة الإدارة', icon: LayoutDashboard, href: '/admin/dashboard', roles: ['admin'] },
      { title: 'إدارة المرفقات', icon: Paperclip, href: '/attachments', roles: ['admin'] },
      { title: 'إدارة الأدوار', icon: Shield, href: '/admin/roles', roles: ['admin'] },
      { title: 'إدارة الصلاحيات', icon: Shield, href: '/admin/permissions', roles: ['admin'] },
      { title: 'تخصيص الأقسام', icon: Settings, href: '/admin/customizations', roles: ['admin'] },
      { title: 'إدارة المستخدمين', icon: Users, href: '/admin/users', roles: ['admin'] },
      { title: 'سجل النشاطات', icon: BarChart3, href: '/admin/activity-log', roles: ['admin'] },
      { title: 'الحدود المالية', icon: CreditCard, href: '/admin/role-limits', roles: ['admin'] },
      { title: 'النسخ الاحتياطي', icon: Warehouse, href: '/admin/backup', roles: ['admin'] },
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
  const { favorites, removeFavorite, isFavorite, toggleFavorite, reorderFavorites } = useFavoritePages();
  const { data: counts } = useSidebarCounts();
  const [openSections, setOpenSections] = useState<string[]>(['daily-operations', 'inventory']);
  const [sections, setSections] = useState(defaultNavSections);

  // Build searchable items
  const allItems = useMemo(() => {
    const items: { title: string; href: string; section: string }[] = [];
    sections.forEach(section => {
      section.items.forEach(item => {
        items.push({
          title: item.title,
          href: item.href,
          section: section.title,
        });
      });
    });
    return items;
  }, [sections]);

  const { searchQuery, setSearchQuery, clearSearch, isSearching, filteredItems } = useSidebarSearch(allItems);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id)
        ? prev.filter(t => t !== id)
        : [...prev, id]
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

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      setSections(arrayMove(sections, oldIndex, newIndex));
    }
  };

  const resetSectionOrder = () => {
    setSections(defaultNavSections);
  };

  const getCount = (item: NavItem) => {
    if (!item.countKey || !counts) return undefined;
    return counts[item.countKey as keyof typeof counts];
  };

  // Filter sections based on search
  const visibleSections = useMemo(() => {
    if (!isSearching) return sections;
    
    return sections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        filteredItems.some(f => f.href === item.href)
      ),
    })).filter(section => section.items.length > 0);
  }, [sections, isSearching, filteredItems]);

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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <Factory className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-bold text-sidebar-foreground">معدات الدواجن</h1>
                  <p className="text-xs text-muted-foreground">نظام الإدارة</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Factory className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            {!collapsed ? (
              <SidebarSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={clearSearch}
                collapsed={collapsed}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full h-9"
                    onClick={() => handleNavigation('/search')}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">البحث الشامل</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Quick Actions */}
          {!isSearching && (
            <div className="px-3 pt-3">
              <QuickActions collapsed={collapsed} />
            </div>
          )}

          {/* Favorites */}
          {!isSearching && favorites.length > 0 && (
            <div className="px-3 pt-3">
              <FavoritesSection
                favorites={favorites}
                onRemove={removeFavorite}
                onReorder={reorderFavorites}
                collapsed={collapsed}
              />
            </div>
          )}

          {/* Dashboard Link */}
          {!isSearching && (
            <div className="px-3 pt-3">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isItemActive('/') ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn(
                        'w-full h-10',
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
                    'w-full justify-start gap-3 h-10',
                    isItemActive('/') && 'bg-primary/10 text-primary hover:bg-primary/15'
                  )}
                  onClick={() => handleNavigation('/')}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>لوحة التحكم</span>
                </Button>
              )}
            </div>
          )}

          {!isSearching && !collapsed && <Separator className="mx-3 mt-3" />}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={visibleSections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <nav className="space-y-2">
                  {visibleSections.map((section) => {
                    const filteredSectionItems = filterItems(section.items);
                    if (filteredSectionItems.length === 0) return null;

                    const isOpen = openSections.includes(section.id);
                    const hasActiveItem = isSectionActive(filteredSectionItems);

                    if (collapsed) {
                      return (
                        <div key={section.id} className="space-y-1">
                          {filteredSectionItems.map((item) => (
                            <NavItemWithBadge
                              key={item.href}
                              title={item.title}
                              href={item.href}
                              icon={item.icon}
                              count={getCount(item)}
                              countColor={item.countColor}
                              sectionColor={section.color}
                              sectionBgColor={section.bgColor}
                              collapsed={collapsed}
                              isFavorite={isFavorite(item.href)}
                              onToggleFavorite={toggleFavorite}
                            />
                          ))}
                        </div>
                      );
                    }

                    return (
                      <DraggableNavSection
                        key={section.id}
                        id={section.id}
                        title={section.title}
                        icon={section.icon}
                        color={section.color}
                        bgColor={section.bgColor}
                        isOpen={isOpen}
                        onToggle={() => toggleSection(section.id)}
                        hasActiveItem={hasActiveItem}
                        isDraggable={!isSearching}
                      >
                        {filteredSectionItems.map((item) => (
                          <NavItemWithBadge
                            key={item.href}
                            title={item.title}
                            href={item.href}
                            icon={item.icon}
                            count={getCount(item)}
                            countColor={item.countColor}
                            sectionColor={section.color}
                            sectionBgColor={section.bgColor}
                            collapsed={collapsed}
                            isFavorite={isFavorite(item.href)}
                            onToggleFavorite={toggleFavorite}
                          />
                        ))}
                      </DraggableNavSection>
                    );
                  })}
                </nav>
              </SortableContext>
            </DndContext>

            {/* Reset Order Button */}
            {!collapsed && !isSearching && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground gap-2"
                onClick={resetSectionOrder}
              >
                <RotateCcw className="h-3 w-3" />
                إعادة الترتيب الافتراضي
              </Button>
            )}
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
                    className="w-full h-9"
                    onClick={onThemeToggle}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-9 text-sm"
                onClick={onThemeToggle}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
                    className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">تسجيل الخروج</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-9 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </Button>
            )}

            {/* Collapse Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="w-full h-8 mt-2"
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
