import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const location = useLocation();

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

      // Custom actions take priority
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

      // Global shortcuts
      const key = e.key.toLowerCase();
      
      // Ctrl+K: Global search
      if (e.ctrlKey && key === 'k') {
        e.preventDefault();
        navigate('/search');
        return;
      }

      // Escape: Go back or close modals
      if (key === 'escape') {
        // This will be handled by individual modals
        return;
      }

      // Ctrl+/: Show shortcuts help (can be implemented later)
      if (e.ctrlKey && key === '/') {
        e.preventDefault();
        // Could open a shortcuts modal
        return;
      }

      // Navigation shortcuts (Alt+number)
      if (e.altKey) {
        switch (key) {
          case '1':
            e.preventDefault();
            navigate('/');
            break;
          case '2':
            e.preventDefault();
            navigate('/customers');
            break;
          case '3':
            e.preventDefault();
            navigate('/products');
            break;
          case '4':
            e.preventDefault();
            navigate('/invoices');
            break;
          case '5':
            e.preventDefault();
            navigate('/sales-orders');
            break;
          case '6':
            e.preventDefault();
            navigate('/reports');
            break;
          case '7':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
    },
    [navigate, customActions]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: [
      { key: 'Ctrl+K', description: 'البحث الشامل' },
      { key: 'Alt+1', description: 'الرئيسية' },
      { key: 'Alt+2', description: 'العملاء' },
      { key: 'Alt+3', description: 'المنتجات' },
      { key: 'Alt+4', description: 'الفواتير' },
      { key: 'Alt+5', description: 'أوامر البيع' },
      { key: 'Alt+6', description: 'التقارير' },
      { key: 'Alt+7', description: 'الإعدادات' },
      ...(customActions || []).map((a) => ({
        key: `${a.ctrlKey ? 'Ctrl+' : ''}${a.altKey ? 'Alt+' : ''}${a.shiftKey ? 'Shift+' : ''}${a.key.toUpperCase()}`,
        description: a.description,
      })),
    ],
  };
}
