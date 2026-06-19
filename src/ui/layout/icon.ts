/**
 * Resolves a Lucide icon name from the `WorkspaceDefinition` /
 * `NavNode` string field. Falls back to a neutral square.
 */
import { Square, type LucideIcon, icons } from "lucide-react";

export function resolveIcon(name?: string): LucideIcon {
  if (!name) return Square;
  const icon = (icons as Record<string, LucideIcon>)[name];
  return icon ?? Square;
}
