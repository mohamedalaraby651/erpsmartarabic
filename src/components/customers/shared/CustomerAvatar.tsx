import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Building2, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerAvatarProps {
  name: string;
  imageUrl?: string | null;
  customerType?: 'individual' | 'company' | 'farm' | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded-square';
  vipBorder?: 'regular' | 'silver' | 'gold' | 'platinum' | string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

const badgeSizeClasses = {
  sm: 'h-5 w-5 -bottom-0.5 -left-0.5',
  md: 'h-6 w-6 -bottom-0.5 -left-0.5',
  lg: 'h-7 w-7 -bottom-1 -left-1',
  xl: 'h-8 w-8 -bottom-1 -left-1',
};

const typeConfig = {
  individual: {
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    icon: User,
    badgeBg: 'bg-blue-600',
  },
  company: {
    gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    icon: Building2,
    badgeBg: 'bg-emerald-600',
  },
  farm: {
    gradient: 'bg-gradient-to-br from-amber-600 to-green-700',
    icon: Leaf,
    badgeBg: 'bg-green-600',
  },
};

const vipBorderColors: Record<string, string> = {
  regular: 'border-border',
  silver: 'border-zinc-400 dark:border-zinc-500',
  gold: 'border-amber-500 dark:border-amber-400',
  platinum: 'border-purple-500 dark:border-purple-400',
};

// Detect Arabic to avoid split-letter rendering ("فع" instead of "فا")
const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

const CustomerAvatar = ({ name, imageUrl, customerType = 'individual', size = 'lg', shape = 'circle', vipBorder, className }: CustomerAvatarProps) => {
  const trimmedName = (name || '').trim();
  // For Arabic names, take the first 1-2 letters of the first word as a connected glyph
  // (Arabic letters change shape when isolated, so split first-letters look broken)
  const initials = isArabic(trimmedName)
    ? trimmedName.split(/\s+/)[0]?.slice(0, 2) || '؟'
    : trimmedName
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
        .toUpperCase();

  const config = typeConfig[customerType as keyof typeof typeConfig] || typeConfig.individual;
  const TypeIcon = config.icon;
  const isSquare = shape === 'rounded-square';
  const borderColor = vipBorder ? (vipBorderColors[vipBorder] || vipBorderColors.regular) : '';

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(
        sizeClasses[size],
        'border-4 shadow-lg',
        isSquare ? 'rounded-xl' : 'rounded-full',
        borderColor || 'border-background',
      )}>
        <AvatarImage src={imageUrl || undefined} alt={name} className={isSquare ? 'rounded-xl' : ''} />
        <AvatarFallback className={cn(
          'text-white font-bold',
          config.gradient,
          isSquare ? 'rounded-xl' : '',
          size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm',
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {/* Type badge overlay */}
      <div className={cn(
        'absolute flex items-center justify-center text-white shadow-md border-2 border-background',
        isSquare ? 'rounded-lg' : 'rounded-full',
        config.badgeBg,
        badgeSizeClasses[size],
      )}>
        <TypeIcon className={iconSizeClasses[size]} />
      </div>
    </div>
  );
};

export default CustomerAvatar;
