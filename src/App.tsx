import { useEffect, useMemo, useState } from 'react';
import { evaluateClause } from './engine/evaluate';
import { evalReportMarkdown, OUTCOME_TEXT, runComparison } from './engine/evals';
import { CONTRACTS } from './engine/fixtures';
import { reviewMemoMarkdown } from './engine/memo';
import { getPlaybook, PLAYBOOKS } from './engine/playbooks';
import { clauseKey, decisionStatus, DecisionError, loadWithStatus, reduce, STORAGE_KEY, type DecisionAction, type DeskEvent, type DeskState } from './engine/store';
import { CLAUSE_LABELS, SEVERITY_LABELS, type ContractClause, type Evaluation, type Span } from './engine/types';

const REPO = 'https://github.com/CashpointSoulja/juro-negotiation-decision-desk';
type Tab = 'review' | 'evals' | 'about';
const tabFromHash = (): Tab => (['review', 'evals', 'about'].includes(location.hash.slice(2)) ? (location.hash.slice(2) as Tab) : 'review');

function download(name: string, body: string, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Highlighted({ text, spans, tone }: { text: string; spans: Span[]; tone: string }) {
  const sorted = [...spans].sort((a, b) => a.start - b.start).filter((s, i, arr) => i === 0 || s.start >= arr[i - 1].end);
  const parts: JSX.Element[] = [];
  let at = 0;
  sorted.forEach((s, i) => {
    if (s.start > at) parts.push(<span key={`t${i}`}>{text.slice(at, s.start)}</span>);
    parts.push(<mark key={`m${i}`} className={`hl hl-${tone}`} title={s.label}>{text.slice(s.start, s.end)}<span className="sr-only"> ({s.label})</span></mark>);
    at = s.end;
  });
  parts.push(<span key="end">{text.slice(at)}</span>);
  return <p className="clause-text">{parts}</p>;
}

const Pill = ({ sev }: { sev: Evaluation['severity'] }) => <span className={`pill pill-${sev}`}>{SEVERITY_LABELS[sev]}</span>;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function App() {
  const [boot] = useState(() => loadWithStatus(localStorage.getItem(STORAGE_KEY)));
  const [state, setState] = useState<DeskState>(boot.state);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [selected, setSelected] = useState('c11');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(boot.discarded ? 'Saved workspace failed validation and was discarded. Showing seeded data.' : '');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { if (!status) return; const t = setTimeout(() => setStatus(''), 4000); return () => clearTimeout(t); }, [status]);
  useEffect(() => { const f = () => setTab(tabFromHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);

  const dispatch = (e: DeskEvent, msg?: string) => {
    try { const now = new Date().toISOString(); reduce(state, e, now); setState((s) => reduce(s, e, now)); setError(''); if (msg) setStatus(msg); return true; }
    catch (err) { if (err instanceof DecisionError) { setError(err.message); return false; } throw err; }
  };

  const contract = CONTRACTS.find((c) => c.id === state.contractId)!;
  const playbook = getPlaybook(state.playbookId);
  const textOf = (c: ContractClause) => state.edits[clauseKey(contract.id, c.id)] ?? c.proposed;
  const evals = useMemo(() => Object.fromEntries(contract.clauses.map((c) => [c.id, evaluateClause(c.clause, textOf(c), playbook.id)])), [state, contract, playbook]);
  const clause = contract.clauses.find((c) => c.id === selected) ?? contract.clauses[0];
  const ev = evals[clause.id];
  const key = clauseKey(contract.id, clause.id);
  const decision = state.decisions[key];
  const dStatus = decisionStatus(decision, ev);
  const stale = dStatus === 'stale_playbook' || dStatus === 'stale_result';
  const standard = playbook.rules.find((r) => r.clause === clause.clause)?.standardClause;
  const decidedCount = contract.clauses.filter((c) => { const d = state.decisions[clauseKey(contract.id, c.id)]; return decisionStatus(d, evals[c.id]) === 'current'; }).length;
  const comparison = useMemo(() => runComparison(), []);

  const decide = (action: DecisionAction) => {
    if (action === 'accepted' && ev.severity !== 'within' && note.trim().length < 5) { setError(`Accepting a clause marked "${SEVERITY_LABELS[ev.severity]}" needs a note: an approval reference or override reason.`); return; }
    if (dispatch({ type: 'decide', clauseId: clause.id, action, note, evaluation: ev, playbookVersion: playbook.version }, `${clause.heading}: ${action.replace('_', '-')}. Logged to the audit trail.`)) setNote('');
  };
  const saveEdit = () => {
    if (editing === null || editing.trim().length < 10) { setError('Edited wording must be at least 10 characters.'); return; }
    const after = evaluateClause(clause.clause, editing, playbook.id);
    dispatch({ type: 'edit', clauseId: clause.id, text: editing, before: ev, after }, `Edit saved. Re-evaluated as ${SEVERITY_LABELS[after.severity]}.`);
    setEditing(null);
  };
  const exportMemo = () => { const now = new Date().toISOString(); const name = `review-memo-${contract.id}-${playbook.id}.md`; download(name, reviewMemoMarkdown(state, now)); dispatch({ type: 'exported', what: 'memo' }, `Review memo downloaded (${name}).`); };
  const exportEval = (format: 'md' | 'json') => {
    const now = new Date().toISOString();
    if (format === 'md') download('eval-report.md', evalReportMarkdown(comparison, now));
    else download('eval-report.json', JSON.stringify({ generatedAt: now, gate: comparison.gate, baseline: comparison.baseline.metrics, current: comparison.current.metrics, rows: comparison.current.results.map((r, i) => ({ id: r.fixture.id, clause: r.fixture.clause, playbook: r.fixture.playbookId, expected: r.fixture.expected, baseline: comparison.baseline.results[i].predicted, baselineOutcome: comparison.baseline.results[i].binary, current: r.predicted, currentOutcome: r.binary, regression: comparison.rows[i].status, citations: r.evaluation.citations.map((c) => c.id) })) }, null, 2), 'application/json');
    dispatch({ type: 'exported', what: 'eval' }, `Eval report downloaded (eval-report.${format}).`);
  };
  const reset = () => { if (confirm('Reset the workspace? This clears decisions, edits and the audit trail.')) { dispatch({ type: 'reset' }, 'Workspace reset to seeded data.'); setSelected('c11'); setEditing(null); setNote(''); } };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src="./brand/juro-logo.svg" alt="Juro" className="logo" width="66" height="27" />
          <span className="product">Negotiation Decision Desk</span>
        </div>
        <nav aria-label="Sections" className="tabs">
          {(['review', 'evals', 'about'] as Tab[]).map((t) => (
            <a key={t} href={`#/${t}`} aria-current={tab === t ? 'page' : undefined} className={tab === t ? 'tab on' : 'tab'}>{t === 'review' ? 'Review' : t === 'evals' ? 'Evals' : 'About'}</a>
          ))}
        </nav>
        <p className="independent">Independent concept by Ayo Ahmed. Not affiliated with Juro.</p>
      </header>

      <p className="notice" role="note">Synthetic contracts and playbooks. Deterministic rules, no language model. Not legal advice, and the rules can be wrong: a reviewer owns every decision.</p>
      <div className={`toast ${status ? 'show' : ''}`} role="status" aria-live="polite">{status}</div>

      {tab === 'review' && (
        <main className="review">
          <section className="controls card" aria-label="Contract and playbook">
            <label>Contract
              <select aria-label="Contract" value={contract.id} onChange={(e) => { dispatch({ type: 'select_contract', contractId: e.target.value }); setSelected('c11'); setEditing(null); }}>
                {CONTRACTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Playbook
              <select aria-label="Playbook" value={playbook.id} onChange={(e) => { dispatch({ type: 'select_playbook', playbookId: e.target.value }, `Playbook switched. Recommendations re-evaluated.`); setEditing(null); }}>
                {PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.name} {p.version} · {p.stance}</option>)}
              </select>
            </label>
            <p className="pb-summary"><strong>{playbook.owner}.</strong> {playbook.summary} <span className="muted">{contract.summary}</span></p>
            <div className="actions">
              <button className="btn" onClick={exportMemo}>Export review memo</button>
              <button className="btn ghost" onClick={reset}>Reset</button>
            </div>
          </section>

          <nav className="clauses card" aria-label="Clauses">
            <h2 className="h-small">Clauses <span className="muted">{decidedCount}/{contract.clauses.length} decided</span></h2>
            <ul>
              {contract.clauses.map((c) => {
                const e = evals[c.id]; const d = state.decisions[clauseKey(contract.id, c.id)];
                return (
                  <li key={c.id}>
                    <button className={`clause-btn ${c.id === clause.id ? 'on' : ''}`} aria-current={c.id === clause.id ? 'true' : undefined} onClick={() => { setSelected(c.id); setEditing(null); setError(''); setNote(''); }}>
                      <span className="clause-name">{c.heading}</span>
                      <Pill sev={e.severity} />
                      <span className="clause-dec">{d ? (decisionStatus(d, e) === 'current' ? `Decided: ${d.action.replace('_', '-')}` : 'Stale decision') : 'Pending'}{state.edits[clauseKey(contract.id, c.id)] ? ' · edited' : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="compare" aria-label="Original and proposed clause">
            <article className="card doc">
              <div className="doc-head"><span className="vtab">1. Your standard</span><span className="pill pill-outline">{playbook.name} {playbook.version}</span></div>
              <h3>{clause.heading}</h3>
              {standard ? <p className="clause-text">{standard}</p> : <p className="clause-text muted">This playbook has no standard {CLAUSE_LABELS[clause.clause].toLowerCase()} clause.</p>}
            </article>
            <article className="card doc">
              <div className="doc-head"><span className="vtab">2. Proposed by them</span><span className="pill pill-outline">{state.edits[key] ? 'Edited by you' : 'Sent by them'}</span></div>
              <h3>{clause.heading}</h3>
              {editing === null ? (
                <>
                  <Highlighted text={textOf(clause)} spans={ev.extraction.spans} tone={ev.severity === 'within' ? 'ok' : 'warn'} />
                  <div className="row">
                    <button className="btn ghost small" onClick={() => { setEditing(textOf(clause)); setError(''); }}>Edit wording</button>
                    {state.edits[key] && <button className="btn ghost small" onClick={() => dispatch({ type: 'revert_edit', clauseId: clause.id }, 'Reverted to counterparty wording.')}>Revert edit</button>}
                  </div>
                </>
              ) : (
                <>
                  <label className="block">Edit the proposed wording. The rules re-run when you save.
                    <textarea value={editing} rows={6} onChange={(e) => setEditing(e.target.value)} />
                  </label>
                  <p className="muted small-text">Preview: <Pill sev={evaluateClause(clause.clause, editing, playbook.id).severity} /></p>
                  <div className="row">
                    <button className="btn small" onClick={saveEdit}>Save edit</button>
                    <button className="btn ghost small" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              )}
            </article>
          </section>

          <section className="card decision" aria-label="Recommendation and decision">
            <div className="dec-head"><h2 className="h-small">Recommendation</h2><Pill sev={ev.severity} /></div>
            <p className={`rec rec-${ev.severity}`}>{ev.recommendation}</p>

            <h3 className="label">Playbook citation</h3>
            {ev.citations.length === 0 ? <p className="cite missing">No rule for {CLAUSE_LABELS[clause.clause].toLowerCase()} in {playbook.name} {playbook.version}. Missing rules never count as approval.</p> :
              ev.citations.map((r) => (
                <blockquote key={r.id} className="cite">
                  <p><strong>{r.id}</strong> · {r.version} · {r.title}</p>
                  <p>"{r.guidance}"</p>
                  <p className="dev"><span className="label-inline">Acceptable deviation:</span> {r.acceptableDeviation} <span className="label-inline">Escalates to:</span> {r.approver}</p>
                </blockquote>
              ))}

            <h3 className="label">How the rules got there</h3>
            <ol className="trace">{ev.trace.map((t, i) => <li key={i} className={t.outcome ? `t-${t.outcome}` : ''}>{t.ruleId && <code>{t.ruleId}</code>} {t.text}</li>)}</ol>

            <h3 className="label">Reviewer decision</h3>
            {decision && <p className={`current-dec ${stale ? 'stale' : ''}`}>{dStatus === 'stale_playbook' ? `Stale: decided "${decision.action.replace('_', '-')}" under ${getPlaybook(decision.playbookId).name}. Re-review under ${playbook.name}.` : dStatus === 'stale_result' ? `Stale: decided "${decision.action.replace('_', '-')}" when the rules said ${SEVERITY_LABELS[decision.severity]}. Re-review.` : `Decided: ${decision.action.replace('_', '-')} at ${fmtTime(decision.at)}${decision.note ? `. Note: ${decision.note}` : ''}`}</p>}
            {ev.severity === 'blocked' && <p className="block-msg" role="alert">Auto-accept is disabled. The rules abstained, so a human must decide.</p>}
            <label className="block">Note {ev.severity !== 'within' ? '(required to accept)' : '(optional)'}
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={ev.severity === 'within' ? 'Optional' : 'Approval reference or override reason'} />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="row">
              <button className="btn" disabled={!ev.autoAcceptEligible} onClick={() => decide('auto_accepted')} title={ev.autoAcceptEligible ? '' : 'Only available when within playbook'}>Auto-accept</button>
              <button className="btn ghost" onClick={() => decide('accepted')}>{ev.severity === 'within' ? 'Accept' : 'Accept (override)'}</button>
              <button className="btn ghost" onClick={() => decide('rejected')}>Reject, counter with standard</button>
            </div>
          </section>

          <section className="card audit" aria-label="Audit trail">
            <h2 className="h-small">Audit trail <span className="muted">{state.audit.length} entries</span></h2>
            {state.audit.length === 0 ? <p className="muted">No actions yet. Decisions, edits, playbook switches and exports appear here.</p> : (
              <ol className="timeline" reversed>
                {[...state.audit].reverse().map((a) => (
                  <li key={a.id}><span className="tl-dot" aria-hidden="true" /><div><p className="tl-head"><strong>{a.action.replace(/_/g, ' ')}</strong>{a.clauseId && ` · ${contract.clauses.find((c) => c.id === a.clauseId)?.heading ?? a.clauseId}`} <time dateTime={a.at}>{fmtTime(a.at)}</time></p><p className="tl-body">{a.actor} · {a.playbookId}{a.ruleIds.length ? ` · ${a.ruleIds.join(', ')}` : ''}. {a.detail}</p></div></li>
                ))}
              </ol>
            )}
          </section>
        </main>
      )}

      {tab === 'evals' && (
        <main className="evals">
          <section className="card">
            <h1 className="display"><span className="lead">Measurable reliability,</span> not vibes</h1>
            <p>Eight synthetic fixtures with reviewer labels. Each one runs through the baseline rules (v1) and the current rules (v2). "Flagged" means anything other than within playbook. A <strong>false negative</strong> is the dangerous case: a clause that should be flagged becomes auto-accept eligible.</p>
            <p className={`gate ${comparison.gate.pass ? 'pass' : 'fail'}`}><strong>Release gate: {comparison.gate.pass ? 'PASS' : 'FAIL'}</strong> · zero false negatives, zero regressions, at most 1 false positive.</p>
            <div className="metrics">
              {([['Exact match', (m: typeof comparison.current.metrics) => `${m.exact}/${m.total}`], ['False negatives', (m: typeof comparison.current.metrics) => m.fn], ['False positives', (m: typeof comparison.current.metrics) => m.fp], ['Abstained', (m: typeof comparison.current.metrics) => m.abstained]] as const).map(([label, f]) => (
                <div className="metric" key={label}><span className="m-label">{label}</span><span className="m-val">{f(comparison.current.metrics)}</span><span className="m-base">v1 baseline: {f(comparison.baseline.metrics)}</span></div>
              ))}
            </div>
            <div className="row"><button className="btn" onClick={() => exportEval('md')}>Export eval report</button><button className="btn ghost" onClick={() => exportEval('json')}>Download JSON</button></div>
          </section>
          <section className="card table-wrap" aria-label="Per-fixture results">
            <table>
              <caption className="sr-only">Per-fixture eval results</caption>
              <thead><tr><th scope="col">Fixture</th><th scope="col">Clause · playbook</th><th scope="col">Reviewer label</th><th scope="col">v1 baseline</th><th scope="col">v2 current</th><th scope="col">Regression</th></tr></thead>
              <tbody>
                {comparison.current.results.map((r, i) => {
                  const b = comparison.baseline.results[i];
                  return (
                    <tr key={r.fixture.id}>
                      <th scope="row">{r.fixture.id}</th>
                      <td data-label="Clause · playbook"><span className="cell">{CLAUSE_LABELS[r.fixture.clause]}<span className="muted">{getPlaybook(r.fixture.playbookId).name}</span></span></td>
                      <td data-label="Reviewer label"><span className="cell"><Pill sev={r.fixture.expected} /></span></td>
                      <td data-label="v1 baseline"><span className="cell"><Pill sev={b.predicted} /><span className={`oc oc-${b.binary}`}>{OUTCOME_TEXT[b.binary]}</span></span></td>
                      <td data-label="v2 current"><span className="cell"><Pill sev={r.predicted} /><span className={`oc oc-${r.binary}`}>{OUTCOME_TEXT[r.binary]}</span></span></td>
                      <td data-label="Regression"><span className="cell"><span className={`reg reg-${comparison.rows[i].status}`}>{comparison.rows[i].status}</span></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="rationale">{comparison.current.results.map((r) => <li key={r.fixture.id}><strong>{r.fixture.id}.</strong> {r.fixture.rationale}</li>)}</ul>
          </section>
        </main>
      )}

      {tab === 'about' && (
        <main className="about">
          <section className="card prose">
            <h1 className="display"><span className="lead">In 30 seconds:</span> why this exists</h1>
            <p>When a customer sends back a marked-up contract, a legal reviewer has to decide clause by clause: accept, push back or escalate. Automated suggestions only help if the reviewer can see <em>which of their own playbook rules</em> a suggestion follows, and if the system stops rather than guesses when the playbook is silent or contradicts itself.</p>
            <p>This desk puts the standard clause and the proposed clause side by side, cites the exact playbook rule, shows the allowed deviation and who must approve, and refuses to auto-accept when a rule is missing or two rules conflict. Every human accept, reject or edit lands in an audit trail, and an eval suite measures how often the rules wrongly flag or wrongly wave through a clause.</p>
            <p><strong>Why a customer would care:</strong> faster first-pass review they can trust, because every recommendation is checkable against rules they wrote, and the failures are counted, not hidden.</p>
            <h2 className="h-small">What is synthetic or simulated</h2>
            <ul><li>All contracts, counterparties and the three playbooks (Fernbrook, Quayside, Alder) are fictional.</li><li>"Reviewer (you)" is the only actor. There are no accounts, no integrations and no data leaves the browser (state lives in localStorage).</li><li>Clause reading is deterministic pattern matching for four clause types. It is not a language model and does not understand contracts in general.</li></ul>
            <h2 className="h-small">Read more</h2>
            <ul>
              <li><a href={`${REPO}#readme`}>README and ELI5</a></li>
              <li><a href={`${REPO}/blob/main/docs/PRD.md`}>PRD</a> · <a href={`${REPO}/blob/main/docs/EVALS.md`}>Evals and test results</a> · <a href={`${REPO}/blob/main/docs/VIABILITY.md`}>Viability memo</a></li>
              <li><a href={`${REPO}/blob/main/docs/SOURCES.md`}>Public sources and date checked</a></li>
            </ul>
          </section>
        </main>
      )}

      <footer className="foot">Independent concept by Ayo Ahmed. Not affiliated with, endorsed by or connected to Juro. Juro and the Juro logo belong to their owner. All data is synthetic.</footer>
    </div>
  );
}
