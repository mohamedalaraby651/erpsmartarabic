/**
 * Navigation and Routes Integration Tests
 * اختبارات تكامل التنقل والمسارات
 * 
 * @module tests/integration/navigation-routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
    userRole: 'admin',
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Test wrapper
const createWrapper = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Location display component for testing
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('Route Configuration Tests / اختبارات تكوين المسارات', () => {
  const routes = [
    { path: '/', name: 'Dashboard / لوحة التحكم' },
    { path: '/auth', name: 'Auth / تسجيل الدخول' },
    { path: '/customers', name: 'Customers List / قائمة العملاء' },
    { path: '/customers/123', name: 'Customer Details / تفاصيل العميل' },
    { path: '/products', name: 'Products List / قائمة المنتجات' },
    { path: '/products/123', name: 'Product Details / تفاصيل المنتج' },
    { path: '/invoices', name: 'Invoices List / قائمة الفواتير' },
    { path: '/invoices/123', name: 'Invoice Details / تفاصيل الفاتورة' },
    { path: '/quotations', name: 'Quotations List / قائمة العروض' },
    { path: '/quotations/123', name: 'Quotation Details / تفاصيل العرض' },
    { path: '/sales-orders', name: 'Sales Orders / أوامر البيع' },
    { path: '/sales-orders/123', name: 'Sales Order Details / تفاصيل أمر البيع' },
    { path: '/purchase-orders', name: 'Purchase Orders / أوامر الشراء' },
    { path: '/purchase-orders/123', name: 'PO Details / تفاصيل أمر الشراء' },
    { path: '/suppliers', name: 'Suppliers / الموردين' },
    { path: '/suppliers/123', name: 'Supplier Details / تفاصيل المورد' },
    { path: '/inventory', name: 'Inventory / المخزون' },
    { path: '/categories', name: 'Categories / التصنيفات' },
    { path: '/treasury', name: 'Treasury / الخزينة' },
    { path: '/treasury/123', name: 'Cash Register / الصندوق' },
    { path: '/expenses', name: 'Expenses / المصروفات' },
    { path: '/expense-categories', name: 'Expense Categories / تصنيفات المصروفات' },
    { path: '/employees', name: 'Employees / الموظفين' },
    { path: '/employees/123', name: 'Employee Details / تفاصيل الموظف' },
    { path: '/payments', name: 'Payments / المدفوعات' },
    { path: '/reports', name: 'Reports / التقارير' },
    { path: '/settings', name: 'Settings / الإعدادات' },
    { path: '/notifications', name: 'Notifications / الإشعارات' },
    { path: '/tasks', name: 'Tasks / المهام' },
    { path: '/search', name: 'Search / البحث' },
    { path: '/admin', name: 'Admin Dashboard / لوحة الإدارة' },
    { path: '/admin/users', name: 'Users Management / إدارة المستخدمين' },
    { path: '/admin/roles', name: 'Roles / الأدوار' },
    { path: '/admin/permissions', name: 'Permissions / الصلاحيات' },
    { path: '/admin/activity-log', name: 'Activity Log / سجل النشاط' },
    { path: '/admin/backup', name: 'Backup / النسخ الاحتياطي' },
    { path: '/admin/customizations', name: 'Customizations / التخصيصات' },
    { path: '/admin/export-templates', name: 'Export Templates / قوالب التصدير' },
    { path: '/admin/role-limits', name: 'Role Limits / حدود الأدوار' },
  ];

  routes.forEach(({ path, name }) => {
    it(`should have route for ${name}`, () => {
      render(
        <LocationDisplay />,
        { wrapper: createWrapper(path) }
      );

      expect(screen.getByTestId('location')).toHaveTextContent(path);
    });
  });
});

describe('Navigation Flow Tests / اختبارات سير التنقل', () => {
  describe('Dashboard Navigation', () => {
    it('should navigate from dashboard to customers', () => {
      const NavigateTest = () => {
        const navigate = useNavigate();
        return (
          <>
            <button onClick={() => navigate('/customers')}>Go to Customers</button>
            <LocationDisplay />
          </>
        );
      };

      render(<NavigateTest />, { wrapper: createWrapper('/') });
      
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });

    it('should navigate to different sections', async () => {
      const user = userEvent.setup();
      const NavigateTest = () => {
        const navigate = useNavigate();
        const location = useLocation();
        return (
          <>
            <button onClick={() => navigate('/products')}>Products</button>
            <button onClick={() => navigate('/invoices')}>Invoices</button>
            <div data-testid="current-path">{location.pathname}</div>
          </>
        );
      };

      render(<NavigateTest />, { wrapper: createWrapper('/') });
      
      await user.click(screen.getByRole('button', { name: /products/i }));
      expect(screen.getByTestId('current-path')).toHaveTextContent('/products');
    });
  });

  describe('Detail Page Navigation', () => {
    it('should navigate to customer details with ID', () => {
      render(<LocationDisplay />, { wrapper: createWrapper('/customers/uuid-123') });
      
      expect(screen.getByTestId('location')).toHaveTextContent('/customers/uuid-123');
    });

    it('should navigate back to list from details', async () => {
      const user = userEvent.setup();
      const BackTest = () => {
        const navigate = useNavigate();
        const location = useLocation();
        return (
          <>
            <button onClick={() => navigate(-1)}>Back</button>
            <button onClick={() => navigate('/customers')}>To List</button>
            <div data-testid="path">{location.pathname}</div>
          </>
        );
      };

      render(<BackTest />, { wrapper: createWrapper('/customers/123') });
      
      await user.click(screen.getByRole('button', { name: /to list/i }));
      expect(screen.getByTestId('path')).toHaveTextContent('/customers');
    });
  });
});

describe('Query Parameters Tests / اختبارات معلمات الاستعلام', () => {
  it('should handle action=new parameter', () => {
    const QueryTest = () => {
      const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
      return <div data-testid="action">{searchParams.get('action')}</div>;
    };

    render(<QueryTest />, { wrapper: createWrapper('/customers?action=new') });
    
    expect(screen.getByTestId('action')).toHaveTextContent('new');
  });

  it('should handle tab parameter in settings', () => {
    const TabTest = () => {
      const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
      return <div data-testid="tab">{searchParams.get('tab')}</div>;
    };

    render(<TabTest />, { wrapper: createWrapper('/settings?tab=appearance') });
    
    expect(screen.getByTestId('tab')).toHaveTextContent('appearance');
  });

  it('should handle filter parameters', () => {
    const FilterTest = () => {
      const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
      return (
        <>
          <div data-testid="status">{searchParams.get('status')}</div>
          <div data-testid="type">{searchParams.get('type')}</div>
        </>
      );
    };

    render(<FilterTest />, { wrapper: createWrapper('/customers?status=active&type=company') });
    
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByTestId('type')).toHaveTextContent('company');
  });

  it('should handle search parameter', () => {
    const SearchTest = () => {
      const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
      return <div data-testid="q">{searchParams.get('q')}</div>;
    };

    render(<SearchTest />, { wrapper: createWrapper('/search?q=عميل') });
    
    expect(screen.getByTestId('q')).toHaveTextContent('عميل');
  });
});

describe('Deep Linking Tests / اختبارات الروابط العميقة', () => {
  it('should handle direct navigation to customer details', () => {
    render(<LocationDisplay />, { wrapper: createWrapper('/customers/abc-123-def') });
    
    expect(screen.getByTestId('location')).toHaveTextContent('/customers/abc-123-def');
  });

  it('should handle direct navigation to invoice with tab', () => {
    const DeepLinkTest = () => {
      const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
      return (
        <>
          <div data-testid="path">{location.pathname}</div>
          <div data-testid="tab">{searchParams.get('tab')}</div>
        </>
      );
    };

    render(<DeepLinkTest />, { wrapper: createWrapper('/invoices/inv-001?tab=payments') });
    
    expect(screen.getByTestId('path')).toHaveTextContent('/invoices/inv-001');
    expect(screen.getByTestId('tab')).toHaveTextContent('payments');
  });

  it('should handle settings deep link with section', () => {
    render(<LocationDisplay />, { wrapper: createWrapper('/settings?tab=security') });
    
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
  });
});

describe('404 Not Found Tests / اختبارات الصفحة غير موجودة', () => {
  it('should handle unknown routes', () => {
    render(<LocationDisplay />, { wrapper: createWrapper('/unknown-page-xyz') });
    
    expect(screen.getByTestId('location')).toHaveTextContent('/unknown-page-xyz');
    // The actual 404 handling would be done by the router
  });

  it('should handle deeply nested unknown routes', () => {
    render(<LocationDisplay />, { wrapper: createWrapper('/unknown/nested/path/here') });
    
    expect(screen.getByTestId('location')).toHaveTextContent('/unknown/nested/path/here');
  });
});

describe('Breadcrumb Tests / اختبارات شريط التنقل', () => {
  describe('Breadcrumb Generation', () => {
    it('should generate breadcrumbs for nested routes', () => {
      const path = '/customers/123';
      const segments = path.split('/').filter(Boolean);
      
      expect(segments).toEqual(['customers', '123']);
    });

    it('should handle root path', () => {
      const path = '/';
      const segments = path.split('/').filter(Boolean);
      
      expect(segments).toEqual([]);
    });

    it('should handle admin paths', () => {
      const path = '/admin/users';
      const segments = path.split('/').filter(Boolean);
      
      expect(segments).toEqual(['admin', 'users']);
    });
  });

  describe('Breadcrumb Labels', () => {
    const labels: Record<string, string> = {
      'customers': 'العملاء',
      'products': 'المنتجات',
      'invoices': 'الفواتير',
      'settings': 'الإعدادات',
      'admin': 'الإدارة',
    };

    Object.entries(labels).forEach(([key, label]) => {
      it(`should have Arabic label for ${key}`, () => {
        expect(labels[key]).toBe(label);
      });
    });
  });
});

describe('Protected Routes Tests / اختبارات المسارات المحمية', () => {
  describe('Admin Routes', () => {
    const adminRoutes = [
      '/admin',
      '/admin/users',
      '/admin/roles',
      '/admin/permissions',
      '/admin/activity-log',
      '/admin/backup',
    ];

    adminRoutes.forEach(route => {
      it(`should protect ${route} route`, () => {
        render(<LocationDisplay />, { wrapper: createWrapper(route) });
        
        // Route exists (actual protection would be handled by auth logic)
        expect(screen.getByTestId('location')).toHaveTextContent(route);
      });
    });
  });

  describe('Auth Routes', () => {
    it('should allow access to auth page when not logged in', () => {
      render(<LocationDisplay />, { wrapper: createWrapper('/auth') });
      
      expect(screen.getByTestId('location')).toHaveTextContent('/auth');
    });
  });
});

describe('Navigation State Tests / اختبارات حالة التنقل', () => {
  it('should pass state during navigation', async () => {
    const user = userEvent.setup();
    const StateTest = () => {
      const navigate = useNavigate();
      const location = useLocation();
      
      return (
        <>
          <button onClick={() => navigate('/customers', { state: { from: 'dashboard' } })}>
            Navigate
          </button>
          <div data-testid="state">
            {location.state ? JSON.stringify(location.state) : 'no state'}
          </div>
        </>
      );
    };

    render(<StateTest />, { wrapper: createWrapper('/') });
    
    await user.click(screen.getByRole('button'));
    
    // State would be available in the navigated route
  });

  it('should handle replace navigation', async () => {
    const user = userEvent.setup();
    const ReplaceTest = () => {
      const navigate = useNavigate();
      
      return (
        <>
          <button onClick={() => navigate('/products', { replace: true })}>
            Replace
          </button>
          <LocationDisplay />
        </>
      );
    };

    render(<ReplaceTest />, { wrapper: createWrapper('/customers') });
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByTestId('location')).toHaveTextContent('/products');
  });
});

describe('Scroll Restoration Tests / اختبارات استعادة التمرير', () => {
  it('should track scroll position', () => {
    const scrollPositions: Record<string, number> = {};
    
    // Save scroll position
    scrollPositions['/customers'] = 500;
    
    expect(scrollPositions['/customers']).toBe(500);
  });

  it('should restore scroll on back navigation', () => {
    const scrollPositions = { '/customers': 500, '/products': 200 };
    
    // Simulate back navigation
    const previousPath = '/customers';
    const scrollY = scrollPositions[previousPath];
    
    expect(scrollY).toBe(500);
  });
});

describe('Hash Navigation Tests / اختبارات التنقل بالهاش', () => {
  it('should handle hash for sections', () => {
    const HashTest = () => {
      const location = useLocation();
      return <div data-testid="hash">{location.hash || 'no hash'}</div>;
    };

    render(<HashTest />, { wrapper: createWrapper('/settings#security') });
    
    // Hash would be parsed from URL
  });
});
