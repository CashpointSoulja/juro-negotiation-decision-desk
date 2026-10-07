import { describe, expect, it } from 'vitest';
import { evaluateClause } from '../../src/engine/evaluate';
import { extract } from '../../src/engine/extract';
import { CONTRACTS, EVAL_FIXTURES } from '../../src/engine/fixtures';
import { PLAYBOOKS } from '../../src/engine/playbooks';

const brightwater = CONTRACTS.find((c) => c.id === 'brightwater')!;
const larkspur = CONTRACTS.find((c) => c.id === 'larkspur')!;
const clause = (c: typeof larkspur, type: string) => c.clauses.find((x) => x.clause === type)!;

describe('playbooks', () => {
  it('ships exactly three fictional playbooks with unique rule ids', () => {
    expect(PLAYBOOKS).toHaveLength(3);
    const ids = PLAYBOOKS.flatMap((p) => p.rules.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('extraction', () => {
  it('reads percentage, digit and word caps', () => {
    expect(extract('liability_cap', 'shall not exceed 100% of the fees paid').values.multiple).toBe(1);
    expect(extract('liability_cap', 'shall not exceed 3x the fees paid').values.multiple).toBe(3);
    expect(extract('liability_cap', 'shall not exceed twice the total fees paid').values.multiple).toBe(2);
  });
  it('baseline engine cannot read word numbers', () => {
    expect(extract('liability_cap', 'shall not exceed twice the total fees paid', 'v1-baseline').ok).toBe(false);
  });
  it('detects an indemnity carve-out from the cap without the word unlimited', () => {
    const ex = extract('indemnity', 'Each party shall indemnify the other. This indemnity shall not be subject to the limitation of liability.');
    expect(ex.values.uncapped).toBe(true);
    expect(ex.values.mutual).toBe(true);
  });
  it('records spans that point at the matched text', () => {
    const text = "renews automatically unless the Customer gives thirty (30) days' written notice.";
    const ex = extract('renewal_notice', text);
    const span = ex.spans.find((s) => s.label === 'notice period')!;
    expect(text.slice(span.start, span.end)).toMatch(/^thirty \(30\) days/);
    expect(ex.values.noticeDays).toBe(30);
  });
});

describe('changing playbook changes the permitted recommendation', () => {
  it('a 2x cap is a deviation for Fernbrook, within for Quayside, and escalated for Alder', () => {
    const t = clause(brightwater, 'liability_cap').proposed;
    expect(evaluateClause('liability_cap', t, 'fernbrook').severity).toBe('deviation');
    expect(evaluateClause('liability_cap', t, 'quayside').severity).toBe('within');
    expect(evaluateClause('liability_cap', t, 'alder').severity).toBe('escalate');
  });
  it('the clean Larkspur contract is fully auto-accept eligible under Fernbrook', () => {
    for (const c of larkspur.clauses) expect(evaluateClause(c.clause, c.proposed, 'fernbrook').autoAcceptEligible).toBe(true);
  });
});

describe('abstention blocks auto-accept', () => {
  it('missing rule blocks (Quayside has no governing-law rule)', () => {
    const ev = evaluateClause('jurisdiction', clause(larkspur, 'jurisdiction').proposed, 'quayside');
    expect(ev.severity).toBe('blocked');
    expect(ev.blockReason).toBe('missing_rule');
    expect(ev.autoAcceptEligible).toBe(false);
  });
  it('conflicting rules block and cite both rules', () => {
    const ev = evaluateClause('indemnity', clause(brightwater, 'indemnity').proposed, 'alder');
    expect(ev.blockReason).toBe('conflicting_rules');
    expect(ev.citations.map((r) => r.id)).toEqual(['AH-IN-01', 'AH-IN-07']);
    expect(ev.autoAcceptEligible).toBe(false);
  });
  it('unreadable wording blocks rather than defaulting to accept', () => {
    const ev = evaluateClause('liability_cap', 'Liability is limited as the parties may agree from time to time.', 'fernbrook');
    expect(ev.blockReason).toBe('unparsed');
    expect(ev.autoAcceptEligible).toBe(false);
  });
  it('the data addendum rule only applies to data-scope indemnities', () => {
    const ev = evaluateClause('indemnity', clause(larkspur, 'indemnity').proposed, 'alder');
    expect(ev.severity).toBe('within');
    expect(ev.citations.map((r) => r.id)).toEqual(['AH-IN-01']);
  });
});

describe('every recommendation is cited', () => {
  it('non-missing evaluations always carry at least one citation', () => {
    for (const f of EVAL_FIXTURES) {
      const ev = evaluateClause(f.clause, f.text, f.playbookId);
      if (ev.blockReason !== 'missing_rule') expect(ev.citations.length).toBeGreaterThan(0);
      expect(ev.trace.length).toBeGreaterThan(0);
    }
  });
});
