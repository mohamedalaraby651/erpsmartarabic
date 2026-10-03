import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://npwofemokwddtutugmas.supabase.co';

// Mock data
export const mockCustomers = [
  {
    id: '1',
    name: 'عميل تجريبي 1',
    email: 'customer1@test.com',
    phone: '01234567890',
    customer_type: 'individual',
    vip_level: 'regular',
    credit_limit: 10000,
    current_balance: 0,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'شركة تجريبية',
    email: 'company@test.com',
    phone: '01234567891',
    customer_type: 'company',
    vip_level: 'gold',
    credit_limit: 50000,
    current_balance: 5000,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

export const mockProducts = [
  {
    id: '1',
    name: 'منتج تجريبي 1',
    sku: 'SKU001',
    cost_price: 100,
    selling_price: 150,
    min_stock: 10,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'منتج تجريبي 2',
    sku: 'SKU002',
    cost_price: 200,
    selling_price: 300,
    min_stock: 5,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'مستخدم تجريبي',
  },
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json({
      user: mockUser,
      session: mockSession,
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({});
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Customers endpoints
  http.get(`${SUPABASE_URL}/rest/v1/customers`, () => {
    return HttpResponse.json(mockCustomers);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/customers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'new-customer-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/customers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockCustomers[0],
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/customers`, () => {
    return HttpResponse.json({});
  }),

  // Products endpoints
  http.get(`${SUPABASE_URL}/rest/v1/products`, () => {
    return HttpResponse.json(mockProducts);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/products`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'new-product-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // User preferences
  http.get(`${SUPABASE_URL}/rest/v1/user_preferences`, () => {
    return HttpResponse.json([
      {
        id: '1',
        user_id: 'user-1',
        theme: 'light',
        primary_color: '#3b82f6',
        font_family: 'Tajawal',
        font_size: 'medium',
        sidebar_compact: false,
        sidebar_order: null,
        favorite_pages: null,
        table_settings: null,
        dashboard_widgets: null,
        notification_settings: null,
        collapsed_sections: null,
      },
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/user_preferences`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'new-pref-id',
      ...body,
    });
  }),

  // User roles
  http.get(`${SUPABASE_URL}/rest/v1/user_roles`, () => {
    return HttpResponse.json([
      {
        id: '1',
        user_id: 'user-1',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Invoices
  http.get(`${SUPABASE_URL}/rest/v1/invoices`, () => {
    return HttpResponse.json([]);
  }),

  // Notifications
  http.get(`${SUPABASE_URL}/rest/v1/notifications`, () => {
    return HttpResponse.json([]);
  }),

  // Default handler for unmatched requests
  http.get(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json({});
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json({});
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json({});
  }),
];
