import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'sidebar_order';

export interface SectionOrder {
  sectionTitle: string;
  itemOrder: string[]; // hrefs in order
}

export interface SidebarOrder {
  sectionOrder: string[]; // section titles in order
  sections: SectionOrder[];
}

export function useSidebarOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<SidebarOrder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load order from localStorage first, then sync with DB
  useEffect(() => {
    if (!user?.id) return;
    
    // Load from localStorage first (fast)
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        setOrder(JSON.parse(stored));
      } catch {
        setOrder(null);
      }
    }
    setIsLoaded(true);

    // Then sync from database
    const loadFromDb = async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('sidebar_order')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.sidebar_order) {
        const dbOrder = data.sidebar_order as unknown as SidebarOrder;
        if (dbOrder && typeof dbOrder === 'object') {
          setOrder(dbOrder);
          localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(dbOrder));
        }
      }
    };

    loadFromDb();
  }, [user?.id]);

  // Save order to both localStorage and database
  const saveOrder = useCallback(async (newOrder: SidebarOrder) => {
    if (!user?.id) return;
    
    // Save to localStorage (fast)
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newOrder));
    setOrder(newOrder);

    // Save to database (background)
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_preferences')
        .update({ sidebar_order: JSON.stringify(newOrder) })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_preferences')
        .insert([{
          user_id: user.id,
          sidebar_order: JSON.stringify(newOrder),
        }]);
    }

    queryClient.invalidateQueries({ queryKey: ['user-preferences', user.id] });
  }, [user?.id, queryClient]);

  const updateSectionOrder = useCallback((sectionTitles: string[]) => {
    const newOrder: SidebarOrder = {
      sectionOrder: sectionTitles,
      sections: order?.sections || [],
    };
    saveOrder(newOrder);
  }, [order, saveOrder]);

  const updateItemOrder = useCallback((sectionTitle: string, itemHrefs: string[]) => {
    const existingSections = order?.sections || [];
    const sectionIndex = existingSections.findIndex(s => s.sectionTitle === sectionTitle);
    
    let newSections: SectionOrder[];
    if (sectionIndex >= 0) {
      newSections = [...existingSections];
      newSections[sectionIndex] = { sectionTitle, itemOrder: itemHrefs };
    } else {
      newSections = [...existingSections, { sectionTitle, itemOrder: itemHrefs }];
    }

    const newOrder: SidebarOrder = {
      sectionOrder: order?.sectionOrder || [],
      sections: newSections,
    };
    saveOrder(newOrder);
  }, [order, saveOrder]);

  const resetOrder = useCallback(async () => {
    if (!user?.id) return;
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setOrder(null);

    // Also clear from database
    await supabase
      .from('user_preferences')
      .update({ sidebar_order: null })
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['user-preferences', user.id] });
  }, [user?.id, queryClient]);

  const getSectionItemOrder = useCallback((sectionTitle: string): string[] | null => {
    const section = order?.sections.find(s => s.sectionTitle === sectionTitle);
    return section?.itemOrder || null;
  }, [order]);

  return {
    order,
    updateSectionOrder,
    updateItemOrder,
    resetOrder,
    getSectionItemOrder,
    hasCustomOrder: order !== null,
    isLoaded,
  };
}
