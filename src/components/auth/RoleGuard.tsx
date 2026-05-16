import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ForbiddenPage from '@/pages/ForbiddenPage';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface RoleGuardProps {
  allow: AppRole[];
  children: ReactNode;
}

/**
 * RoleGuard — تحقّق من دور المستخدم قبل عرض الصفحة.
 * يُستخدم حول مسارات admin/platform لإظهار 403 صريح بدل شاشة فارغة.
 * ملاحظة: هذا فحص UX فقط؛ الحماية الحقيقية تتم عبر RLS في قاعدة البيانات.
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !allow.includes(userRole)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
