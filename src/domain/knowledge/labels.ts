import type { ApprovalStatus, ExecutionStatus, KnowledgeKind, VerificationStatus } from './types';

export const KIND_LABELS: Record<KnowledgeKind, string> = {
  adr: 'القرارات المعمارية',
  governance: 'الحوكمة وسجلات التنفيذ',
  risk: 'المخاطر',
  architecture: 'المعمارية',
  contract: 'العقود',
};

export const KNOWLEDGE_KINDS: KnowledgeKind[] = ['adr', 'governance', 'risk', 'architecture', 'contract'];

export const EXECUTION_LABELS: Record<ExecutionStatus, string> = {
  not_started: 'لم يبدأ', in_progress: 'قيد التنفيذ', executed: 'نُفّذ', unknown: 'غير معروف',
};
export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: 'غير متحقق', verified: 'متحقق', failed: 'فشل التحقق', unknown: 'غير معروف',
};
export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: 'بانتظار الاعتماد', accepted: 'معتمد (مُسجّل في المصدر)', rejected: 'مرفوض', superseded: 'مُستبدل', unknown: 'غير معروف',
};

export function isKnowledgeKind(v: string): v is KnowledgeKind {
  return (KNOWLEDGE_KINDS as string[]).includes(v);
}
