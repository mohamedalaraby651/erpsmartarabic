import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

// Route to Arabic label mapping
const routeLabels: Record<string, string> = {
  '': 'الرئيسية',
  'customers': 'العملاء',
  'products': 'المنتجات',
  'invoices': 'الفواتير',
  'quotations': 'عروض الأسعار',
  'sales-orders': 'أوامر البيع',
  'purchase-orders': 'أوامر الشراء',
  'suppliers': 'الموردين',
  'employees': 'الموظفين',
  'treasury': 'الخزينة',
  'expenses': 'المصروفات',
  'expense-categories': 'تصنيفات المصروفات',
  'inventory': 'المخزون',
  'categories': 'التصنيفات',
  'payments': 'المدفوعات',
  'reports': 'التقارير',
  'settings': 'الإعدادات',
  'notifications': 'الإشعارات',
  'search': 'البحث',
  'tasks': 'المهام',
  'attachments': 'المرفقات',
  'admin': 'الإدارة',
  'dashboard': 'لوحة التحكم',
  'users': 'المستخدمين',
  'roles': 'الأدوار',
  'permissions': 'الصلاحيات',
  'activity-log': 'سجل النشاط',
  'backup': 'النسخ الاحتياطي',
  'customizations': 'التخصيصات',
  'export-templates': 'قوالب التصدير',
  'role-limits': 'حدود الأدوار',
  'sync': 'المزامنة',
  'install': 'التثبيت',
};

// Pages that should hide breadcrumbs
const hideBreadcrumbsOn = ['/', '/auth'];

interface SmartBreadcrumbsProps {
  className?: string;
  maxItems?: number;
}

export function SmartBreadcrumbs({ className, maxItems = 4 }: SmartBreadcrumbsProps) {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Build breadcrumb items
    const items: Array<{ label: string; href: string; isLast: boolean }> = [];
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Check if this is a UUID (detail page)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      if (isUuid) {
        items.push({
          label: 'التفاصيل',
          href: currentPath,
          isLast,
        });
      } else {
        items.push({
          label: routeLabels[segment] || segment,
          href: currentPath,
          isLast,
        });
      }
    });

    // If too many items, truncate middle ones
    if (items.length > maxItems) {
      const first = items.slice(0, 1);
      const last = items.slice(-2);
      return [...first, { label: '...', href: '', isLast: false }, ...last];
    }

    return items;
  }, [location.pathname, maxItems]);

  // Hide on specific pages
  if (hideBreadcrumbsOn.includes(location.pathname)) {
    return null;
  }

  // Don't show if only home
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={cn('animate-fade-in', className)}>
      <BreadcrumbList>
        {/* Home */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to="/" 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only md:not-sr-only">الرئيسية</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((item, index) => (
          <BreadcrumbItem key={index}>
            <BreadcrumbSeparator>
              <ChevronLeft className="h-3.5 w-3.5" />
            </BreadcrumbSeparator>
            
            {item.isLast ? (
              <BreadcrumbPage className="font-medium text-foreground max-w-[150px] truncate">
                {item.label}
              </BreadcrumbPage>
            ) : item.label === '...' ? (
              <span className="text-muted-foreground px-1">...</span>
            ) : (
              <BreadcrumbLink asChild>
                <Link 
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors max-w-[120px] truncate"
                >
                  {item.label}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
