# #310 — the caption rank

`Guidelines/The page` at 1200px wide, in both themes, before and after the `caption` row
(`docs/specification.md#labels-and-titles`). Before is `origin/main` at `233a1e7`; after is this
branch.

| | light | dark |
| --- | --- | --- |
| the page, before | `before-page-light.png` | `before-page-dark.png` |
| the page, after | `after-page-light.png` | `after-page-dark.png` |
| one rule, life size, before | `before-rule-light.png` | `before-rule-dark.png` |
| one rule, life size, after | `after-rule-light.png` | `after-rule-dark.png` |

**Shot by `scripts/evidence/guideline.mjs`**, which is the rail rig's own server with the story's
`guidelinePage()` call in the page and Storybook's theme decorator over it — so between the two
checkouts only the code differs. The crop is the first rule that draws a specimen pair: two
captions and the why under them in one frame, at 1:1, which is where a weight is legible.

The weight was read off the rendered page rather than judged by eye. In the same browser, both
themes:

| | before | after |
| --- | --- | --- |
| `.gc-cell__cap` | 13px / 500 / 20.15px | 13px / 400 / 21.06px |
| `.gc-why` | 14.5px / 400 / 23.49px | unchanged |
| ink, light | `rgb(26, 30, 39)` | unchanged |
| ink, dark | `rgb(233, 231, 240)` | unchanged |

The leading moves because the rank inherits one: the shared sheet's `font` shorthand had pinned
1.55 on this selector, and the page's rule says `inherit` now, which is the body's 1.62.

**The page is 14px shorter after**, 2628 → 2614. Seven of the eight captions keep their line count
and gain the 0.91px a line the looser leading costs; the eighth, "Twelve cards exceed the limit…",
falls from two lines to one, because normal weight is narrower and it stops wrapping at this width.
Nothing else on the page moved.
