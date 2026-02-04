import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ApprovalChain {
  id: string;
  tenant_id: string | null;
  entity_type: string;
  amount_threshold: number;
  required_approvers: number;
  approver_roles: string[];
  escalation_hours: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: string;
  tenant_id: string | null;
  entity_type: string;
  entity_id: string;
  chain_id: string | null;
  current_level: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  approved_by: string[];
  rejection_reason: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseApprovalChainReturn {
  // Data
  chains: ApprovalChain[];
  isLoadingChains: boolean;
  
  // Helpers
  needsApproval: (entityType: string, amount: number) => Promise<boolean>;
  getApplicableChain: (entityType: string, amount: number) => ApprovalChain | undefined;
  
  // Actions
  createApprovalRequest: (entityType: string, entityId: string, amount: number) => Promise<ApprovalRecord | null>;
  approveRequest: (recordId: string) => Promise<boolean>;
  rejectRequest: (recordId: string, reason: string) => Promise<boolean>;
  
  // Record queries
  getPendingApprovals: () => Promise<ApprovalRecord[]>;
}

export function useApprovalChain(): UseApprovalChainReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch approval chains using raw query since types aren't generated yet
  const { data: chains = [], isLoading: isLoadingChains } = useQuery({
    queryKey: ['approval-chains'],
    queryFn: async () => {
      // Use raw SQL query via RPC or direct fetch
      const { data, error } = await supabase
        .from('approval_chains' as never)
        .select('*')
        .eq('is_active', true)
        .order('amount_threshold', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ApprovalChain[];
    },
    enabled: !!user,
  });

  // Check if an entity needs approval using RPC
  const needsApproval = async (entityType: string, amount: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('needs_approval', {
        _entity_type: entityType,
        _amount: amount,
      });
      if (error) return false;
      return data as boolean;
    } catch {
      return false;
    }
  };

  // Get the applicable chain for an entity (from local cache)
  const getApplicableChain = (entityType: string, amount: number): ApprovalChain | undefined => {
    return chains.find(
      (chain) =>
        chain.entity_type === entityType &&
        chain.is_active &&
        amount >= chain.amount_threshold
    );
  };

  // Create an approval request
  const createApprovalRequest = async (
    entityType: string,
    entityId: string,
    amount: number
  ): Promise<ApprovalRecord | null> => {
    const chain = getApplicableChain(entityType, amount);
    if (!chain) return null;

    const { data, error } = await supabase
      .from('approval_records' as never)
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        chain_id: chain.id,
        status: 'pending',
      } as never)
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating approval request:', error);
      }
      toast.error('حدث خطأ أثناء إنشاء طلب الموافقة');
      return null;
    }

    toast.success('تم إرسال طلب الموافقة');
    return data as unknown as ApprovalRecord;
  };

  // Approve a request
  const approveRequestMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const { data: record, error: fetchError } = await supabase
        .from('approval_records' as never)
        .select('*, chain:approval_chains(*)')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      type RecordWithChain = ApprovalRecord & { chain: ApprovalChain };
      const approvalRecord = record as unknown as RecordWithChain;
      const newApprovedBy = [...(approvalRecord.approved_by || []), user?.id];
      
      // Check if we have enough approvers
      const requiredApprovers = approvalRecord.chain?.required_approvers || 1;
      const newStatus = newApprovedBy.length >= requiredApprovers ? 'approved' : 'pending';

      const { error } = await supabase
        .from('approval_records' as never)
        .update({
          approved_by: newApprovedBy,
          status: newStatus,
          current_level: approvalRecord.current_level + 1,
        } as never)
        .eq('id', recordId);

      if (error) throw error;

      return newStatus === 'approved';
    },
    onSuccess: (fullyApproved) => {
      queryClient.invalidateQueries({ queryKey: ['approval-records'] });
      toast.success(fullyApproved ? 'تمت الموافقة بنجاح' : 'تم تسجيل موافقتك');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الموافقة');
    },
  });

  // Reject a request
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      const { error } = await supabase
        .from('approval_records' as never)
        .update({
          status: 'rejected',
          rejection_reason: reason,
        } as never)
        .eq('id', recordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-records'] });
      toast.success('تم رفض الطلب');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الرفض');
    },
  });

  // Get pending approvals for current user
  const getPendingApprovals = async (): Promise<ApprovalRecord[]> => {
    const { data, error } = await supabase
      .from('approval_records' as never)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching pending approvals:', error);
      }
      return [];
    }

    return (data || []) as unknown as ApprovalRecord[];
  };

  return {
    chains,
    isLoadingChains,
    needsApproval,
    getApplicableChain,
    createApprovalRequest,
    approveRequest: (recordId: string) => approveRequestMutation.mutateAsync(recordId),
    rejectRequest: (recordId: string, reason: string) =>
      rejectRequestMutation.mutateAsync({ recordId, reason }).then(() => true),
    getPendingApprovals,
  };
}

export default useApprovalChain;
