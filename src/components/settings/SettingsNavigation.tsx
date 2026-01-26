import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Shield,
  Palette,
  Bell,
  Paperclip,
  Building2,
  Receipt,
  FileBox,
  Database,
  WifiOff,
  Lock,
  Search,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SettingsTab {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly: boolean;
  description?: string;
  color?: string;
}

export const personalTabs: SettingsTab[] = [
  { id: 'profile', label: 'الملف الشخصي', icon: User, adminOnly: false, description: 'البيانات الشخصية والصورة', color: 'bg-blue-500' },
  { id: 'security', label: 'الأمان', icon: Shield, adminOnly: false, description: 'كلمة المرور وتسجيل الدخول', color: 'bg-green-500' },
  { id: 'appearance', label: 'المظهر', icon: Palette, adminOnly: false, description: 'الثيم والألوان والخطوط', color: 'bg-purple-500' },
  { id: 'notifications', label: 'الإشعارات', icon: Bell, adminOnly: false, description: 'إعدادات التنبيهات', color: 'bg-orange-500' },
  { id: 'documents', label: 'مستنداتي', icon: Paperclip, adminOnly: false, description: 'المرفقات الشخصية', color: 'bg-pink-500' },
];

export const systemTabs: SettingsTab[] = [
  { id: 'company', label: 'الشركة', icon: Building2, adminOnly: true, description: 'معلومات وشعار الشركة', color: 'bg-indigo-500' },
  { id: 'invoices', label: 'الفواتير', icon: Receipt, adminOnly: true, description: 'العملة وإعدادات الفواتير', color: 'bg-teal-500' },
  { id: 'templates', label: 'القوالب', icon: FileBox, adminOnly: true, description: 'قوالب التقارير والطباعة', color: 'bg-cyan-500' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, adminOnly: true, description: 'تصدير واستيراد البيانات', color: 'bg-amber-500' },
  { id: 'export', label: 'تصدير الإعدادات', icon: Download, adminOnly: true, description: 'تصدير واستيراد إعدادات النظام', color: 'bg-emerald-500' },
  { id: 'offline', label: 'Offline', icon: WifiOff, adminOnly: true, description: 'العمل بدون اتصال', color: 'bg-slate-500' },
];

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  hasUnsavedChanges: boolean;
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DesktopSidebar({
  activeTab,
  onTabChange,
  hasUnsavedChanges,
  isAdmin,
  searchQuery,
  onSearchChange,
}: DesktopSidebarProps) {
  const filterTabs = (tabs: SettingsTab[]) => {
    if (!searchQuery) return tabs;
    return tabs.filter(
      (tab) =>
        tab.label.includes(searchQuery) ||
        tab.description?.includes(searchQuery)
    );
  };

  const filteredPersonalTabs = filterTabs(personalTabs);
  const filteredSystemTabs = isAdmin ? filterTabs(systemTabs) : [];

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0">
      <div className="sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="animate-pulse gap-1">
              <AlertCircle className="h-3 w-3" />
              تغييرات غير محفوظة
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في الإعدادات..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>

        <ScrollArea className="h-[calc(100vh-16rem)]">
          {/* Personal Settings */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-3 py-2">
              الإعدادات الشخصية
            </p>
            {filteredPersonalTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-right',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted'
                  )}
                >
                  <TabIcon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 text-right">
                    <span className="font-medium">{tab.label}</span>
                    {tab.description && (
                      <p className={cn(
                        'text-xs mt-0.5 transition-colors',
                        activeTab === tab.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {tab.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* System Settings - Admin Only */}
          {isAdmin && filteredSystemTabs.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-3 py-2 flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  إعدادات النظام
                </p>
                {filteredSystemTabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-right',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-muted'
                      )}
                    >
                      <TabIcon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 text-right">
                        <span className="font-medium">{tab.label}</span>
                        {tab.description && (
                          <p className={cn(
                            'text-xs mt-0.5 transition-colors',
                            activeTab === tab.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}>
                            {tab.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}

interface MobileSettingsListProps {
  onTabSelect: (tabId: string) => void;
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasUnsavedChanges: boolean;
}

export function MobileSettingsList({
  onTabSelect,
  isAdmin,
  searchQuery,
  onSearchChange,
  hasUnsavedChanges,
}: MobileSettingsListProps) {
  const filterTabs = (tabs: SettingsTab[]) => {
    if (!searchQuery) return tabs;
    return tabs.filter(
      (tab) =>
        tab.label.includes(searchQuery) ||
        tab.description?.includes(searchQuery)
    );
  };

  const filteredPersonalTabs = filterTabs(personalTabs);
  const filteredSystemTabs = isAdmin ? filterTabs(systemTabs) : [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        {hasUnsavedChanges && (
          <Badge variant="outline" className="animate-pulse gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            غير محفوظ
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الإعدادات..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Personal Settings */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1">
          الإعدادات الشخصية
        </p>
        <div className="space-y-1">
          {filteredPersonalTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabSelect(tab.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 transition-all touch-target"
              >
                <div className={cn('p-2.5 rounded-xl text-white', tab.color || 'bg-primary')}>
                  <TabIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-medium">{tab.label}</p>
                  {tab.description && (
                    <p className="text-xs text-muted-foreground">{tab.description}</p>
                  )}
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* System Settings - Admin Only */}
      {isAdmin && filteredSystemTabs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            إعدادات النظام
          </p>
          <div className="space-y-1">
            {filteredSystemTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabSelect(tab.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 transition-all touch-target"
                >
                  <div className={cn('p-2.5 rounded-xl text-white', tab.color || 'bg-primary')}>
                    <TabIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-medium">{tab.label}</p>
                    {tab.description && (
                      <p className="text-xs text-muted-foreground">{tab.description}</p>
                    )}
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MobileSettingsDetailProps {
  tab: SettingsTab;
  onBack: () => void;
  children: React.ReactNode;
}

export function MobileSettingsDetail({ tab, onBack, children }: MobileSettingsDetailProps) {
  const TabIcon = tab.icon;
  
  return (
    <div className="animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors touch-target"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className={cn('p-2 rounded-lg text-white', tab.color || 'bg-primary')}>
            <TabIcon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{tab.label}</h2>
            {tab.description && (
              <p className="text-xs text-muted-foreground">{tab.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-safe-area-bottom">
        {children}
      </div>
    </div>
  );
}
