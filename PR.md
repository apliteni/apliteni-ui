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
| `.gc-cell__cap` — a caption | 13px / **500** / **20.15px** | 13px / **400** / **21.06px** |
| `.gc-why` — the why under it | 14.5px / 400 / 23.49px | unchanged |
| ink, both, light | `rgb(26, 30, 39)` | unchanged |
| ink, both, dark | `rgb(233, 231, 240)` | unchanged |

Two properties move, on one selector. The weight is the decision; the leading is the rank's word
*inherited* actually taking effect — see the review below, which is what found it.

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
| the page, after | `after-page-light.png` (1200 × 2614) | `after-page-dark.png` (1200 × 2614) |
| one rule, life size, before | `before-rule-light.png` | `before-rule-dark.png` |
| one rule, life size, after | `after-rule-light.png` | `after-rule-dark.png` |

The crop is the heading-order rule: two captions and the why under them in one frame, which is where
the weight is legible at 1:1.

**The 14px the page lost.** Eight captions, measured in the same browser. Seven keep their line count
and gain the 0.91px a line that 1.62 costs over 1.55 — 40px → 42px for the two-line ones, 20px → 21px
for the one-line ones. The eighth, *"Twelve cards exceed the limit…"*, falls from two lines to one:
normal weight is narrower, so it stops wrapping at 1200 wide. 2628px → 2614px is those two effects
against each other, and nothing else on the page moved.

**The rig's own cross-check**, which its README asks for before anything else it says is trusted:
the after pair re-shot on the same checkout is byte-identical to what is committed.

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
| a rank that inherits its leading may write `line-height: inherit`, and only that | this branch | the gate's own comment; it is the one value that takes back a number an earlier rule for the same element pinned |
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

## Review

One independent diff review ran on this branch before it was handed over. It was interrupted
partway — its four specialist passes never returned — so it is one critical pass, and what it did
not reach is listed with it. **Two findings, both real, both fixed and re-verified.**

**The caption claimed a leading it did not render.** The rank table says a caption's line-height is
*inherited*. The page's rule set size, weight and ink and left line-height out — but
`stories/guidelines/_layout.js` writes `.gc-cell__cap { font: 400 12px/1.55 … }` for the same
selector *earlier* in the cascade, and omitting a property does not take back a number an earlier
rule pinned. The rendered caption kept 1.55, a number of this page's own, which is exactly what the
comment four lines above says the page does not do. The gate could not see it: it refuses the `font`
shorthand *inside* a noted rule for this very reason, and here the shorthand sat in an unnoted rule
for the same selector. The three siblings on that page each reset their leading; the caption was the
only one that did not.

Fixed both halves. `.gc-cell__cap` writes `line-height: inherit`, and the gate now accepts `inherit`
— and only `inherit` — where a rank inherits its leading, with a mutation putting 1.55 back to prove
the check still bites. The caption's leading is `--leading-normal` from the body now, 21.06px against
20.15px, which is the second property in the before/after table above and the reason the page is
2614px rather than 2608px.

**The widened sweep could not read an HTML file.** `READ` listed `css`, `js`, `mjs`, `jsx`, `ts` and
`tsx`, while the sibling gate named beside it in the specification — `letter-case.test.js` — sweeps
the same four directories *including* `.html`. `site/index.html` and `site/changelog.html` each carry
a `<style>` block with a dozen `font-size` declarations, so a rank note written in one would have
been read by nobody, and the sentence this branch added to the specification — *"the stories and
pages this repo draws"* — would have overstated the gate. `html` is in the pattern now; the note
count is unchanged, because none of those files carries a note today. The same finding's second
half: `walk()` throws on a directory that is not there, where the sibling gate guards with
`existsSync`. It does too now — latent rather than live, all four exist.

**Verified clean by the same pass**, each against the tree rather than against this body: the note
count of 15; all eight of the original mutation tests still killing the case they name; the order
rule matching the sentence the specification now carries; the px figures 30/18/14.5/13/13/11 against
`tokens.css`; the `label` row untouched; and no statement of "five ranks" left anywhere — it read
every `grep -rni "five"` hit and found the rest to be about easings, shadows, stylesheets, statuses
and poll intervals.

**What the review did not reach**, stated because it was cut short rather than because it was
scoped out: this body and the evidence README were not fact-checked; `scripts/evidence/guideline.mjs`
was not reviewed; the other citation gates were not run by it (they are run below); and its red-team
pass never ran.

**One thing it raised that is deliberately not fixed here.** The sixteen other guideline pages still
take `.gc-cell__cap` from the shared sheet — 12px, medium-free but `--muted` — with no note, so the
new row does not describe them. That is #298's decision that only this page moves, and moving the
rest is a separate change with sixteen pages of evidence behind it.

| review | who | findings | resolved |
| --- | --- | --- | --- |
| diff review, one critical pass (interrupted before its specialist passes) | `diff-reviewer`, on this branch at `add05a0` | 2 real (1 × P1, 1 × P2) | both, with a gate mutation for the first and the note count re-run for the second |

_The rows below are the coordinator's._

| review | who | findings | resolved |
| --- | --- | --- | --- |
|  |  |  |  |

**`ai-slop-detector`**: PASS at paranoid over `PR.md`, the gate, the story and the shot scripts. One
warning stands on `docs/evidence/caption-rank/README.md` — `scope-template` on *"falls from two
lines to one"*, which is a measurement of two rendered line counts and not the enumerating-scope
cliché the rule is after. Left as written.

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
