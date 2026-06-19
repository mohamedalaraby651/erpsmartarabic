/**
 * useBreadcrumbs — derive breadcrumbs from the LocationAdapter and the
 * active workspace. Workspaces may provide a custom resolver.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocationAdapter } from "../providers/shell-services";
import { useWorkspaceContext } from "../providers/WorkspaceProvider";
import type { Breadcrumb, NavNode } from "../layout/types";

function walkNavForPath(
  nodes: readonly NavNode[],
  pathname: string,
  trail: Breadcrumb[] = []
): Breadcrumb[] | null {
  for (const node of nodes) {
    const next = [...trail, { label: node.title, to: node.to }];
    if (node.type === "link" && node.to && pathname.startsWith(node.to)) {
      return next;
    }
    if (node.children) {
      const found = walkNavForPath(node.children, pathname, next);
      if (found) return found;
    }
  }
  return null;
}

export function useBreadcrumbs(): readonly Breadcrumb[] {
  const location = useLocationAdapter();
  const { active, activeId } = useWorkspaceContext();
  const [pathname, setPathname] = useState(() => location.pathname());

  useEffect(() => {
    setPathname(location.pathname());
    return location.subscribe?.(() => setPathname(location.pathname()));
  }, [location]);

  return useMemo<readonly Breadcrumb[]>(() => {
    if (active?.breadcrumbs) {
      return active.breadcrumbs(pathname, { workspaceId: activeId });
    }
    const root: Breadcrumb = active
      ? { label: active.name, to: active.basePath }
      : { label: "Home", to: "/" };
    const fromNav = active
      ? walkNavForPath(active.navigation, pathname, [root])
      : null;
    return fromNav ?? [root];
  }, [active, activeId, pathname]);
}
