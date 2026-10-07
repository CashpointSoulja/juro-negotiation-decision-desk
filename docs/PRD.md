# PRD: Negotiation Decision Desk

Independent concept by Ayo Ahmed. Not affiliated with Juro. Synthetic data only.

## Problem
When a counterparty marks up a contract, a reviewer goes clause by clause: accept, push back, or escalate. Automated suggestions save time only if the reviewer can trust them. Trust needs two things:
1. **Traceability.** The reviewer can see which of *their own* playbook rules the suggestion follows, what deviation the rule allows, and who must approve.
2. **Abstention.** When the playbook is silent, contradicts itself, or the system can't read the key term, it should stop rather than guess.

**Hypothesis:** legal reviewers need to see why an automated redline follows their own playbook, and where it must abstain. If they can, they will accept more first-pass suggestions without re-reading every clause from scratch, and they will not quietly accept risky wording.

## Users
- **Primary:** in-house commercial counsel and legal ops reviewers working through third-party markups.
- **Secondary:** playbook owners (GC, legal ops), who need to see where rules are missing or conflicting, and deal desk or sales leaders waiting on approvals.

## Scope (shipped in this prototype)
| Capability | Behaviour |
|---|---|
| Playbook selection | 3 fictional playbooks (Fernbrook v4, Quayside v2, Alder v7). Switching re-evaluates every clause and marks earlier decisions stale. |
| Side-by-side review | Your standard clause (from the selected playbook) next to the counterparty's proposed clause. The terms the rules read are highlighted in place. |
| Deterministic rules | Four clause types: liability cap, indemnity, renewal and notice, governing law. Each result shows the rule ID and version, quoted guidance, acceptable deviation, approver, severity and a step-by-step trace. |
| Severity | `within` (auto-accept eligible), `deviation` (accept with named approval), `escalate` (counter and escalate), `blocked` (abstain). |
| Abstention | Missing rule, conflicting rules, or an unreadable key term all produce `blocked`, and auto-accept is disabled. |
| Human decision | Auto-accept (only when within), accept (needs a note unless within), reject and counter with the standard. Edit the wording and the rules re-run. |
| Audit trail | Every decision, edit, revert, playbook or contract switch, export and reset is logged with time, actor, playbook and rule IDs. |
| Exports | Review memo (Markdown) and eval report (Markdown and JSON). |
| Evals | 8 labelled fixtures, baseline (v1) vs current (v2) rules, TP/TN/FP/FN, regression status, release gate. |

## Out of scope (deliberately)
- Any language model, free-text contract understanding, or clause types beyond the four.
- Accounts, multi-user approval routing, integrations, real documents.
- Legal advice. The desk records decisions. It does not make them correct.

## Requirements and acceptance criteria
1. Each non-missing recommendation cites at least one rule with ID and version. *(unit test: "every recommendation is cited")*
2. Switching playbook changes the permitted recommendation for the same wording. *(2x cap: Fernbrook deviation, Quayside within, Alder escalate)*
3. Missing, conflicting or unreadable rules block auto-accept. *(unit tests plus e2e)*
4. Accepting anything other than `within` needs a note of at least 5 characters, and the log records it as a human override.
5. An edit re-runs the rules, clears the prior decision and logs the severity change, e.g. `deviation → within`.
6. Eval release gate: 0 false negatives, 0 regressions vs baseline, at most 1 false positive.
7. No horizontal overflow at 1366px, 820px or 390px. *(e2e)*

## Success metrics
See [METRICS.md](METRICS.md).
