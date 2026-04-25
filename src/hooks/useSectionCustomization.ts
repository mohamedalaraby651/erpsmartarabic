import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SectionCustomization {
  id: string;
  section: string;
  field_name: string;
  custom_label: string | null;
  is_visible: boolean;
  sort_order: number;
  is_custom_field: boolean;
  field_type: string;
  field_options: Record<string, unknown> | null;
}

export function useSectionCustomization(section: string) {
  const { data: customizations, isLoading, refetch } = useQuery({
    queryKey: ['section-customizations', section],
    queryFn: async () => {
      const { data } = await supabase
        .from('section_customizations')
        .select('*')
        .eq('section', section)
        .order('sort_order');
      
      return data || [];
    },
  });

  const getFieldLabel = (fieldName: string, defaultLabel: string): string => {
    const customization = customizations?.find(c => c.field_name === fieldName);
    return customization?.custom_label || defaultLabel;
  };

  const isFieldVisible = (fieldName: string): boolean => {
    const customization = customizations?.find(c => c.field_name === fieldName);
    // Default to visible if no customization exists
    return customization?.is_visible ?? true;
  };

  const getVisibleFields = (fields: { name: string; label: string }[]) => {
    if (!customizations || customizations.length === 0) {
      return fields;
    }

    return fields
      .filter(field => isFieldVisible(field.name))
      .map(field => ({
        ...field,
        label: getFieldLabel(field.name, field.label),
      }))
      .sort((a, b) => {
        const aOrder = customizations.find(c => c.field_name === a.name)?.sort_order ?? 999;
        const bOrder = customizations.find(c => c.field_name === b.name)?.sort_order ?? 999;
        return aOrder - bOrder;
      });
  };

  const getCustomFields = () => {
    return customizations?.filter(c => c.is_custom_field) || [];
  };

  return {
    customizations,
    isLoading,
    refetch,
    getFieldLabel,
    isFieldVisible,
    getVisibleFields,
    getCustomFields,
  };
}
