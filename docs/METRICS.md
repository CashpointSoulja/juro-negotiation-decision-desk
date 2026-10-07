# Metrics and success criteria

## North star
**Trusted first-pass rate:** the share of clauses where the reviewer's final decision matches the desk's recommendation *without an edit*, measured only on clauses the desk did not block.

Denominator: non-blocked clauses reviewed in the period. Blocked clauses are reported separately, so abstaining can never inflate the rate.

## Guardrails (release-blocking)
| Metric | Definition | Target | Prototype result (v2) |
|---|---|---|---|
| False negatives | Labelled "should flag" but the engine marks it within (auto-accept eligible) | 0 | 0 of 8 fixtures |
| Regressions | Fixture correct in baseline, wrong in candidate | 0 | 0 |
| False positives | Labelled within, but the engine flags it | ≤ 1 per 8 fixtures | 1 (F7) |

## Diagnostic metrics
- **Abstention rate** by reason (missing rule, conflict, unreadable). High "missing rule" is a playbook-coverage problem, not an engine problem. Route it to the playbook owner.
- **Override rate:** human accept against a non-within recommendation. Rising overrides on one rule ID suggest the rule is stale.
- **Stale-decision rate** after a playbook switch.
- **Time to decision per clause**, split by severity. Only meaningful with real usage, so it is not measured in this prototype.

## How we'd know the bet worked (pilot design)
- Compare cohorts of reviewers with and without citations shown, on the same clause mix. Report the clause-type mix, because a cohort that sees more governing-law clauses will look faster for reasons unrelated to the desk.
- Success: trusted first-pass rate up by a meaningful margin, with false negatives in the human-labelled audit sample held at 0. With fewer than about 30 decisions per arm, report "insufficient data" and hold the decision.

## What the prototype actually measures
Only the eval suite (8 synthetic fixtures). Every usage metric above is a design for a pilot, not a result.
