import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Moon, Sun, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarFooterProps {
  collapsed: boolean;
  isDark: boolean;
  onThemeToggle: () => void;
  onToggle: () => void;
  onSignOut: () => void;
}

export function SidebarFooter({
  collapsed,
  isDark,
  onThemeToggle,
  onToggle,
  onSignOut,
}: SidebarFooterProps) {
  return (
    <div className="border-t border-sidebar-border p-3 space-y-2">
      {collapsed ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onThemeToggle}
                className="w-full"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                className="w-full text-destructive hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تسجيل الخروج</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onThemeToggle}
              className="flex-1 gap-2"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'فاتح' : 'داكن'}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={onToggle}
        className={cn(
          'absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background shadow-md',
          'hover:bg-muted border'
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
