import { useEffect } from "react";

/**
 * Keyboard shortcuts for list screens (OPA-INV-UX-001 / M2).
 *
 * Keyboard Ownership Contract:
 * - Shortcuts fire only while the page-level workspace owns the keyboard.
 * - Typing contexts (input, textarea, select, combobox, date pickers,
 *   contenteditable) and transient overlays (dialog, alertdialog, popover,
 *   menu, listbox) keep their native behaviour — no shortcut is captured.
 * - Escape is delegated to the caller, which must close the highest-priority
 *   transient UI first before clearing selection.
 *
 * Presentation/interaction only — no data, query or domain behaviour here.
 */
export interface ListShortcutHandlers {
  /** `/` — focus the search field. */
  onFocusSearch?: () => void;
  /** `n` — create a new record. */
  onNew?: () => void;
  /** `r` — refresh the current view. */
  onRefresh?: () => void;
  /** `Escape` — close transient UI, else clear selection. */
  onEscape?: () => void;
  /** `?` — toggle the shortcuts help. */
  onToggleHelp?: () => void;
}

const EDITABLE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="spinbutton"]',
].join(',');

const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[data-radix-popper-content-wrapper]',
].join(',');

/** True when the event originates inside an editable control or overlay. */
const isGuardedTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest(EDITABLE_SELECTOR) || el.closest(OVERLAY_SELECTOR));
};

/** True when any modal/transient overlay is open anywhere on the page. */
const hasOpenOverlay = (): boolean => {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"]') ||
    document.querySelector('[role="alertdialog"][data-state="open"]') ||
    document.querySelector('[data-radix-popper-content-wrapper]'),
  );
};

export function useListShortcuts(handlers: ListShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Escape: the caller decides the priority order (overlay first).
      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // The workspace must own the keyboard for any other shortcut.
      if (isGuardedTarget(event.target) || hasOpenOverlay()) return;

      switch (event.key) {
        case '/':
          if (handlers.onFocusSearch) { event.preventDefault(); handlers.onFocusSearch(); }
          break;
        case 'n':
        case 'N':
          if (handlers.onNew) { event.preventDefault(); handlers.onNew(); }
          break;
        case 'r':
        case 'R':
          if (handlers.onRefresh) { event.preventDefault(); handlers.onRefresh(); }
          break;
        case '?':
        case '؟':
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

/**
 * Row activation contract: a row opens its details only when the click did not
 * originate from an interactive child (checkbox, link, button, menu, input).
 */
const INTERACTIVE_IN_ROW = 'button,a,input,select,textarea,label,[role="checkbox"],[role="button"],[role="menuitem"],[data-no-row-activate]';

export const isRowActivationTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return true;
  return !el.closest(INTERACTIVE_IN_ROW);
};
