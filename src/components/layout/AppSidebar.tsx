import { useState, memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { useSidebarSearch } from '@/hooks/useSidebarSearch';
import { useSidebarSettings } from '@/hooks/useSidebarSettings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ClickableSearchButton from '@/components/sidebar/ClickableSearchButton';
import QuickActions from '@/components/sidebar/QuickActions';
import FavoritesSection from '@/components/sidebar/FavoritesSection';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Factory,
  Moon,
  Sun,
  Shield,
  Search,
  RotateCcw,
} from 'lucide-react';
import SidebarNavSections, { defaultNavSections, type NavSection } from './sidebar/SidebarNavSections';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

function AppSidebar({ collapsed, onToggle, isDark, onThemeToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const { favorites, removeFavorite, isFavorite, toggleFavorite, reorderFavorites } = useFavoritePages();
  const { settings, updateSectionOrder, resetSettings } = useSidebarSettings();
  const [openSections, setOpenSections] = useState<string[]>(['sales', 'inventory']);

  // Order sections based on saved settings
  const orderedSections = useMemo(() => {
    const sectionMap = new Map(defaultNavSections.map(s => [s.id, s]));
    const ordered: NavSection[] = [];
    
    settings.sectionOrder.forEach(id => {
      const section = sectionMap.get(id);
      if (section) {
        ordered.push(section);
        sectionMap.delete(id);
      }
    });
    
    sectionMap.forEach(section => ordered.push(section));
    
    return ordered;
  }, [settings.sectionOrder]);

  // Build searchable items
  const allItems = useMemo(() => {
    const items: { title: string; href: string; section: string }[] = [];
    orderedSections.forEach(section => {
      section.items.forEach(item => {
        items.push({
          title: item.title,
          href: item.href,
          section: section.title,
        });
      });
    });
    return items;
  }, [orderedSections]);

  const { searchQuery, setSearchQuery, clearSearch, isSearching, filteredItems } = useSidebarSearch(allItems);

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isItemActive = (href: string) => location.pathname === href;

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedSections.findIndex(s => s.id === active.id);
      const newIndex = orderedSections.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(orderedSections.map(s => s.id), oldIndex, newIndex);
      updateSectionOrder(newOrder);
    }
  };

  const handleResetOrder = () => {
    resetSettings();
    setOpenSections(['sales', 'inventory']);
  };

  // Filter sections based on search
  const visibleSections = useMemo(() => {
    if (!isSearching) return orderedSections;
    
    return orderedSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        filteredItems.some(f => f.href === item.href)
      ),
    })).filter(section => section.items.length > 0);
  }, [orderedSections, isSearching, filteredItems]);

  const isAdmin = userRole === 'admin';

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 h-screen border-l bg-sidebar transition-all duration-300',
          collapsed ? 'w-[70px]' : 'w-[280px]'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            'flex items-center border-b border-sidebar-border p-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <Factory className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-bold text-sidebar-foreground">معدات الدواجن</h1>
                  <p className="text-xs text-muted-foreground">نظام الإدارة</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Factory className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            {!collapsed ? (
              <ClickableSearchButton
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={clearSearch}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full h-9"
                    onClick={() => handleNavigation('/search')}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">البحث الشامل</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Quick Actions */}
          {!isSearching && (
            <div className="px-3 pt-3">
              <QuickActions collapsed={collapsed} />
            </div>
          )}

          {/* Favorites */}
          {!isSearching && favorites.length > 0 && (
            <div className="px-3 pt-3">
              <FavoritesSection
                favorites={favorites}
                onRemove={removeFavorite}
                onReorder={reorderFavorites}
                collapsed={collapsed}
              />
            </div>
          )}

          {/* Dashboard Link */}
          {!isSearching && (
            <div className="px-3 pt-3">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isItemActive('/') ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn(
                        'w-full h-10',
                        isItemActive('/') && 'bg-primary/10 text-primary hover:bg-primary/15'
                      )}
                      onClick={() => handleNavigation('/')}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">لوحة التحكم</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant={isItemActive('/') ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-10',
                    isItemActive('/') && 'bg-primary/10 text-primary hover:bg-primary/15'
                  )}
                  onClick={() => handleNavigation('/')}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>لوحة التحكم</span>
                </Button>
              )}
            </div>
          )}

          {!isSearching && !collapsed && <Separator className="mx-3 mt-3" />}

          {/* Navigation Sections */}
          <ScrollArea className="flex-1 px-3 py-3">
            <SidebarNavSections
              orderedSections={orderedSections}
              visibleSections={visibleSections}
              openSections={openSections}
              collapsed={collapsed}
              userRole={userRole}
              isSearching={isSearching}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              toggleSection={toggleSection}
              onSectionDragEnd={handleSectionDragEnd}
            />

            {/* Admin Link */}
            {!collapsed && !isSearching && isAdmin && (
              <>
                <Separator className="my-3" />
                <Button
                  variant={location.pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-10',
                    location.pathname.startsWith('/admin') && 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  )}
                  onClick={() => handleNavigation('/admin/dashboard')}
                >
                  <div className="p-1.5 rounded-md bg-purple-500/10">
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span>إدارة النظام</span>
                  <ChevronLeft className="mr-auto h-4 w-4" />
                </Button>
              </>
            )}

            {/* Reset Order Button */}
            {!collapsed && !isSearching && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground gap-2"
                onClick={handleResetOrder}
              >
                <RotateCcw className="h-3 w-3" />
                إعادة الترتيب الافتراضي
              </Button>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            {/* Theme Toggle */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-9"
                    onClick={onThemeToggle}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-9"
                onClick={onThemeToggle}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
              </Button>
            )}

            {/* Collapse Toggle */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-10 bg-gradient-to-r from-primary/15 to-primary/5 hover:from-primary/25 hover:to-primary/10 border border-primary/20 shadow-sm transition-all duration-200 group"
                    onClick={onToggle}
                  >
                    <ChevronRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="font-semibold">
                  توسيع القائمة
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:via-primary/10 hover:to-primary/5 border border-primary/15 shadow-sm transition-all duration-200 group"
                onClick={onToggle}
              >
                <div className="p-1.5 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-primary transition-transform group-hover:-translate-x-0.5" />
                </div>
                <span className="font-medium">طي القائمة</span>
              </Button>
            )}

            {/* Sign Out */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">تسجيل الخروج</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default memo(AppSidebar);
