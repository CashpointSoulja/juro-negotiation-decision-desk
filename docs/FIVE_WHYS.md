# Five whys

**Observed pattern (hypothesis drawn from public material on playbook-based review, not a claim about any company's data):** reviewers re-check automated redline suggestions instead of accepting them.

1. **Why do reviewers re-check suggestions?** Because they can't tell at a glance whether a suggestion reflects *their* position or a generic market norm.
2. **Why can't they tell?** Because the suggestion and the playbook rule it relies on are not shown together with the specific term that triggered it.
3. **Why does that matter so much?** Because the same wording can be fine for one team and unacceptable for another (a 2x cap is within for a speed-first seller and an escalation for a regulated one). Correctness depends on the playbook.
4. **Why isn't a correct-looking answer enough?** Because playbooks are incomplete and sometimes contradict themselves (a general indemnity rule vs a data addendum). A system that answers anyway hides the cases most likely to hurt.
5. **Why does hiding them hurt adoption?** Because one wrongly accepted clause costs more trust than many correct ones earn. Reviewers rationally fall back to checking everything.

**Root cause:** suggestions are not *accountable*. They lack a citation, a stated tolerance and an honest "I don't know".

**Product response:** cite every recommendation, show the allowed deviation and approver, abstain loudly on missing, conflicting or unreadable rules, and measure false negatives as the release-blocking metric.
