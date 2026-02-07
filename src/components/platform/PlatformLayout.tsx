import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import PlatformSidebar from './PlatformSidebar';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlatformLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isPlatformAdmin, isLoading: platformLoading } = usePlatformAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/platform/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || platformLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">غير مصرح بالوصول</h1>
          <p className="text-muted-foreground">
            هذه المنطقة مخصصة لمسؤولي المنصة فقط. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مالك المنصة.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              العودة للنظام
            </Button>
            <Button variant="outline" onClick={() => navigate('/platform/auth')}>
              تسجيل دخول آخر
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PlatformSidebar />
      <div className="mr-[260px]">
        <main className="p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
