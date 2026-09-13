# Type ranks: a caption row, and a gate that reads a note on a story

Closes #310.

## Premises

**The decision was already taken.** Artur, companion round 9, 2026-09-13: *"Add a caption rank
(13px, normal weight)."* This branch builds that and does not reopen it. The `label` row is
untouched — an eyebrow, a table head and a nav caption keep their medium weight and `--muted` ink.

**The gap it closes.** `docs/specification.md#labels-and-titles` had five ranks and no row for a
sentence under a figure, so PR #298's Guidelines / The page borrowed `label`. The cost was written
into that PR's own body: `label` is medium and `body` is normal, so each caption read a shade
heavier than the 14.5px why printed under it, *despite being the smaller of the two*. The hierarchy
ran backwards.

**No version bump and no changelog entry**, by instruction — the lines are under
[Changelog entry](#changelog-entry) for the coordinator to sequence. Nothing under `src/` that the
tarball ships changed: the diff is the specification, one gate, one story and a shot script.

## What was found in the code

**One: the borrowed rank, measured.** In Chrome at 1200 wide, on `origin/main` at `233a1e7`, the
page's caption and the why under it compute to:

| | before | after |
|---|---|---|
| `.gc-cell__cap` — a caption | 13px / **500** / 20.15px | 13px / **400** / 20.15px |
| `.gc-why` — the why under it | 14.5px / 400 / 23.49px | unchanged |
| ink, both, light | `rgb(26, 30, 39)` | unchanged |
| ink, both, dark | `rgb(233, 231, 240)` | unchanged |

The weight is the only property that moves, and it moves on one selector.

**Two: two ranks now share a size.** `caption` is `--text-sm`, which is `label`'s size. The gate's
order rule was *each rank strictly smaller than the one above it*, and a sixth row at 13px under a
13px row fails it. That rule had to be restated rather than dodged: a rank is under the one above it
**by size, or — where two share a size — by weight**. `label` at medium against `caption` at normal
is what separates them, and it is the same distinction the reader sees on the page.

**Three: the gate could not see the subject.** `src/styles/type-ranks.test.js` read its rules out of
`kitSheetNames()`, which is the sheets `src/index.css` imports and nothing else. The caption lives in
a `<style>` block inside `stories/guidelines/_the-page.js`, so a note on it would have been a claim
nobody checked. #298 knew this and said so in the sheet — *"No rank note: the gate that reads those
sweeps `src/`, not `stories/`"* — and wrote its four restated rules as longhands *"against the day
its sweep arrives"*. This is that day.

**Four: what actually says "five".** `grep -rn "five"` over the tree, every hit read: four
statements are about the ranks — `docs/specification.md` line 17 and the rank paragraph,
`stories/foundations/Typography.stories.js`, and the gate's own first test name. The rest are about
easings, toast statuses, protected checks and a comment block's line budget. **`docs/guidelines.md`
carries no count at all** — the issue lists it, and it states nothing about ranks. Nothing was
edited there.

## What was done

**The row.** `docs/specification.md`, between `label` and `chip`:

| rank | size | weight | line-height | what takes it |
| --- | --- | --- | --- | --- |
| `caption` | `--text-sm` | `--weight-normal` | inherited | a sentence under a specimen, figure or screenshot |

The paragraph above it now says six ranks and states the tie-break; the paragraph below adds why a
caption keeps the body's weight; the *Held by* paragraph says the sweep reaches the stories and
pages this repo draws; and the *Decided in* paragraph names #310 and whose call it was.

**The gate.** `src/styles/type-ranks.test.js`:

- Its subjects are the kit's sheets in import order, then every `.css`, `.js`, `.jsx`, `.ts`, `.tsx`
  and `.mjs` file under `stories/`, `site/`, `react/src` and `.storybook` — walked, not listed, with
  build output pruned by the shared `walk()`. A gate's own file is skipped: the rank notes in its
  mutations are strings, not rules anybody renders.
- The order rule reads a weight token where two ranks tie on size, and says so in the failure:
  *"caption shares label's 13px and is not lighter than it (--weight-medium, 500 against
  --weight-medium, 500)"*.
- The note count moves 14 → 15, with the comment saying which note arrived and that it is the first
  one outside the kit's own sheets.
- One existing mutation used `caption` as the rank the table lacks; it now uses `footnote`, because
  `caption` is a real row and that mutation would have been caught for the wrong reason.
- A new mutation: the caption row set to the label's weight, which leaves nothing holding it under
  the label. It fails, and the failure names both ranks.

**The page.** `stories/guidelines/_the-page.js`: `.gc-cell__cap` carries `/* rank: caption */` and
`--weight-normal`. The comment above the four restated selectors no longer says the gate cannot
reach them.

**The Typography story** now names six ranks, caption among them.

**A producer for the evidence.** `scripts/evidence/guideline.mjs` and `guideline.html`, on the rail
rig's own `serve.mjs`: one static server over the checkout under test, the story's own
`guidelinePage()` call under Storybook's own theme decorator, one Chrome, one viewport — so between
two checkouts only the code differs and the before side is the same script pointed at `main`. It
takes any guideline page by name, and shoots the full page and a life-size crop of the first rule
that draws a specimen pair.

## Evidence

`docs/evidence/caption-rank/`, shot at 1200 wide, `deviceScaleFactor: 1`, both themes, before off
`origin/main` at `233a1e7` and after off this branch:

| | light | dark |
| --- | --- | --- |
| the page, before | `before-page-light.png` (1200 × 2628) | `before-page-dark.png` (1200 × 2628) |
| the page, after | `after-page-light.png` (1200 × 2608) | `after-page-dark.png` (1200 × 2608) |
| one rule, life size, before | `before-rule-light.png` | `before-rule-dark.png` |
| one rule, life size, after | `after-rule-light.png` | `after-rule-dark.png` |

The crop is the heading-order rule: two captions and the why under them in one frame, which is where
the weight is legible at 1:1.

**The 20px the page lost.** Eight captions, measured in the same browser: seven keep their height and
*"Twelve cards exceed the limit…"* falls from two lines to one — normal weight is narrower, so it
stops wrapping at 1200 wide. That is the whole height difference.

Reproduce either side:

```sh
export UI_PLAYWRIGHT=/path/to/playwright/index.mjs
export UI_CHROME=/path/to/chrome
node scripts/evidence/guideline.mjs . docs/evidence/caption-rank after
git worktree add --detach /tmp/before origin/main
node scripts/evidence/guideline.mjs /tmp/before docs/evidence/caption-rank before
```

## Decisions

| decision | who | where it is recorded |
| --- | --- | --- |
| a caption rank at 13px, normal weight | Artur, companion round 9, 2026-09-13 | issue #310; `docs/specification.md#labels-and-titles` |
| the `label` row keeps its medium weight and `--muted` ink | Artur, same round | issue #310 |
| `caption` sits between `label` and `chip`, not above `label` | this branch | the table reads down in decreasing prominence, and at equal size the lighter row is the lower one |
| a tie on size is broken by weight rather than by dropping the order rule | this branch | `src/styles/type-ranks.test.js`, and the sentence it reads in the specification |
| the rank-note sweep reaches `stories/`, `site/`, `react/src` and `.storybook` | this branch | the gate's own comment; #298 had asked for it in the sheet it could not gate |
| the three other restated rules on that page stay unnoted | this branch | they are #298's rules and outside this issue; noting them is additive and needs no decision from Artur — say the word and it is three lines |
| no version bump, no changelog entry | the coordinator's standing rule | this file, below |

## Proof

Pasted from the runs on this branch, not summarised:

```
npm test        — PENDING
npm run build   — ESM dist/index.js 39.58 KB, dist/index.css 2.06 KB, DTS dist/index.d.ts 8.49 KB, build success
react tests     — Test Files 17 passed (17), Tests 353 passed (353), Duration 20.46s
```

Focused, the four gates this diff touches or could break:

```
node --test src/styles/type-ranks.test.js stories/guidelines/letter-case.test.js \
            stories/guidelines/refs.test.js stories/guidelines/the-page.test.js \
            scripts/doc-refs.test.js
ℹ tests 81   ℹ pass 81   ℹ fail 0
```

## Reviews

_Left for the coordinator._

| review | who | findings | resolved |
| --- | --- | --- | --- |
|  |  |  |  |

## Changelog entry

```
Type ranks — a sixth rank, caption: --text-sm at --weight-normal, for a sentence under a
specimen, figure or screenshot. It is the first rank that does not take a size of its own: it
shares the label's 13px and is separated from it by weight, so the rank table's order rule now
reads "smaller, or the same size and lighter". Guidelines / The page had been borrowing the label
rank for its captions, which put a medium 13px line under a normal 14.5px one; its captions are
normal weight now.
The gate that holds the ranks, src/styles/type-ranks.test.js, reads /* rank: … */ notes from the
stories, site pages and React sources as well as from the sheets the kit ships — a rule drawn in a
story is now held by the same table.
```
