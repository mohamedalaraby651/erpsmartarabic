import { Factory } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarHeaderProps {
  collapsed: boolean;
}

export function SidebarHeader({ collapsed }: SidebarHeaderProps) {
  return (
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
  );
}
