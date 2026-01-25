import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsPageSkeleton } from '@/components/shared/AdminPageSkeleton';
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
} from 'lucide-react';

// Section Components - loaded eagerly for better UX
import { PersonalInfoSection } from '@/components/settings/PersonalInfoSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { DocumentsSection } from '@/components/settings/DocumentsSection';
import { CompanyInfoSection } from '@/components/settings/CompanyInfoSection';
import { InvoiceSettingsSection } from '@/components/settings/InvoiceSettingsSection';
import { ReportTemplateEditor } from '@/components/reports/ReportTemplateEditor';
import { BackupTab } from '@/components/settings/BackupTab';
import { SettingsExportImport } from '@/components/settings/SettingsExportImport';
import { OfflineSettings } from '@/components/settings/OfflineSettings';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly: boolean;
  description?: string;
}

const personalTabs: SettingsTab[] = [
  { id: 'profile', label: 'الملف الشخصي', icon: User, adminOnly: false, description: 'البيانات الشخصية والصورة' },
  { id: 'security', label: 'الأمان', icon: Shield, adminOnly: false, description: 'كلمة المرور وتسجيل الدخول' },
  { id: 'appearance', label: 'المظهر', icon: Palette, adminOnly: false, description: 'الثيم والألوان والخطوط' },
  { id: 'notifications', label: 'الإشعارات', icon: Bell, adminOnly: false, description: 'إعدادات التنبيهات' },
  { id: 'documents', label: 'مستنداتي', icon: Paperclip, adminOnly: false, description: 'المرفقات الشخصية' },
];

const systemTabs: SettingsTab[] = [
  { id: 'company', label: 'الشركة', icon: Building2, adminOnly: true, description: 'معلومات وشعار الشركة' },
  { id: 'invoices', label: 'الفواتير', icon: Receipt, adminOnly: true, description: 'العملة وإعدادات الفواتير' },
  { id: 'templates', label: 'القوالب', icon: FileBox, adminOnly: true, description: 'قوالب التقارير والطباعة' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, adminOnly: true, description: 'تصدير واستيراد البيانات' },
  { id: 'export', label: 'تصدير الإعدادات', icon: Download, adminOnly: true, description: 'تصدير واستيراد إعدادات النظام' },
  { id: 'offline', label: 'Offline', icon: WifiOff, adminOnly: true, description: 'العمل بدون اتصال' },
];

// Section skeleton for loading states
function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    </div>
  );
}

export default function UnifiedSettingsPage() {
  const { user, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isAdmin = userRole === 'admin';
  const activeTab = searchParams.get('tab') || 'profile';

  // Fetch profile data
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = (tabId: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟');
      if (!confirmed) return;
    }
    setSearchParams({ tab: tabId });
    setHasUnsavedChanges(false);
  };

  // Filter tabs based on search
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

  // Get all available tabs
  const allTabs = [...personalTabs, ...(isAdmin ? systemTabs : [])];
  const currentTab = allTabs.find((t) => t.id === activeTab) || personalTabs[0];

  if (loadingProfile) {
    return <SettingsPageSkeleton />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <PersonalInfoSection
            userId={user?.id || ''}
            profile={profile}
            userEmail={user?.email || ''}
            userRole={userRole}
            onDataChange={() => setHasUnsavedChanges(true)}
          />
        );
      case 'security':
        return <SecuritySection userId={user?.id || ''} />;
      case 'appearance':
        return <ThemeCustomizer onDataChange={() => setHasUnsavedChanges(true)} />;
      case 'notifications':
        return <NotificationSettings />;
      case 'documents':
        return <DocumentsSection userId={user?.id || ''} />;
      case 'company':
        return isAdmin ? <CompanyInfoSection onDataChange={() => setHasUnsavedChanges(true)} /> : null;
      case 'invoices':
        return isAdmin ? <InvoiceSettingsSection onDataChange={() => setHasUnsavedChanges(true)} /> : null;
      case 'templates':
        return isAdmin ? <ReportTemplateEditor /> : null;
      case 'backup':
        return isAdmin ? <BackupTab /> : null;
      case 'export':
        return isAdmin ? <SettingsExportImport /> : null;
      case 'offline':
        return isAdmin ? <OfflineSettings /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar - Desktop */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            {/* Personal Settings */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-3 py-2">
                الإعدادات الشخصية
              </p>
              {filteredPersonalTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-right',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted'
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
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
              ))}
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
                  {filteredSystemTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-right',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-muted'
                      )}
                    >
                      <tab.icon className="h-4 w-4 shrink-0" />
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
                  ))}
                </div>
              </>
            )}
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile Header & Tabs */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="animate-pulse gap-1 text-xs">
              <AlertCircle className="h-3 w-3" />
              غير محفوظ
            </Badge>
          )}
        </div>

        {/* Mobile Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Mobile Tabs - Grouped */}
        <div className="space-y-3">
          {/* Personal Tabs */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">شخصي</p>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {filteredPersonalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-all min-h-[44px]',
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* System Tabs - Admin Only */}
          {isAdmin && filteredSystemTabs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                النظام
              </p>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {filteredSystemTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-all min-h-[44px]',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 min-w-0">
        {/* Section Header - Mobile */}
        <div className="lg:hidden mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            {currentTab && <currentTab.icon className="h-5 w-5 text-primary" />}
            <div>
              <h2 className="text-lg font-semibold">{currentTab?.label}</h2>
              <p className="text-sm text-muted-foreground">{currentTab?.description}</p>
            </div>
          </div>
        </div>

        {/* Content with animation */}
        <div className="space-y-6 animate-fade-in" key={activeTab}>
          <Suspense fallback={<SectionSkeleton />}>
            {renderContent()}
          </Suspense>
        </div>
      </main>
    </div>
  );
}