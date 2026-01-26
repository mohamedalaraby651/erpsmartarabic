import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'sidebar_settings';

export interface SidebarSettings {
  sectionOrder: string[];
  collapsedSections: string[];
}

const DEFAULT_SETTINGS: SidebarSettings = {
  sectionOrder: ['sales', 'inventory', 'finance', 'system'],
  collapsedSections: [],
};

export function useSidebarSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SidebarSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage first, then sync with DB
  useEffect(() => {
    if (!user?.id) return;
    
    // Load from localStorage first (fast)
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setIsLoaded(true);

    // Then sync from database
    const loadFromDb = async () => {
      const { data } = await supabase
        .from('user_sidebar_settings')
        .select('section_order, collapsed_sections')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const dbSettings: SidebarSettings = {
          sectionOrder: (data.section_order as string[]) || DEFAULT_SETTINGS.sectionOrder,
          collapsedSections: data.collapsed_sections || [],
        };
        setSettings(dbSettings);
        localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(dbSettings));
      }
    };

    loadFromDb();
  }, [user?.id]);

  // Save settings to both localStorage and database
  const saveSettings = useCallback(async (newSettings: SidebarSettings) => {
    if (!user?.id) return;
    
    // Save to localStorage (fast)
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newSettings));
    setSettings(newSettings);

    // Save to database (background)
    const { data: existing } = await supabase
      .from('user_sidebar_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_sidebar_settings')
        .update({ 
          section_order: newSettings.sectionOrder,
          collapsed_sections: newSettings.collapsedSections,
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_sidebar_settings')
        .insert([{
          user_id: user.id,
          section_order: newSettings.sectionOrder,
          collapsed_sections: newSettings.collapsedSections,
        }]);
    }

    queryClient.invalidateQueries({ queryKey: ['sidebar-settings', user.id] });
  }, [user?.id, queryClient]);

  const updateSectionOrder = useCallback((sectionOrder: string[]) => {
    saveSettings({ ...settings, sectionOrder });
  }, [settings, saveSettings]);

  const toggleSectionCollapsed = useCallback((sectionId: string) => {
    const collapsedSections = settings.collapsedSections.includes(sectionId)
      ? settings.collapsedSections.filter(id => id !== sectionId)
      : [...settings.collapsedSections, sectionId];
    saveSettings({ ...settings, collapsedSections });
  }, [settings, saveSettings]);

  const isSectionCollapsed = useCallback((sectionId: string) => {
    return settings.collapsedSections.includes(sectionId);
  }, [settings.collapsedSections]);

  const resetSettings = useCallback(async () => {
    if (!user?.id) return;
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setSettings(DEFAULT_SETTINGS);

    await supabase
      .from('user_sidebar_settings')
      .delete()
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['sidebar-settings', user.id] });
  }, [user?.id, queryClient]);

  return {
    settings,
    updateSectionOrder,
    toggleSectionCollapsed,
    isSectionCollapsed,
    resetSettings,
    isLoaded,
  };
}
