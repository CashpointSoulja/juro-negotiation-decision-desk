import { CONTRACTS } from './fixtures';
import { PLAYBOOKS } from './playbooks';
import type { Evaluation, Severity } from './types';

export type DecisionAction = 'accepted' | 'auto_accepted' | 'rejected';
export interface Decision {
  action: DecisionAction;
  note: string;
  playbookId: string;
  playbookVersion: string;
  ruleIds: string[];
  severity: Severity;
  at: string;
}
export type AuditAction = DecisionAction | 'edited' | 'edit_reverted' | 'playbook_changed' | 'contract_changed' | 'reset' | 'exported_memo' | 'exported_eval';
export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  action: AuditAction;
  contractId: string;
  clauseId?: string;
  playbookId: string;
  ruleIds: string[];
  severity?: Severity;
  detail: string;
}
export interface DeskState {
  contractId: string;
  playbookId: string;
  edits: Record<string, string>;
  decisions: Record<string, Decision>;
  audit: AuditEntry[];
}

export const ACTOR = 'Reviewer (you)';
export const initialState = (): DeskState => ({ contractId: 'larkspur', playbookId: 'fernbrook', edits: {}, decisions: {}, audit: [] });
export const clauseKey = (contractId: string, clauseId: string) => `${contractId}:${clauseId}`;

export type DeskEvent =
  | { type: 'select_contract'; contractId: string }
  | { type: 'select_playbook'; playbookId: string }
  | { type: 'decide'; clauseId: string; action: DecisionAction; note: string; evaluation: Evaluation; playbookVersion: string }
  | { type: 'edit'; clauseId: string; text: string; before: Evaluation; after: Evaluation }
  | { type: 'revert_edit'; clauseId: string }
  | { type: 'exported'; what: 'memo' | 'eval' }
  | { type: 'reset' };

export class DecisionError extends Error {}

/** Validates a decision before it is applied; throws DecisionError with a reviewer-facing message. */
export function validateDecision(action: DecisionAction, note: string, ev: Evaluation): void {
  if (action === 'auto_accepted' && !ev.autoAcceptEligible) throw new DecisionError('Auto-accept is only available when the clause is within playbook.');
  if (action === 'accepted' && ev.severity !== 'within' && note.trim().length < 5)
    throw new DecisionError(`Accepting a clause marked "${ev.severity}" needs a note (approval reference or override reason).`);
}

export function reduce(state: DeskState, e: DeskEvent, now: string): DeskState {
  const log = (s: DeskState, entry: Omit<AuditEntry, 'id' | 'at' | 'actor' | 'contractId' | 'playbookId'> & Partial<AuditEntry>): DeskState => ({
    ...s,
    audit: [...s.audit, { id: s.audit.length + 1, at: now, actor: ACTOR, contractId: s.contractId, playbookId: s.playbookId, ...entry }],
  });
  switch (e.type) {
    case 'select_contract':
      if (e.contractId === state.contractId) return state;
      return log({ ...state, contractId: e.contractId }, { action: 'contract_changed', ruleIds: [], detail: `Opened contract ${e.contractId}.` });
    case 'select_playbook':
      if (e.playbookId === state.playbookId) return state;
      return log({ ...state, playbookId: e.playbookId }, { action: 'playbook_changed', ruleIds: [], detail: `Switched playbook from ${state.playbookId} to ${e.playbookId}. Earlier decisions are marked stale.` });
    case 'decide': {
      validateDecision(e.action, e.note, e.evaluation);
      const ruleIds = e.evaluation.citations.map((r) => r.id);
      const d: Decision = { action: e.action, note: e.note.trim(), playbookId: state.playbookId, playbookVersion: e.playbookVersion, ruleIds, severity: e.evaluation.severity, at: now };
      const s = { ...state, decisions: { ...state.decisions, [clauseKey(state.contractId, e.clauseId)]: d } };
      const override = e.action === 'accepted' && e.evaluation.severity !== 'within' ? ` Human accepted against a "${e.evaluation.severity}" recommendation.` : '';
      return log(s, { action: e.action, clauseId: e.clauseId, ruleIds, severity: e.evaluation.severity, detail: `${e.action.replace('_', '-')}.${override}${d.note ? ` Note: ${d.note}` : ''}` });
    }
    case 'edit': {
      const key = clauseKey(state.contractId, e.clauseId);
      const decisions = { ...state.decisions };
      delete decisions[key];
      const s = { ...state, edits: { ...state.edits, [key]: e.text }, decisions };
      return log(s, { action: 'edited', clauseId: e.clauseId, ruleIds: e.after.citations.map((r) => r.id), severity: e.after.severity, detail: `Edited proposed wording. Re-evaluated: ${e.before.severity} → ${e.after.severity}. Any prior decision was cleared.` });
    }
    case 'revert_edit': {
      const key = clauseKey(state.contractId, e.clauseId);
      const edits = { ...state.edits };
      delete edits[key];
      const decisions = { ...state.decisions };
      delete decisions[key];
      return log({ ...state, edits, decisions }, { action: 'edit_reverted', clauseId: e.clauseId, ruleIds: [], detail: 'Reverted to the counterparty wording.' });
    }
    case 'exported':
      return log(state, { action: e.what === 'memo' ? 'exported_memo' : 'exported_eval', ruleIds: [], detail: `Downloaded ${e.what === 'memo' ? 'review memo' : 'eval report'}.` });
    case 'reset':
      return log(initialState(), { action: 'reset', ruleIds: [], detail: 'Reset the workspace to seeded data.' , contractId: 'larkspur', playbookId: 'fernbrook' });
  }
}

export const STORAGE_KEY = 'juro-ndd-state-v1';

const SEVERITIES = ['within', 'deviation', 'escalate', 'blocked'];
const DECISION_ACTIONS = ['accepted', 'auto_accepted', 'rejected'];
const AUDIT_ACTIONS = [...DECISION_ACTIONS, 'edited', 'edit_reverted', 'playbook_changed', 'contract_changed', 'reset', 'exported_memo', 'exported_eval'];
const MAX_EDIT_LENGTH = 5000;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isStrArr = (x: unknown) => Array.isArray(x) && x.every(isStr);
const validKey = (k: string) => CONTRACTS.some((c) => c.clauses.some((cl) => clauseKey(c.id, cl.id) === k));
const validPlaybook = (x: unknown) => PLAYBOOKS.some((p) => p.id === x);
const validContract = (x: unknown) => CONTRACTS.some((c) => c.id === x);

function validDecision(d: unknown): boolean {
  return isObj(d) && DECISION_ACTIONS.includes(d.action as string) && isStr(d.note) && validPlaybook(d.playbookId)
    && isStr(d.playbookVersion) && isStrArr(d.ruleIds) && SEVERITIES.includes(d.severity as string) && isStr(d.at);
}
function validAudit(a: unknown): boolean {
  return isObj(a) && typeof a.id === 'number' && isStr(a.at) && isStr(a.actor) && AUDIT_ACTIONS.includes(a.action as string)
    && isStr(a.contractId) && isStr(a.playbookId) && isStrArr(a.ruleIds) && isStr(a.detail)
    && (a.clauseId === undefined || isStr(a.clauseId)) && (a.severity === undefined || SEVERITIES.includes(a.severity as string));
}

/** Strict shape check. Any unknown contract, playbook, clause key or malformed field fails the whole state. */
export function isValidState(s: unknown): s is DeskState {
  if (!isObj(s) || !validContract(s.contractId) || !validPlaybook(s.playbookId)) return false;
  if (!isObj(s.edits) || !Object.entries(s.edits).every(([k, v]) => validKey(k) && isStr(v) && v.length <= MAX_EDIT_LENGTH)) return false;
  if (!isObj(s.decisions) || !Object.entries(s.decisions).every(([k, v]) => validKey(k) && validDecision(v))) return false;
  return Array.isArray(s.audit) && s.audit.every(validAudit);
}

export interface LoadResult { state: DeskState; discarded: boolean }
/** Fails closed: anything that is not a fully valid saved state is discarded and the seeded state is used. */
export function loadWithStatus(raw: string | null): LoadResult {
  if (!raw) return { state: initialState(), discarded: false };
  try {
    const s: unknown = JSON.parse(raw);
    if (isValidState(s)) return { state: s, discarded: false };
  } catch { /* fall through */ }
  return { state: initialState(), discarded: true };
}
export const load = (raw: string | null): DeskState => loadWithStatus(raw).state;

export type DecisionStatus = 'none' | 'current' | 'stale_playbook' | 'stale_result';
/** A decision only counts if it was made under this playbook against the same result the rules give now. */
export function decisionStatus(d: Decision | undefined, ev: Evaluation): DecisionStatus {
  if (!d) return 'none';
  if (d.playbookId !== ev.playbookId) return 'stale_playbook';
  const sameRules = d.ruleIds.join(',') === ev.citations.map((r) => r.id).join(',');
  if (d.severity !== ev.severity || !sameRules || (d.action === 'auto_accepted' && !ev.autoAcceptEligible)) return 'stale_result';
  return 'current';
}
