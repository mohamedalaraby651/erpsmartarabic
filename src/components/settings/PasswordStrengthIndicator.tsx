import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Shield } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const criteria: PasswordCriteria[] = useMemo(() => [
    { label: '6 أحرف على الأقل', met: password.length >= 6 },
    { label: 'يحتوي على أرقام', met: /\d/.test(password) },
    { label: 'يحتوي على حروف كبيرة', met: /[A-Z]/.test(password) },
    { label: 'يحتوي على رموز', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = criteria.filter(c => c.met).length;
    if (metCount === 0) return { level: 0, label: 'ضعيفة جداً', color: 'bg-destructive' };
    if (metCount === 1) return { level: 1, label: 'ضعيفة', color: 'bg-destructive' };
    if (metCount === 2) return { level: 2, label: 'متوسطة', color: 'bg-warning' };
    if (metCount === 3) return { level: 3, label: 'جيدة', color: 'bg-success' };
    return { level: 4, label: 'قوية', color: 'bg-success' };
  }, [criteria]);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            قوة كلمة المرور
          </span>
          <span className={cn(
            'font-medium',
            strength.level <= 1 && 'text-destructive',
            strength.level === 2 && 'text-warning',
            strength.level >= 3 && 'text-success'
          )}>
            {strength.label}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300 rounded-full', strength.color)}
            style={{ width: `${(strength.level / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Criteria List */}
      <div className="grid grid-cols-2 gap-2">
        {criteria.map((item, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 text-xs p-2 rounded-lg transition-colors',
              item.met ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            )}
          >
            {item.met ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
