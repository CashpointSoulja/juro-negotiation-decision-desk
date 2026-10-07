# Eval report: Negotiation Decision Desk rules engine

Generated: build time (deterministic fixtures). Synthetic fixtures. Deterministic rules, no language model. This is not legal advice.

**Release gate: PASS.** Rules: zero false negatives, zero regressions, at most 1 false positive.

## Metrics (n = 8 fixtures)

| Metric | v1-baseline | v2-current |
|---|---|---|
| Exact severity match | 3/8 | 7/8 |
| True positives (flagged, should flag) | 2 | 5 |
| True negatives (auto-accept, correct) | 2 | 2 |
| False positives (flagged, but within playbook) | 1 | 1 |
| False negatives (auto-accepted, should flag) | 3 | 0 |
| Abstained (blocked for human review) | 0 | 2 |
| Flagged with the wrong severity (safe mismatch) | 1 | 0 |

"Positive" means the clause is flagged (anything other than within playbook). A false negative is the dangerous case, because the clause would be auto-accept eligible when a reviewer says it should not be.

## Per-fixture results

| Fixture | Clause | Playbook | Expected | v1-baseline | v2-current | Regression |
|---|---|---|---|---|---|---|
| F1 | Liability cap | Fernbrook Software | Within playbook | Within playbook: TN (auto-accept, correct) | Within playbook: TN (auto-accept, correct) | unchanged-pass |
| F2 | Liability cap | Fernbrook Software | Acceptable deviation | Within playbook: FN (auto-accepted, should flag) | Acceptable deviation: TP (flagged, should flag) | fixed |
| F3 | Liability cap | Alder Health | Escalate | Escalate: TP (flagged, should flag) | Escalate: TP (flagged, should flag) | unchanged-pass |
| F4 | Indemnity | Quayside Payments | Within playbook | Within playbook: TN (auto-accept, correct) | Within playbook: TN (auto-accept, correct) | unchanged-pass |
| F5 | Indemnity | Fernbrook Software | Escalate | Within playbook: FN (auto-accepted, should flag) | Escalate: TP (flagged, should flag) | fixed |
| F6 | Indemnity | Alder Health | Blocked: human review | Escalate: TP (flagged, should flag) | Blocked: human review: TP (flagged, should flag) | fixed |
| F7 | Renewal & notice | Fernbrook Software | Within playbook | Acceptable deviation: FP (flagged, but within) | Acceptable deviation: FP (flagged, but within) | unchanged-fail |
| F8 | Governing law | Quayside Payments | Blocked: human review | Within playbook: FN (auto-accepted, should flag) | Blocked: human review: TP (flagged, should flag) | fixed |

## Fixture rationale and v2 citations

- **F1**: Matches the Fernbrook standard cap exactly. v2 cites: FB-LC-01 v4.
- **F2**: 2x is above preferred 1x but within the 2x deviation that needs Commercial Counsel approval. Written in words, not digits. v2 cites: FB-LC-01 v4.
- **F3**: Alder never accepts uncapped liability. v2 cites: AH-LC-01 v7.
- **F4**: Mutual IP indemnity inside the cap. v2 cites: QP-IN-01 v2.
- **F5**: Takes a data indemnity outside the cap through a carve-out, without using the word "unlimited". Fernbrook only allows IP outside the cap. v2 cites: FB-IN-01 v4.
- **F6**: AH-IN-01 says never uncapped, while the AH-IN-07 data addendum allows it with DPO approval. The playbook conflicts, so a human must decide. v2 cites: AH-IN-01 v7, AH-IN-07 v7.
- **F7**: Reviewer label: Fernbrook's commercial team treats 30 days as fine after a 36-month initial term. The rules do not model initial-term exceptions (known false positive). v2 cites: FB-RN-01 v4.
- **F8**: Quayside has no governing-law rule. Silence is not approval. v2 cites: no rule (missing).
