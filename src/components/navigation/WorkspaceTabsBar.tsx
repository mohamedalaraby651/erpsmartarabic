import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from '@/lib/router-compat';
import { cn } from '@/lib/utils';
import { routeLabels } from './SmartBreadcrumbs';
import { closeTab, loadTabs, openTab, saveTabs, type WorkspaceTab } from '@/lib/workspace/workspaceTabs';

function labelFor(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return 'الرئيسية';
  const base = routeLabels[segs[0]] || segs[0];
  if (segs.length === 1) return base;
  const last = segs[segs.length - 1];
  return `${base} · ${routeLabels[last] || last.slice(0, 8)}`;
}

/** Top bar of open screens; switching keeps each screen's URL state (decision 327). */
export function WorkspaceTabsBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const current = location.pathname;

  useEffect(() => { setTabs(loadTabs()); }, []);
  useEffect(() => {
    const path = current + (location.search ?? '');
    setTabs((prev) => {
      const next = openTab(prev, { path, label: labelFor(current) });
      saveTabs(next);
      return next;
    });
  }, [current, location.search]);

  const close = (path: string) => {
    const next = closeTab(tabs, path);
    setTabs(next); saveTabs(next);
    if (path.split('?')[0] === current) navigate(next.length ? next[next.length - 1].path : '/');
  };

  if (tabs.length < 2) return null;
  return (
    <nav aria-label="الشاشات المفتوحة" className="flex gap-1 overflow-x-auto border-b bg-muted/30 px-4 pt-1.5">
      {tabs.map((t) => {
        const active = t.path.split('?')[0] === current;
        return (
          <div key={t.path} className={cn('group flex shrink-0 items-center gap-1 rounded-t-md border border-b-0 px-3 py-1.5 text-sm',
            active ? 'bg-background font-semibold text-foreground' : 'bg-transparent text-muted-foreground hover:bg-background/60')}>
            <button type="button" onClick={() => navigate(t.path)} className="max-w-[160px] truncate">{t.label}</button>
            <button type="button" aria-label={`إغلاق ${t.label}`} onClick={() => close(t.path)} className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
