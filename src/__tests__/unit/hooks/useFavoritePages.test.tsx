/**
 * Favorite Pages Hook Tests
 * اختبارات خطاف الصفحات المفضلة
 * 
 * Tests for useFavoritePages hook which manages user's favorite navigation pages
 * @module tests/hooks/useFavoritePages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    session: { access_token: 'test-token' },
    loading: false,
    userRole: 'admin',
  }),
}));

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Import after mocks are set up
import { useFavoritePages } from '@/hooks/useFavoritePages';

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useFavoritePages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Initialization / التهيئة', () => {
    it('should start with empty favorites', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.favorites).toEqual([]);
    });

    it('should load favorites from localStorage', async () => {
      const savedFavorites = [
        { href: '/customers', title: 'العملاء', addedAt: Date.now() },
      ];
      localStorage.setItem('sidebar_favorites_test-user-id', JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.favorites.length).toBe(1);
      });
    });

    it('should have correct max favorites limit', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      expect(result.current.maxFavorites).toBe(7);
    });
  });

  describe('Add Favorite / إضافة مفضلة', () => {
    it('should add a favorite page', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.addFavorite('/customers', 'العملاء');
      });

      expect(result.current.favorites.length).toBe(1);
      expect(result.current.favorites[0].href).toBe('/customers');
    });

    it('should not add duplicate favorites', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.addFavorite('/customers', 'العملاء');
      });

      act(() => {
        const added = result.current.addFavorite('/customers', 'العملاء');
        expect(added).toBe(false);
      });

      expect(result.current.favorites.length).toBe(1);
    });

    it('should respect max favorites limit', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Add 7 favorites (max limit)
      for (let i = 0; i < 7; i++) {
        act(() => {
          result.current.addFavorite(`/page-${i}`, `Page ${i}`);
        });
      }

      // Try to add 8th favorite - should fail
      act(() => {
        const added = result.current.addFavorite('/page-8', 'Page 8');
        expect(added).toBe(false);
      });

      expect(result.current.favorites.length).toBe(7);
      expect(result.current.canAddMore).toBe(false);
    });
  });

  describe('Remove Favorite / إزالة مفضلة', () => {
    it('should remove a favorite page', async () => {
      const savedFavorites = [
        { href: '/customers', title: 'العملاء', addedAt: Date.now() },
        { href: '/products', title: 'المنتجات', addedAt: Date.now() },
      ];
      localStorage.setItem('sidebar_favorites_test-user-id', JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(2);
      });

      act(() => {
        result.current.removeFavorite('/customers');
      });

      expect(result.current.favorites.length).toBe(1);
      expect(result.current.favorites[0].href).toBe('/products');
    });
  });

  describe('Check Favorite / التحقق من المفضلة', () => {
    it('should correctly identify favorites', async () => {
      const savedFavorites = [
        { href: '/customers', title: 'العملاء', addedAt: Date.now() },
      ];
      localStorage.setItem('sidebar_favorites_test-user-id', JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.isFavorite('/customers')).toBe(true);
      expect(result.current.isFavorite('/products')).toBe(false);
    });
  });

  describe('Toggle Favorite / تبديل المفضلة', () => {
    it('should toggle favorite on', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.toggleFavorite('/customers', 'العملاء');
      });

      expect(result.current.isFavorite('/customers')).toBe(true);
    });

    it('should toggle favorite off', async () => {
      const savedFavorites = [
        { href: '/customers', title: 'العملاء', addedAt: Date.now() },
      ];
      localStorage.setItem('sidebar_favorites_test-user-id', JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFavorite('/customers')).toBe(true);
      });

      act(() => {
        result.current.toggleFavorite('/customers', 'العملاء');
      });

      expect(result.current.isFavorite('/customers')).toBe(false);
    });
  });

  describe('Reorder Favorites / إعادة ترتيب المفضلات', () => {
    it('should reorder favorites', async () => {
      const savedFavorites = [
        { href: '/customers', title: 'العملاء', addedAt: 1 },
        { href: '/products', title: 'المنتجات', addedAt: 2 },
      ];
      localStorage.setItem('sidebar_favorites_test-user-id', JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(2);
      });

      const reordered = [
        { href: '/products', title: 'المنتجات', addedAt: 2 },
        { href: '/customers', title: 'العملاء', addedAt: 1 },
      ];

      act(() => {
        result.current.reorderFavorites(reordered);
      });

      expect(result.current.favorites[0].href).toBe('/products');
      expect(result.current.favorites[1].href).toBe('/customers');
    });
  });

  describe('Can Add More / إمكانية الإضافة', () => {
    it('should allow adding when under limit', async () => {
      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.canAddMore).toBe(true);
    });

    it('should not allow adding when at limit', async () => {
      const savedFavorites = Array.from({ length: 7 }, (_, i) => ({
        href: `/page-${i}`,
        title: `Page ${i}`,
        addedAt: Date.now(),
      }));
      localStorage.setItem('sidebar_favorites_test-user-id', JSON.stringify(savedFavorites));

      const { result } = renderHook(() => useFavoritePages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.favorites.length).toBe(7);
      });

      expect(result.current.canAddMore).toBe(false);
    });
  });
});
