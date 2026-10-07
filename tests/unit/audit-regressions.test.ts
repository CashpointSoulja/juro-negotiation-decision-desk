import { describe, expect, it } from 'vitest';
import { evaluateClause } from '../../src/engine/evaluate';
import { CONTRACTS } from '../../src/engine/fixtures';
import { reviewMemoMarkdown } from '../../src/engine/memo';
import { decisionStatus, initialState, isValidState, load, loadWithStatus, reduce, type DeskState } from '../../src/engine/store';

const T = '2026-10-07T00:00:00Z';
const blockedAmbiguous = (ev: ReturnType<typeof evaluateClause>) => {
  expect(ev.severity).toBe('blocked');
  expect(ev.blockReason).toBe('ambiguous');
  expect(ev.autoAcceptEligible).toBe(false);
};

describe('liability cap carve-outs fail closed', () => {
  it('a 1x cap with a 10x carve-out is not auto-accepted', () => {
    blockedAmbiguous(evaluateClause('liability_cap', "Each party's total aggregate liability shall not exceed 100% of the fees paid in the twelve (12) months preceding the claim, except that liability for breach of clause 9 shall not exceed 10x the annual fees.", 'fernbrook'));
  });
  it('a super-cap written as a second multiple is blocked', () => {
    blockedAmbiguous(evaluateClause('liability_cap', 'Liability is capped at 1x the annual fees plus a super-cap of 10x the annual fees for data claims.', 'quayside'));
  });
  it('a carve-out with no stated amount is blocked', () => {
    blockedAmbiguous(evaluateClause('liability_cap', 'Liability shall not exceed 100% of the fees, provided that the cap shall not apply to breach of confidentiality.', 'fernbrook'));
  });
  it('a cap plus a currency amount is blocked', () => {
    blockedAmbiguous(evaluateClause('liability_cap', 'Liability shall not exceed the greater of 100% of the fees and £5,000,000.', 'fernbrook'));
  });
  it('the standard fraud carve-out on its own stays within', () => {
    const lark = CONTRACTS.find((c) => c.id === 'larkspur')!.clauses.find((c) => c.clause === 'liability_cap')!;
    const ev = evaluateClause('liability_cap', lark.proposed, 'fernbrook');
    expect(ev.severity).toBe('within');
    expect(ev.autoAcceptEligible).toBe(true);
  });
});

describe('indemnity mutuality', () => {
  it('"each party" outside the indemnity obligation does not make it mutual', () => {
    const ev = evaluateClause('indemnity', "The Customer shall indemnify the Supplier against claims brought by each party's affiliates, subject to clause 11.", 'fernbrook');
    expect(ev.extraction.values.mutual).toBe(false);
    expect(ev.severity).toBe('escalate');
    expect(ev.autoAcceptEligible).toBe(false);
  });
  it('explicitly non-mutual wording is one-way even if it says "mutual"', () => {
    const ev = evaluateClause('indemnity', 'This indemnity is not mutual: the Supplier shall indemnify the Customer, subject to clause 11.', 'alder');
    expect(ev.severity).toBe('escalate');
  });
  it('mutual and one-way wording in the same clause is blocked', () => {
    blockedAmbiguous(evaluateClause('indemnity', 'Each party shall indemnify the other; however only the Customer shall indemnify for IP claims, subject to clause 11.', 'quayside'));
  });
});

describe('governing law', () => {
  it('a conflicting second law is blocked, not read as the first one', () => {
    blockedAmbiguous(evaluateClause('jurisdiction', 'This Agreement is governed by the laws of England and Wales, save that disputes under clause 9 are governed by the laws of the State of New York.', 'fernbrook'));
  });
  it('an unlisted second forum is blocked', () => {
    blockedAmbiguous(evaluateClause('jurisdiction', 'This Agreement is governed by the laws of England and Wales, and the parties submit to the courts of France.', 'alder'));
  });
  it('repeating the same law is fine', () => {
    expect(evaluateClause('jurisdiction', 'This Agreement is governed by the laws of England, and the courts of England have exclusive jurisdiction.', 'fernbrook').severity).toBe('within');
  });
});

describe('saved state fails closed', () => {
  const valid = () => reduce(initialState(), { type: 'select_contract', contractId: 'brightwater' }, T);
  const bad: [string, (s: any) => void][] = [
    ['unknown contract', (s) => { s.contractId = 'nope'; }],
    ['unknown playbook', (s) => { s.playbookId = 'nope'; }],
    ['edits not an object', (s) => { s.edits = 'x'; }],
    ['edit for an unknown clause', (s) => { s.edits = { 'larkspur:c99': 'x' }; }],
    ['non-string edit', (s) => { s.edits = { 'larkspur:c11': 5 }; }],
    ['decisions missing', (s) => { delete s.decisions; }],
    ['decision with unknown action', (s) => { s.decisions = { 'larkspur:c11': { action: 'approved', note: '', playbookId: 'fernbrook', playbookVersion: 'v4', ruleIds: [], severity: 'within', at: T } }; }],
    ['decision with unknown playbook', (s) => { s.decisions = { 'larkspur:c11': { action: 'rejected', note: '', playbookId: 'x', playbookVersion: 'v4', ruleIds: [], severity: 'within', at: T } }; }],
    ['decision missing ruleIds', (s) => { s.decisions = { 'larkspur:c11': { action: 'rejected', note: '', playbookId: 'fernbrook', playbookVersion: 'v4', severity: 'within', at: T } }; }],
    ['audit entry malformed', (s) => { s.audit = [null]; }],
    ['audit entry bad action', (s) => { s.audit = [{ ...s.audit[0], action: 'hack' }]; }],
  ];
  for (const [name, mutate] of bad) {
    it(`discards state with ${name}`, () => {
      const s = JSON.parse(JSON.stringify(valid()));
      mutate(s);
      expect(isValidState(s)).toBe(false);
      const r = loadWithStatus(JSON.stringify(s));
      expect(r.discarded).toBe(true);
      expect(r.state).toEqual(initialState());
      expect(() => reviewMemoMarkdown(r.state, T)).not.toThrow();
    });
  }
  it('keeps a valid saved state', () => {
    const s = valid();
    expect(loadWithStatus(JSON.stringify(s))).toEqual({ state: s, discarded: false });
    expect(load(null)).toEqual(initialState());
  });
  it('the memo refuses malformed state instead of crashing', () => {
    const md = reviewMemoMarkdown({ contractId: 'nope', playbookId: 'fernbrook', edits: {}, decisions: {}, audit: [] } as DeskState, T);
    expect(md).toContain('Review memo not generated');
    expect(reviewMemoMarkdown({ contractId: 'larkspur' } as DeskState, T)).toContain('failed validation');
  });
});

describe('decisions recorded against a different result are stale', () => {
  it('an auto-accept saved before the rules blocked the clause is not reported as current', () => {
    const text = 'Liability is capped at 1x the annual fees plus a super-cap of 10x the annual fees for data claims.';
    const ev = evaluateClause('liability_cap', text, 'fernbrook');
    const saved = { action: 'auto_accepted' as const, note: '', playbookId: 'fernbrook', playbookVersion: 'v4', ruleIds: ['FB-LC-01'], severity: 'within' as const, at: T };
    expect(decisionStatus(saved, ev)).toBe('stale_result');
    const s: DeskState = { ...initialState(), edits: { 'larkspur:c11': text }, decisions: { 'larkspur:c11': saved } };
    const md = reviewMemoMarkdown(s, T);
    expect(md).toMatch(/auto-accepted \(stale: decided when the rules said .+; re-review\)/);
  });
});

describe('renewal term must be bounded', () => {
  const at60 = (term: string) => `This Agreement renews automatically for ${term} unless either party gives at least 60 days' written notice before the end of the current term.`;
  for (const term of ['successive perpetual terms', 'successive terms of the same length', 'an indefinite period', 'successive renewal periods']) {
    it(`"${term}" with 60 days' notice is blocked, not auto-accepted`, () => {
      for (const pb of ['fernbrook', 'quayside', 'alder']) blockedAmbiguous(evaluateClause('renewal_notice', at60(term), pb));
    });
  }
  it('a stated 12-month renewal term still auto-accepts under Fernbrook', () => {
    const ev = evaluateClause('renewal_notice', at60('successive 12-month periods'), 'fernbrook');
    expect(ev.severity).toBe('within');
    expect(ev.autoAcceptEligible).toBe(true);
  });
});

describe('memo table cells are escaped', () => {
  it('a reviewer note with pipes and newlines stays inside one table row', () => {
    let s = reduce(initialState(), { type: 'select_contract', contractId: 'brightwater' }, T);
    const capClause = CONTRACTS.find((c) => c.id === 'brightwater')!.clauses.find((c) => c.clause === 'liability_cap')!;
    const ev = evaluateClause('liability_cap', capClause.proposed, 'fernbrook');
    s = reduce(s, { type: 'decide', clauseId: capClause.id, action: 'rejected', note: 'Counter | at 1x\n| fake | row |\r\nsee CC-1 \\ ok', evaluation: ev, playbookVersion: 'v4' }, T);
    const md = reviewMemoMarkdown(s, T);
    const rows = md.split('\n').filter((l) => l.startsWith('| 11. Limitation'));
    expect(rows).toHaveLength(1);
    expect(md).not.toMatch(/^\| fake/m);
    const cells = rows[0].split(/(?<!\\)\|/).slice(1, -1);
    expect(cells).toHaveLength(4);
    expect(rows[0]).toContain('Counter \\| at 1x \\| fake \\| row \\| see CC-1 \\\\ ok');
    expect(md.split('\n').filter((l) => l.includes('rejected') && l.startsWith('- ')).every((l) => !l.includes('\n'))).toBe(true);
    expect(md).not.toMatch(/^\| row/m);
  });
});
