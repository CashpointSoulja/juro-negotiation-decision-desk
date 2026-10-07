import { describe, expect, it } from 'vitest';
import { compare, evalReportMarkdown, runComparison, runSuite } from '../../src/engine/evals';
import { EVAL_FIXTURES } from '../../src/engine/fixtures';

describe('eval suite', () => {
  it('has 8 fixtures covering all four clause types', () => {
    expect(EVAL_FIXTURES).toHaveLength(8);
    expect(new Set(EVAL_FIXTURES.map((f) => f.clause))).toEqual(new Set(['liability_cap', 'indemnity', 'renewal_notice', 'jurisdiction']));
  });
  it('current engine: 7/8 exact, 1 FP (F7), 0 FN', () => {
    const r = runSuite('v2-current');
    expect(r.metrics).toMatchObject({ exact: 7, fp: 1, fn: 0, abstained: 2 });
    expect(r.results.find((x) => x.binary === 'FP')!.fixture.id).toBe('F7');
  });
  it('baseline engine: 3/8 exact, 3 FN (F2, F5, F8)', () => {
    const r = runSuite('v1-baseline');
    expect(r.metrics).toMatchObject({ exact: 3, fn: 3, fp: 1 });
    expect(r.results.filter((x) => x.binary === 'FN').map((x) => x.fixture.id)).toEqual(['F2', 'F5', 'F8']);
  });
  it('regression comparison: four fixed, none regressed, gate passes', () => {
    const c = runComparison();
    expect(c.rows.filter((r) => r.status === 'fixed').map((r) => r.id)).toEqual(['F2', 'F5', 'F6', 'F8']);
    expect(c.rows.some((r) => r.status === 'regressed')).toBe(false);
    expect(c.gate.pass).toBe(true);
  });
  it('gate fails when the candidate regresses against the baseline', () => {
    const c = compare(runSuite('v2-current'), runSuite('v1-baseline'));
    expect(c.gate.pass).toBe(false);
    expect(c.rows.filter((r) => r.status === 'regressed').map((r) => r.id)).toEqual(['F2', 'F5', 'F6', 'F8']);
  });
  it('report names the false positive and false negatives explicitly', () => {
    const md = evalReportMarkdown(runComparison(), 'test');
    expect(md).toContain('Release gate: PASS');
    expect(md).toContain('FP (flagged, but within)');
    expect(md).toContain('FN (auto-accepted, should flag)');
  });
});
