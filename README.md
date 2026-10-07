# Negotiation Decision Desk

**Independent concept by Ayo Ahmed. Not affiliated with Juro.** Synthetic data only. Not legal advice.

A clause review workspace that shows *which of your own playbook rules* each recommendation follows, what deviation that rule allows and who must approve it. When the playbook is silent, contradicts itself, or the rules cannot read the key term, it abstains and blocks auto-accept.

- Live demo: _see the completion notes. The URL is added once it is deployed and verified._
- Walkthrough video: _added once it is published and verified._

## In 30 seconds
When a customer sends back a marked-up contract, a legal reviewer decides clause by clause: accept, push back or escalate. Automated suggestions only help if the reviewer can check them against their own rules, and if the system stops instead of guessing when those rules run out. This desk puts your standard clause next to their wording, cites the exact playbook rule, shows the allowed deviation and approver, and refuses to auto-accept when a rule is missing or two rules conflict. Every accept, reject or edit is logged, and an eval suite counts how often the rules wrongly flag or wrongly wave through a clause.

**Why a customer would care:** faster first-pass review they can trust, because every recommendation is checkable, and the failures are measured instead of hidden.

## ELI5
Imagine your team has a rulebook for contracts: "we never let the other side make us pay unlimited damages". Someone sends back a contract with changes. This tool reads each change, finds the matching page in *your* rulebook and says "rule 4 says this is fine" or "rule 4 says ask Sam first". If the rulebook has no page for it, or two pages disagree, it says "I can't tell, a person has to decide" instead of guessing. Then it writes down what the person chose.

## What you can do in the app
1. Pick a contract (Larkspur: clean, Brightwater: heavily marked up) and one of three fictional playbooks (Fernbrook v4, Quayside v2, Alder v7).
2. Read your standard clause and their proposed clause side by side. The terms the rules read are highlighted.
3. See the recommendation: severity, rule ID and version, quoted guidance, acceptable deviation, approver, and a step-by-step trace.
4. Switch playbook and watch the same wording change from *within* to *deviation* to *escalate*.
5. Decide: auto-accept (only when within), accept (a note is required unless within), or reject and counter. Edit the wording and the rules re-run.
6. Check the audit trail, export a review memo, and open **Evals** to see 8 fixtures, FP/FN and the baseline-vs-current regression comparison. Export the eval report.

## Seeded examples
| Example | Playbook | Result |
|---|---|---|
| Larkspur, every clause | Fernbrook | Within playbook. Auto-accept is available. |
| Brightwater 2x liability cap | Fernbrook / Quayside / Alder | Deviation / within / escalate |
| Brightwater uncapped data indemnity | Alder | **Blocked:** AH-IN-01 and AH-IN-07 conflict |
| Any governing-law clause | Quayside | **Blocked:** missing rule |

## Run it
```bash
npm ci
npm run dev          # local app
npm test             # unit tests (Vitest)
npm run evals        # eval suite, writes docs/eval-report.md, fails if the release gate fails
npm run build        # production build to dist/
npm run test:e2e     # Playwright flow and overflow checks (run `npx playwright install chromium` first)
```

## Deploy
This is a static site. On Cloudflare Pages (free plan), use build command `npm run build`, output directory `dist`, and Node 20 or newer. It has no server, secrets or environment variables. The walkthrough video ships with the site at `/video/walkthrough.mp4`.

## What is synthetic or simulated
- All contracts, counterparties, playbooks, rule IDs, approvers and eval labels are fictional.
- There is one actor, "Reviewer (you)". No accounts, no integrations, no server. State lives in your browser's localStorage. Reset clears it.
- Clause reading is deterministic pattern matching for four clause types. No language model is used anywhere, and it does not understand contracts in general.

## Known limits
- Four clause types and a fixed set of phrasings. Unfamiliar wording is blocked, not guessed. That is intentional, but it means more manual review.
- One known false positive (fixture F7): the rules don't model initial-term exceptions for renewal notice.
- The eval set is 8 synthetic fixtures. It shows the method, not real-world accuracy.

## Docs
[PRD](docs/PRD.md) · [JTBD](docs/JTBD.md) · [Five whys](docs/FIVE_WHYS.md) · [Metrics](docs/METRICS.md) · [Assumptions and risks](docs/ASSUMPTIONS_RISKS.md) · [Viability memo](docs/VIABILITY.md) · [Test plan](docs/TEST_PLAN.md) · [Evals and test results](docs/EVALS.md) · [Eval report](docs/eval-report.md) · [V2 roadmap](docs/ROADMAP.md) · [Sources (checked 7 Oct 2026)](docs/SOURCES.md) · [Design](docs/DESIGN.md) · [Brand guide](docs/brand-guide.html)

## Credit
Designed and built by Ayo Ahmed. Juro and the Juro logo belong to their owner and are used only to identify the company this concept is addressed to.
