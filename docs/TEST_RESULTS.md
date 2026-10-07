# Test results

Final run on 7 October 2026 (UTC), Node 22, Chromium from Playwright. The output below is verbatim, with colour codes and per-test timings removed. The commands are listed in [TEST_PLAN.md](TEST_PLAN.md).

```text
$ npm run typecheck
exit code: 0

$ npm test
 ✓ tests/unit/engine.test.ts (12 tests) 10ms
 ✓ tests/unit/evals.test.ts (6 tests) 10ms
 ✓ tests/unit/store.test.ts (6 tests) 9ms
 Test Files  3 passed (3)
      Tests  24 passed (24)
exit code: 0

$ npm run evals
F1 expected=within v1=within(TN) v2=within(TN) unchanged-pass
F2 expected=deviation v1=within(FN) v2=deviation(TP) fixed
F3 expected=escalate v1=escalate(TP) v2=escalate(TP) unchanged-pass
F4 expected=within v1=within(TN) v2=within(TN) unchanged-pass
F5 expected=escalate v1=within(FN) v2=escalate(TP) fixed
F6 expected=blocked v1=escalate(TP) v2=blocked(TP) fixed
F7 expected=within v1=deviation(FP) v2=deviation(FP) unchanged-fail
F8 expected=blocked v1=within(FN) v2=blocked(TP) fixed
v1 {"total":8,"exact":3,"tp":2,"tn":2,"fp":1,"fn":3,"abstained":0,"safeMismatch":1}
v2 {"total":8,"exact":7,"tp":5,"tn":2,"fp":1,"fn":0,"abstained":2,"safeMismatch":0}
gate PASS 
exit code: 0

$ npm run build
✓ 39 modules transformed.
dist/index.html 0.73 kB │ gzip: 0.43 kB
dist/assets/index-gaRSJ96P.css 10.65 kB │ gzip: 2.94 kB
dist/assets/index-DRZyn0hu.js 186.25 kB │ gzip: 58.90 kB
✓ built in 9.07s
exit code: 0

$ npm run test:e2e -- --reporter=list
  ✓  1 flow.spec.ts:3:1 › seed → checks → success → blocked → export
  ✓  2 flow.spec.ts:66:3 › no horizontal overflow at desktop
  ✓  3 flow.spec.ts:66:3 › no horizontal overflow at tablet
  ✓  4 flow.spec.ts:66:3 › no horizontal overflow at phone
  4 passed
exit code: 0
```

## Visual evidence
Screenshots of the production build are in [`screenshots/`](screenshots/). Each one was inspected by eye.

| Width | Review | Blocked exception | Evals |
|---|---|---|---|
| Desktop 1366px | [desktop-review](screenshots/desktop-review.png) | [desktop-blocked](screenshots/desktop-blocked.png) | [desktop-evals](screenshots/desktop-evals.png) |
| Tablet 820px | [tablet-review](screenshots/tablet-review.png) | [tablet-blocked](screenshots/tablet-blocked.png) | [tablet-evals](screenshots/tablet-evals.png) |
| Phone 390px | [phone-review](screenshots/phone-review.png) | [phone-blocked](screenshots/phone-blocked.png) | [phone-evals](screenshots/phone-evals.png) |

### Issues found by inspection and fixed
- **Phone eval table:** the 6-column table forced sideways scrolling at 390px. Below 640px it now stacks into labelled cards.
- **Ambiguous accessible names:** "Playbook" matched both the section and the select. The selects now carry explicit `aria-label`s.
- **Silent exports:** the export status was only visible to screen readers. It now shows as a visible toast that names the file and is still announced politely.
- **Two eval downloads from one click:** some browsers block that. Markdown and JSON are now separate buttons.
