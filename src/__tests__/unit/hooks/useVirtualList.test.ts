import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualList } from '@/hooks/useVirtualList';

describe('useVirtualList', () => {
  const createItems = (count: number) => 
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useVirtualList).toBeDefined();
  });

  it('should return required properties', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight: 50 })
    );

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.handleScroll).toBeDefined();
    expect(result.current.virtualItems).toBeDefined();
    expect(result.current.totalHeight).toBeDefined();
    expect(result.current.containerStyle).toBeDefined();
    expect(result.current.innerStyle).toBeDefined();
  });

  it('should calculate totalHeight correctly', () => {
    const items = createItems(100);
    const itemHeight = 50;
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight })
    );

    expect(result.current.totalHeight).toBe(items.length * itemHeight);
  });

  it('should only render visible items plus overscan', () => {
    const items = createItems(1000);
    const itemHeight = 50;
    const containerHeight = 400;
    const overscan = 5;

    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight, overscan, containerHeight })
    );

    // At scroll position 0:
    // Visible items = containerHeight / itemHeight = 400 / 50 = 8
    // With overscan = 5 on each side, we expect around 18 items max
    expect(result.current.virtualItems.length).toBeLessThan(items.length);
    expect(result.current.virtualItems.length).toBeGreaterThanOrEqual(8);
  });

  it('should include item data in virtualItems', () => {
    const items = createItems(10);
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight: 50, containerHeight: 200 })
    );

    result.current.virtualItems.forEach((virtualItem) => {
      expect(virtualItem.item).toBeDefined();
      expect(virtualItem.index).toBeDefined();
      expect(virtualItem.style).toBeDefined();
    });
  });

  it('should set correct position styles for items', () => {
    const items = createItems(10);
    const itemHeight = 50;
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight, containerHeight: 200 })
    );

    result.current.virtualItems.forEach((virtualItem) => {
      expect(virtualItem.style.position).toBe('absolute');
      expect(virtualItem.style.height).toBe(itemHeight);
      expect(virtualItem.style.top).toBe(virtualItem.index * itemHeight);
      expect(virtualItem.style.left).toBe(0);
      expect(virtualItem.style.right).toBe(0);
    });
  });

  it('should return container style with correct properties', () => {
    const containerHeight = 400;
    const { result } = renderHook(() => 
      useVirtualList({ 
        items: createItems(100), 
        itemHeight: 50, 
        containerHeight 
      })
    );

    expect(result.current.containerStyle.height).toBe(containerHeight);
    expect(result.current.containerStyle.overflow).toBe('auto');
  });

  it('should return inner style with correct properties', () => {
    const items = createItems(100);
    const itemHeight = 50;
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight })
    );

    expect(result.current.innerStyle.height).toBe(items.length * itemHeight);
    expect(result.current.innerStyle.position).toBe('relative');
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() => 
      useVirtualList({ items: [], itemHeight: 50 })
    );

    expect(result.current.virtualItems).toEqual([]);
    expect(result.current.totalHeight).toBe(0);
  });

  it('should handle single item', () => {
    const items = createItems(1);
    const itemHeight = 50;
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight, containerHeight: 400 })
    );

    expect(result.current.virtualItems.length).toBe(1);
    expect(result.current.virtualItems[0].item).toEqual(items[0]);
  });

  it('should use default containerHeight when not provided', () => {
    const { result } = renderHook(() => 
      useVirtualList({ items: createItems(100), itemHeight: 50 })
    );

    // Default containerHeight is 400
    expect(result.current.containerStyle.height).toBe(400);
  });

  it('should use default overscan when not provided', () => {
    const items = createItems(1000);
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight: 50, containerHeight: 400 })
    );

    // Default overscan is 5, so we should have some extra items rendered
    const visibleCount = Math.ceil(400 / 50);
    const expectedMin = visibleCount; // at least visible items
    const expectedMax = visibleCount + 10 + 1; // visible + 2*overscan + 1

    expect(result.current.virtualItems.length).toBeGreaterThanOrEqual(expectedMin);
    expect(result.current.virtualItems.length).toBeLessThanOrEqual(expectedMax);
  });

  it('should handle scroll events', () => {
    const items = createItems(1000);
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight: 50, containerHeight: 400 })
    );

    const initialVirtualItems = result.current.virtualItems.map(v => v.index);

    // Simulate scroll
    const mockScrollEvent = {
      currentTarget: { scrollTop: 500 }
    } as React.UIEvent<HTMLDivElement>;

    act(() => {
      result.current.handleScroll(mockScrollEvent);
    });

    const scrolledVirtualItems = result.current.virtualItems.map(v => v.index);

    // After scrolling 500px with 50px items, we should see different items
    expect(scrolledVirtualItems).not.toEqual(initialVirtualItems);
    expect(scrolledVirtualItems[0]).toBeGreaterThan(initialVirtualItems[0]);
  });

  it('should clamp indices to valid range', () => {
    const items = createItems(10);
    const { result } = renderHook(() => 
      useVirtualList({ items, itemHeight: 50, containerHeight: 400 })
    );

    result.current.virtualItems.forEach((virtualItem) => {
      expect(virtualItem.index).toBeGreaterThanOrEqual(0);
      expect(virtualItem.index).toBeLessThan(items.length);
    });
  });

  it('should update when items change', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useVirtualList({ items, itemHeight: 50 }),
      { initialProps: { items: createItems(10) } }
    );

    expect(result.current.totalHeight).toBe(500);

    rerender({ items: createItems(20) });

    expect(result.current.totalHeight).toBe(1000);
  });
});
