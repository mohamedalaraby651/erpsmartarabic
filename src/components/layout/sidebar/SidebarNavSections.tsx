import { memo, useMemo } from 'react';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
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
  Users,
  Package,
  FileText,
  ShoppingCart,
  Warehouse,
  Truck,
  Settings,
  Receipt,
  CreditCard,
  FolderTree,
  ClipboardList,
  BarChart3,
  Bell,
  CheckSquare,
  Wallet,
  Briefcase,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import NavItemWithBadge from '@/components/sidebar/NavItemWithBadge';
import DraggableNavSection from '@/components/sidebar/DraggableNavSection';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  countKey?: string;
  countColor?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
}

export interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: NavItem[];
}

// Section icon colors for visual distinction
export const sectionIconColors = {
  sales: { icon: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', hover: 'hover:bg-blue-500/20' },
  inventory: { icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500/20' },
  finance: { icon: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', hover: 'hover:bg-orange-500/20' },
  system: { icon: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', hover: 'hover:bg-slate-500/20' },
};

// الهيكل الجديد: 4 أقسام رئيسية
export const defaultNavSections: NavSection[] = [
  {
    id: 'sales',
    title: 'المبيعات والعملاء',
    icon: ShoppingCart,
    color: sectionIconColors.sales.icon,
    bgColor: sectionIconColors.sales.bg,
    items: [
      { title: 'العملاء', icon: Users, href: '/customers', roles: ['admin', 'sales'] },
      { title: 'عروض الأسعار', icon: FileText, href: '/quotations', roles: ['admin', 'sales'], countKey: 'pendingQuotations', countColor: 'info' },
      { title: 'أوامر البيع', icon: ShoppingCart, href: '/sales-orders', roles: ['admin', 'sales'], countKey: 'pendingSalesOrders', countColor: 'warning' },
      { title: 'الفواتير', icon: Receipt, href: '/invoices', roles: ['admin', 'sales', 'accountant'], countKey: 'pendingInvoices', countColor: 'destructive' },
      { title: 'التحصيل', icon: CreditCard, href: '/payments', roles: ['admin', 'accountant'] },
    ],
  },
  {
    id: 'inventory',
    title: 'المخزون والمشتريات',
    icon: Warehouse,
    color: sectionIconColors.inventory.icon,
    bgColor: sectionIconColors.inventory.bg,
    items: [
      { title: 'المنتجات', icon: Package, href: '/products', roles: ['admin', 'warehouse'] },
      { title: 'التصنيفات', icon: FolderTree, href: '/categories', roles: ['admin', 'warehouse'] },
      { title: 'المخزون', icon: Warehouse, href: '/inventory', roles: ['admin', 'warehouse'], countKey: 'lowStockAlerts', countColor: 'warning' },
      { title: 'الموردين', icon: Truck, href: '/suppliers', roles: ['admin', 'warehouse'] },
      { title: 'أوامر الشراء', icon: ClipboardList, href: '/purchase-orders', roles: ['admin', 'warehouse'], countKey: 'pendingPurchaseOrders', countColor: 'info' },
    ],
  },
  {
    id: 'finance',
    title: 'المالية',
    icon: DollarSign,
    color: sectionIconColors.finance.icon,
    bgColor: sectionIconColors.finance.bg,
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
    color: sectionIconColors.system.icon,
    bgColor: sectionIconColors.system.bg,
    items: [
      { title: 'الموظفين', icon: Briefcase, href: '/employees', roles: ['admin', 'hr'] },
      { title: 'المهام', icon: CheckSquare, href: '/tasks', countKey: 'openTasks', countColor: 'success' },
      { title: 'الإشعارات', icon: Bell, href: '/notifications', countKey: 'unreadNotifications', countColor: 'info' },
      { title: 'حالة المزامنة', icon: RefreshCw, href: '/sync' },
      { title: 'الإعدادات', icon: Settings, href: '/settings' },
    ],
  },
];

interface SidebarNavSectionsProps {
  orderedSections: NavSection[];
  visibleSections: NavSection[];
  openSections: string[];
  collapsed: boolean;
  userRole: string | null;
  isSearching: boolean;
  isFavorite: (href: string) => boolean;
  toggleFavorite: (href: string, title: string) => void;
  toggleSection: (id: string) => void;
  onSectionDragEnd: (event: DragEndEvent) => void;
}

function SidebarNavSections({
  orderedSections,
  visibleSections,
  openSections,
  collapsed,
  userRole,
  isSearching,
  isFavorite,
  toggleFavorite,
  toggleSection,
  onSectionDragEnd,
}: SidebarNavSectionsProps) {
  const { data: counts } = useSidebarCounts();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filterItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.roles) return true;
      if (!userRole) return false;
      return item.roles.includes(userRole);
    });
  };

  const getCount = (item: NavItem) => {
    if (!item.countKey || !counts) return undefined;
    return counts[item.countKey as keyof typeof counts];
  };

  const isItemActive = (href: string) => location.pathname === href;
  const isSectionActive = (items: NavItem[]) => items.some(item => isItemActive(item.href));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onSectionDragEnd}
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
  );
}

export default memo(SidebarNavSections);
