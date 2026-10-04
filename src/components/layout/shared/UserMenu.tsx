import { useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

interface UserMenuProps {
  /** When true, hides the inline name/role label (used in compact mobile mode). */
  compact?: boolean;
  className?: string;
}

export function UserMenu({ compact = false, className }: UserMenuProps) {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'relative gap-2 hover:bg-muted/80',
            compact ? 'h-8 w-8 p-0' : 'h-10 px-2',
            className
          )}
        >
          <Avatar className={cn(compact ? 'h-7 w-7' : 'h-8 w-8', 'ring-2 ring-background shadow-sm')}>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              {userRole && (
                <Badge variant="secondary" className="text-xs h-5">
                  {roleLabels[userRole] || userRole}
                </Badge>
              )}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>حسابي</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')} className="cursor-pointer">
          <User className="ml-2 h-4 w-4" />
          الملف الشخصي
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings?tab=appearance')} className="cursor-pointer">
          <Settings className="ml-2 h-4 w-4" />
          الإعدادات
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="ml-2 h-4 w-4" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
