import {
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
  Settings,
  Bell,
  Shield,
} from 'lucide-react';

export interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  color?: string;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  color: string;
  colorClass: string;
  items: NavItem[];
}

// ألوان الأقسام
export const sectionColors = {
  inventory: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/20',
    dark: {
      bg: 'dark:bg-emerald-500/20',
      text: 'dark:text-emerald-400',
    }
  },
  sales: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/20',
    dark: {
      bg: 'dark:bg-blue-500/20',
      text: 'dark:text-blue-400',
    }
  },
  reports: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-600',
    border: 'border-slate-500/20',
    dark: {
      bg: 'dark:bg-slate-500/20',
      text: 'dark:text-slate-400',
    }
  },
  admin: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-500/20',
    dark: {
      bg: 'dark:bg-purple-500/20',
      text: 'dark:text-purple-400',
    }
  },
};

export const navSections: NavSection[] = [
  {
    title: 'المخزون والمشتريات',
    color: 'emerald',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    items: [
      {
        title: 'المنتجات',
        icon: Package,
        href: '/products',
        roles: ['admin', 'warehouse'],
        color: 'emerald',
      },
      {
        title: 'التصنيفات',
        icon: FolderTree,
        href: '/categories',
        roles: ['admin', 'warehouse'],
        color: 'emerald',
      },
      {
        title: 'المخزون',
        icon: Warehouse,
        href: '/inventory',
        roles: ['admin', 'warehouse'],
        color: 'emerald',
      },
      {
        title: 'الموردين',
        icon: Truck,
        href: '/suppliers',
        roles: ['admin', 'warehouse'],
        color: 'emerald',
      },
      {
        title: 'أوامر الشراء',
        icon: ClipboardList,
        href: '/purchase-orders',
        roles: ['admin', 'warehouse'],
        color: 'emerald',
      },
    ],
  },
  {
    title: 'المبيعات والتحصيل',
    color: 'blue',
    colorClass: 'text-blue-600 dark:text-blue-400',
    items: [
      {
        title: 'العملاء',
        icon: Users,
        href: '/customers',
        roles: ['admin', 'sales'],
        color: 'blue',
      },
      {
        title: 'عروض الأسعار',
        icon: FileText,
        href: '/quotations',
        roles: ['admin', 'sales'],
        color: 'blue',
      },
      {
        title: 'أوامر البيع',
        icon: ShoppingCart,
        href: '/sales-orders',
        roles: ['admin', 'sales'],
        color: 'blue',
      },
      {
        title: 'الفواتير',
        icon: Receipt,
        href: '/invoices',
        roles: ['admin', 'sales', 'accountant'],
        color: 'blue',
      },
      {
        title: 'التحصيل',
        icon: CreditCard,
        href: '/payments',
        roles: ['admin', 'accountant'],
        color: 'blue',
      },
    ],
  },
  {
    title: 'التقارير والإعدادات',
    color: 'slate',
    colorClass: 'text-slate-600 dark:text-slate-400',
    items: [
      {
        title: 'التقارير',
        icon: BarChart3,
        href: '/reports',
        roles: ['admin', 'accountant'],
        color: 'slate',
      },
      {
        title: 'الإشعارات',
        icon: Bell,
        href: '/notifications',
        color: 'slate',
      },
      {
        title: 'الإعدادات',
        icon: Settings,
        href: '/settings',
        color: 'slate',
      },
    ],
  },
];

// عناصر التنقل السريع للموبايل
export const mobileQuickNavItems: NavItem[] = [
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
    title: 'الفواتير',
    icon: Receipt,
    href: '/invoices',
    roles: ['admin', 'sales', 'accountant'],
  },
];

// قائمة الأدمن
export const adminNavItems: NavItem[] = [
  {
    title: 'إدارة الأدوار',
    icon: Shield,
    href: '/admin/roles',
    roles: ['admin'],
  },
  {
    title: 'إدارة الصلاحيات',
    icon: Shield,
    href: '/admin/permissions',
    roles: ['admin'],
  },
  {
    title: 'تخصيص الأقسام',
    icon: Settings,
    href: '/admin/customizations',
    roles: ['admin'],
  },
  {
    title: 'إدارة المستخدمين',
    icon: Users,
    href: '/admin/users',
    roles: ['admin'],
  },
];

// خريطة المسارات للـ Breadcrumb
export const routeLabels: Record<string, string> = {
  '/': 'لوحة التحكم',
  '/customers': 'العملاء',
  '/products': 'المنتجات',
  '/categories': 'التصنيفات',
  '/quotations': 'عروض الأسعار',
  '/sales-orders': 'أوامر البيع',
  '/invoices': 'الفواتير',
  '/payments': 'التحصيل',
  '/inventory': 'المخزون',
  '/suppliers': 'الموردين',
  '/purchase-orders': 'أوامر الشراء',
  '/reports': 'التقارير',
  '/notifications': 'الإشعارات',
  '/tasks': 'المهام',
  '/settings': 'الإعدادات',
  '/search': 'البحث',
  '/admin/roles': 'إدارة الأدوار',
  '/admin/permissions': 'إدارة الصلاحيات',
  '/admin/customizations': 'تخصيص الأقسام',
  '/admin/users': 'إدارة المستخدمين',
};

export function getRouteLabel(path: string): string {
  // Check exact match first
  if (routeLabels[path]) return routeLabels[path];
  
  // Check for dynamic routes
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const basePath = '/' + segments[0];
    if (routeLabels[basePath]) {
      return 'تفاصيل ' + routeLabels[basePath];
    }
  }
  
  return path;
}
