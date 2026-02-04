import { supabase } from '@/integrations/supabase/client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, unknown>;
  subscription_tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  is_default: boolean;
  joined_at: string;
  tenant?: Tenant;
}

// Cache for current tenant
let currentTenantCache: Tenant | null = null;
let currentTenantId: string | null = null;

/**
 * Get the current tenant ID from the database
 */
export async function getCurrentTenantId(): Promise<string | null> {
  if (currentTenantId) {
    return currentTenantId;
  }

  const { data, error } = await supabase.rpc('get_current_tenant');
  
  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error getting current tenant:', error);
    }
    return null;
  }

  currentTenantId = data;
  return data;
}

/**
 * Get the current tenant details
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  if (currentTenantCache) {
    return currentTenantCache;
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return null;
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching tenant:', error);
    }
    return null;
  }

  currentTenantCache = data as Tenant;
  return currentTenantCache;
}

/**
 * Get all tenants the current user belongs to
 */
export async function getUserTenants(): Promise<UserTenant[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_tenants')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('user_id', user.id);

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching user tenants:', error);
    }
    return [];
  }

  return data as UserTenant[];
}

/**
 * Switch to a different tenant
 */
export async function switchTenant(tenantId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  // First, set all user's tenants to non-default
  const { error: resetError } = await supabase
    .from('user_tenants')
    .update({ is_default: false })
    .eq('user_id', user.id);

  if (resetError) {
    if (import.meta.env.DEV) {
      console.error('Error resetting default tenant:', resetError);
    }
    return false;
  }

  // Set the new tenant as default
  const { error: setError } = await supabase
    .from('user_tenants')
    .update({ is_default: true })
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId);

  if (setError) {
    if (import.meta.env.DEV) {
      console.error('Error setting default tenant:', setError);
    }
    return false;
  }

  // Clear cache
  clearTenantCache();

  return true;
}

/**
 * Clear the tenant cache (call on logout or tenant switch)
 */
export function clearTenantCache(): void {
  currentTenantCache = null;
  currentTenantId = null;
}

/**
 * Create a new tenant
 */
export async function createTenant(
  name: string,
  slug: string,
  domain?: string
): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name,
      slug,
      domain: domain || null,
    })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error creating tenant:', error);
    }
    return null;
  }

  return data as Tenant;
}

/**
 * Add a user to a tenant
 */
export async function addUserToTenant(
  userId: string,
  tenantId: string,
  role: string = 'member',
  isDefault: boolean = false
): Promise<boolean> {
  const { error } = await supabase
    .from('user_tenants')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      role,
      is_default: isDefault,
    });

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error adding user to tenant:', error);
    }
    return false;
  }

  return true;
}

/**
 * Check if user belongs to a specific tenant
 */
export async function isUserInTenant(tenantId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_tenant_member', {
    _user_id: (await supabase.auth.getUser()).data.user?.id,
    _tenant_id: tenantId,
  });

  if (error) {
    return false;
  }

  return data as boolean;
}
