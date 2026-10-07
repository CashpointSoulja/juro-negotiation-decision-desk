# Brand sheet (written before any UI code)

Source: juro.com/negotiate and juro.com/ai-contract-review, inspected at 1366px desktop and 390px mobile, plus the product illustrations on those pages (version tabs, redline suggestions, approval timeline).

## What the product UI looks like
- Warm off-white canvas (`#f2f0ed`) fading into a pale mint wash (`#e0f1e9` → `#d4f1e6`).
- White document cards, ~24px radius, soft long shadow, no hard borders.
- Version tabs: "1. Original / 2. External / 3. Internal" with a timestamp on the right and an uppercase outline pill (`DRAFT`, `SENT BY THEM`, `TO REVIEW`).
- Redlines highlight clause text in mint (accepted/suggestion) or pink (needs a decision), and each one is linked to a comment card with a round initial avatar.
- Primary action is a soft butter-yellow pill ("Send back new version", `#fbe98b` with dark olive text).
- Timeline: grey "Draft" bar, then a yellow "Approval" bar, with rows of activity icons.
- Section headings pair an olive (`#7a6a00`) or maroon (`#7a0f1e`) lead phrase with black text.

## Type
- Display: Kazimir (proprietary). Fallback: **DM Serif Display** (OFL) for headings.
- UI/body: Cera Pro (proprietary). Fallback: **Outfit** (OFL), a geometric sans that's close in shape.
- Both fallbacks are bundled through Fontsource, so there are no external font requests.

## Colour tokens
| token | hex | use |
|---|---|---|
| canvas | `#f2f0ed` | page background |
| mint-wash | `#e0f1e9` | gradient, panels |
| mint | `#8ff0d0` | accept/within-playbook highlight |
| pink | `#ffb8c6` | deviation highlight |
| butter | `#fbe98b` | primary action |
| olive | `#7a6a00` | heading lead phrase |
| maroon | `#7a0f1e` | refusal / walk-away |
| ink | `#111111` | text |
| muted | `#8a8580` | timestamps |

## Logo
The official Juro wordmark is the inline SVG from the juro.com navbar (`viewBox 0 0 66 27`, `fill="currentColor"`), copied verbatim to `public/brand/juro-logo.svg`. It sits top-left next to "Negotiation Decision Desk" and the label "Independent concept by Ayo Ahmed. Not affiliated with Juro."

## Product UI principles applied to this concept
- **Side by side, not chat.** The original clause and the counterparty's proposed clause sit next to each other, styled like Juro's "Original / External" version tabs, so the reviewer reads a redline instead of a chatbot answer.
- **Every recommendation carries a citation.** Each decision card names the playbook rule ID, the version, and the text of the acceptable deviation, the same way Juro says each AI redline shows which playbook rule was used.
- **Abstain loudly.** When the rule is missing or two rules conflict, the card turns maroon, the "Accept" action is disabled and the label reads "Blocked: needs human review". Nothing auto-accepts without a matching rule.
- **Severity uses Juro's highlight language.** Mint means within playbook, butter means acceptable deviation (approval needed), pink means escalate, maroon means blocked.
- **The audit trail looks like Juro's activity timeline.** Version, actor initial avatar, action icon and timestamp on one row.
- **The primary action is a butter pill** ("Record decision"). Secondary actions are outline pills. Export actions sit in the header, the way "Send back new version" does.

## Accessibility
- Text contrast is at least 4.5:1 (ink on canvas, olive on white, white on maroon).
- Colour is never the only signal: every severity also has a text label and an icon glyph.
- Every control is a native button, select or textarea with a visible focus ring (2px ink outline, 2px offset).
- Layout: three columns at 1280px and above, two at 820px, one at 390px. No horizontal scroll at any width.
