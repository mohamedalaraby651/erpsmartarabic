import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentTenant,
  getCurrentTenantId,
  getUserTenants,
  switchTenant,
  clearTenantCache,
  type Tenant,
  type UserTenant,
} from '@/lib/tenantContext';
import { useAuth } from './useAuth';

export interface UseTenantReturn {
  // Current tenant
  tenant: Tenant | null;
  tenantId: string | null;
  isLoading: boolean;
  error: Error | null;
  
  // All user's tenants
  userTenants: UserTenant[];
  isLoadingTenants: boolean;
  
  // Actions
  switchToTenant: (tenantId: string) => Promise<boolean>;
  refreshTenant: () => void;
  
  // Helpers
  hasManyTenants: boolean;
  currentTenantName: string;
}

export function useTenant(): UseTenantReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current tenant
  const {
    data: tenant,
    isLoading: isLoadingTenant,
    error: tenantError,
    refetch: refetchTenant,
  } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: getCurrentTenant,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch current tenant ID
  const { data: tenantId } = useQuery({
    queryKey: ['current-tenant-id'],
    queryFn: getCurrentTenantId,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all user's tenants
  const {
    data: userTenants = [],
    isLoading: isLoadingTenants,
  } = useQuery({
    queryKey: ['user-tenants'],
    queryFn: getUserTenants,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Switch tenant mutation
  const switchTenantMutation = useMutation({
    mutationFn: switchTenant,
    onSuccess: () => {
      // Invalidate all tenant-related queries
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      queryClient.invalidateQueries({ queryKey: ['current-tenant-id'] });
      
      // Invalidate all data queries as they're tenant-scoped
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
    },
  });

  // Clear cache on logout
  useEffect(() => {
    if (!user) {
      clearTenantCache();
    }
  }, [user]);

  const switchToTenant = useCallback(async (newTenantId: string): Promise<boolean> => {
    const result = await switchTenantMutation.mutateAsync(newTenantId);
    return result;
  }, [switchTenantMutation]);

  const refreshTenant = useCallback(() => {
    clearTenantCache();
    refetchTenant();
  }, [refetchTenant]);

  return {
    tenant: tenant || null,
    tenantId: tenantId || null,
    isLoading: isLoadingTenant,
    error: tenantError as Error | null,
    userTenants,
    isLoadingTenants,
    switchToTenant,
    refreshTenant,
    hasManyTenants: userTenants.length > 1,
    currentTenantName: tenant?.name || '',
  };
}

export default useTenant;
