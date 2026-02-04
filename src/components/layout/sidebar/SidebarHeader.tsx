import { Layers } from 'lucide-react';
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-md shadow-primary/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">نظرة</h1>
            <p className="text-xs text-muted-foreground">نظام إدارة الأعمال</p>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-md shadow-primary/20">
          <Layers className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  );
}
