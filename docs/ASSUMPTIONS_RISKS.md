# Assumptions and risks

## Assumptions
| # | Assumption | How to test |
|---|---|---|
| A1 | Reviewers value a rule citation more than a fluent explanation | Usability test: same suggestion with and without the citation block. Measure accept-without-edit. |
| A2 | Playbooks have real gaps and conflicts often enough to matter | Audit a sample of customer playbooks (with consent) for clause types with no rule and for overlapping rules |
| A3 | Abstaining is acceptable to users if the reason is specific | Track whether blocked clauses get resolved faster than unexplained low-confidence flags |
| A4 | Four clause types are enough to learn from | They cover high-frequency, high-risk negotiation points. Expand only after the eval process works. |

## Risks
| Risk | Severity | Mitigation in this prototype |
|---|---|---|
| False negative: risky wording auto-accepted | High | FN is the release gate. Unreadable wording blocks instead of defaulting to accept (the v1 baseline bug). |
| Over-flagging erodes trust (false positives) | Medium | FP tolerance is explicit (≤1). F7 is a known FP and is documented, not hidden. |
| Pattern rules are brittle against new phrasing | High | Word-number and carve-out handling added in v2. Every new miss becomes a fixture. Blocked beats wrong. |
| Users read the output as legal advice | High | Persistent notice, memo disclaimer, and a human owns every decision |
| Playbook switch leaves old decisions looking valid | Medium | Decisions are keyed to playbook ID and marked stale on switch |
| Synthetic fixtures don't reflect real markups | High | Stated plainly. V2 roadmap starts with a labelled real-world sample under customer consent. |
