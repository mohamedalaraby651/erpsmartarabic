/**
 * Nazra Knowledge OS — Phase 1 domain types (read-only, repo-sourced).
 * The three status axes are independent; none is derived from another.
 */
export type KnowledgeKind = 'adr' | 'governance' | 'risk' | 'architecture' | 'contract';

export type KnowledgeOrigin = 'repo' | 'local-draft' | 'demo';

export type ExecutionStatus = 'not_started' | 'in_progress' | 'executed' | 'unknown';
export type VerificationStatus = 'unverified' | 'verified' | 'failed' | 'unknown';
export type ApprovalStatus = 'pending' | 'accepted' | 'rejected' | 'superseded' | 'unknown';

export interface KnowledgeSourceFile {
  /** Repo-relative path, e.g. "docs/adr/0031-enterprise-boundary-contract.md". */
  path: string;
  content: string;
}

export interface KnowledgeStatus {
  execution: ExecutionStatus;
  verification: VerificationStatus;
  approval: ApprovalStatus;
  /** Raw status text exactly as written in the source, or null when absent. */
  raw: string | null;
}

export interface KnowledgeRecord {
  id: string;
  kind: KnowledgeKind;
  title: string;
  path: string;
  origin: KnowledgeOrigin;
  date: string | null;
  area: string | null;
  status: KnowledgeStatus;
  /** Ids referenced by this record (ADR-xxxx, RISK-xxx, [[id]]). */
  references: string[];
  /** Repo-relative paths of linked .md files. */
  fileLinks: string[];
  body: string;
  /** Evidence paths mentioned in the body. `exists` is null until resolved by the index. */
  evidence: EvidenceRef[];
}

export type EvidenceKind = 'audit_output' | 'execution_record' | 'test' | 'report';

export interface EvidenceRef {
  path: string;
  kind: EvidenceKind;
  /** true = file present in repo, false = mentioned but missing, null = not resolved. */
  exists: boolean | null;
}

export type IntegritySeverity = 'error' | 'warning';

export interface IntegrityIssue {
  type: 'duplicate_id' | 'broken_file_link' | 'unresolved_reference' | 'index_drift' | 'unparsed_status'
    | 'executed_without_evidence' | 'superseded_without_successor';
  severity: IntegritySeverity;
  recordId: string | null;
  path: string | null;
  detail: string;
}

export interface KnowledgeIndex {
  records: KnowledgeRecord[];
  issues: IntegrityIssue[];
}
