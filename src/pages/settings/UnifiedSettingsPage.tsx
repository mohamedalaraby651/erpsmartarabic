import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsPageSkeleton } from '@/components/shared/AdminPageSkeleton';
import {
  DesktopSidebar,
  MobileSettingsList,
  MobileSettingsDetail,
  personalTabs,
  systemTabs,
  SettingsTab,
} from '@/components/settings/SettingsNavigation';

// Section Components
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
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'detail'>('list');

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

  // Reset mobile view when switching tabs on desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileViewMode('list');
    }
  }, [isMobile]);

  // Get all available tabs
  const allTabs = [...personalTabs, ...(isAdmin ? systemTabs : [])];
  const currentTab = allTabs.find((t) => t.id === activeTab) || personalTabs[0];

  const handleTabChange = (tabId: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟');
      if (!confirmed) return;
    }
    setSearchParams({ tab: tabId });
    setHasUnsavedChanges(false);
    
    // On mobile, switch to detail view
    if (isMobile) {
      setMobileViewMode('detail');
    }
  };

  const handleMobileBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟');
      if (!confirmed) return;
    }
    setMobileViewMode('list');
    setHasUnsavedChanges(false);
  };

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen pb-20 px-4">
        {mobileViewMode === 'list' ? (
          <MobileSettingsList
            onTabSelect={handleTabChange}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        ) : (
          <MobileSettingsDetail
            tab={currentTab}
            onBack={handleMobileBack}
          >
            <Suspense fallback={<SectionSkeleton />}>
              {renderContent()}
            </Suspense>
          </MobileSettingsDetail>
        )}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar - Desktop */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasUnsavedChanges={hasUnsavedChanges}
        isAdmin={isAdmin}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Content Area */}
      <main className="flex-1 min-w-0">
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
