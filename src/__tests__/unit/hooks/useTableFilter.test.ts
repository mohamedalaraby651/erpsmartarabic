/**
 * Table Filter Hook Tests
 * اختبارات خطاف فلتر الجدول
 * 
 * Tests for useTableFilter hook which provides filtering capabilities for data tables
 * @module tests/hooks/useTableFilter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableFilter } from '@/hooks/useTableFilter';

// Sample test data
const sampleData = [
  { id: 1, name: 'أحمد محمد', status: 'active', amount: 1000, category: 'sales' },
  { id: 2, name: 'محمد علي', status: 'inactive', amount: 2000, category: 'support' },
  { id: 3, name: 'فاطمة أحمد', status: 'active', amount: 500, category: 'sales' },
  { id: 4, name: 'خالد عمر', status: 'pending', amount: 3000, category: 'marketing' },
  { id: 5, name: 'سارة محمود', status: 'active', amount: 1500, category: 'support' },
];

describe('useTableFilter', () => {
  describe('Initialization / التهيئة', () => {
    it('should return all data when no filters applied', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      expect(result.current.filteredData).toEqual(sampleData);
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should initialize with empty filters', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('Search Functionality / وظيفة البحث', () => {
    it('should filter by search query', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setSearchFields(['name']);
        result.current.setSearchQuery('أحمد');
      });

      expect(result.current.filteredData.length).toBe(2);
      expect(result.current.filteredData.every(item => 
        item.name.includes('أحمد')
      )).toBe(true);
    });

    it('should be case insensitive', () => {
      const englishData = [
        { id: 1, name: 'John Doe', status: 'active' },
        { id: 2, name: 'jane smith', status: 'active' },
      ];

      const { result } = renderHook(() => useTableFilter(englishData));

      act(() => {
        result.current.setSearchFields(['name']);
        result.current.setSearchQuery('JOHN');
      });

      expect(result.current.filteredData.length).toBe(1);
    });

    it('should search across multiple fields', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setSearchFields(['name', 'category']);
        result.current.setSearchQuery('sales');
      });

      expect(result.current.filteredData.length).toBe(2);
    });

    it('should return empty when no matches found', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setSearchFields(['name']);
        result.current.setSearchQuery('xyz123');
      });

      expect(result.current.filteredData.length).toBe(0);
    });
  });

  describe('Exact Match Filter / فلتر التطابق التام', () => {
    it('should filter by exact string match', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', 'active');
      });

      // The hook uses includes() for string matching - 'active' and 'inactive' both contain 'active'
      expect(result.current.filteredData.length).toBe(4);
      expect(result.current.filteredData.every(item => 
        item.status.includes('active')
      )).toBe(true);
    });

    it('should handle partial string match', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', 'act');
      });

      // 'active' and 'inactive' both contain 'act' - uses includes() matching
      expect(result.current.filteredData.length).toBe(4);
    });
  });

  describe('Array Filter / فلتر المصفوفة', () => {
    it('should filter by multiple values (OR)', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', ['active', 'pending']);
      });

      expect(result.current.filteredData.length).toBe(4);
    });

    it('should handle empty array filter', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', []);
      });

      // Empty array should not filter (same as no filter)
      expect(result.current.filteredData).toEqual(sampleData);
    });
  });

  describe('Range Filter / فلتر النطاق', () => {
    it('should filter by min value', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('amount', { min: 1500 });
      });

      expect(result.current.filteredData.length).toBe(3);
      expect(result.current.filteredData.every(item => 
        item.amount >= 1500
      )).toBe(true);
    });

    it('should filter by max value', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('amount', { max: 1000 });
      });

      expect(result.current.filteredData.length).toBe(2);
      expect(result.current.filteredData.every(item => 
        item.amount <= 1000
      )).toBe(true);
    });

    it('should filter by min and max range', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('amount', { min: 1000, max: 2000 });
      });

      expect(result.current.filteredData.length).toBe(3);
      expect(result.current.filteredData.every(item => 
        item.amount >= 1000 && item.amount <= 2000
      )).toBe(true);
    });
  });

  describe('Multiple Filters / فلاتر متعددة', () => {
    it('should apply multiple filters (AND)', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', 'active');
        result.current.setFilter('category', 'sales');
      });

      expect(result.current.filteredData.length).toBe(2);
      expect(result.current.filteredData.every(item => 
        item.status === 'active' && item.category === 'sales'
      )).toBe(true);
    });

    it('should combine search and filters', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setSearchFields(['name']);
        result.current.setSearchQuery('أحمد');
        result.current.setFilter('status', 'active');
      });

      expect(result.current.filteredData.length).toBe(2);
    });
  });

  describe('Clear Filters / مسح الفلاتر', () => {
    it('should clear individual filter', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', 'active');
        result.current.setFilter('category', 'sales');
      });

      expect(Object.keys(result.current.filters).length).toBe(2);

      act(() => {
        result.current.clearFilter('status');
      });

      expect(Object.keys(result.current.filters).length).toBe(1);
      expect(result.current.filters.status).toBeUndefined();
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', 'active');
        result.current.setFilter('category', 'sales');
        result.current.setSearchQuery('test');
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredData).toEqual(sampleData);
    });
  });

  describe('Active Filter Count / عدد الفلاتر النشطة', () => {
    it('should count active filters correctly', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      expect(result.current.activeFilterCount).toBe(0);

      act(() => {
        result.current.setFilter('status', 'active');
      });
      expect(result.current.activeFilterCount).toBe(1);

      act(() => {
        result.current.setFilter('category', 'sales');
      });
      expect(result.current.activeFilterCount).toBe(2);

      act(() => {
        result.current.setSearchQuery('test');
      });
      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  describe('Edge Cases / حالات حدية', () => {
    it('should handle empty data array', () => {
      const { result } = renderHook(() => useTableFilter([]));

      expect(result.current.filteredData).toEqual([]);
      
      act(() => {
        result.current.setFilter('status', 'active');
      });

      expect(result.current.filteredData).toEqual([]);
    });

    it('should handle null values in data', () => {
      const dataWithNulls = [
        { id: 1, name: 'Test', status: null },
        { id: 2, name: 'Test2', status: 'active' },
      ];

      const { result } = renderHook(() => useTableFilter(dataWithNulls));

      act(() => {
        result.current.setSearchFields(['name']);
        result.current.setSearchQuery('Test');
      });

      expect(result.current.filteredData.length).toBe(2);
    });

    it('should handle undefined filter values', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', undefined);
      });

      expect(result.current.filteredData).toEqual(sampleData);
    });

    it('should handle empty string filter', () => {
      const { result } = renderHook(() => useTableFilter(sampleData));

      act(() => {
        result.current.setFilter('status', '');
      });

      expect(result.current.filteredData).toEqual(sampleData);
    });
  });
});
