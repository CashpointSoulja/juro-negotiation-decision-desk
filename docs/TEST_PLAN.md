# Test plan

| Layer | Tool | What it proves | Command |
|---|---|---|---|
| Type safety | TypeScript (strict) | Engine, store and UI compile with no type errors | `npm run typecheck` |
| Unit: extraction and rules | Vitest | Each clause type reads its key term. Word numbers and cap carve-outs are handled. Spans point at the matched text. | `npm test` |
| Unit: playbook sensitivity | Vitest | The same wording gives different severities under Fernbrook, Quayside and Alder | `npm test` |
| Unit: abstention | Vitest | Missing rule, conflicting rules, unreadable terms and ambiguous wording (cap carve-outs, mixed mutual/one-way indemnity, a second governing law, an auto-renewal with no fixed term length) all block and disable auto-accept | `npm test` |
| Unit: decisions and audit | Vitest | Auto-accept is refused when not within. Accepting a non-within clause needs a note. Edit re-evaluates and clears the prior decision. Reset. Corrupt or malformed saved state is discarded in full, the memo never crashes, and decisions made against a different result are marked stale. Memo table cells escape pipes and line breaks from reviewer notes. | `npm test` |
| Unit: memo | Vitest | The memo carries citations, stale-decision markers and the disclaimer | `npm test` |
| Eval suite | vite-node script | 8 fixtures, baseline vs current, FP/FN, regression status, release gate. Writes `docs/eval-report.md`. Exits non-zero if the gate fails. | `npm run evals` |
| Production build | Vite | The app bundles for static hosting | `npm run build` |
| End-to-end flow | Playwright (Chromium) | Seed → checks → successful auto-accept → playbook switch to missing rule → conflicting-rule block → override needs a note → reject → edit re-evaluation → memo download (content checked) → eval report download → reset | `npm run test:e2e` |
| Responsive overflow | Playwright | No horizontal scroll on Review, Evals and About at 1366, 820 and 390px | `npm run test:e2e` |
| Visual inspection | Screenshots, reviewed by eye | Readability, wrapping and hierarchy at desktop, tablet and phone | see `docs/screenshots/` |

## Manual checks
- Keyboard: tab through tabs, selects, clause list, decision buttons and note field. Focus ring is visible on each.
- Screen reader: status messages are announced through a polite live region. Block and error messages use `role="alert"`.
- Disabled auto-accept explains itself in text, not only through colour.
