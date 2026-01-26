import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ResetSettingsButtonProps {
  onReset: () => void;
  sectionName?: string;
  requireConfirmation?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ResetSettingsButton({
  onReset,
  sectionName,
  requireConfirmation = false,
  variant = 'outline',
  size = 'default',
}: ResetSettingsButtonProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    if (requireConfirmation && confirmText !== 'RESET') {
      toast.error('يرجى كتابة RESET للتأكيد');
      return;
    }
    onReset();
    setConfirmText('');
    setIsOpen(false);
    toast.success(sectionName ? `تم إعادة تعيين ${sectionName}` : 'تم إعادة التعيين بنجاح');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {size !== 'icon' && (sectionName ? `إعادة تعيين ${sectionName}` : 'استعادة الافتراضي')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            تأكيد إعادة التعيين
          </AlertDialogTitle>
          <AlertDialogDescription>
            {sectionName 
              ? `هل أنت متأكد من إعادة تعيين إعدادات ${sectionName}؟ سيتم استعادة القيم الافتراضية.`
              : 'هل أنت متأكد من إعادة تعيين جميع الإعدادات؟ لا يمكن التراجع عن هذا الإجراء.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireConfirmation && (
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm">
              اكتب <span className="font-mono font-bold text-destructive">RESET</span> للتأكيد
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              dir="ltr"
              className="font-mono"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={requireConfirmation && confirmText !== 'RESET'}
          >
            <RotateCcw className="h-4 w-4 ml-2" />
            إعادة التعيين
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
