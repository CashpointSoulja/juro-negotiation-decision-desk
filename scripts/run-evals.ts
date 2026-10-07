import { writeFileSync } from 'node:fs';
import { evalReportMarkdown, runComparison } from '../src/engine/evals';

const c = runComparison();
const md = evalReportMarkdown(c, 'build time (deterministic fixtures)');
writeFileSync('docs/eval-report.md', md);
for (const r of c.current.results) {
  const b = c.baseline.results.find((x) => x.fixture.id === r.fixture.id)!;
  console.log(`${r.fixture.id} expected=${r.fixture.expected} v1=${b.predicted}(${b.binary}) v2=${r.predicted}(${r.binary}) ${c.rows.find((x) => x.id === r.fixture.id)!.status}`);
}
console.log('v1', JSON.stringify(c.baseline.metrics));
console.log('v2', JSON.stringify(c.current.metrics));
console.log('gate', c.gate.pass ? 'PASS' : 'FAIL', c.gate.reasons.join(' '));
process.exit(c.gate.pass ? 0 : 1);
