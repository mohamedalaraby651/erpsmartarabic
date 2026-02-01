import { useState, useRef, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface PinchZoomProps {
  children: React.ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
  onZoomChange?: (scale: number) => void;
}

function PinchZoom({
  children,
  className,
  minScale = 1,
  maxScale = 4,
  onZoomChange,
}: PinchZoomProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const initialCenter = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });

  // حساب المسافة بين نقطتين
  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // حساب مركز نقطتين
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      initialDistance.current = getDistance(touch1, touch2);
      initialScale.current = scale;
      initialCenter.current = getCenter(touch1, touch2);
      lastPosition.current = position;
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // حساب المقياس الجديد
      const currentDistance = getDistance(touch1, touch2);
      const scaleChange = currentDistance / initialDistance.current;
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale.current * scaleChange));
      
      // حساب المركز الجديد
      const currentCenter = getCenter(touch1, touch2);
      const centerDelta = {
        x: currentCenter.x - initialCenter.current.x,
        y: currentCenter.y - initialCenter.current.y,
      };
      
      // تحديث الموقع مع المقياس
      const newPosition = {
        x: lastPosition.current.x + centerDelta.x * (newScale / initialScale.current - 1),
        y: lastPosition.current.y + centerDelta.y * (newScale / initialScale.current - 1),
      };
      
      setScale(newScale);
      setPosition(newPosition);
      onZoomChange?.(newScale);
    }
  }, [isPinching, maxScale, minScale, onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    
    // إعادة الضبط إذا كان المقياس قريباً من 1
    if (scale < 1.1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      onZoomChange?.(1);
    }
  }, [scale, onZoomChange]);

  // إعادة الضبط بالنقر المزدوج
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      onZoomChange?.(1);
    } else {
      setScale(2);
      onZoomChange?.(2);
    }
  }, [scale, onZoomChange]);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden touch-none', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={cn(
          'origin-center',
          !isPinching && 'transition-transform duration-200'
        )}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      >
        {children}
      </div>
      
      {/* مؤشر المقياس */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}

export default memo(PinchZoom);
