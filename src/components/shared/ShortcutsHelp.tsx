import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: { keys: string; description: string }[];
}

/** Read-only keyboard shortcuts reference for list screens. */
export const ShortcutsHelp = ({ open, onOpenChange, shortcuts }: ShortcutsHelpProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>اختصارات لوحة المفاتيح</DialogTitle>
        <DialogDescription>اختصارات سريعة لتسريع العمل داخل هذه الشاشة.</DialogDescription>
      </DialogHeader>
      <ul className="space-y-2">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-center justify-between gap-4 rounded-md border border-border/60 px-3 py-2">
            <span className="text-sm text-muted-foreground">{shortcut.description}</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{shortcut.keys}</kbd>
          </li>
        ))}
      </ul>
    </DialogContent>
  </Dialog>
);
