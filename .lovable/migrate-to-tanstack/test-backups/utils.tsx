import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
        <Sonner />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Helper to wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Helper to create mock event
export const createMockEvent = (overrides = {}) => ({
  preventDefault: () => {},
  stopPropagation: () => {},
  ...overrides,
});

// Helper for form testing
export const fillInput = async (
  userEvent: ReturnType<typeof import('@testing-library/user-event').default.setup>,
  element: HTMLElement,
  value: string
) => {
  await userEvent.clear(element);
  await userEvent.type(element, value);
};

// Helper to mock Supabase response
export const mockSupabaseResponse = <T,>(data: T) => ({
  data,
  error: null,
});

export const mockSupabaseError = (message: string, code?: string) => ({
  data: null,
  error: { message, code },
});
