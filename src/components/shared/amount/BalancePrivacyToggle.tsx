import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBalancePrivacy } from '@/hooks/useBalancePrivacy';

export function BalancePrivacyToggle() {
  const { hidden, toggle } = useBalancePrivacy();
  const label = hidden ? 'إظهار الأرصدة' : 'إخفاء الأرصدة';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} aria-pressed={hidden} className="h-10 w-10">
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
