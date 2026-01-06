import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ThemeConfig, defaultThemeConfig, applyTheme, saveThemeToLocalStorage, getThemeFromLocalStorage } from '@/lib/themeManager';
import { useEffect } from 'react';

export interface UserPreferences {
  id?: string;
  user_id?: string;
  theme: string;
  primary_color: string;
  accent_color: string;
  font_family: string;
  font_size: string;
  sidebar_compact: boolean;
  sidebar_order: any[];
  favorite_pages: any[];
  collapsed_sections: any[];
  dashboard_widgets: any;
  table_settings: Record<string, any>;
  notification_settings: Record<string, any>;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  primary_color: '#2563eb',
  accent_color: '#8b5cf6',
  font_family: 'Cairo',
  font_size: 'medium',
  sidebar_compact: false,
  sidebar_order: [],
  favorite_pages: [],
  collapsed_sections: [],
  dashboard_widgets: null,
  table_settings: {},
  notification_settings: {},
};

function parseJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(value: any): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences from database
  const { data: dbPreferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Merge local and DB preferences with proper parsing
  const preferences: UserPreferences = {
    ...defaultPreferences,
    ...(dbPreferences ? {
      ...dbPreferences,
      sidebar_order: parseJsonArray(dbPreferences.sidebar_order),
      favorite_pages: parseJsonArray(dbPreferences.favorite_pages),
      collapsed_sections: parseJsonArray(dbPreferences.collapsed_sections),
      table_settings: parseJsonObject(dbPreferences.table_settings),
      notification_settings: parseJsonObject(dbPreferences.notification_settings),
    } : {}),
  };

  // Apply theme when preferences change
  useEffect(() => {
    if (dbPreferences) {
      const themeConfig: ThemeConfig = {
        theme: dbPreferences.theme as ThemeConfig['theme'] || 'system',
        primaryColor: dbPreferences.primary_color || defaultThemeConfig.primaryColor,
        accentColor: dbPreferences.accent_color || defaultThemeConfig.accentColor,
        fontFamily: dbPreferences.font_family || defaultThemeConfig.fontFamily,
        fontSize: dbPreferences.font_size as ThemeConfig['fontSize'] || 'medium',
        sidebarCompact: dbPreferences.sidebar_compact || false,
      };
      applyTheme(themeConfig);
      saveThemeToLocalStorage(themeConfig);
    }
  }, [dbPreferences]);

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if record exists
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({ ...updates, user_id: user.id });
        if (error) throw error;
      }

      return updates;
    },
    onSuccess: (updates) => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
      
      // Apply theme changes immediately
      if (updates.theme || updates.primary_color || updates.accent_color || 
          updates.font_family || updates.font_size || updates.sidebar_compact !== undefined) {
        const themeConfig: Partial<ThemeConfig> = {};
        if (updates.theme) themeConfig.theme = updates.theme as ThemeConfig['theme'];
        if (updates.primary_color) themeConfig.primaryColor = updates.primary_color;
        if (updates.accent_color) themeConfig.accentColor = updates.accent_color;
        if (updates.font_family) themeConfig.fontFamily = updates.font_family;
        if (updates.font_size) themeConfig.fontSize = updates.font_size as ThemeConfig['fontSize'];
        if (updates.sidebar_compact !== undefined) themeConfig.sidebarCompact = updates.sidebar_compact;
        
        applyTheme(themeConfig);
        saveThemeToLocalStorage(themeConfig);
      }
    },
  });

  // Helper functions for specific updates
  const updateTheme = (theme: string) => updateMutation.mutate({ theme });
  const updatePrimaryColor = (primary_color: string) => updateMutation.mutate({ primary_color });
  const updateAccentColor = (accent_color: string) => updateMutation.mutate({ accent_color });
  const updateFontFamily = (font_family: string) => updateMutation.mutate({ font_family });
  const updateFontSize = (font_size: string) => updateMutation.mutate({ font_size });
  const updateSidebarCompact = (sidebar_compact: boolean) => updateMutation.mutate({ sidebar_compact });
  const updateSidebarOrder = (sidebar_order: string[]) => updateMutation.mutate({ sidebar_order });
  const updateFavoritePages = (favorite_pages: string[]) => updateMutation.mutate({ favorite_pages });
  const updateDashboardWidgets = (dashboard_widgets: any) => updateMutation.mutate({ dashboard_widgets });
  const updateTableSettings = (table_settings: Record<string, any>) => updateMutation.mutate({ table_settings });
  const updateNotificationSettings = (notification_settings: Record<string, any>) => updateMutation.mutate({ notification_settings });

  return {
    preferences,
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateTheme,
    updatePrimaryColor,
    updateAccentColor,
    updateFontFamily,
    updateFontSize,
    updateSidebarCompact,
    updateSidebarOrder,
    updateFavoritePages,
    updateDashboardWidgets,
    updateTableSettings,
    updateNotificationSettings,
  };
}
