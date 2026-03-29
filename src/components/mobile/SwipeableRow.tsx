import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onCall?: () => void;
  className?: string;
}

export function SwipeableRow({ children, onDelete, onEdit, onCall, className }: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const ACTION_WIDTH = 80;
  const THRESHOLD = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const diff = e.touches[0].clientX - startX;
    
    // Left swipe → show edit/delete actions
    if (diff < 0) {
      const newTranslate = Math.max(diff, -ACTION_WIDTH * 2);
      setTranslateX(newTranslate);
    }
    // Right swipe → show call action
    else if (diff > 0 && onCall) {
      const newTranslate = Math.min(diff, ACTION_WIDTH);
      setTranslateX(newTranslate);
    }
    // Right swipe to close left actions
    else if (diff > 0 && translateX < 0) {
      const newTranslate = Math.min(translateX + diff, 0);
      setTranslateX(newTranslate);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (translateX < -THRESHOLD) {
      setTranslateX(-ACTION_WIDTH);
    } else if (translateX > THRESHOLD && onCall) {
      setTranslateX(ACTION_WIDTH);
    } else {
      setTranslateX(0);
    }
  };

  const handleAction = (action: 'edit' | 'delete' | 'call') => {
    setTranslateX(0);
    if (action === 'delete' && onDelete) {
      onDelete();
    } else if (action === 'edit' && onEdit) {
      onEdit();
    } else if (action === 'call' && onCall) {
      onCall();
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Action buttons (behind) */}
      <div className="absolute inset-y-0 left-0 flex items-stretch">
        {onEdit && (
          <button
            onClick={() => handleAction('edit')}
            className="flex items-center justify-center w-20 bg-primary text-primary-foreground"
          >
            <span className="text-sm font-medium">تعديل</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => handleAction('delete')}
            className="flex items-center justify-center w-20 bg-destructive text-destructive-foreground"
          >
            <span className="text-sm font-medium">حذف</span>
          </button>
        )}
      </div>

      {/* Main content */}
      <div
        className={cn(
          'relative bg-background',
          !isSwiping && 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
