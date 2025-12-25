import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { navSections, sectionColors } from '@/lib/navigation';
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
import {
  Factory,
  LogOut,
  Moon,
  Sun,
  Settings,
  Shield,
  Search,
} from 'lucide-react';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export default function MobileDrawer({
  open,
  onOpenChange,
  isDark,
  onThemeToggle,
}: MobileDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole, user } = useAuth();

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

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 space-y-6">
            {/* Search Button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigation('/search')}
            >
              <Search className="h-4 w-4" />
              البحث الشامل
            </Button>

            {/* Navigation Sections */}
            {navSections.map((section) => {
              const filteredItems = section.items.filter(item => {
                if (!item.roles) return true;
                if (!userRole) return false;
                return item.roles.includes(userRole);
              });

              if (filteredItems.length === 0) return null;

              return (
                <div key={section.title}>
                  <h3 className={cn('text-sm font-semibold mb-2', section.colorClass)}>
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {filteredItems.map((item) => {
                      const isActive = location.pathname === item.href;
                      const Icon = item.icon;
                      const colors = sectionColors[section.color as keyof typeof sectionColors];

                      return (
                        <Button
                          key={item.href}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3',
                            isActive && colors && `${colors.bg} ${colors.text} ${colors.dark.bg} ${colors.dark.text}`
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
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => handleNavigation('/admin/roles')}
                    >
                      إدارة الأدوار
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => handleNavigation('/admin/permissions')}
                    >
                      إدارة الصلاحيات
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => handleNavigation('/admin/customizations')}
                    >
                      تخصيص الأقسام
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => handleNavigation('/admin/users')}
                    >
                      إدارة المستخدمين
                    </Button>
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
