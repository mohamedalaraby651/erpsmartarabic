/**
 * UI Integration Tests
 * اختبارات تكامل واجهة المستخدم
 * 
 * Integration tests for common UI interaction patterns
 * @module tests/integration/ui-interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';

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
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UI Integration Tests / اختبارات تكامل واجهة المستخدم', () => {
  // Use real timers - don't pass advanceTimers to userEvent
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Button Interactions / تفاعلات الأزرار', () => {
    it('should handle button clicks', async () => {
      const handleClick = vi.fn();
      
      render(
        <button onClick={handleClick} data-testid="test-button">
          Click Me
        </button>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByTestId('test-button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle disabled buttons', async () => {
      const handleClick = vi.fn();
      
      render(
        <button onClick={handleClick} disabled data-testid="disabled-button">
          Disabled
        </button>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByTestId('disabled-button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Form Interactions / تفاعلات النماذج', () => {
    it('should handle text input', async () => {
      const handleChange = vi.fn();
      
      render(
        <input 
          type="text" 
          onChange={handleChange}
          data-testid="text-input"
          placeholder="Enter text"
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByTestId('text-input'), 'Hello World');
      
      expect(handleChange).toHaveBeenCalled();
      expect(screen.getByTestId('text-input')).toHaveValue('Hello World');
    });

    it('should handle form submission', async () => {
      const handleSubmit = vi.fn(e => e.preventDefault());
      
      render(
        <form onSubmit={handleSubmit} data-testid="test-form">
          <input type="text" name="name" defaultValue="Test" />
          <button type="submit">Submit</button>
        </form>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle checkbox toggling', async () => {
      const handleChange = vi.fn();
      
      render(
        <input 
          type="checkbox" 
          onChange={handleChange}
          data-testid="checkbox"
        />,
        { wrapper: createWrapper() }
      );

      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      
      expect(checkbox.checked).toBe(false);
      
      await user.click(checkbox);
      
      expect(checkbox.checked).toBe(true);
      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle select changes', async () => {
      const handleChange = vi.fn();
      
      render(
        <select onChange={handleChange} data-testid="select">
          <option value="">Select</option>
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
        </select>,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByTestId('select'), 'option1');
      
      expect(handleChange).toHaveBeenCalled();
      expect(screen.getByTestId('select')).toHaveValue('option1');
    });
  });

  describe('Keyboard Interactions / تفاعلات لوحة المفاتيح', () => {
    it('should handle Enter key press', async () => {
      const handleKeyDown = vi.fn();
      
      render(
        <input 
          type="text" 
          onKeyDown={handleKeyDown}
          data-testid="input-with-keyboard"
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByTestId('input-with-keyboard');
      input.focus();
      
      await user.keyboard('{Enter}');
      
      expect(handleKeyDown).toHaveBeenCalled();
      expect(handleKeyDown.mock.calls[0][0].key).toBe('Enter');
    });

    it('should handle Escape key press', async () => {
      const handleKeyDown = vi.fn();
      
      render(
        <div tabIndex={0} onKeyDown={handleKeyDown} data-testid="keyboard-handler">
          Press Escape
        </div>,
        { wrapper: createWrapper() }
      );

      const element = screen.getByTestId('keyboard-handler');
      element.focus();
      
      await user.keyboard('{Escape}');
      
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Focus Management / إدارة التركيز', () => {
    it('should handle tab navigation', async () => {
      render(
        <div>
          <button data-testid="button1">First</button>
          <button data-testid="button2">Second</button>
          <button data-testid="button3">Third</button>
        </div>,
        { wrapper: createWrapper() }
      );

      await user.tab();
      expect(screen.getByTestId('button1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('button2')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('button3')).toHaveFocus();
    });

    it('should handle shift+tab for reverse navigation', async () => {
      render(
        <div>
          <button data-testid="button1">First</button>
          <button data-testid="button2">Second</button>
        </div>,
        { wrapper: createWrapper() }
      );

      // Focus second button
      screen.getByTestId('button2').focus();
      expect(screen.getByTestId('button2')).toHaveFocus();

      // Shift+Tab to first
      await user.tab({ shift: true });
      expect(screen.getByTestId('button1')).toHaveFocus();
    });
  });

  describe('Async Operations / العمليات غير المتزامنة', () => {
    it('should handle conditional rendering', async () => {
      const handleToggle = vi.fn();
      
      render(
        <div>
          <button onClick={handleToggle}>Toggle</button>
        </div>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /toggle/i }));
      
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('List Interactions / تفاعلات القوائم', () => {
    it('should handle list item selection', async () => {
      const handleSelect = vi.fn();
      const items = ['Item 1', 'Item 2', 'Item 3'];

      render(
        <ul>
          {items.map((item, index) => (
            <li 
              key={index} 
              onClick={() => handleSelect(item)}
              data-testid={`item-${index}`}
            >
              {item}
            </li>
          ))}
        </ul>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByTestId('item-1'));
      
      expect(handleSelect).toHaveBeenCalledWith('Item 2');
    });
  });

  describe('Error Handling / معالجة الأخطاء', () => {
    it('should handle error states gracefully', () => {
      const ErrorComponent = ({ error }: { error?: string }) => (
        <div>
          {error ? (
            <div role="alert" data-testid="error-message">{error}</div>
          ) : (
            <div data-testid="content">No errors</div>
          )}
        </div>
      );

      const { rerender } = render(
        <ErrorComponent />, 
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      rerender(<ErrorComponent error="Something went wrong" />);

      expect(screen.getByTestId('error-message')).toHaveTextContent('Something went wrong');
    });
  });
});
