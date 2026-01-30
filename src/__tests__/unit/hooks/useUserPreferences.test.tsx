import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockApplyTheme, mockSaveThemeToLocalStorage, mockGetThemeFromLocalStorage } = vi.hoisted(() => ({
  mockApplyTheme: vi.fn(),
  mockSaveThemeToLocalStorage: vi.fn(),
  mockGetThemeFromLocalStorage: vi.fn(() => ({
    theme: 'system',
    primaryColor: '#2563eb',
    accentColor: '#8b5cf6',
    fontFamily: 'Cairo',
    fontSize: 'medium',
    sidebarCompact: false,
  })),
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' }
  }))
}));

// Mock themeManager
vi.mock('@/lib/themeManager', () => ({
  applyTheme: mockApplyTheme,
  saveThemeToLocalStorage: mockSaveThemeToLocalStorage,
  getThemeFromLocalStorage: mockGetThemeFromLocalStorage,
  defaultThemeConfig: {
    theme: 'system',
    primaryColor: '#2563eb',
    accentColor: '#8b5cf6',
    fontFamily: 'Cairo',
    fontSize: 'medium',
    sidebarCompact: false,
  }
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('useUserPreferences Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  theme: 'dark',
                  primary_color: '#3b82f6',
                  accent_color: '#8b5cf6',
                  font_family: 'Cairo',
                  font_size: 'medium',
                  sidebar_compact: false,
                  sidebar_order: '["dashboard","customers","products"]',
                  favorite_pages: '[]',
                  table_settings: '{}',
                  collapsed_sections: '[]',
                  dashboard_widgets: '[]',
                  notification_settings: '{}'
                },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          }),
          insert: vi.fn().mockResolvedValue({ error: null })
        } as any;
      }
      return { select: vi.fn() } as any;
    });
  });

  describe('Fetching Preferences', () => {
    it('should fetch user preferences on mount', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences.theme).toBe('dark');
      expect(result.current.preferences.primary_color).toBe('#3b82f6');
    });

    it('should use default preferences when no data exists', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      } as any));

      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have default values
      expect(result.current.preferences.theme).toBe('system');
      expect(result.current.preferences.font_size).toBe('medium');
    });

    it('should merge fetched preferences with defaults', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                theme: 'light',
                primary_color: null,
                font_family: null
              },
              error: null
            })
          })
        })
      } as any));

      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences.theme).toBe('light');
      expect(result.current.preferences.font_size).toBe('medium');
    });
  });

  describe('Updating Preferences', () => {
    it('should provide updateTheme function', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.updateTheme).toBe('function');
      expect(result.current.preferences).toBeDefined();
    });

    it('should provide updateSidebarCompact function', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.updateSidebarCompact).toBe('function');
      expect(result.current.preferences).toBeDefined();
    });

    it('should call applyTheme when preferences are fetched', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApplyTheme).toHaveBeenCalled();
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON arrays correctly', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                favorite_pages: '["dashboard", "customers", "products"]',
                sidebar_order: '["products", "customers", "dashboard"]',
                collapsed_sections: '["settings"]'
              },
              error: null
            })
          })
        })
      } as any));

      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences.favorite_pages).toEqual(['dashboard', 'customers', 'products']);
      expect(result.current.preferences.sidebar_order).toEqual(['products', 'customers', 'dashboard']);
      expect(result.current.preferences.collapsed_sections).toEqual(['settings']);
    });

    it('should parse JSON objects correctly', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                table_settings: '{"customers": {"pageSize": 25}}',
                notification_settings: '{"email": true, "push": false}'
              },
              error: null
            })
          })
        })
      } as any));

      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences.table_settings).toEqual({ customers: { pageSize: 25 } });
      expect(result.current.preferences.notification_settings).toEqual({ email: true, push: false });
    });

    it('should handle invalid JSON gracefully', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                favorite_pages: 'invalid json',
                table_settings: '{broken'
              },
              error: null
            })
          })
        })
      } as any));

      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.preferences.favorite_pages)).toBe(true);
      expect(typeof result.current.preferences.table_settings).toBe('object');
    });
  });

  describe('No User', () => {
    it('should return defaults when no user is logged in', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userRole: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn()
      } as any);

      const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences.theme).toBe('system');
    });
  });
});

describe('useUserPreferences Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      userRole: 'sales',
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any);
  });

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      })
    } as any));

    const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences.theme).toBe('system');
  });

  it('should handle update errors gracefully', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { theme: 'light' },
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') })
      }),
      insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') })
    } as any));

    const { result } = renderHook(() => useUserPreferences(), { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not crash
    expect(result.current.preferences).toBeDefined();
  });
});
