/**
 * NavigationTree — recursive renderer for `NavNode[]`. Pure presentation;
 * respects permissions, feature flags, hidden, order. Token-only styling.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavNode } from "./types";
import { resolveIcon } from "./icon";
import { useWorkspace } from "../hooks/useWorkspace";
import { useLocationAdapter } from "../providers/shell-services";

interface Props {
  nodes: readonly NavNode[];
  collapsed?: boolean;
  featureFlags?: ReadonlySet<string>;
  depth?: number;
}

function sortNodes(nodes: readonly NavNode[]): readonly NavNode[] {
  return [...nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function NavigationTree({
  nodes,
  collapsed = false,
  featureFlags,
  depth = 0,
}: Props) {
  const { permissions } = useWorkspace();
  const location = useLocationAdapter();
  const currentPath = location.pathname();

  const visible = sortNodes(nodes).filter((n) => {
    if (n.hidden) return false;
    if (n.permission && !permissions.has(n.permission)) return false;
    if (n.featureFlag && featureFlags && !featureFlags.has(n.featureFlag))
      return false;
    return true;
  });

  return (
    <ul
      className={cn(
        "flex flex-col gap-0.5",
        depth > 0 && "ms-3 border-s border-border ps-2"
      )}
      role="tree"
    >
      {visible.map((node) => (
        <NavNodeItem
          key={node.id}
          node={node}
          collapsed={collapsed}
          currentPath={currentPath}
          featureFlags={featureFlags}
          depth={depth}
        />
      ))}
    </ul>
  );
}

interface ItemProps {
  node: NavNode;
  collapsed: boolean;
  currentPath: string;
  featureFlags?: ReadonlySet<string>;
  depth: number;
}

function NavNodeItem({
  node,
  collapsed,
  currentPath,
  featureFlags,
  depth,
}: ItemProps) {
  const Icon = resolveIcon(node.icon);
  const isActive = node.to ? currentPath.startsWith(node.to) : false;
  const [open, setOpen] = useState(isActive || depth === 0);

  if (node.type === "group") {
    return (
      <li role="treeitem" aria-expanded={open}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
            "text-sm font-medium text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && (
            <>
              <span className="flex-1 text-start truncate">{node.title}</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  open ? "rotate-0" : "-rotate-90 rtl:rotate-90"
                )}
                aria-hidden="true"
              />
            </>
          )}
        </button>
        {open && node.children && !collapsed && (
          <NavigationTree
            nodes={node.children}
            collapsed={collapsed}
            featureFlags={featureFlags}
            depth={depth + 1}
          />
        )}
      </li>
    );
  }

  return (
    <li role="treeitem" aria-current={isActive ? "page" : undefined}>
      <a
        href={node.to ?? "#"}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        title={collapsed ? node.title : undefined}
        aria-label={node.title}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{node.title}</span>
            {node.badge !== undefined && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {node.badge}
              </span>
            )}
          </>
        )}
      </a>
    </li>
  );
}
