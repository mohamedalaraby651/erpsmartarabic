import type { ColumnFilters } from '@/components/ui/column-filter';
import { applyColumnFilters } from '@/lib/filters/applyColumnFilters';

export const CUSTOMER_FILTER_COLUMNS: Record<string, string> = {
  name: 'name',
  type: 'customer_type',
  vip: 'vip_level',
  phone: 'phone',
  governorate: 'governorate',
  balance: 'current_balance',
  last_activity: 'last_activity_at',
  status: 'is_active',
  email: 'email',
  tax_number: 'tax_number',
  contact_person: 'contact_person',
  credit_limit: 'credit_limit',
  purchases: 'total_purchases_cached',
  created_at: 'created_at',
};

export function applyCustomerColumnFilters<Q>(query: Q, filters: ColumnFilters): Q {
  return applyColumnFilters(query, filters, CUSTOMER_FILTER_COLUMNS);
}