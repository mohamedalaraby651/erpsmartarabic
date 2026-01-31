import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useInfiniteScroll', () => {
  let mockObserve: Mock;
  let mockDisconnect: Mock;
  let mockUnobserve: Mock;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockUnobserve = vi.fn();
    
    // Store original
    originalIntersectionObserver = global.IntersectionObserver;
    
    // Create a proper class that can be instantiated with new
    class MockIntersectionObserver {
      readonly root: Element | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: readonly number[] = [];
      
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
        // Store callback if needed
      }
      
      observe(target: Element): void {
        mockObserve(target);
      }
      
      disconnect(): void {
        mockDisconnect();
      }
      
      unobserve(target: Element): void {
        mockUnobserve(target);
      }
      
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.IntersectionObserver = originalIntersectionObserver;
  });

  it('should be defined', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    expect(useInfiniteScroll).toBeDefined();
  });

  it('should return initial state with defaults', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => useInfiniteScroll());

    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);
  });

  it('should accept custom pageSize', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => 
      useInfiniteScroll({ pageSize: 50 })
    );

    expect(result.current.pageSize).toBe(50);
  });

  it('should not setup observer when disabled', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => 
      useInfiniteScroll({ enabled: false })
    );

    const mockElement = document.createElement('div');
    result.current.observerRef(mockElement);

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('should setup observer when enabled and has more pages', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => 
      useInfiniteScroll({ enabled: true })
    );

    const mockElement = document.createElement('div');
    act(() => {
      result.current.observerRef(mockElement);
    });

    expect(mockObserve).toHaveBeenCalledWith(mockElement);
  });

  it('should increment page when fetchNextPage is called', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => useInfiniteScroll());

    expect(result.current.page).toBe(0);

    act(() => {
      result.current.fetchNextPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('should update hasMore correctly with updateHasMore', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => 
      useInfiniteScroll({ pageSize: 20 })
    );

    expect(result.current.hasNextPage).toBe(true);

    // If we got less data than pageSize, there's no more
    act(() => {
      result.current.updateHasMore(10);
    });

    expect(result.current.hasNextPage).toBe(false);

    // If we got exactly pageSize, there might be more
    act(() => {
      result.current.updateHasMore(20);
    });

    expect(result.current.hasNextPage).toBe(true);
  });

  it('should reset state when reset is called', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => useInfiniteScroll());

    // Fetch some pages
    act(() => {
      result.current.fetchNextPage();
      result.current.fetchNextPage();
    });

    expect(result.current.page).toBe(2);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.page).toBe(0);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should not fetch when already fetching', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => useInfiniteScroll());

    // Set fetching state
    act(() => {
      result.current.setIsFetching(true);
    });

    const pageBeforeFetch = result.current.page;

    act(() => {
      result.current.fetchNextPage();
    });

    // Page should not change
    expect(result.current.page).toBe(pageBeforeFetch);
  });

  it('should not fetch when no more pages', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => useInfiniteScroll());

    // Set hasMore to false
    act(() => {
      result.current.updateHasMore(5); // less than pageSize
    });

    const pageBeforeFetch = result.current.page;

    act(() => {
      result.current.fetchNextPage();
    });

    // Page should not change
    expect(result.current.page).toBe(pageBeforeFetch);
  });

  it('should disconnect observer on unmount', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result, unmount } = renderHook(() => useInfiniteScroll());

    const mockElement = document.createElement('div');
    act(() => {
      result.current.observerRef(mockElement);
    });

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should disconnect previous observer when ref changes', async () => {
    const { useInfiniteScroll } = await import('@/hooks/useInfiniteScroll');
    const { result } = renderHook(() => useInfiniteScroll());

    const element1 = document.createElement('div');
    const element2 = document.createElement('div');

    act(() => {
      result.current.observerRef(element1);
    });

    act(() => {
      result.current.observerRef(element2);
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalledWith(element2);
  });
});
