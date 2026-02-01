import { useState, useEffect, useCallback } from 'react';

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount?: number;
}

interface UseSearchHistoryOptions {
  maxItems?: number;
  storageKey?: string;
}

interface UseSearchHistoryReturn {
  history: SearchHistoryItem[];
  recentQueries: string[];
  addToHistory: (query: string, resultCount?: number) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
  getSuggestions: (partial: string) => string[];
}

export function useSearchHistory(options: UseSearchHistoryOptions = {}): UseSearchHistoryReturn {
  const { maxItems = 20, storageKey = 'search-history' } = options;

  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // حفظ التاريخ في localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save search history:', e);
    }
  }, [history, storageKey]);

  // إضافة بحث جديد
  const addToHistory = useCallback((query: string, resultCount?: number) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    setHistory(prev => {
      // إزالة التكرارات
      const filtered = prev.filter(
        item => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
      );

      // إضافة العنصر الجديد في البداية
      const newItem: SearchHistoryItem = {
        query: trimmedQuery,
        timestamp: Date.now(),
        resultCount,
      };

      const updated = [newItem, ...filtered];

      // الاحتفاظ بالحد الأقصى فقط
      return updated.slice(0, maxItems);
    });
  }, [maxItems]);

  // إزالة عنصر من التاريخ
  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => 
      prev.filter(item => item.query.toLowerCase() !== query.toLowerCase())
    );
  }, []);

  // مسح التاريخ بالكامل
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // الحصول على اقتراحات بناءً على نص جزئي
  const getSuggestions = useCallback((partial: string): string[] => {
    const trimmed = partial.trim().toLowerCase();
    if (!trimmed) return history.slice(0, 5).map(h => h.query);

    return history
      .filter(item => item.query.toLowerCase().includes(trimmed))
      .slice(0, 5)
      .map(item => item.query);
  }, [history]);

  // قائمة الاستعلامات الأخيرة (نصوص فقط)
  const recentQueries = history.slice(0, 10).map(h => h.query);

  return {
    history,
    recentQueries,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getSuggestions,
  };
}
