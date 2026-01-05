import { useState, useMemo, useCallback } from 'react';

export interface SearchableItem {
  title: string;
  href: string;
  section?: string;
  keywords?: string[];
}

export function useSidebarSearch(items: SearchableItem[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase().trim();
    
    return items.filter(item => {
      // Check title
      if (item.title.toLowerCase().includes(query)) return true;
      
      // Check section
      if (item.section?.toLowerCase().includes(query)) return true;
      
      // Check keywords
      if (item.keywords?.some(k => k.toLowerCase().includes(query))) return true;
      
      return false;
    });
  }, [items, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const hasResults = filteredItems.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    clearSearch,
    hasResults,
    isSearching,
  };
}
