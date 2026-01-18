import { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Edit, Trash2, Share2 } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

interface LongPressMenuProps {
  children: React.ReactNode;
  items: MenuItem[];
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  className?: string;
}

export function LongPressMenu({
  children,
  items,
  onView,
  onEdit,
  onDelete,
  onShare,
  className,
}: LongPressMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const defaultItems: MenuItem[] = [
    ...(onView
      ? [{ label: 'عرض', icon: <Eye className="h-4 w-4" />, onClick: onView }]
      : []),
    ...(onEdit
      ? [{ label: 'تعديل', icon: <Edit className="h-4 w-4" />, onClick: onEdit }]
      : []),
    ...(onShare
      ? [{ label: 'مشاركة', icon: <Share2 className="h-4 w-4" />, onClick: onShare }]
      : []),
    ...(onDelete
      ? [
          {
            label: 'حذف',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: onDelete,
            variant: 'destructive' as const,
            separator: true,
          },
        ]
      : []),
  ];

  const allItems = [...defaultItems, ...items];

  const handleLongPress = useCallback(() => {
    haptics.medium();
    setIsMenuOpen(true);
    setIsPressing(false);
  }, []);

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    onStart: () => setIsPressing(true),
    onCancel: () => setIsPressing(false),
    delay: 500,
  });

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            'touch-none select-none transition-all duration-150',
            isPressing && 'scale-[0.98] opacity-80',
            className
          )}
          {...longPressHandlers}
        >
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 animate-scale-in">
        {allItems.map((item, index) => (
          <div key={index}>
            {item.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => {
                haptics.light();
                item.onClick();
                setIsMenuOpen(false);
              }}
              className={cn(
                'gap-2',
                item.variant === 'destructive' && 'text-destructive focus:text-destructive'
              )}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
