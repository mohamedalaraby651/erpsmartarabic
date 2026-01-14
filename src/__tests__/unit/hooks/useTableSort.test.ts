/**
 * Table Sort Hook Tests
 * اختبارات خطاف ترتيب الجدول
 * 
 * Tests for useTableSort hook which provides sorting capabilities for data tables
 * @module tests/hooks/useTableSort
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableSort } from '@/hooks/useTableSort';

// Sample test data
const sampleData = [
  { id: 1, name: 'زيد', amount: 1000, createdAt: new Date('2024-01-15') },
  { id: 2, name: 'أحمد', amount: 2000, createdAt: new Date('2024-01-10') },
  { id: 3, name: 'محمد', amount: 500, createdAt: new Date('2024-01-20') },
  { id: 4, name: 'عمر', amount: 3000, createdAt: new Date('2024-01-05') },
  { id: 5, name: 'باسم', amount: 1500, createdAt: new Date('2024-01-25') },
];

describe('useTableSort', () => {
  describe('Initialization / التهيئة', () => {
    it('should return unsorted data when no initial config', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      expect(result.current.sortedData).toEqual(sampleData);
      expect(result.current.sortConfig.key).toBe('');
      expect(result.current.sortConfig.direction).toBeNull();
    });

    it('should apply initial sort config', () => {
      const { result } = renderHook(() => 
        useTableSort(sampleData, { key: 'amount', direction: 'asc' })
      );

      expect(result.current.sortConfig.key).toBe('amount');
      expect(result.current.sortConfig.direction).toBe('asc');
      expect(result.current.sortedData[0].amount).toBe(500);
    });
  });

  describe('String Sorting / ترتيب النصوص', () => {
    it('should sort strings in ascending order', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      act(() => {
        result.current.requestSort('name');
      });

      expect(result.current.sortConfig.direction).toBe('asc');
      // Arabic alphabetical order
      expect(result.current.sortedData[0].name).toBe('أحمد');
    });

    it('should sort strings in descending order', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      // First click: asc
      act(() => {
        result.current.requestSort('name');
      });

      // Second click: desc
      act(() => {
        result.current.requestSort('name');
      });

      expect(result.current.sortConfig.direction).toBe('desc');
    });

    it('should reset sort on third click', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      // Click 1: asc
      act(() => {
        result.current.requestSort('name');
      });

      // Click 2: desc
      act(() => {
        result.current.requestSort('name');
      });

      // Click 3: reset
      act(() => {
        result.current.requestSort('name');
      });

      expect(result.current.sortConfig.direction).toBeNull();
      expect(result.current.sortedData).toEqual(sampleData);
    });
  });

  describe('Number Sorting / ترتيب الأرقام', () => {
    it('should sort numbers in ascending order', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      act(() => {
        result.current.requestSort('amount');
      });

      expect(result.current.sortedData[0].amount).toBe(500);
      expect(result.current.sortedData[4].amount).toBe(3000);
    });

    it('should sort numbers in descending order', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      act(() => {
        result.current.requestSort('amount');
        result.current.requestSort('amount');
      });

      expect(result.current.sortedData[0].amount).toBe(3000);
      expect(result.current.sortedData[4].amount).toBe(500);
    });
  });

  describe('Date Sorting / ترتيب التواريخ', () => {
    it('should sort dates in ascending order', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      act(() => {
        result.current.requestSort('createdAt');
      });

      expect(result.current.sortedData[0].createdAt.getDate()).toBe(5);
      expect(result.current.sortedData[4].createdAt.getDate()).toBe(25);
    });

    it('should sort dates in descending order', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      act(() => {
        result.current.requestSort('createdAt');
        result.current.requestSort('createdAt');
      });

      expect(result.current.sortedData[0].createdAt.getDate()).toBe(25);
      expect(result.current.sortedData[4].createdAt.getDate()).toBe(5);
    });
  });

  describe('Column Switching / تبديل الأعمدة', () => {
    it('should reset direction when switching columns', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      // Sort by name desc
      act(() => {
        result.current.requestSort('name');
        result.current.requestSort('name');
      });

      expect(result.current.sortConfig.direction).toBe('desc');

      // Switch to amount - should start with asc
      act(() => {
        result.current.requestSort('amount');
      });

      expect(result.current.sortConfig.key).toBe('amount');
      expect(result.current.sortConfig.direction).toBe('asc');
    });
  });

  describe('Clear Sort / مسح الترتيب', () => {
    it('should clear sort configuration', () => {
      const { result } = renderHook(() => useTableSort(sampleData));

      act(() => {
        result.current.requestSort('name');
      });

      act(() => {
        result.current.clearSort();
      });

      expect(result.current.sortConfig.key).toBe('');
      expect(result.current.sortConfig.direction).toBeNull();
      expect(result.current.sortedData).toEqual(sampleData);
    });
  });

  describe('Null Handling / معالجة القيم الفارغة', () => {
    it('should handle null values', () => {
      const dataWithNulls = [
        { id: 1, name: 'أحمد', value: 100 },
        { id: 2, name: null, value: 200 },
        { id: 3, name: 'محمد', value: null },
        { id: 4, name: 'زيد', value: 300 },
      ];

      const { result } = renderHook(() => useTableSort(dataWithNulls));

      act(() => {
        result.current.requestSort('name');
      });

      // Null values should be at the end
      expect(result.current.sortedData[3].name).toBeNull();
    });

    it('should handle undefined values', () => {
      const dataWithUndefined = [
        { id: 1, name: 'أحمد', value: 100 },
        { id: 2, name: undefined, value: 200 },
        { id: 3, name: 'محمد', value: 300 },
      ];

      const { result } = renderHook(() => useTableSort(dataWithUndefined));

      act(() => {
        result.current.requestSort('name');
      });

      // Undefined values should be at the end
      expect(result.current.sortedData[2].name).toBeUndefined();
    });
  });

  describe('Edge Cases / حالات حدية', () => {
    it('should handle empty data array', () => {
      const { result } = renderHook(() => useTableSort([]));

      act(() => {
        result.current.requestSort('name');
      });

      expect(result.current.sortedData).toEqual([]);
    });

    it('should handle single item array', () => {
      const singleItem = [{ id: 1, name: 'Test' }];
      const { result } = renderHook(() => useTableSort(singleItem));

      act(() => {
        result.current.requestSort('name');
      });

      expect(result.current.sortedData).toEqual(singleItem);
    });

    it('should handle data updates', () => {
      const { result, rerender } = renderHook(
        ({ data }) => useTableSort(data),
        { initialProps: { data: sampleData } }
      );

      act(() => {
        result.current.requestSort('amount');
      });

      const newData = [
        { id: 6, name: 'New', amount: 100, createdAt: new Date() },
      ];

      rerender({ data: newData });

      expect(result.current.sortedData.length).toBe(1);
      expect(result.current.sortedData[0].amount).toBe(100);
    });
  });
});
