import { describe, expect, it } from 'vitest';
import { evaluateClause } from '../../src/engine/evaluate';
import { CONTRACTS } from '../../src/engine/fixtures';
import { reviewMemoMarkdown } from '../../src/engine/memo';
import { DecisionError, initialState, load, reduce } from '../../src/engine/store';

const T = '2026-10-07T00:00:00Z';
const bw = CONTRACTS.find((c) => c.id === 'brightwater')!;
const ind = bw.clauses.find((c) => c.clause === 'indemnity')!;
const cap = bw.clauses.find((c) => c.clause === 'liability_cap')!;

describe('decisions and audit trail', () => {
  it('auto-accept is refused for a blocked clause', () => {
    let s = reduce(initialState(), { type: 'select_contract', contractId: 'brightwater' }, T);
    s = reduce(s, { type: 'select_playbook', playbookId: 'alder' }, T);
    const ev = evaluateClause('indemnity', ind.proposed, 'alder');
    expect(() => reduce(s, { type: 'decide', clauseId: ind.id, action: 'auto_accepted', note: '', evaluation: ev, playbookVersion: 'v7' }, T)).toThrow(DecisionError);
  });
  it('human accept of a non-within clause requires a note and logs an override', () => {
    let s = reduce(initialState(), { type: 'select_contract', contractId: 'brightwater' }, T);
    const ev = evaluateClause('liability_cap', cap.proposed, 'fernbrook');
    expect(() => reduce(s, { type: 'decide', clauseId: cap.id, action: 'accepted', note: '', evaluation: ev, playbookVersion: 'v4' }, T)).toThrow(/needs a note/);
    s = reduce(s, { type: 'decide', clauseId: cap.id, action: 'accepted', note: 'Approved by Commercial Counsel, ref CC-112', evaluation: ev, playbookVersion: 'v4' }, T);
    const last = s.audit.at(-1)!;
    expect(last.action).toBe('accepted');
    expect(last.ruleIds).toEqual(['FB-LC-01']);
    expect(last.detail).toContain('Human accepted against a "deviation" recommendation');
  });
  it('edit re-evaluates, clears the prior decision and is logged', () => {
    let s = reduce(initialState(), { type: 'select_contract', contractId: 'brightwater' }, T);
    const before = evaluateClause('liability_cap', cap.proposed, 'fernbrook');
    s = reduce(s, { type: 'decide', clauseId: cap.id, action: 'rejected', note: '', evaluation: before, playbookVersion: 'v4' }, T);
    const text = cap.proposed.replace('twice the total fees', '100% of the fees');
    const after = evaluateClause('liability_cap', text, 'fernbrook');
    s = reduce(s, { type: 'edit', clauseId: cap.id, text, before, after }, T);
    expect(after.severity).toBe('within');
    expect(s.decisions['brightwater:c11']).toBeUndefined();
    expect(s.audit.at(-1)!.detail).toContain('deviation → within');
  });
  it('reset restores seeds and keeps a single reset entry', () => {
    let s = reduce(initialState(), { type: 'select_playbook', playbookId: 'alder' }, T);
    s = reduce(s, { type: 'reset' }, T);
    expect(s.playbookId).toBe('fernbrook');
    expect(s.audit).toHaveLength(1);
    expect(s.audit[0].action).toBe('reset');
  });
  it('load rejects corrupt storage', () => {
    expect(load('{not json').contractId).toBe('larkspur');
    expect(load('{"foo":1}').playbookId).toBe('fernbrook');
  });
});

describe('review memo', () => {
  it('includes citations, decisions, stale markers and the disclaimer', () => {
    let s = reduce(initialState(), { type: 'select_contract', contractId: 'brightwater' }, T);
    const ev = evaluateClause('liability_cap', cap.proposed, 'fernbrook');
    s = reduce(s, { type: 'decide', clauseId: cap.id, action: 'rejected', note: 'Counter at 1x', evaluation: ev, playbookVersion: 'v4' }, T);
    s = reduce(s, { type: 'select_playbook', playbookId: 'alder' }, T);
    const md = reviewMemoMarkdown(s, T);
    expect(md).toContain('AH-LC-01 v7');
    expect(md).toContain('stale: decided under fernbrook');
    expect(md).toContain('not legal advice');
    expect(md).toContain('AH-IN-01 v7, AH-IN-07 v7');
  });
});
