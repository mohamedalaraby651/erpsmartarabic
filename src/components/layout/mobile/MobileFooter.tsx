import { Button } from '@/components/ui/button';
import { Moon, Sun, Settings, LogOut } from 'lucide-react';

interface MobileFooterProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onNavigateSettings: () => void;
  onSignOut: () => void;
}

export function MobileFooter({
  isDark,
  onThemeToggle,
  onNavigateSettings,
  onSignOut,
}: MobileFooterProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-2.5 space-y-1.5">
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={onThemeToggle}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {isDark ? 'فاتح' : 'داكن'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={onNavigateSettings}
        >
          <Settings className="h-3.5 w-3.5" />
          الإعدادات
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-8 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5"
        onClick={onSignOut}
      >
        <LogOut className="h-3.5 w-3.5" />
        تسجيل الخروج
      </Button>
    </div>
  );
}
