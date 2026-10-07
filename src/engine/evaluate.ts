import { extract } from './extract';
import { getPlaybook } from './playbooks';
import type { ClauseType, EngineVersion, Evaluation, Extraction, PlaybookRule, Severity, TraceStep } from './types';

const RANK: Record<Severity, number> = { within: 0, deviation: 1, escalate: 2, blocked: 3 };
const worst = (a: Severity, b: Severity): Severity => (RANK[a] >= RANK[b] ? a : b);

interface Assessment { severity: Severity; steps: TraceStep[] }

export function assess(rule: PlaybookRule, ex: Extraction): Assessment {
  const t = rule.terms;
  const steps: TraceStep[] = [];
  const v = ex.values;
  const step = (text: string, outcome: Severity) => { steps.push({ text, ruleId: rule.id, outcome }); return outcome; };
  let sev: Severity = 'within';

  if (t.kind === 'liability_cap') {
    if (v.uncapped) sev = step('Liability is uncapped; the playbook never allows that.', 'escalate');
    else {
      const m = v.multiple as number;
      if (m <= t.preferredMax) sev = step(`Cap ${m}x is within the preferred ≤${t.preferredMax}x.`, 'within');
      else if (m <= t.acceptableMax) sev = step(`Cap ${m}x is above the preferred ${t.preferredMax}x but within the acceptable ≤${t.acceptableMax}x.`, 'deviation');
      else sev = step(`Cap ${m}x exceeds the acceptable maximum of ${t.acceptableMax}x.`, 'escalate');
    }
  } else if (t.kind === 'indemnity') {
    if (t.requireMutual && !v.mutual) sev = worst(sev, step('Indemnity is one-way; the playbook requires mutual indemnities.', 'escalate'));
    if (v.uncapped) {
      const ipOnly = v.ipScope && !v.dataScope;
      if (t.uncapped === 'ip_with_approval' && ipOnly) sev = worst(sev, step('Uncapped IP indemnity: allowed with approval.', 'deviation'));
      else if (t.uncapped === 'data_with_approval' && v.dataScope) sev = worst(sev, step('Uncapped data-protection indemnity: allowed with approval under the data addendum.', 'deviation'));
      else sev = worst(sev, step(`Indemnity sits outside the cap, and this rule does not allow that for ${v.dataScope ? 'data-protection' : 'this'} scope.`, 'escalate'));
    }
    if (sev === 'within') step('Indemnity is mutual where required and sits inside the cap.', 'within');
  } else if (t.kind === 'renewal_notice') {
    const d = v.noticeDays as number;
    if (d >= t.preferredMinNoticeDays) sev = step(`Notice of ${d} days meets the preferred ≥${t.preferredMinNoticeDays} days.`, 'within');
    else if (d >= t.acceptableMinNoticeDays) sev = step(`Notice of ${d} days is below the preferred ${t.preferredMinNoticeDays} days but within the acceptable ≥${t.acceptableMinNoticeDays} days.`, 'deviation');
    else sev = step(`Notice of ${d} days is below the acceptable minimum of ${t.acceptableMinNoticeDays} days.`, 'escalate');
    if (!v.autoRenew) sev = worst(sev, step('Clause removes auto-renewal.', 'deviation'));
    if (typeof v.renewalMonths === 'number' && v.renewalMonths > t.maxRenewalMonths)
      sev = worst(sev, step(`Renewal term of ${v.renewalMonths} months exceeds ${t.maxRenewalMonths} months.`, 'deviation'));
  } else {
    const law = v.law as string;
    if (t.preferred.includes(law)) sev = step(`${law} law is preferred.`, 'within');
    else if (t.acceptable.includes(law)) sev = step(`${law} law is an acceptable alternative.`, 'deviation');
    else sev = step(`${law} law is not on the preferred or acceptable list.`, 'escalate');
  }
  return { severity: sev, steps };
}

function recommendation(sev: Severity, approver?: string, reason?: string): string {
  switch (sev) {
    case 'within': return 'Accept. The proposed wording is within the playbook.';
    case 'deviation': return `Accept only with approval from ${approver}. The wording is an acceptable deviation.`;
    case 'escalate': return `Do not accept as drafted. Counter with the standard clause and escalate to ${approver}.`;
    default: return `Abstain: ${reason}. A reviewer must decide, and auto-accept is disabled.`;
  }
}

const BLOCK_TEXT = {
  missing_rule: 'this playbook has no rule for this clause type',
  conflicting_rules: 'two playbook rules give different answers',
  unparsed: 'the rules could not read the key term from the wording',
} as const;

export function evaluateClause(clause: ClauseType, text: string, playbookId: string, engine: EngineVersion = 'v2-current'): Evaluation {
  const playbook = getPlaybook(playbookId);
  const rules = playbook.rules.filter((r) => r.clause === clause);
  const extraction = extract(clause, text, engine);
  const base = { clause, playbookId, engine, extraction };
  const trace: TraceStep[] = extraction.notes.map((text) => ({ text }));

  const blocked = (reason: keyof typeof BLOCK_TEXT, citations: PlaybookRule[], extra: TraceStep[] = []): Evaluation => ({
    ...base, severity: 'blocked', blockReason: reason, citations, autoAcceptEligible: false,
    recommendation: recommendation('blocked', undefined, BLOCK_TEXT[reason]),
    trace: [...trace, ...extra, { text: `Blocked: ${BLOCK_TEXT[reason]}.`, outcome: 'blocked' }],
  });
  const pass = (citations: PlaybookRule[], note: string): Evaluation => ({
    ...base, severity: 'within', citations, autoAcceptEligible: true,
    recommendation: recommendation('within'), trace: [...trace, { text: note, outcome: 'within' }],
  });

  if (rules.length === 0) {
    return engine === 'v2-current' ? blocked('missing_rule', []) : pass([], 'Baseline: no rule found, treated as no objection.');
  }
  if (!extraction.ok) {
    return engine === 'v2-current' ? blocked('unparsed', rules) : pass(rules, 'Baseline: term not read, treated as no objection.');
  }
  const applicable = rules.filter((r) => r.terms.kind !== 'indemnity' || !r.terms.appliesTo || (r.terms.appliesTo === 'data' && extraction.values.dataScope));
  const results = applicable.map((r) => ({ rule: r, ...assess(r, extraction) }));
  const severities = new Set(results.map((r) => r.severity));
  if (engine === 'v2-current' && severities.size > 1) {
    return blocked('conflicting_rules', results.map((r) => r.rule), results.flatMap((r) => r.steps));
  }
  const chosen = engine === 'v2-current' ? results : results.slice(0, 1);
  const severity = chosen[0].severity;
  const approver = chosen[0].rule.approver;
  return {
    ...base, severity, citations: chosen.map((r) => r.rule), approver,
    autoAcceptEligible: severity === 'within',
    recommendation: recommendation(severity, approver),
    trace: [...trace, ...chosen.flatMap((r) => r.steps)],
  };
}
