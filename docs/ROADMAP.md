# V2 roadmap

Ordered by what would most reduce risk to the core hypothesis.

1. **Real-world eval sample.** 100+ consented, anonymised clause markups labelled by two reviewers, with inter-rater agreement reported. Synthetic fixtures stay as regression tests.
2. **Fix the known false positive (F7).** Model initial-term exceptions for renewal notice, as a playbook-owned rule rather than an engine special case.
3. **Playbook health view.** Aggregate blocks by reason and rule ID so owners can fill gaps (e.g. Quayside's missing governing-law rule) and resolve conflicts (Alder AH-IN-01 vs AH-IN-07).
4. **Approval routing.** Turn "accept with approval from Commercial Counsel" into a real approval request, with SLA and audit.
5. **Model-assisted extraction behind the same contract.** Let a model propose the extracted term and span. The deterministic rule still decides, and disagreement between model and pattern extraction blocks. Gate on the same FN = 0 eval.
6. **More clause types.** Data protection, payment terms, termination for convenience, SLA credits. Each ships with fixtures first.
7. **Multi-user audit.** Named reviewers, immutable log, exportable for compliance.
