import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Layers,
  LogOut,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { label: 'الرئيسية', icon: LayoutDashboard, path: '/platform' },
  { label: 'الشركات', icon: Building2, path: '/platform/tenants' },
  { label: 'المسؤولين', icon: Users, path: '/platform/admins' },
  { label: 'الاشتراكات', icon: CreditCard, path: '/platform/billing' },
  { label: 'التقارير', icon: BarChart3, path: '/platform/reports' },
  { label: 'الإعدادات', icon: Settings, path: '/platform/settings' },
];

export default function PlatformSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { platformRole } = usePlatformAdmin();

  const roleLabel = {
    super_admin: 'مالك المنصة',
    support: 'دعم فني',
    billing: 'إدارة مالية',
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-[260px] border-l bg-sidebar-background text-sidebar-foreground flex flex-col z-50">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate">لوحة تحكم المنصة</h2>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-primary" />
            <span className="text-xs text-muted-foreground">
              {roleLabel[platformRole || 'super_admin']}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === '/platform'
              ? location.pathname === '/platform'
              : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* Footer */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 ml-2" />
          تسجيل الخروج
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">نظرة v2.0 - إدارة المنصة</p>
      </div>
    </aside>
  );
}
