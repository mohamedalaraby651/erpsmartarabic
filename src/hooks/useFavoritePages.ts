import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'sidebar_favorites';
const MAX_FAVORITES = 7;

export interface FavoritePage {
  href: string;
  title: string;
  addedAt: number;
}

export function useFavoritePages() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePage[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    if (!user?.id) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, [user?.id]);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: FavoritePage[]) => {
    if (!user?.id) return;
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  }, [user?.id]);

  const addFavorite = useCallback((href: string, title: string) => {
    if (favorites.length >= MAX_FAVORITES) return false;
    if (favorites.some(f => f.href === href)) return false;
    
    const newFavorites = [...favorites, { href, title, addedAt: Date.now() }];
    saveFavorites(newFavorites);
    return true;
  }, [favorites, saveFavorites]);

  const removeFavorite = useCallback((href: string) => {
    const newFavorites = favorites.filter(f => f.href !== href);
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  const isFavorite = useCallback((href: string) => {
    return favorites.some(f => f.href === href);
  }, [favorites]);

  const toggleFavorite = useCallback((href: string, title: string) => {
    if (isFavorite(href)) {
      removeFavorite(href);
      return false;
    } else {
      return addFavorite(href, title);
    }
  }, [isFavorite, removeFavorite, addFavorite]);

  const reorderFavorites = useCallback((newOrder: FavoritePage[]) => {
    saveFavorites(newOrder);
  }, [saveFavorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    reorderFavorites,
    maxFavorites: MAX_FAVORITES,
    canAddMore: favorites.length < MAX_FAVORITES,
  };
}
