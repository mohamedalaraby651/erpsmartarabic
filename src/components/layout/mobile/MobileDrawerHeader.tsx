import { memo, useState } from 'react';
import { Factory, Search, X } from 'lucide-react';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MobileDrawerHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  isSearchActive: boolean;
  onSearchActivate: () => void;
  onSearchDeactivate: () => void;
}

function MobileDrawerHeader({
  searchQuery,
  onSearchChange,
  onSearchClear,
  isSearchActive,
  onSearchActivate,
  onSearchDeactivate,
}: MobileDrawerHeaderProps) {
  return (
    <>
      <SheetHeader className="p-3 border-b bg-gradient-to-l from-primary/5 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Factory className="h-4 w-4 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-right text-sm">معدات الدواجن</SheetTitle>
            <p className="text-[10px] text-muted-foreground">نظام الإدارة</p>
          </div>
        </div>
      </SheetHeader>

      <div className="p-3 pt-3">
        {!isSearchActive && !searchQuery ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9 bg-muted/50 border-transparent text-muted-foreground text-sm"
            onClick={onSearchActivate}
          >
            <Search className="h-3.5 w-3.5" />
            <span>ابحث في القائمة...</span>
          </Button>
        ) : (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في القائمة..."
              className="pr-8 pl-8 h-9 bg-background text-sm"
              autoFocus
              onBlur={() => {
                if (!searchQuery.trim()) {
                  onSearchDeactivate();
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={onSearchClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(MobileDrawerHeader);
