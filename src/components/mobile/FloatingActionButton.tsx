import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="h-6 w-6" />,
  label,
  className 
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed bottom-20 left-4 z-40 h-14 rounded-full shadow-lg md:hidden',
        label ? 'px-6 gap-2' : 'w-14',
        className
      )}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </Button>
  );
}
