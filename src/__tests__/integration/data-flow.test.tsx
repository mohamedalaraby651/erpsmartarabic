/**
 * Data Flow Integration Tests
 * اختبارات تكامل تدفق البيانات
 * 
 * Tests for data fetching, caching, and state management
 * @module tests/integration/data-flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode, useState } from 'react';

// Create test wrapper
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false, 
      gcTime: 0,
      staleTime: 0,
    },
    mutations: { retry: false },
  },
});

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Data Flow Integration Tests / اختبارات تكامل تدفق البيانات', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Data Fetching / جلب بيانات الاستعلام', () => {
    it('should fetch and display data', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const fetchFn = vi.fn().mockResolvedValue(mockData);

      const DataComponent = () => {
        const { data, isLoading, error } = useQuery({
          queryKey: ['test-items'],
          queryFn: fetchFn,
        });

        if (isLoading) return <div>Loading...</div>;
        if (error) return <div>Error</div>;

        return (
          <ul>
            {data?.map(item => (
              <li key={item.id} data-testid={`item-${item.id}`}>{item.name}</li>
            ))}
          </ul>
        );
      };

      const queryClient = createTestQueryClient();
      render(<DataComponent />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveTextContent('Item 1');
        expect(screen.getByTestId('item-2')).toHaveTextContent('Item 2');
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Fetch failed'));

      const ErrorComponent = () => {
        const { error, isError } = useQuery({
          queryKey: ['error-test'],
          queryFn: fetchFn,
        });

        if (isError) return <div data-testid="error">Error: {(error as Error).message}</div>;
        return <div>Loading...</div>;
      };

      const queryClient = createTestQueryClient();
      render(<ErrorComponent />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Error: Fetch failed');
      });
    });

    it('should use cached data on re-render', async () => {
      const mockData = { id: 1, name: 'Cached Item' };
      const fetchFn = vi.fn().mockResolvedValue(mockData);

      const CachedComponent = () => {
        const { data } = useQuery({
          queryKey: ['cached-item'],
          queryFn: fetchFn,
          staleTime: 5000,
        });

        return <div data-testid="result">{data?.name || 'Loading...'}</div>;
      };

      const queryClient = createTestQueryClient();
      const Wrapper = createWrapper(queryClient);

      const { rerender } = render(<CachedComponent />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('Cached Item');
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Re-render should use cache
      rerender(<CachedComponent />);

      expect(screen.getByTestId('result')).toHaveTextContent('Cached Item');
      // Fetch should not be called again due to staleTime
    });
  });

  describe('Mutations / التعديلات', () => {
    it('should handle successful mutation', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'New Item' });
      const onSuccess = vi.fn();

      const MutationComponent = () => {
        const mutation = useMutation({
          mutationFn,
          onSuccess,
        });

        return (
          <div>
            <button 
              onClick={() => mutation.mutate({ name: 'New Item' })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
            {mutation.isSuccess && <div data-testid="success">Saved!</div>}
          </div>
        );
      };

      const queryClient = createTestQueryClient();
      render(<MutationComponent />, { wrapper: createWrapper(queryClient) });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByTestId('success')).toBeInTheDocument();
      });

      expect(mutationFn).toHaveBeenCalledWith({ name: 'New Item' });
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle mutation errors', async () => {
      const mutationFn = vi.fn().mockRejectedValue(new Error('Save failed'));

      const ErrorMutationComponent = () => {
        const mutation = useMutation({
          mutationFn,
        });

        return (
          <div>
            <button onClick={() => mutation.mutate({})}>Save</button>
            {mutation.isError && (
              <div data-testid="error">Error: {(mutation.error as Error).message}</div>
            )}
          </div>
        );
      };

      const queryClient = createTestQueryClient();
      render(<ErrorMutationComponent />, { wrapper: createWrapper(queryClient) });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Error: Save failed');
      });
    });

    it('should invalidate queries after mutation', async () => {
      const fetchFn = vi.fn()
        .mockResolvedValueOnce([{ id: 1, name: 'Old Item' }])
        .mockResolvedValueOnce([{ id: 1, name: 'Updated Item' }]);

      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      const InvalidationComponent = () => {
        const queryClient = useQueryClient();
        
        const { data } = useQuery({
          queryKey: ['items'],
          queryFn: fetchFn,
        });

        const mutation = useMutation({
          mutationFn,
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
          },
        });

        return (
          <div>
            <div data-testid="item">{data?.[0]?.name || 'Loading...'}</div>
            <button onClick={() => mutation.mutate({})}>Update</button>
          </div>
        );
      };

      const queryClient = createTestQueryClient();
      render(<InvalidationComponent />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByTestId('item')).toHaveTextContent('Old Item');
      });

      await user.click(screen.getByRole('button', { name: /update/i }));

      await waitFor(() => {
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Optimistic Updates / التحديثات المتفائلة', () => {
    it('should show optimistic update immediately', async () => {
      const items = [{ id: 1, name: 'Item 1' }];
      const fetchFn = vi.fn().mockResolvedValue(items);
      const mutationFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const OptimisticComponent = () => {
        const queryClient = useQueryClient();
        const [localItems, setLocalItems] = useState(items);

        const { data } = useQuery({
          queryKey: ['optimistic-items'],
          queryFn: fetchFn,
          initialData: items,
        });

        const mutation = useMutation({
          mutationFn,
          onMutate: async (newItem) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['optimistic-items'] });
            
            // Snapshot previous value
            const previous = queryClient.getQueryData(['optimistic-items']);
            
            // Optimistically update
            setLocalItems(prev => [...prev, newItem as any]);
            
            return { previous };
          },
        });

        return (
          <div>
            <ul>
              {localItems.map((item, idx) => (
                <li key={idx} data-testid={`item-${idx}`}>{item.name}</li>
              ))}
            </ul>
            <button 
              onClick={() => mutation.mutate({ id: 2, name: 'New Item' })}
            >
              Add
            </button>
          </div>
        );
      };

      const queryClient = createTestQueryClient();
      render(<OptimisticComponent />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByTestId('item-0')).toHaveTextContent('Item 1');

      await user.click(screen.getByRole('button', { name: /add/i }));

      // Should immediately show new item (optimistic)
      expect(screen.getByTestId('item-1')).toHaveTextContent('New Item');
    });
  });

  describe('Pagination / التصفح', () => {
    it('should handle paginated data', async () => {
      const page1 = [{ id: 1, name: 'Page 1 Item' }];
      const page2 = [{ id: 2, name: 'Page 2 Item' }];

      const fetchFn = vi.fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const PaginatedComponent = () => {
        const [page, setPage] = useState(1);
        
        const { data, isFetching } = useQuery({
          queryKey: ['paginated', page],
          queryFn: fetchFn,
        });

        return (
          <div>
            {isFetching && <div data-testid="loading">Loading...</div>}
            <div data-testid="content">
              {data?.[0]?.name}
            </div>
            <button onClick={() => setPage(2)}>Next Page</button>
          </div>
        );
      };

      const queryClient = createTestQueryClient();
      render(<PaginatedComponent />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByTestId('content')).toHaveTextContent('Page 1 Item');
      });

      await user.click(screen.getByRole('button', { name: /next page/i }));

      await waitFor(() => {
        expect(screen.getByTestId('content')).toHaveTextContent('Page 2 Item');
      });
    });
  });

  describe('Dependent Queries / الاستعلامات المتتابعة', () => {
    it('should wait for dependent query', async () => {
      const fetchUser = vi.fn().mockResolvedValue({ id: 1, name: 'User 1' });
      const fetchPosts = vi.fn().mockResolvedValue([{ id: 1, title: 'Post 1' }]);

      const DependentComponent = () => {
        const { data: user } = useQuery({
          queryKey: ['user'],
          queryFn: fetchUser,
        });

        const { data: posts } = useQuery({
          queryKey: ['posts', user?.id],
          queryFn: fetchPosts,
          enabled: !!user?.id,
        });

        return (
          <div>
            <div data-testid="user">{user?.name || 'Loading user...'}</div>
            <div data-testid="posts">
              {posts ? `${posts.length} posts` : 'Loading posts...'}
            </div>
          </div>
        );
      };

      const queryClient = createTestQueryClient();
      render(<DependentComponent />, { wrapper: createWrapper(queryClient) });

      // First, user should be loading
      expect(screen.getByTestId('user')).toHaveTextContent('Loading user...');

      // Then user loads
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User 1');
      });

      // Then posts load (dependent on user)
      await waitFor(() => {
        expect(screen.getByTestId('posts')).toHaveTextContent('1 posts');
      });

      expect(fetchUser).toHaveBeenCalledTimes(1);
      expect(fetchPosts).toHaveBeenCalledTimes(1);
    });
  });
});
