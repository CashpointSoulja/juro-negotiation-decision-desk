# Viability memo: why this concept fits the Senior PM role

Role: Senior Product Manager, contract workflows, negotiation and agentic review ([job description](https://jobs.ashbyhq.com/juro/9e261493-30cc-44d8-93f8-d3ef784b7f10), checked 7 Oct 2026).

## What the JD asks for, and where this project addresses it
| JD theme (paraphrased from the public posting) | Evidence in this repo |
|---|---|
| Customer-specific, playbook-sensitive judgment | The same wording gets different recommendations under three playbooks. The playbook, not the engine, defines "correct". |
| Reliable agentic and AI loops | Deterministic check → cite → abstain → human decision → audit, with no step that silently guesses |
| Evals and quality measurement | 8 labelled fixtures, explicit FP/FN, baseline vs candidate regression comparison, release gate |
| Shipping, not just discovery | A working app with tests, e2e flow, exports and documented results |
| Measuring whether bets worked | METRICS.md separates release guardrails from pilot metrics and calls out denominators and mix effects |
| Cross-functional work with legal and engineering | Rule IDs, versions and approvers are the shared language between playbook owners, reviewers and engineers |

## Why it's plausible for a product like Juro
Juro's public pages describe AI review against customer-controlled playbooks, responses that cite the playbook rule used, and users who accept, edit or skip suggestions. This concept explores one narrow extension of that public direction: making **abstention** and **measured error** first-class in the review UI. It does not claim Juro lacks these things. It is a self-directed exploration of the problem space.

## What I would do in the first 90 days (hypothetical)
1. Talk to reviewers and playbook owners about which errors cost the most trust, and confirm or kill A1 and A2.
2. Agree on an eval set and a false-negative definition with legal SMEs before changing any model behaviour.
3. Ship one measurable improvement to how abstentions are surfaced, behind a flag, with the guardrails in METRICS.md.

## Honest limits
This is a synthetic-data prototype with pattern-matching rules, not a model. It shows product judgment and how I'd frame evals. It does not show performance on real contracts.
