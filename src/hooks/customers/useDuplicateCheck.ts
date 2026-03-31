import { useQuery } from "@tanstack/react-query";
import { customerSearchRepo } from "@/lib/repositories/customerSearchRepo";
import { useDebounce } from "@/hooks/useDebounce";

export function useDuplicateCheck(name: string, phone: string, editingId?: string) {
  const debouncedName = useDebounce(name?.trim() || '', 500);
  const debouncedPhone = useDebounce(phone?.trim() || '', 500);

  const { data: duplicates } = useQuery({
    queryKey: ['duplicate-check', debouncedName, debouncedPhone, editingId],
    queryFn: () => customerSearchRepo.findDuplicates(
      debouncedName.length >= 3 ? debouncedName : undefined,
      debouncedPhone.length >= 6 ? debouncedPhone : undefined,
      editingId
    ),
    enabled: debouncedName.length >= 3 || debouncedPhone.length >= 6,
    staleTime: 30000,
  });

  return {
    nameDuplicates: duplicates?.nameDuplicates || [],
    phoneDuplicates: duplicates?.phoneDuplicates || [],
  };
}
