import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      getSession: vi.fn(() => Promise.resolve({ 
        data: { session: null }, 
        error: null 
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      // Initially loading
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should have null user when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('Sign In', () => {
    it('should call signInWithPassword with correct credentials', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should return error on failed sign in', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ 
        error: mockError,
        data: { user: null, session: null }
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(signInResult?.error).toBeTruthy();
    });
  });

  describe('Sign Up', () => {
    it('should call signUp with correct data and redirect URL', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'New User');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: expect.stringContaining('/'),
          data: {
            full_name: 'New User'
          }
        }
      });
    });

    it('should return error on failed sign up', async () => {
      const mockError = new Error('User already exists');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({ 
        error: mockError,
        data: { user: null, session: null }
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password123', 'User');
      });

      expect(signUpResult?.error).toBeTruthy();
    });
  });

  describe('Sign Out', () => {
    it('should call signOut and clear user state', async () => {
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.auth.signOut).mockImplementation(mockSignOut);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.userRole).toBeNull();
    });
  });

  describe('Auth State Change', () => {
    it('should set up auth state listener on mount', () => {
      renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
      const unsubscribeMock = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } }
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      unmount();
      
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('User Role', () => {
    it('should fetch user role when session exists', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token'
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null
      });

      const mockFromSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockFromSelect
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Role fetching is deferred with setTimeout
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_roles');
      }, { timeout: 1000 });
    });
  });
});

describe('useAuth Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    // Should not throw
    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it('should handle role fetch errors gracefully', async () => {
    const mockSession = {
      user: { id: 'user-123' },
      access_token: 'token'
    };
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not crash, role should be null
    expect(result.current.userRole).toBeNull();
  });
});
