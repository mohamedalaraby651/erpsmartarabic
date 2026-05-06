import { useCallback, useRef, useState, useEffect } from 'react';
import { haptics } from '@/lib/haptics';

interface Options {
  enabled?: boolean;
  threshold?: number;
  maxReveal?: number;
  onSwipeLeftRevealed?: () => void;
  onSwipeRightRevealed?: () => void;
}

/**
 * Pointer-based swipe handler for list cards.
 * RTL-aware: uses logical inline-start/inline-end semantics.
 *
 * - Swipe في اتجاه الـ inline-end يكشف "إجراءات أساسية" (left reveal in LTR)
 * - Swipe في اتجاه الـ inline-start يكشف "إجراءات تواصل"
 *
 * In RTL the dx sign is inverted to feel native.
 */
export function useCustomerSwipeActions({
  enabled = true,
  threshold = 64,
  maxReveal = 144,
  onSwipeLeftRevealed,
  onSwipeRightRevealed,
}: Options = {}) {
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<'none' | 'primary' | 'contact'>('none');
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isHorizontal = useRef<boolean | null>(null);
  const triggeredHaptic = useRef(false);
  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  const reset = useCallback(() => {
    setOffset(0);
    setDirection('none');
    startX.current = null;
    startY.current = null;
    isHorizontal.current = null;
    triggeredHaptic.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled || e.pointerType === 'mouse') return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    isHorizontal.current = null;
    triggeredHaptic.current = false;
  }, [enabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!enabled || startX.current === null || startY.current === null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontal.current) return;
    }
    if (!isHorizontal.current) return;

    // Logical dx: positive = inline-start direction (visual left in LTR, visual right in RTL)
    const logicalDx = isRTL ? -dx : dx;
    const clamped = Math.max(-maxReveal, Math.min(maxReveal, logicalDx));
    setOffset(clamped);

    if (clamped <= -threshold) setDirection('primary');
    else if (clamped >= threshold) setDirection('contact');
    else setDirection('none');

    if (Math.abs(clamped) >= threshold && !triggeredHaptic.current) {
      haptics.selection();
      triggeredHaptic.current = true;
    } else if (Math.abs(clamped) < threshold && triggeredHaptic.current) {
      triggeredHaptic.current = false;
    }
  }, [enabled, threshold, maxReveal, isRTL]);

  const onPointerUp = useCallback(() => {
    if (!enabled) return;
    if (offset <= -threshold) {
      onSwipeLeftRevealed?.();
      haptics.light();
    } else if (offset >= threshold) {
      onSwipeRightRevealed?.();
      haptics.light();
    }
    reset();
  }, [enabled, offset, threshold, onSwipeLeftRevealed, onSwipeRightRevealed, reset]);

  // Visual translateX (negative offset means content slides toward inline-start)
  const visualTranslateX = isRTL ? -offset : offset;

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
      onPointerLeave: (e: React.PointerEvent) => {
        if (e.buttons === 0) reset();
      },
    },
    offset,
    visualTranslateX,
    direction,
    reset,
  };
}
