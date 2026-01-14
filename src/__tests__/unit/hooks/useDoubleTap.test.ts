/**
 * Double Tap Hook Tests
 * اختبارات خطاف النقر المزدوج
 * 
 * Tests for useDoubleTap hook which detects double tap gestures
 * @module tests/hooks/useDoubleTap
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDoubleTap } from '@/hooks/useDoubleTap';

describe('useDoubleTap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Double Tap Detection / اكتشاف النقر المزدوج', () => {
    it('should call onDoubleTap when tapped twice quickly', () => {
      const onDoubleTap = vi.fn();
      const onSingleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap, onSingleTap })
      );

      // First tap
      act(() => {
        result.current();
      });

      // Second tap within delay
      act(() => {
        vi.advanceTimersByTime(100);
        result.current();
      });

      expect(onDoubleTap).toHaveBeenCalledTimes(1);
      expect(onSingleTap).not.toHaveBeenCalled();
    });

    it('should call onSingleTap when tapped once', () => {
      const onDoubleTap = vi.fn();
      const onSingleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap, onSingleTap, delay: 300 })
      );

      // Single tap
      act(() => {
        result.current();
      });

      // Wait for delay to pass
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(onSingleTap).toHaveBeenCalledTimes(1);
      expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('should not call single tap if double tap detected', () => {
      const onDoubleTap = vi.fn();
      const onSingleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap, onSingleTap, delay: 300 })
      );

      // First tap
      act(() => {
        result.current();
      });

      // Second tap before single tap callback
      act(() => {
        vi.advanceTimersByTime(100);
        result.current();
      });

      // Advance past delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onDoubleTap).toHaveBeenCalledTimes(1);
      expect(onSingleTap).not.toHaveBeenCalled();
    });
  });

  describe('Delay Configuration / تكوين التأخير', () => {
    it('should use default delay of 300ms', () => {
      const onDoubleTap = vi.fn();
      const onSingleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap, onSingleTap })
      );

      // First tap
      act(() => {
        result.current();
      });

      // Second tap just after 300ms - should NOT be double tap
      act(() => {
        vi.advanceTimersByTime(350);
        result.current();
      });

      // First tap should have triggered single tap
      expect(onSingleTap).toHaveBeenCalledTimes(1);
    });

    it('should respect custom delay', () => {
      const onDoubleTap = vi.fn();
      const onSingleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap, onSingleTap, delay: 500 })
      );

      // First tap
      act(() => {
        result.current();
      });

      // Second tap at 400ms (within custom delay)
      act(() => {
        vi.advanceTimersByTime(400);
        result.current();
      });

      expect(onDoubleTap).toHaveBeenCalledTimes(1);
      expect(onSingleTap).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases / حالات حدية', () => {
    it('should handle no single tap callback', () => {
      const onDoubleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap })
      );

      // Single tap
      act(() => {
        result.current();
      });

      // Advance past delay
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Should not throw
      expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('should handle multiple double taps', () => {
      const onDoubleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap })
      );

      // First double tap
      act(() => {
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
      });

      // Wait a bit
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Second double tap
      act(() => {
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
      });

      expect(onDoubleTap).toHaveBeenCalledTimes(2);
    });

    it('should reset state after double tap', () => {
      const onDoubleTap = vi.fn();
      const onSingleTap = vi.fn();

      const { result } = renderHook(() => 
        useDoubleTap({ onDoubleTap, onSingleTap, delay: 300 })
      );

      // Double tap
      act(() => {
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
      });

      expect(onDoubleTap).toHaveBeenCalledTimes(1);

      // Wait
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Single tap
      act(() => {
        result.current();
      });

      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(onSingleTap).toHaveBeenCalledTimes(1);
    });
  });
});
