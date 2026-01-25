import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminMenu from './AdminMenu';
import QuickActions from '@/components/navigation/QuickActions';
import OfflineIndicator from '@/components/offline/OfflineIndicator';

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
  accountant: 'محاسب',
  hr: 'موارد بشرية',
};

export default function AppHeader() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 w-full"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Quick Actions */}
        <QuickActions />

        {/* Admin Menu */}
        <AdminMenu />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-center text-sm text-muted-foreground">
              لا توجد إشعارات جديدة
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
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
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>
              <User className="ml-2 h-4 w-4" />
              الملف الشخصي
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings?tab=appearance')}>
              <Settings className="ml-2 h-4 w-4" />
              الإعدادات
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
