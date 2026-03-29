import { memo, ReactNode } from 'react';
import { LucideIcon, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface StandardPageHeaderProps {
  /** Page title */
  title: string;
  /** Optional icon displayed next to the title */
  icon?: LucideIcon;
  /** Search input value */
  searchValue?: string;
  /** Search input change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Primary CTA (e.g. "إضافة عميل") */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    disabled?: boolean;
  };
  /** Extra toolbar actions (e.g. export, filter buttons) */
  actions?: ReactNode;
  /** Content below the header (e.g. filter chips, tabs) */
  children?: ReactNode;
  className?: string;
}

/**
 * StandardPageHeader — unified header for all list pages.
 *
 * Provides consistent layout for: title, search, primary CTA, and extra actions.
 * Responsive: stacks vertically on mobile.
 */
export const StandardPageHeader = memo(function StandardPageHeader({
  title,
  icon: Icon,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  primaryAction,
  actions,
  children,
  className,
}: StandardPageHeaderProps) {
  const PrimaryIcon = primaryAction?.icon || Plus;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Row 1: Title + Primary CTA */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="gap-2"
          >
            <PrimaryIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{primaryAction.label}</span>
          </Button>
        )}
      </div>

      {/* Row 2: Search + Actions */}
      {(onSearchChange || actions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onSearchChange && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pr-9"
              />
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Children (filters, tabs, etc.) */}
      {children}
    </div>
  );
});
