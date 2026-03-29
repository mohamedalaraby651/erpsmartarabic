import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface DuplicateResult {
  id: string;
  name: string;
  phone: string | null;
}

export function useDuplicateCheck(name: string, phone: string, editingId?: string) {
  const debouncedName = useDebounce(name?.trim() || '', 500);
  const debouncedPhone = useDebounce(phone?.trim() || '', 500);

  const { data: nameDuplicates = [] } = useQuery({
    queryKey: ['duplicate-check-name', debouncedName, editingId],
    queryFn: async () => {
      if (!debouncedName || debouncedName.length < 3) return [];
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .ilike('name', `%${debouncedName}%`)
        .limit(3);
      if (editingId) query = query.neq('id', editingId);
      const { data } = await query;
      return (data || []) as DuplicateResult[];
    },
    enabled: debouncedName.length >= 3,
    staleTime: 30000,
  });

  const { data: phoneDuplicates = [] } = useQuery({
    queryKey: ['duplicate-check-phone', debouncedPhone, editingId],
    queryFn: async () => {
      if (!debouncedPhone || debouncedPhone.length < 6) return [];
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .eq('phone', debouncedPhone)
        .limit(3);
      if (editingId) query = query.neq('id', editingId);
      const { data } = await query;
      return (data || []) as DuplicateResult[];
    },
    enabled: debouncedPhone.length >= 6,
    staleTime: 30000,
  });

  return { nameDuplicates, phoneDuplicates };
}
