import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, Users, Settings, Lock } from 'lucide-react';

export default function AdminMenu() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  // Only show for admins
  if (userRole !== 'admin') return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Shield className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-600" />
          إدارة النظام
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/admin/roles')} className="gap-3 cursor-pointer">
          <Lock className="h-4 w-4" />
          إدارة الأدوار
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/admin/permissions')} className="gap-3 cursor-pointer">
          <Shield className="h-4 w-4" />
          إدارة الصلاحيات
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/admin/customizations')} className="gap-3 cursor-pointer">
          <Settings className="h-4 w-4" />
          تخصيص الأقسام
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/admin/users')} className="gap-3 cursor-pointer">
          <Users className="h-4 w-4" />
          إدارة المستخدمين
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
