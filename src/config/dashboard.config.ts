/**
 * Dashboard quick action configuration.
 * Extracted from Dashboard.tsx for maintainability and reuse.
 */
import {
  Users, Package, FileText, Receipt, ShoppingCart,
  ClipboardList, Truck, CreditCard, Briefcase, ListChecks,
} from 'lucide-react';
import { quickActionLabels } from '@/lib/uiCopy';

export interface QuickAction {
  title: string;
  icon: React.ElementType;
  href: string;
  tone: string;
  roles: string[];
}

export const allQuickActions: QuickAction[] = [
  { title: quickActionLabels.newCustomer, icon: Users, href: '/customers', tone: 'bg-primary/10 text-primary', roles: ['admin', 'sales'] },
  { title: quickActionLabels.newProduct, icon: Package, href: '/products', tone: 'bg-success/10 text-success', roles: ['admin', 'warehouse'] },
  { title: quickActionLabels.newQuotation, icon: FileText, href: '/quotations', tone: 'bg-accent text-accent-foreground', roles: ['admin', 'sales'] },
  { title: quickActionLabels.newInvoice, icon: Receipt, href: '/invoices', tone: 'bg-warning/10 text-warning', roles: ['admin', 'sales', 'accountant'] },
  { title: quickActionLabels.newSalesOrder, icon: ShoppingCart, href: '/sales-orders', tone: 'bg-primary/10 text-primary', roles: ['admin', 'sales'] },
  { title: quickActionLabels.newPurchaseOrder, icon: ClipboardList, href: '/purchase-orders', tone: 'bg-success/10 text-success', roles: ['admin', 'warehouse'] },
  { title: quickActionLabels.newSupplier, icon: Truck, href: '/suppliers', tone: 'bg-success/10 text-success', roles: ['admin', 'warehouse'] },
  { title: quickActionLabels.newCollection, icon: CreditCard, href: '/payments', tone: 'bg-primary/10 text-primary', roles: ['admin', 'accountant'] },
  { title: quickActionLabels.newEmployee, icon: Briefcase, href: '/employees', tone: 'bg-warning/10 text-warning', roles: ['admin', 'hr'] },
  { title: quickActionLabels.newTask, icon: ListChecks, href: '/tasks', tone: 'bg-destructive/10 text-destructive', roles: ['admin', 'sales', 'warehouse', 'accountant', 'hr'] },
];

export const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};
