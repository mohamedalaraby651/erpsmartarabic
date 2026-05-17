import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Users, Package, FileText, Receipt, ShoppingCart,
  CreditCard, Truck, ClipboardList, ListChecks,
  LayoutDashboard, BarChart3, Settings, Building2, Wallet,
} from 'lucide-react';

const items = [
  { label: 'لوحة التحكم', href: '/', icon: LayoutDashboard, group: 'تنقّل' },
  { label: 'العملاء', href: '/customers', icon: Users, group: 'تنقّل' },
  { label: 'الموردون', href: '/suppliers', icon: Truck, group: 'تنقّل' },
  { label: 'المنتجات', href: '/products', icon: Package, group: 'تنقّل' },
  { label: 'الفواتير', href: '/invoices', icon: Receipt, group: 'تنقّل' },
  { label: 'عروض الأسعار', href: '/quotations', icon: FileText, group: 'تنقّل' },
  { label: 'أوامر البيع', href: '/sales-orders', icon: ShoppingCart, group: 'تنقّل' },
  { label: 'أوامر الشراء', href: '/purchase-orders', icon: ClipboardList, group: 'تنقّل' },
  { label: 'التحصيلات', href: '/payments', icon: CreditCard, group: 'تنقّل' },
  { label: 'الخزينة', href: '/treasury', icon: Wallet, group: 'تنقّل' },
  { label: 'المهام', href: '/tasks', icon: ListChecks, group: 'تنقّل' },
  { label: 'التقارير', href: '/reports', icon: BarChart3, group: 'تنقّل' },
  { label: 'الإعدادات', href: '/settings', icon: Settings, group: 'تنقّل' },

  { label: 'عميل جديد', href: '/customers?action=new', icon: Users, group: 'إنشاء' },
  { label: 'فاتورة جديدة', href: '/invoices?action=new', icon: Receipt, group: 'إنشاء' },
  { label: 'عرض سعر جديد', href: '/quotations?action=new', icon: FileText, group: 'إنشاء' },
  { label: 'تحصيل جديد', href: '/payments?action=new', icon: CreditCard, group: 'إنشاء' },
  { label: 'منتج جديد', href: '/products?action=new', icon: Package, group: 'إنشاء' },
  { label: 'مورد جديد', href: '/suppliers?action=new', icon: Truck, group: 'إنشاء' },
  { label: 'مهمة جديدة', href: '/tasks?action=new', icon: ListChecks, group: 'إنشاء' },

  { label: 'لوحة الإدارة', href: '/admin', icon: Building2, group: 'إدارة' },
] as const;

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate],
  );

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="ابحث أو نفّذ أمراً... (Ctrl/Cmd + K)" />
      <CommandList>
        <CommandEmpty>لا توجد نتائج</CommandEmpty>
        {groups.map((g, gi) => (
          <div key={g}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={g}>
              {items
                .filter((i) => i.group === g)
                .map((i) => {
                  const Icon = i.icon;
                  return (
                    <CommandItem key={i.href + i.label} onSelect={() => go(i.href)}>
                      <Icon className="ms-2 h-4 w-4 text-muted-foreground" />
                      <span>{i.label}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandBar;
