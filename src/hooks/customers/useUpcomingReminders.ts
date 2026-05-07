import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the count of customer reminders scheduled within the next `days`
 * window (default 7) and not yet completed. Used for QuickSuggestions and
 * IconStrip badges on the customer detail page.
 */
export function useUpcomingReminders(customerId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: ['customer-upcoming-reminders', customerId, days],
    queryFn: async (): Promise<number> => {
      if (!customerId) return 0;
      const now = new Date();
      const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const { count, error } = await supabase
        .from('customer_reminders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('is_completed', false)
        .gte('reminder_date', now.toISOString())
        .lte('reminder_date', horizon.toISOString());
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!customerId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
