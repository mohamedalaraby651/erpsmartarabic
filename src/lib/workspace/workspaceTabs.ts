/** Multi-task tabs store (decision 327). Pure helpers, persisted in sessionStorage. */
export interface WorkspaceTab { path: string; label: string }
export const MAX_TABS = 10;
const KEY = 'nazra:workspace-tabs';

export function openTab(tabs: WorkspaceTab[], tab: WorkspaceTab): WorkspaceTab[] {
  const base = (p: string) => p.split('?')[0];
  const i = tabs.findIndex((t) => base(t.path) === base(tab.path));
  if (i >= 0) return tabs.map((t, k) => (k === i ? tab : t));
  const next = [...tabs, tab];
  return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
}

export function closeTab(tabs: WorkspaceTab[], path: string): WorkspaceTab[] {
  return tabs.filter((t) => t.path !== path);
}

export function loadTabs(): WorkspaceTab[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveTabs(tabs: WorkspaceTab[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(tabs)); } catch { /* ignore */ }
}
