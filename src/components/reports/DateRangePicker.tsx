import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (from: Date | undefined, to: Date | undefined) => void;
}

export function DateRangePicker({ from, to, onSelect }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-64 justify-start text-right font-normal',
            !from && !to && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {from && to ? (
            <>
              {format(from, 'dd/MM/yyyy', { locale: ar })} -{' '}
              {format(to, 'dd/MM/yyyy', { locale: ar })}
            </>
          ) : (
            <span>اختر الفترة</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={from}
          selected={{ from, to }}
          onSelect={(range) => {
            onSelect(range?.from, range?.to);
            if (range?.from && range?.to) {
              setIsOpen(false);
            }
          }}
          numberOfMonths={2}
          locale={ar}
        />
      </PopoverContent>
    </Popover>
  );
}
