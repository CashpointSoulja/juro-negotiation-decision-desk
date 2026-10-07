export type ClauseType = 'liability_cap' | 'indemnity' | 'renewal_notice' | 'jurisdiction';
export type Severity = 'within' | 'deviation' | 'escalate' | 'blocked';
export type EngineVersion = 'v1-baseline' | 'v2-current';
export type BlockReason = 'missing_rule' | 'conflicting_rules' | 'unparsed';

export interface LiabilityTerms { kind: 'liability_cap'; preferredMax: number; acceptableMax: number }
export interface IndemnityTerms {
  kind: 'indemnity';
  requireMutual: boolean;
  uncapped: 'never' | 'ip_with_approval' | 'data_with_approval';
  appliesTo?: 'data';
}
export interface RenewalTerms {
  kind: 'renewal_notice';
  preferredMinNoticeDays: number;
  acceptableMinNoticeDays: number;
  maxRenewalMonths: number;
}
export interface JurisdictionTerms { kind: 'jurisdiction'; preferred: string[]; acceptable: string[] }
export type RuleTerms = LiabilityTerms | IndemnityTerms | RenewalTerms | JurisdictionTerms;

export interface PlaybookRule {
  id: string;
  version: string;
  clause: ClauseType;
  title: string;
  guidance: string;
  acceptableDeviation: string;
  approver: string;
  standardClause: string;
  terms: RuleTerms;
}

export interface Playbook {
  id: string;
  name: string;
  owner: string;
  version: string;
  stance: string;
  summary: string;
  rules: PlaybookRule[];
}

export interface Span { start: number; end: number; label: string }

export interface Extraction {
  ok: boolean;
  values: Record<string, string | number | boolean>;
  spans: Span[];
  notes: string[];
}

export interface TraceStep { text: string; ruleId?: string; outcome?: Severity }

export interface Evaluation {
  clause: ClauseType;
  playbookId: string;
  engine: EngineVersion;
  severity: Severity;
  recommendation: string;
  autoAcceptEligible: boolean;
  blockReason?: BlockReason;
  citations: PlaybookRule[];
  approver?: string;
  trace: TraceStep[];
  extraction: Extraction;
}

export interface ContractClause { id: string; clause: ClauseType; heading: string; proposed: string }
export interface Contract { id: string; name: string; counterparty: string; summary: string; clauses: ContractClause[] }

export interface EvalFixture {
  id: string;
  clause: ClauseType;
  playbookId: string;
  text: string;
  expected: Severity;
  rationale: string;
}

export const CLAUSE_LABELS: Record<ClauseType, string> = {
  liability_cap: 'Liability cap',
  indemnity: 'Indemnity',
  renewal_notice: 'Renewal & notice',
  jurisdiction: 'Governing law',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  within: 'Within playbook',
  deviation: 'Acceptable deviation',
  escalate: 'Escalate',
  blocked: 'Blocked: human review',
};
