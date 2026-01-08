import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'sidebar_favorites';
const MAX_FAVORITES = 7;

export interface FavoritePage {
  href: string;
  title: string;
  addedAt: number;
}

export function useFavoritePages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<FavoritePage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage first, then sync with DB
  useEffect(() => {
    if (!user?.id) return;
    
    // Load from localStorage first (fast)
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
    setIsLoaded(true);

    // Then sync from database
    const loadFromDb = async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('favorite_pages')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.favorite_pages) {
        const dbFavorites = data.favorite_pages as unknown as FavoritePage[];
        if (Array.isArray(dbFavorites)) {
          setFavorites(dbFavorites);
          localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(dbFavorites));
        }
      }
    };

    loadFromDb();
  }, [user?.id]);

  // Save favorites to both localStorage and database
  const saveFavorites = useCallback(async (newFavorites: FavoritePage[]) => {
    if (!user?.id) return;
    
    // Save to localStorage (fast)
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newFavorites));
    setFavorites(newFavorites);

    // Save to database (background)
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_preferences')
        .update({ favorite_pages: JSON.parse(JSON.stringify(newFavorites)) })
        .eq('user_id', user.id);
    } else {
      await (supabase
        .from('user_preferences')
        .insert as any)({
          user_id: user.id,
          favorite_pages: JSON.parse(JSON.stringify(newFavorites)),
        });
    }

    queryClient.invalidateQueries({ queryKey: ['user-preferences', user.id] });
  }, [user?.id, queryClient]);

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
    isLoaded,
  };
}
