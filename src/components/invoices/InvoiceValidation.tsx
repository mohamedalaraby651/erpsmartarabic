import { memo } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceValidationProps {
  isValidating: boolean;
  isPending: boolean;
  isEditing: boolean;
  onCancel: () => void;
}

function InvoiceValidation({
  isValidating,
  isPending,
  isEditing,
  onCancel,
}: InvoiceValidationProps) {
  const getButtonContent = () => {
    if (isValidating) {
      return (
        <>
          <ShieldCheck className="h-4 w-4 ml-2 animate-pulse" />
          جاري التحقق...
        </>
      );
    }
    if (isPending) {
      return (
        <>
          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          جاري الحفظ...
        </>
      );
    }
    return isEditing ? 'تحديث' : 'إنشاء';
  };

  return (
    <div className="flex justify-end gap-3 pt-4">
      <Button type="button" variant="outline" onClick={onCancel}>
        إلغاء
      </Button>
      <Button type="submit" disabled={isPending || isValidating}>
        {getButtonContent()}
      </Button>
    </div>
  );
}

export default memo(InvoiceValidation);
