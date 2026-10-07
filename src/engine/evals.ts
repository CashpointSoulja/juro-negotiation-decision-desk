import { evaluateClause } from './evaluate';
import { EVAL_FIXTURES } from './fixtures';
import { getPlaybook } from './playbooks';
import type { EngineVersion, EvalFixture, Evaluation, Severity } from './types';
import { CLAUSE_LABELS, SEVERITY_LABELS } from './types';

export type BinaryOutcome = 'TP' | 'TN' | 'FP' | 'FN';
export interface FixtureResult {
  fixture: EvalFixture;
  evaluation: Evaluation;
  predicted: Severity;
  exact: boolean;
  binary: BinaryOutcome;
}
export interface SuiteMetrics { total: number; exact: number; tp: number; tn: number; fp: number; fn: number; abstained: number; safeMismatch: number }
export interface SuiteRun { engine: EngineVersion; results: FixtureResult[]; metrics: SuiteMetrics }
export type RegressionStatus = 'fixed' | 'regressed' | 'unchanged-pass' | 'unchanged-fail';
export interface Comparison { baseline: SuiteRun; current: SuiteRun; rows: { id: string; status: RegressionStatus }[]; gate: { pass: boolean; reasons: string[] } }

const flagged = (s: Severity) => s !== 'within';

export function runSuite(engine: EngineVersion, fixtures: EvalFixture[] = EVAL_FIXTURES): SuiteRun {
  const results = fixtures.map((fixture) => {
    const evaluation = evaluateClause(fixture.clause, fixture.text, fixture.playbookId, engine);
    const predicted = evaluation.severity;
    const p = flagged(predicted), e = flagged(fixture.expected);
    const binary: BinaryOutcome = p && e ? 'TP' : !p && !e ? 'TN' : p ? 'FP' : 'FN';
    return { fixture, evaluation, predicted, exact: predicted === fixture.expected, binary };
  });
  const count = (f: (r: FixtureResult) => boolean) => results.filter(f).length;
  return {
    engine, results,
    metrics: {
      total: results.length, exact: count((r) => r.exact),
      tp: count((r) => r.binary === 'TP'), tn: count((r) => r.binary === 'TN'),
      fp: count((r) => r.binary === 'FP'), fn: count((r) => r.binary === 'FN'),
      abstained: count((r) => r.predicted === 'blocked'),
      safeMismatch: count((r) => r.binary === 'TP' && !r.exact),
    },
  };
}

export function compare(baseline: SuiteRun, current: SuiteRun): Comparison {
  const rows = current.results.map((c, i) => {
    const b = baseline.results[i];
    const status: RegressionStatus = b.exact && c.exact ? 'unchanged-pass' : !b.exact && c.exact ? 'fixed' : b.exact && !c.exact ? 'regressed' : 'unchanged-fail';
    return { id: c.fixture.id, status };
  });
  const reasons: string[] = [];
  if (current.metrics.fn > 0) reasons.push(`${current.metrics.fn} false negative(s): a flagged clause would auto-accept.`);
  const regressed = rows.filter((r) => r.status === 'regressed');
  if (regressed.length) reasons.push(`Regressed fixtures: ${regressed.map((r) => r.id).join(', ')}.`);
  if (current.metrics.fp > 1) reasons.push(`${current.metrics.fp} false positives exceed the tolerance of 1.`);
  return { baseline, current, rows, gate: { pass: reasons.length === 0, reasons } };
}

export function runComparison(): Comparison {
  return compare(runSuite('v1-baseline'), runSuite('v2-current'));
}

export const OUTCOME_TEXT: Record<BinaryOutcome, string> = {
  TP: 'TP (flagged, should flag)', TN: 'TN (auto-accept, correct)', FP: 'FP (flagged, but within)', FN: 'FN (auto-accepted, should flag)',
};

export function evalReportMarkdown(c: Comparison, generatedAt: string): string {
  const m = (r: SuiteRun) => r.metrics;
  const line = (label: string, f: (x: SuiteMetrics) => number | string) => `| ${label} | ${f(m(c.baseline))} | ${f(m(c.current))} |`;
  const out: string[] = [
    '# Eval report: Negotiation Decision Desk rules engine',
    '',
    `Generated: ${generatedAt}. Synthetic fixtures. Deterministic rules, no language model. This is not legal advice.`,
    '',
    `**Release gate: ${c.gate.pass ? 'PASS' : 'FAIL'}.** Rules: zero false negatives, zero regressions, at most 1 false positive.`,
    ...c.gate.reasons.map((r) => `- ${r}`),
    '',
    '## Metrics (n = 8 fixtures)',
    '',
    '| Metric | v1-baseline | v2-current |',
    '|---|---|---|',
    line('Exact severity match', (x) => `${x.exact}/${x.total}`),
    line('True positives (flagged, should flag)', (x) => x.tp),
    line('True negatives (auto-accept, correct)', (x) => x.tn),
    line('False positives (flagged, but within playbook)', (x) => x.fp),
    line('False negatives (auto-accepted, should flag)', (x) => x.fn),
    line('Abstained (blocked for human review)', (x) => x.abstained),
    line('Flagged with the wrong severity (safe mismatch)', (x) => x.safeMismatch),
    '',
    '"Positive" means the clause is flagged (anything other than within playbook). A false negative is the dangerous case, because the clause would be auto-accept eligible when a reviewer says it should not be.',
    '',
    '## Per-fixture results',
    '',
    '| Fixture | Clause | Playbook | Expected | v1-baseline | v2-current | Regression |',
    '|---|---|---|---|---|---|---|',
  ];
  c.current.results.forEach((r, i) => {
    const b = c.baseline.results[i];
    out.push(`| ${r.fixture.id} | ${CLAUSE_LABELS[r.fixture.clause]} | ${getPlaybook(r.fixture.playbookId).name} | ${SEVERITY_LABELS[r.fixture.expected]} | ${SEVERITY_LABELS[b.predicted]}: ${OUTCOME_TEXT[b.binary]} | ${SEVERITY_LABELS[r.predicted]}: ${OUTCOME_TEXT[r.binary]} | ${c.rows[i].status} |`);
  });
  out.push('', '## Fixture rationale and v2 citations', '');
  c.current.results.forEach((r) => {
    out.push(`- **${r.fixture.id}**: ${r.fixture.rationale} v2 cites: ${r.evaluation.citations.map((x) => `${x.id} ${x.version}`).join(', ') || 'no rule (missing)'}.`);
  });
  return out.join('\n') + '\n';
}
