import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
  const [order, setOrder] = useState<SidebarOrder | null>(null);

  // Load order from localStorage
  useEffect(() => {
    if (!user?.id) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        setOrder(JSON.parse(stored));
      } catch {
        setOrder(null);
      }
    }
  }, [user?.id]);

  // Save order to localStorage
  const saveOrder = useCallback((newOrder: SidebarOrder) => {
    if (!user?.id) return;
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newOrder));
    setOrder(newOrder);
  }, [user?.id]);

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

  const resetOrder = useCallback(() => {
    if (!user?.id) return;
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setOrder(null);
  }, [user?.id]);

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
  };
}
