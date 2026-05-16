import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 mb-4">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">غير مصرّح بالوصول</h1>
        <p className="text-muted-foreground mb-6">
          ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة. تواصل مع مسؤول النظام إن كنت تعتقد أن هذا خطأ.
        </p>
        <Button onClick={() => navigate('/')} variant="default">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة إلى لوحة القيادة
        </Button>
      </div>
    </div>
  );
}
