import { memo, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Keyboard, RotateCcw, Navigation, Zap, Globe } from 'lucide-react';
import { useCustomShortcuts, ShortcutDefinition } from '@/hooks/useCustomShortcuts';
import { cn } from '@/lib/utils';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons = {
  navigation: Navigation,
  action: Zap,
  global: Globe,
};

const categoryLabels = {
  navigation: 'التنقل',
  action: 'الإجراءات',
  global: 'عام',
};

const ShortcutItem = memo(function ShortcutItem({
  shortcut,
  label,
  onToggle,
}: {
  shortcut: ShortcutDefinition;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
      shortcut.enabled ? 'bg-transparent' : 'bg-muted/50 opacity-60'
    )}>
      <div className="flex items-center gap-3">
        <kbd className={cn(
          'inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded border text-xs font-mono font-medium',
          shortcut.enabled 
            ? 'bg-muted border-border text-foreground' 
            : 'bg-muted/50 border-border/50 text-muted-foreground'
        )}>
          {label}
        </kbd>
        <span className="text-sm">{shortcut.description}</span>
      </div>
      <Switch
        checked={shortcut.enabled}
        onCheckedChange={onToggle}
        aria-label={`تفعيل اختصار ${shortcut.description}`}
      />
    </div>
  );
});

function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const { shortcuts, toggleShortcut, resetToDefault, getShortcutLabel } = useCustomShortcuts();

  // تجميع الاختصارات حسب الفئة
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutDefinition[]> = {
      navigation: [],
      action: [],
      global: [],
    };

    shortcuts.forEach(shortcut => {
      if (groups[shortcut.category]) {
        groups[shortcut.category].push(shortcut);
      }
    });

    return groups;
  }, [shortcuts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            اختصارات لوحة المفاتيح
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pe-4">
            {Object.entries(groupedShortcuts).map(([category, items]) => {
              if (items.length === 0) return null;
              
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              const label = categoryLabels[category as keyof typeof categoryLabels];

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm text-muted-foreground">{label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {items.filter(i => i.enabled).length}/{items.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    {items.map(shortcut => (
                      <ShortcutItem
                        key={shortcut.id}
                        shortcut={shortcut}
                        label={getShortcutLabel(shortcut)}
                        onToggle={() => toggleShortcut(shortcut.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator className="my-2" />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            اضغط <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">Ctrl+/</kbd> لعرض هذه النافذة
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            استعادة الافتراضي
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(ShortcutsModal);
