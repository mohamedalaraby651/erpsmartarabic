import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomShortcuts, ShortcutDefinition } from './useCustomShortcuts';

interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(customActions?: ShortcutAction[]) {
  const navigate = useNavigate();
  const { shortcuts, findShortcutByKey, getShortcutLabel } = useCustomShortcuts();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Custom page-specific actions take priority
      if (customActions) {
        for (const shortcut of customActions) {
          if (
            e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            !!e.ctrlKey === !!shortcut.ctrlKey &&
            !!e.altKey === !!shortcut.altKey &&
            !!e.shiftKey === !!shortcut.shiftKey
          ) {
            e.preventDefault();
            shortcut.action();
            return;
          }
        }
      }

      // Find matching shortcut from custom shortcuts system
      const matchedShortcut = findShortcutByKey(e.key, {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
      });

      if (matchedShortcut) {
        e.preventDefault();
        handleShortcutAction(matchedShortcut);
        return;
      }

      // Escape: Go back or close modals
      if (e.key === 'Escape') {
        // This will be handled by individual modals
        return;
      }
    },
    [customActions, findShortcutByKey]
  );

  const handleShortcutAction = (shortcut: ShortcutDefinition) => {
    switch (shortcut.action) {
      case 'show-shortcuts':
        setShowShortcutsModal(true);
        break;
      case 'new-item':
        // Dispatch custom event for page-specific handling
        window.dispatchEvent(new CustomEvent('keyboard-new-item'));
        break;
      case 'save':
        window.dispatchEvent(new CustomEvent('keyboard-save'));
        break;
      case 'print':
        window.print();
        break;
      case 'export':
        window.dispatchEvent(new CustomEvent('keyboard-export'));
        break;
      default:
        // Navigation paths
        if (shortcut.action.startsWith('/')) {
          navigate(shortcut.action);
        }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get displayable shortcuts list
  const displayableShortcuts = shortcuts
    .filter(s => s.enabled)
    .map(s => ({
      key: getShortcutLabel(s),
      description: s.description,
    }));

  // Add custom actions to display list
  const allShortcuts = [
    ...displayableShortcuts,
    ...(customActions || []).map(a => ({
      key: `${a.ctrlKey ? 'Ctrl+' : ''}${a.altKey ? 'Alt+' : ''}${a.shiftKey ? 'Shift+' : ''}${a.key.toUpperCase()}`,
      description: a.description,
    })),
  ];

  return {
    shortcuts: allShortcuts,
    showShortcutsModal,
    setShowShortcutsModal,
  };
}
