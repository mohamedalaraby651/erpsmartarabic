import { useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ATTACHMENT_CATEGORIES } from './AttachmentUploadForm';

export interface AttachmentFilters {
  search: string;
  category: string;
  fileType: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  showExpiringSoon: boolean;
  showExpired: boolean;
}

interface AttachmentsSearchProps {
  filters: AttachmentFilters;
  onFiltersChange: (filters: AttachmentFilters) => void;
  className?: string;
  showAdvanced?: boolean;
}

const FILE_TYPE_OPTIONS = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'image', label: 'صور' },
  { value: 'document', label: 'مستندات' },
  { value: 'spreadsheet', label: 'جداول بيانات' },
  { value: 'archive', label: 'ملفات مضغوطة' },
  { value: 'other', label: 'أخرى' },
];

export function AttachmentsSearch({
  filters,
  onFiltersChange,
  className,
  showAdvanced = true,
}: AttachmentsSearchProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value });
  };

  const handleFileTypeChange = (value: string) => {
    onFiltersChange({ ...filters, fileType: value });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, dateFrom: date });
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, dateTo: date });
  };

  const toggleExpiringSoon = () => {
    onFiltersChange({ ...filters, showExpiringSoon: !filters.showExpiringSoon });
  };

  const toggleExpired = () => {
    onFiltersChange({ ...filters, showExpired: !filters.showExpired });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category: 'all',
      fileType: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      showExpiringSoon: false,
      showExpired: false,
    });
  };

  const activeFiltersCount = [
    filters.category !== 'all',
    filters.fileType !== 'all',
    filters.dateFrom,
    filters.dateTo,
    filters.showExpiringSoon,
    filters.showExpired,
  ].filter(Boolean).length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في المرفقات..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>
        {showAdvanced && (
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            فلترة
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && showFilters && (
        <div className="p-4 bg-muted/30 rounded-lg space-y-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">التصنيف</label>
              <Select value={filters.category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع التصنيفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {ATTACHMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع الملف</label>
              <Select value={filters.fileType} onValueChange={handleFileTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <label className="text-sm font-medium">من تاريخ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-right font-normal',
                      !filters.dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {filters.dateFrom
                      ? format(filters.dateFrom, 'dd MMM yyyy', { locale: ar })
                      : 'اختر تاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={handleDateFromChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-right font-normal',
                      !filters.dateTo && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {filters.dateTo
                      ? format(filters.dateTo, 'dd MMM yyyy', { locale: ar })
                      : 'اختر تاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={handleDateToChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.showExpiringSoon ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80"
              onClick={toggleExpiringSoon}
            >
              قريبة الانتهاء
            </Badge>
            <Badge
              variant={filters.showExpired ? 'destructive' : 'outline'}
              className="cursor-pointer"
              onClick={toggleExpired}
            >
              منتهية الصلاحية
            </Badge>
            
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-xs gap-1"
              >
                <X className="h-3 w-3" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {ATTACHMENT_CATEGORIES.find((c) => c.value === filters.category)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleCategoryChange('all')}
              />
            </Badge>
          )}
          {filters.fileType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {FILE_TYPE_OPTIONS.find((t) => t.value === filters.fileType)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFileTypeChange('all')}
              />
            </Badge>
          )}
          {filters.showExpiringSoon && (
            <Badge variant="default" className="gap-1">
              قريبة الانتهاء
              <X className="h-3 w-3 cursor-pointer" onClick={toggleExpiringSoon} />
            </Badge>
          )}
          {filters.showExpired && (
            <Badge variant="destructive" className="gap-1">
              منتهية الصلاحية
              <X className="h-3 w-3 cursor-pointer" onClick={toggleExpired} />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 text-xs"
          >
            مسح الكل
          </Button>
        </div>
      )}
    </div>
  );
}

export const defaultFilters: AttachmentFilters = {
  search: '',
  category: 'all',
  fileType: 'all',
  dateFrom: undefined,
  dateTo: undefined,
  showExpiringSoon: false,
  showExpired: false,
};
