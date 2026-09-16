import { useEffect } from "react";

/**
 * Keyboard shortcuts for list screens.
 * Presentation/interaction only — no data or domain behaviour lives here.
 * Shortcuts are ignored while the user types in an input, textarea,
 * contenteditable element, or while a modifier key is held.
 */
export interface ListShortcutHandlers {
  /** `/` — focus the search field. */
  onFocusSearch?: () => void;
  /** `n` — create a new record. */
  onNew?: () => void;
  /** `e` — export the current view. */
  onExport?: () => void;
  /** `r` — refresh the current view. */
  onRefresh?: () => void;
  /** `Escape` — clear selection / close transient UI. */
  onEscape?: () => void;
  /** `?` — toggle the shortcuts help. */
  onToggleHelp?: () => void;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

export function useListShortcuts(handlers: ListShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Escape must work even from inside the search field.
      if (event.key === 'Escape') {
        if (handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }

      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case '/':
          if (handlers.onFocusSearch) { event.preventDefault(); handlers.onFocusSearch(); }
          break;
        case 'n':
        case 'N':
          if (handlers.onNew) { event.preventDefault(); handlers.onNew(); }
          break;
        case 'e':
        case 'E':
          if (handlers.onExport) { event.preventDefault(); handlers.onExport(); }
          break;
        case 'r':
        case 'R':
          if (handlers.onRefresh) { event.preventDefault(); handlers.onRefresh(); }
          break;
        case '?':
          if (handlers.onToggleHelp) { event.preventDefault(); handlers.onToggleHelp(); }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, handlers]);
}
