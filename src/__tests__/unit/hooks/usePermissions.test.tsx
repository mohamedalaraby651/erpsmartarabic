import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' },
    userRole: 'sales'
  }))
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { usePermissions } from '@/hooks/usePermissions';
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

describe('usePermissions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { custom_role_id: 'role-123' },
                error: null
              })
            })
          })
        } as any;
      }
      if (table === 'role_section_permissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { section: 'customers', can_view: true, can_create: true, can_edit: true, can_delete: false },
                { section: 'products', can_view: true, can_create: false, can_edit: false, can_delete: false }
              ],
              error: null
            })
          })
        } as any;
      }
      if (table === 'role_field_permissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { section: 'customers', field_name: 'credit_limit', can_view: true, can_edit: false },
                { section: 'customers', field_name: 'email', can_view: true, can_edit: true }
              ],
              error: null
            })
          })
        } as any;
      }
      if (table === 'role_limits') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  max_discount_percentage: 20,
                  max_credit_limit: 50000,
                  max_invoice_amount: 100000
                },
                error: null
              })
            })
          })
        } as any;
      }
      return { select: vi.fn() } as any;
    });
  });

  describe('Section Permissions', () => {
    it('should return hook result', () => {
      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      // Verify hook returns expected structure
      expect(result.current).toHaveProperty('hasPermission');
      expect(result.current).toHaveProperty('canViewField');
      expect(result.current).toHaveProperty('canEditField');
      expect(result.current).toHaveProperty('checkLimit');
      expect(result.current).toHaveProperty('isAdmin');
    });

    it('should have hasPermission function', () => {
      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(typeof result.current.hasPermission).toBe('function');
    });

    it('should have canViewField function', () => {
      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(typeof result.current.canViewField).toBe('function');
    });

    it('should have canEditField function', () => {
      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(typeof result.current.canEditField).toBe('function');
    });

    it('should have checkLimit function', () => {
      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(typeof result.current.checkLimit).toBe('function');
    });
  });

  describe('Admin Role', () => {
    it('should identify admin user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'admin-123' },
        userRole: 'admin',
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn()
      } as any);

      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(result.current.isAdmin).toBe(true);
    });

    it('should identify non-admin user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123' },
        userRole: 'sales',
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn()
      } as any);

      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('No User', () => {
    it('should handle no user gracefully', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userRole: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn()
      } as any);

      const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
      
      expect(result.current.isAdmin).toBe(false);
    });
  });
});
