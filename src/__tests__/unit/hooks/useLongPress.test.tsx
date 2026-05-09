/**
 * Long Press Hook Tests
 * اختبارات خطاف الضغط المطول
 * 
 * Tests for useLongPress hook which detects long press gestures
 * @module tests/hooks/useLongPress
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '@/hooks/useLongPress';

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Long Press Detection / اكتشاف الضغط المطول', () => {
    it('should call onLongPress after delay', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, delay: 500 })
      );

      // Start press
      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      expect(result.current.isPressed).toBe(true);

      // Wait for long press delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isPressed).toBe(false);
    });

    it('should not call onLongPress if released early', () => {
      const onLongPress = vi.fn();
      const onPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, onPress, delay: 500 })
      );

      // Start press
      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      // Release before delay
      act(() => {
        vi.advanceTimersByTime(200);
        result.current.onMouseUp({} as any);
      });

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Short Press Detection / اكتشاف الضغط القصير', () => {
    it('should call onPress for short press', () => {
      const onLongPress = vi.fn();
      const onPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, onPress, delay: 500 })
      );

      // Start and quickly release
      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        result.current.onMouseUp({} as any);
      });

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should not call onPress if not provided', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, delay: 500 })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        result.current.onMouseUp({} as any);
      });

      // Should not throw
      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('Event Handlers / معالجات الأحداث', () => {
    it('should provide all necessary event handlers', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress })
      );

      expect(result.current).toHaveProperty('onTouchStart');
      expect(result.current).toHaveProperty('onTouchMove');
      expect(result.current).toHaveProperty('onTouchEnd');
      expect(result.current).toHaveProperty('onTouchCancel');
      expect(result.current).toHaveProperty('onMouseDown');
      expect(result.current).toHaveProperty('onMouseUp');
      expect(result.current).toHaveProperty('onMouseLeave');
      expect(result.current).toHaveProperty('isPressed');
    });

    it('should handle touch events', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, delay: 500 })
      );

      // Touch start
      act(() => {
        result.current.onTouchStart({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      expect(result.current.isPressed).toBe(true);

      // Wait for long press
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should cancel on mouse leave', () => {
      const onLongPress = vi.fn();
      const onPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, onPress, delay: 500 })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      act(() => {
        vi.advanceTimersByTime(200);
        result.current.onMouseLeave({} as any);
      });

      expect(result.current.isPressed).toBe(false);
    });

    it('should cancel on touch cancel', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, delay: 500 })
      );

      act(() => {
        result.current.onTouchStart({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      act(() => {
        vi.advanceTimersByTime(200);
        result.current.onTouchCancel({} as any);
      });

      expect(result.current.isPressed).toBe(false);
      expect(onLongPress).not.toHaveBeenCalled();
  });

  describe('Synthetic Mouse Event Suppression / منع الأحداث المركبة', () => {
    it('should ignore synthetic mousedown fired right after touchend', () => {
      const onLongPress = vi.fn();
      const onPress = vi.fn();

      const { result } = renderHook(() =>
        useLongPress({ onLongPress, onPress, delay: 500 })
      );

      // Touch start then release (short tap → onPress fires once)
      act(() => {
        result.current.onTouchStart({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
          touches: [{ clientX: 0, clientY: 0 }],
        } as any);
      });
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.onTouchEnd({
          changedTouches: [{ clientX: 0, clientY: 0 }],
        } as any);
      });

      expect(onPress).toHaveBeenCalledTimes(1);

      // Browser fires synthetic mousedown/mouseup right after — must be ignored
      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
          clientX: 0,
          clientY: 0,
        } as any);
        result.current.onMouseUp({} as any);
      });

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();
    });
  });
});

  describe('Delay Configuration / تكوين التأخير', () => {
    it('should use default delay of 500ms', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      // Not triggered at 400ms
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onLongPress).not.toHaveBeenCalled();

      // Triggered at 500ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should respect custom delay', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, delay: 1000 })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(onLongPress).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('isPressed State / حالة الضغط', () => {
    it('should track pressed state correctly', () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() => 
        useLongPress({ onLongPress, delay: 500 })
      );

      expect(result.current.isPressed).toBe(false);

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
          target: document.createElement('div'),
        } as any);
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.isPressed).toBe(false);
    });
  });
});
