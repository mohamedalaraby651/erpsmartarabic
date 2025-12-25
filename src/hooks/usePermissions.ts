import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Permission {
  section: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface FieldPermission {
  section: string;
  field_name: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface RoleLimits {
  max_discount_percentage: number;
  max_credit_limit: number;
  max_invoice_amount: number;
}

export function usePermissions() {
  const { user, userRole } = useAuth();

  const { data: customRole } = useQuery({
    queryKey: ['user-custom-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await supabase
        .from('user_roles')
        .select('custom_role_id, custom_roles(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return data?.custom_roles || null;
    },
    enabled: !!user?.id,
  });

  const { data: sectionPermissions } = useQuery({
    queryKey: ['section-permissions', customRole?.id],
    queryFn: async () => {
      if (!customRole?.id) return [];
      
      const { data } = await supabase
        .from('role_section_permissions')
        .select('*')
        .eq('role_id', customRole.id);
      
      return data || [];
    },
    enabled: !!customRole?.id,
  });

  const { data: fieldPermissions } = useQuery({
    queryKey: ['field-permissions', customRole?.id],
    queryFn: async () => {
      if (!customRole?.id) return [];
      
      const { data } = await supabase
        .from('role_field_permissions')
        .select('*')
        .eq('role_id', customRole.id);
      
      return data || [];
    },
    enabled: !!customRole?.id,
  });

  const { data: roleLimits } = useQuery({
    queryKey: ['role-limits', customRole?.id],
    queryFn: async () => {
      if (!customRole?.id) return null;
      
      const { data } = await supabase
        .from('role_limits')
        .select('*')
        .eq('role_id', customRole.id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!customRole?.id,
  });

  // Admin has all permissions
  const isAdmin = userRole === 'admin';

  const hasPermission = (section: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (isAdmin) return true;
    
    const permission = sectionPermissions?.find(p => p.section === section);
    if (!permission) return false;
    
    switch (action) {
      case 'view': return permission.can_view;
      case 'create': return permission.can_create;
      case 'edit': return permission.can_edit;
      case 'delete': return permission.can_delete;
      default: return false;
    }
  };

  const canViewField = (section: string, fieldName: string): boolean => {
    if (isAdmin) return true;
    
    const permission = fieldPermissions?.find(
      p => p.section === section && p.field_name === fieldName
    );
    
    // Default to visible if no specific permission set
    return permission?.can_view ?? true;
  };

  const canEditField = (section: string, fieldName: string): boolean => {
    if (isAdmin) return true;
    
    const permission = fieldPermissions?.find(
      p => p.section === section && p.field_name === fieldName
    );
    
    return permission?.can_edit ?? true;
  };

  const checkLimit = (type: 'discount' | 'credit' | 'invoice', value: number): boolean => {
    if (isAdmin) return true;
    if (!roleLimits) return true;

    switch (type) {
      case 'discount':
        return value <= (roleLimits.max_discount_percentage || 100);
      case 'credit':
        return value <= (roleLimits.max_credit_limit || 999999999);
      case 'invoice':
        return value <= (roleLimits.max_invoice_amount || 999999999);
      default:
        return true;
    }
  };

  return {
    isAdmin,
    customRole,
    sectionPermissions,
    fieldPermissions,
    roleLimits,
    hasPermission,
    canViewField,
    canEditField,
    checkLimit,
  };
}
