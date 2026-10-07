import { evaluateClause } from './evaluate';
import { CONTRACTS } from './fixtures';
import { getPlaybook } from './playbooks';
import { clauseKey, decisionStatus, isValidState, type DeskState } from './store';
import { CLAUSE_LABELS, SEVERITY_LABELS } from './types';

export function reviewMemoMarkdown(state: DeskState, generatedAt: string): string {
  if (!isValidState(state)) {
    return `# Review memo not generated\n\nGenerated ${generatedAt}. The workspace state failed validation, so no clause results or decisions are reported. Reset the workspace and review again.\n`;
  }
  const contract = CONTRACTS.find((c) => c.id === state.contractId)!;
  const pb = getPlaybook(state.playbookId);
  const out = [
    `# Review memo: ${contract.name}`,
    '',
    `Counterparty: ${contract.counterparty}. Playbook: ${pb.name} ${pb.version} (${pb.stance}). Generated ${generatedAt}.`,
    '',
    '> Synthetic demo data. Deterministic playbook rules, no language model. This memo is not legal advice, and the rules may be wrong. A qualified reviewer owns every decision.',
    '',
    '| Clause | Engine severity | Citation | Reviewer decision |',
    '|---|---|---|---|',
  ];
  const details: string[] = [];
  for (const cl of contract.clauses) {
    const key = clauseKey(contract.id, cl.id);
    const text = state.edits[key] ?? cl.proposed;
    const ev = evaluateClause(cl.clause, text, pb.id);
    const d = state.decisions[key];
    const status = decisionStatus(d, ev);
    const staleText = status === 'stale_playbook' ? ` (stale: decided under ${d!.playbookId})` : status === 'stale_result' ? ` (stale: decided when the rules said ${SEVERITY_LABELS[d!.severity]}; re-review)` : '';
    const decision = !d ? 'Pending' : `${d.action.replace('_', '-')}${staleText}${d.note ? `: ${d.note}` : ''}`;
    out.push(`| ${cl.heading} | ${SEVERITY_LABELS[ev.severity]} | ${ev.citations.map((r) => `${r.id} ${r.version}`).join(', ') || 'none'} | ${decision} |`);
    details.push(`### ${cl.heading} (${CLAUSE_LABELS[cl.clause]})`, '', `Proposed${state.edits[key] ? ' (edited by reviewer)' : ''}: "${text}"`, '', `Recommendation: ${ev.recommendation}`, '', ...ev.trace.map((t) => `- ${t.ruleId ? `[${t.ruleId}] ` : ''}${t.text}`), '');
  }
  out.push('', '## Clause detail', '', ...details, '## Audit trail', '');
  if (!state.audit.length) out.push('No actions recorded yet.');
  for (const a of state.audit) out.push(`- ${a.at} · ${a.actor} · ${a.action}${a.clauseId ? ` · clause ${a.clauseId}` : ''} · ${a.detail}`);
  return out.join('\n') + '\n';
}
