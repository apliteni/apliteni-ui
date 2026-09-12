# A stat band for key figures: three layouts, tiles by default

Closes #267.

## Premises

**What this is about.** The finance portal shows its key figures in a strip, and each screen
builds its own out of a kit card and local CSS. The one on Company Overview reads like a grey
form, not like the numbers a reader came to see.

**What I found.** The issue blames the card. The card is fine; the kit has nothing for what
goes inside it.

- The kit ships no stat component. Nothing in `src/` is named stat, kpi or metric, and the
  kit's own `Apps / Finance report` story built its strip with inline styles and a local
  container query.
- The portal has built three strips of its own: `fin-kpi` on Overview, `fin-report__kpi` on
  the non-fee report and `fin-adm__kpi` on the admin hub. They disagree on the value size
  (18px, 30px, 18px), on label tracking (0.14em, 0.04em, 0.12em) and on what holds the figures
  (one card with hairlines, nothing, a bordered tile each).
- The portal's own plan already lists "`ui-kpi-row` does not exist" as a kit gap, under
  finance #632 — line 325 of the M2 replatform plan, in the `finance.apli.tech` tree.
- The rejected card's faults are kit parts used for the wrong job. The value is 18px, the same
  step as a card title. The change is a `ui-badge`, a 10px uppercase status chip, and what it is
  measured against lives only in a hover `title` (`web/src/components/KpiBand.tsx:151`).

**What I did.** Added a stat band to the kit (`statBand()`, `.ui-stats`, and `<StatBand>` in
React), built it in three layouts, and put them in front of Artur to choose the default. He picked
A · Band on 2026-09-11 and, having seen it shipped, picked **B · Tiles** on 2026-09-12. Tiles is
the default here; A and C are still `variant`s, and the colour rule is unchanged. Moving the
default also moved the band's caption, which is the second decision below.

**The verdict: Changed.** The problem is real, but it is in what the card holds, not in the card.

**Does it depend on #268?** No. The band's labels are its own class, `.ui-stat__label`, set
in sentence case. `ui-eyebrow` is untouched, and so is its only appearance here: the "before"
don't on the guidelines page, which shows the rejected card as it is.

## Decision record for the issues

**The default layout: B · Tiles.** Chosen by Artur on 2026-09-12, on this PR at `e7c7f92`,
after seeing A · Band shipped. A · Band was the first pick, on 2026-09-11, from the three rendered
over the same four figures in both themes; this is the second look at the same three pictures, not
a fresh derivation. Nothing is dropped either way — all three layouts ship, and the decision is
only which one a caller gets for naming none.

| | | Why |
|---|---|---|
| **B · Tiles** | **chosen** | A card per figure. Each number is its own box, which is what the page actually has — four figures, not one object — and a figure can become a link to its drill-down without the row around it changing. |
| A · Band | an option | One card, figures divided by space. It keeps the Overview's footprint and adds no borders the page does not already have, which is why it was picked first. Against the tiles it reads as one object, and the divisions between the figures are space alone. |
| C · Open | an option | Four rules across the page, and a 40px value. The figures come out louder than the 30px page title above them, so the screen has no first thing to read. |

**The band's caption goes above the figures**, in every layout — the second decision the change of
default forced, set out under [Where the caption goes](#where-the-caption-goes) below. Under a row
of separate cards it read as a note on the last one.

**The colour rule: colour by news, not by direction.** Confirmed by Artur on 2026-09-11 and
already what the branch shipped. The caller says whether a change is good news, bad news, or
neither, and the band paints that and nothing else; the sign of the number never picks a colour.
An arrow, read off the sign the caller printed, is what says which way the figure went. What this
buys is in `#610`: a rising cost is not congratulated, and a falling count of unclassified rows
is not a warning.

**The issue's open question — does a stat band belong in the kit? Yes.** Four reasons, set out
under [Is a stat band in scope for the kit?](#is-a-stat-band-in-scope-for-the-kit-yes) below: it
is already built three times over, the portal's own replatform plan asks for it, its rules are
not the portal's to decide alone, and it is small — a factory, one stylesheet and no chart.

**Still open, and not this PR's to close.** The portal plan's `ui-kpi-row` needs renaming to the
name that shipped, and the Overview needs to render `<StatBand>` — neither can happen until this
is released, because the portal installs a published version.

## Proof

- [x] A person met it in something running: Artur chose the default from the Storybook gallery,
      in both themes, on 2026-09-11, and chose again on 2026-09-12 having seen the first choice
      shipped.
- [x] The three layouts are compared over the same four figures, with the same sparklines.
- [x] Every `stat-*` picture in this body was re-shot at the head of this branch, at one viewport
      (1440x900, dpr 2), light and dark, in one browser — except the portal reconstruction, which
      is named below and cannot be re-shot from this repository.
- [x] The kit's own example shows every verdict a caller can give: a rise that is good news, a
      rise that is bad news, a fall that is good news, and a change nobody declared.
- [x] Nothing overlaps at any width: every layout at two, three and four figures, measured in
      Chrome from 1500px down to 300px in 10px steps.
- [x] Every guideline cites kit code, and `refs.test.js` resolves each citation.
- [ ] Exercised in the finance portal. Not done and not claimed: the portal installs a
      published version, so this can only be proven after a release. What would settle it is
      `KpiBand.tsx` rendering `<StatBand>` and `overview.css` losing its `fin-kpi` rules.

## The colour rule, and what the example shows

Colour answers "is this good?". The arrow answers "which way?". They are separate, and only the
caller can answer the first, so the band never guesses it.

The four Overview figures carry the four answers, on the Gallery, on the guidelines page, in
the React story and in both parity fixtures — so the rule is drawn wherever it is stated:

| Figure | Change | Declared | Drawn |
|---|---|---|---|
| Income | ↑ +47.1% | `tone: 'good'` | green — a rise that is good news |
| Cost | ↑ +12.4% | `tone: 'bad'` | red — the same arrow, the opposite news |
| Net cashflow | ↑ +168.0% | nothing | neutral |
| Unclassified | ↓ −61.8% | `tone: 'good'` | green — a fall that is good news |

Income and Cost are the pair that makes the rule visible: both rose, and they are not the same
news, so the same arrow is green on one and red on the other. A band that painted by the sign
would make them both green.

**What neutral means.** Neutral is the band saying nothing about the news. It is what a change
gets when nobody declares a tone, and `tone: 'neutral'` says the same thing out loud. An
undeclared change still draws its arrow and still says what it is measured against — it is the
colour, and only the colour, that is withheld.

**When to leave it undeclared.** When the screen has no verdict to give: a volume nobody scores,
a figure whose good direction depends on who is reading it, or one the figures beside it have
already accounted for. Net cashflow is the third of those — it is income less cost, and those two
have already said whose news it is.

A change with no earlier figure is a separate thing and takes no tone at all: there is no news to
colour, so it says so in words rather than showing `+0%`.

## Inventory: what the kit offered for a stat band

| Asked for | In the kit before this PR |
|---|---|
| A row of figures | Nothing. `ui-card` plus whatever the page builds inside it |
| A figure's label | `ui-eyebrow`, a generic uppercase caption |
| A figure's value | Nothing. Each consumer sets its own size and weight |
| A change against a period | Nothing. The portal borrowed `ui-badge`, a status chip |
| A trend | Nothing. The portal draws its own SVG |
| Folding at narrow widths | Nothing. Two consumers wrote two container queries (620px; 60rem and 30rem) |

## What the portal already tried

Read from the finance issues before anything was proposed here.

- **#610** (closed) was four bugs in the Overview's KPI strip: `€` wrapping onto its own line,
  two currency placements, captions under each figure in three different patterns, and a list
  labelled with the wrong month. The band takes the two that are layout. A value is `nowrap`
  and a figure never shrinks below it. The captions become one caption under the band. Currency
  placement stays with the portal's formatter, which already owns it.
- **#632** (closed) lists "`ui-kpi-row` does not exist" among the kit gaps and asks that it
  exist, or that the Overview plan be corrected. It exists now as `statBand()` / `.ui-stats`
  rather than `ui-kpi-row`, because `ui-kpi-row` was a name remembered in a plan, not a
  convention the kit had. **The portal plan's `ui-kpi-row` needs renaming to match.**
- **#446** (closed) set the shape this issue follows: redesign with the kit, show variants in
  both themes.
- Nothing in these was tried and rejected that this proposal repeats. The portal's own
  `KpiBand.tsx` already shows direction with the arrow rather than colour, and keeps green
  for net cashflow alone. The band's `tone` does exactly that, and the portal's interactive
  sparkline fits its `trend` slot unchanged.

## Is a stat band in scope for the kit? Yes

The issue left this open. Four reasons it belongs in the kit rather than in the portal:

1. **It is already repeated.** Three portal screens and one kit story each built one, and
   they came out different.
2. **The portal asked for it.** Its replatform plan says to contribute kit gaps upstream
   rather than fork them, and lists this one.
3. **The rules are not the portal's.** A figure that must not break, a change coloured by
   good or bad news rather than by direction, a comparison a phone can read: any screen with a
   key figure needs these, and #610 showed what it costs when each call site decides them.
4. **It is small.** A factory, one stylesheet, and no chart. The trend is a slot for the
   caller's `<svg>`, which keeps the kit out of charting (now stated under "What the kit does
   not do").

## The survey

Fourteen systems, read from their own source or docs on 2026-09-11, not from memory. It
stays here rather than in `docs/`, as
[`docs/README.md`](docs/README.md#where-a-decision-gets-recorded) says it should.

| System | What ships | Container | How a change is coloured | Value |
|---|---|---|---|---|
| Chakra v3 `Stat` | label, value, unit, help text, up and down indicators | none; root is a `<dl>` | by direction: `[data-type=up]` gets `fg.success` | `2xl` semibold, `proportional-nums` |
| Chakra v2 `Stat` | `StatArrow type="increase"\|"decrease"` | `StatGroup` | by direction, fixed green and red | `2xl` semibold |
| Ant Design `Statistic` | `title`, `value`, `prefix`, `suffix`; no change part | none; the demo wraps each in a `Card` | hard-coded in the demo only | 24px |
| Tremor v3 `BadgeDelta` | label, value, delta badge, spark chart | a card each | **tone split from direction:** `deltaType` plus `isIncreasePositive` | `text-tremor-metric` |
| Shopify metrics card | heading, value, trend badge | **one section, dividers between figures** | `tone` and `icon` are separate attributes | plain text |
| Mantine StatsGrid / StatsGroup | title, value, diff, "Compared to previous month" | a card each, or one strip with dividers | by sign, teal and red | 24px / 32px bold, **uppercase** labels |
| MUI dashboard `StatCard` | title, value, interval, trend chip, sparkline | a card each | `trend: 'up'\|'down'\|'neutral'` | `h4` |
| shadcn/ui `SectionCards` | label, value, trend badge, footer | a card each | **no colour** at all | `text-2xl`, `tabular-nums` |
| Cloudscape `KeyValuePairs` | label, value, info | one container, 1 to 4 columns | no change concept | "Display large light" |
| Atlassian `MetricText` | typography only | none | none | 24 to 28px bold |
| Salesforce page header | detail blocks in one row | one header | none | not verified |
| Carbon, Primer, Fluent 2, GOV.UK, USWDS | **nothing** | | | |
| Radix Themes, Material 3 | nothing found; not fully verified | | | |

**Where they disagree.** The container: a card per figure (shadcn, MUI, Mantine, Tremor), one
strip (Shopify, Mantine's group, Salesforce), or nothing (Chakra, Ant, Atlassian). Colour: only
Tremor v3 separates good news from direction; Chakra, Mantine and Ant tie colour to the sign;
shadcn uses none. Label case: uppercase in Mantine, sentence case in Tremor, MUI and shadcn.

**Where they agree.** The value is about 24 to 30px and semibold or bold.

**What nobody does, and what this PR does about it.**
1. No system says how to announce a change together with what it is measured against. Chakra
   v2 had hidden "increased by" text and v3 dropped it. **Here every change points at the
   caption that names its comparison** (`aria-describedby`), and a gate walks every story to
   hold it.
2. Only Tremor v3 has a "lower is better" switch. **Here tone is the only thing that colours a
   change**, and a rise with no tone stays neutral.
3. No core stat component takes a sparkline. **Here the trend is a slot**, sized and coloured
   by the kit and drawn by the caller.

## The layouts, and the default

Storybook: **Components / Stat band → Gallery** shows all three over the same four figures, in
both themes, in the order they were put in front of Artur. B · Tiles is the default; the other two
are a `variant`.

![The three layouts, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-variants-light.png)
![The three layouts, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-variants-dark.png)

| | Surface | Value | On Overview |
|---|---|---|---|
| A: Band | one card, figures divided by space | 30px | the same footprint as today: one card at the top of the stack |
| **B: Tiles** (default) | a card per figure | 30px | four boxes where there was one; each could become a link |
| C: Open | none; a rule over each figure | 40px | leaves the card stack; its numbers outsize the 30px page title |

```js
statBand({ stats, basis })                     // B, the default
statBand({ stats, basis, variant: 'band' })    // A
statBand({ stats, basis, variant: 'open' })    // C
```

The letters are the identities the three were reviewed under and they have not moved; only the
default has. A caller on A keeps A by naming it.

## Where the caption goes

Making tiles the default forced a question the review had already pointed at. In A · Band the
caption — *Change against the previous 12 months* — was inside the one card that held the figures,
and it read as that card's own footer. In B · Tiles the same line sat under four separate boxes
with nothing around it. Three places were on the table:

| Where | Reads as | |
|---|---|---|
| Under the row, which is what A shipped | a note on the last card. Nothing marks it as belonging to all four rather than to the box directly above it | rejected |
| Inside the first tile | that one figure's comparison. The band already has that slot — `delta.basis`, printed beside the change — so a shared statement in the same place says the wrong thing twice | rejected |
| **Above the row, as the row's caption** | **one statement about every figure, read before the numbers it explains** | **chosen** |

Three reasons for the third, in the order they decided it.

1. **A caption that governs a group comes first.** That is what `<caption>` is on a table and what
   a column head is over a column: the reader is told what the numbers mean before meeting them.
   *Change against the previous 12 months* read ahead of the row does work; read after it, it is a
   correction.
2. **Above the row it is outside every figure, and visibly so.** Under a row of tiles there is
   always a nearest card, and a reader attaches a loose line to it. Above the row there is nothing
   to attach it to but the row.
3. **It is one rule, not a rule per layout.** The caption does not move when a caller changes
   `variant`, so switching from tiles to the band does not reorder what a screen reader says. That
   was the alternative — leave it under the band and lift it only for tiles — and a component whose
   reading order depends on its surface is a component with two contracts.

Nothing about reachability changes: every change still points at the caption with
`aria-describedby`, which resolves by id and not by position, and a figure measured against
something else still carries its own basis beside its change. What is new is that
`stories/stat-basis.test.js` now also fails a caption that has slipped under its figures or into
one of them, and carries the two mutations that prove the check can fail.

`.ui-stats__basis` keeps its `--space-5` of air; the margin moved from its top to its bottom.

## How it folds

A figure never breaks and never overlaps the next. That holds by construction: a figure's
minimum width is its value's, so a band too narrow for its figures wraps. On top of that, fold
points keep a figure from sitting alone on a row. Measured in Chrome over each layout. The widths
here are the band's outer width, as a page sizes it; the specification states the same folds in
rem of the band's content box, which leaves out the band card's 26px padding and 1px border:

| Layout | 4 figures | 3 figures | 2 figures |
|---|---|---|---|
| Band | row above 940px, 2+2 to 500px | row above 720px | row above 500px |
| Tiles | row above 890px, 2+2 to 440px | row above 670px | row above 440px |
| Open | row above 1050px, 2+2 to 510px | row above 800px | row above 510px |

No 3+1, 2+1 or 1+1+2 row at any width, and no overlap. The first cut used fixed columns and
would have overlapped between about 704 and 804px, which is #610's bug again. The width sweep caught it.

## What changed

- `src/components/stat.js`: `statBand()`. A `<dl>`, one `<div>` group per figure, `variant`
  defaulting to `tiles`, and the caption emitted before the list. A single figure is not
  exported, because its `<dt>` and `<dd>`s are valid only inside the band's list.
- `src/styles/stat.css`: the three layouts and the folds. `.ui-stats__basis` carries its space
  below it now rather than above.
- `react/src/primitives/StatBand.tsx`: `<StatBand>`, the same default and the same caption
  order, with a parity test against the factory that now reads which of the two comes first.
  `value` and `trend` take React nodes, so the portal's drill-down link and its interactive
  sparkline fit in unchanged.
- `stories/components/Stat.stories.js`: Playground, Gallery, States, Narrow. The Playground opens
  on the default; the Gallery keeps A, B, C in their review order and marks B as the default.
- **Guidelines / Stat bands**, three rules.
- `docs/specification.md#stat-bands`: the guarantees, the fold table, and "No charts" under what
  the kit does not do. `docs/library.md` has a catalogue row.
- `Apps / Finance report` now uses the band, in the default layout. Its local style block and the
  gate that pinned its 620px are gone; the fold lives in the component and is pinned there. Its
  loading skeleton wears the tiles' own classes and holds the caption's place above the row, so
  the card does not change shape when the figures land.

## Before / After

Every picture below was re-shot for this revision at 1440x900, dpr 2, in one headless Chrome,
light and dark, except the two named in the next paragraph — including the finance report's
**before**, re-rendered from `origin/main` at `fba0e82` so the pair differs in this branch and not
in a renderer, in #292, in #289 or in #293. Ten of the twelve `stat-*` files changed. The before pair came
out byte-identical rendered at `6275355` and at `7139166`: #289 moves nothing on this screen. The
six light shots changed once more on the rebase onto #293, which carries #284 — a light card is
flat now, a hairline border and no drop shadow — so every tile in the light pictures is the card
`main` draws today. The six dark shots have not moved since the first re-shoot.

**Before**, reconstructed from the portal's own code: `KpiBand.tsx` markup and `overview.css`
at `finance.apli.tech@db8e4c808`, over this branch's kit CSS, with the same figures. This is the
one pair that was **not** re-shot, and cannot be from here: it is drawn from the portal's tree,
which is not in this repository, and nothing in this branch changes it. It is also the one pair
at a different height, because the reconstruction is one card and not a screen.

![Before, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-before-light.png)
![Before, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-before-dark.png)

**Apps / Finance report**, the kit's own example screen, on `origin/main` and on this branch:

![Finance report before, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-finance-report-before-light.png)
![Finance report after, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-finance-report-after-light.png)

Dark: `docs/evidence/stat-finance-report-before-dark.png`, `docs/evidence/stat-finance-report-after-dark.png`.

**States** (no earlier figure, a figure with its own comparison, figures only) and **Narrow**
(640px and 360px columns):

![States, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-states-light.png)
![Narrow, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-narrow-light.png)

Dark: `docs/evidence/stat-states-dark.png`, `docs/evidence/stat-narrow-dark.png`.

**Guidelines / Stat bands** — the colour rule's do and don't are the four figures above,
declared and then painted by the sign instead:

![Guidelines page, light](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-guidelines-light.png)
![Guidelines page, dark](https://raw.githubusercontent.com/apliteni/apliteni-ui/e2d5db1/docs/evidence/stat-guidelines-dark.png)

## Gates

| Guarantee | Held by |
|---|---|
| a band is a `<dl>`, text is escaped, tone never follows the sign, the caption id is unique, a caller who names no layout gets tiles, and the caption leads the band in all three layouts | `src/components/stat.test.js` |
| a figure never breaks; wraps rather than overlaps; folds from its own width; colour only from tone; good takes the success ink and bad the danger ink; the caption's space sits under it; fold widths equal the spec's table | `src/styles/stat.test.js` |
| every change in every story names its comparison in reachable text, and every caption in every story leads the figures it captions | `stories/stat-basis.test.js` |
| React renders what the factory renders, over all four verdicts, all three layouts and the default — caption order included | `react/src/primitives/StatBand.test.tsx` |
| the arrow clears the 1.5 CSS px stroke line | `stories/glyph-stroke.test.js` (existing) |
| contrast and axe in both themes | `stories/contrast.test.js`, `stories/a11y.test.js` (existing) |

**Every gate was broken on purpose and went red.** Thirty-eight mutations over four rounds, each
put on disk, diffed to confirm it landed, and restored from git afterwards.

**This revision's five, all red.** The default and the caption's place are the two decisions it
makes, and each is now held on both sides of the kit.

| Mutation | Went red saying |
|---|---|
| `stat.js`: `variant` defaults to `'band'` again | a caller who names no layout gets tiles — the default layout is not tiles |
| `stat.js`: the caption emitted after the list again | 3 red: the caption leads the band in every layout; the check's own mutation pair; and the walk over every story — *the caption "Change against the previous 12 months" does not lead its figures*, in each of the stories that renders one |
| `StatBand.tsx`: React defaults to `'band'` | 2 red parity cases — the default's figures differ on their classes |
| `StatBand.tsx`: React's caption after the list | 4 red parity cases — the shape's `captionLeads` differs |
| `stat.css`: the caption's margin back above it | the caption keeps `var(--space-5)` above it, and it leads the row |

The caption mutation is the one worth reading: the walk finds it in every story that draws a band,
because the check is over what a story renders and not over a list of subjects.

**The colour rule, nine mutations, all red.** The gate it started with asserted that a rise was
not painted by default and that a fall the caller called good came out green. It never asserted
that bad news comes out red, and never asserted that an explicit `tone: 'neutral'` stays neutral —
so half the rule was unpinned. `src/components/stat.test.js` now runs every verdict against both
signs, and `src/styles/stat.test.js` pins which ink each tone takes.

| Mutation | Went red saying |
|---|---|
| `stat.js`: only `'good'` ever reaches the class list | a rise the caller called bad news was not painted bad |
| `stat.js`: good and bad swapped | a rise the caller called good news was not painted good |
| `stat.js`: an explicit `'neutral'` is allowed to paint | a rise the caller called neutral was painted |
| `stat.js`: the tone is read off the sign instead of the caller | a rise the caller called bad news was not painted bad |
| `stat.css`: the two inks swapped | good news is not painted with the success ink |
| `stat.css`: bad news loses its rule | `.ui-stat--bad .ui-stat__delta` has no rule, so bad news is not painted |
| `stat.css`: a rule for a tone the component never sets | the sheet paints a tone the component never sets |
| `StatBand.tsx`: React drops `'bad'` | the parity shape differs on the figure's classes |
| `StatBand.tsx`: React lets `'neutral'` paint | the parity shape differs on the figure's classes |

**The runs**, on the rebase onto `origin/main` at `a7cfcea`. #292, #289, #293 and #287 all landed
while this revision was being written, and it was rebased onto each. Both trees were run back to
back on the same box:

```
                       main (a7cfcea)   this branch
root  npm test          1310             1345
      pass / fail        1307 / 1         1342 / 1
react npm test            300              322   (0 failing)
npm run build              ok               ok
```

Thirty-five root tests and twenty-two React tests over main, and **the same single failure as
main, which is not this branch's.** Four of the root additions are this revision's: the default
layout, the caption's place in all three layouts, the mutation pair that proves the caption check
can fail, and the caption's space moving under it in the sheet. One React test is this revision's —
A · Band as a parity case of its own, now that it is no longer what a caller gets for naming
nothing — and the parity shape every case is judged on grew a field: which of the caption and the
list comes first.

**The one failure is `contrast.test.js`'s wall clock, and `origin/main` fails it on this box
without any branch involved.** The gate gives the walk 120s. Four measurements, each tree on its
own:

| Tree | Pairs judged | Walk | Clock gate |
|---|---|---|---|
| `origin/main` (a7cfcea) | 12478 | 159.1s | **fails** |
| this branch | 12844 | 137.6s | fails |
| `origin/main` (7139166), before #293 and #287 | 11246 | 108.7s | passes |
| this branch on `7139166` | 11612 | 113.5s | passes |

The branch adds 366 pairs, 2.9% more than main — the stat band's stories and its guidelines page
walked like everything else. What crossed the ceiling is the wave landing: main went from 11246
pairs to 12478 in three merges, and from 108.7s to over the limit. The branch's own 366 are
inside a gate that main has already blown, and the spread between main's 159.1s and the branch's
137.6s for a larger walk is the box, which is what a wall clock measures. Nothing here stopped
terminating and no theme×accent cell was added — both are what the gate's own message asks about.
The ceiling is not this PR's to move, so it is reported rather than adjusted, and it wants a
decision from whoever owns the walk.

One failure did go away on this rebase: `refs.test.js` → `_labels-and-titles.js` cited
`card.css:65` after #293 shortened that file, and #287 recomputed the line.

**The earlier two rounds, twenty-four mutations.** Two survived the first time, and both were
gate holes, closed then:

- `.ui-stat__delta, .ui-stat--good .ui-stat__delta` painted every change and passed, because the
  tone check read a selector list as one string. It now judges each selector.
- A React band that painted "No earlier figure" red passed, because the parity test had no figure
  with a tone and no change. It has one now.

The rest, all red: a figure allowed to shrink below its value; a value allowed to break; a fold
keyed to the viewport; a fold width moved without the spec; the pairs fold set to one per row; the
pairs range run under the one-column fold; the band's fold reaching the open layout; the arrow at
the old 1.0px stroke; a change no longer pointing at its caption; a rise painted good by default;
up and down glyphs swapped; a typeset minus, an accounting bracket or a leading space drawing the
wrong arrow; caption ids repeating; a figure with no change painted; a rule on the `<dd>` resetting
the spacing; a guidelines band dropping its caption; the finance report bringing its own fold back,
or its skeleton losing the caption's place; React missing the typeset minus or pointing at a
caption that is not there.

## Review

Two independent reviews ran on the first revision — a diff review with a red-team pass and a prose
review — and one independent review ran over the whole wave, at head `790c449`.

**The wave review's three findings, fixed at `e7c7f92`.**

- **`.ui-stat__label` and `.ui-stats__basis` sit outside #292's rank table.** The review asked for
  a `/* rank: label */` note on the label. It cannot be taken: #292 gives rank `label` an inherited
  line-height, `type-ranks.test.js` enforces it, and `.ui-stat__label` sets `--leading-snug` so a
  figure's parts stay close. Taking the note means 1.4 → 1.62 at 13px and a taller label box in
  every band. Reproduced by running #292's gate against this tree. The leading stays, the rule
  claims no rank, and a comment at the declaration says which part of the rank it takes and why it
  takes no more. Same answer #289 gives `.ui-drawer__section-title`.
- **`stories/stat-basis.test.js` said it was an accessibility gate only in an import.** The floor
  page names it, and `accessibility-floor.test.js` finds gates by reading each file's own text —
  which #292 now does with imports stripped, so `from './lib/contrast.js'` stopped counting. The
  header says it in prose now. Verified: with #292's gate in the tree, green.
- **The body's images were branch refs**, which 404 the day the branch is deleted. Pinned to a
  commit, the way #286 pins its own.

**And the finding the review made about tiles is why this revision exists.** It noted that in
B · Tiles the caption sits outside the cards. Tiles is now the default, so that stopped being an
observation about a `variant` and became the shape of the component: the caption leads the row.

**Blocking, fixed.** `.ui-stat > dd { margin: 0 }` (0,1,1) outranked the value's, the change's
and the trend's own margins (0,1,0). Every value sat flush under its label, and trends did not line
up when one figure's change wrapped. No gate could see it; the first round of screenshots shows it.
The rule is gone (`base.css` already zeroes margins) and a jsdom cascade test holds each part's
spacing. The screenshots above are retaken after the fix.

**Should-fix, fixed.**
- `stories/stat-basis.test.js` skipped the guidelines page, which renders its bands through a
  content module. It walks every story now.
- `<StatBand>` had no React story, so the React axe and contrast walks never mounted it. It has one.
- The parity test left the vanilla band in the document, so a wrong caption id on the React side
  resolved to the vanilla caption and passed. The vanilla band is removed before React renders.
- The glyph test checked only that arrows differed. It now compares each to the kit's own glyph.
- The fold test read only upper widths. It reads each fold's range and basis, and checks the
  two-per-row range stops where the one-column range starts.
- "No earlier figure" could be painted red by a tone. A figure with no change takes no tone.
- `' −4.0%'` and `'(4.0%)'` drew the flat dash. The arrow reads through a leading space and an
  accounting bracket.
- The finance report's skeleton had no place for the caption, so the card grew when data landed.
- `stat()` was public, but its `<dt>`/`<dd>` are valid only inside the band. It is private.

**Nits, fixed:** React's empty `id` and `label`, the guideline caption claiming a hover title the
drawn badge does not have, `trend` now called trusted markup in `docs/library.md`, the two count
histories, and the spec now says a band in a flex row needs a width and six or more figures wrap as
they fit.

**The prose review** found nothing machine-made and the hard-word rate at or under the repo's
floor. Two sentences in the spec were split and one caption was reworded on its notes.

**The slop detector on this revision.** Level 2 on this body: 0 errors, 3 warnings — two
`middot-chain` on the layout names *A · Band* and *B · Tiles*, and one `scope-template` on "from
the bottom of the card to the top", which is a card and a top and not a range. All three are the
false positives the wave review already named. Level 4 on the four stat files: one `comment-essay`,
on `stat-basis.test.js`'s header, now 12 prose lines because this revision added the caption's
half of the rule to it. Left as it is: the header is what
`accessibility-floor.test.js` reads to discover the gate, and four gates on `main` —
`typeface-roles.test.js` three times over, `letter-case.test.js` once — fire the same rule on the
same convention.

## What a reviewer should push on

- **The example declines to colour net cashflow.** That is a judgement, not a rule the kit
  enforces — a screen that wants the year's result in green passes `tone: 'good'` and gets it.
  What the kit enforces is that the band does not decide either way on its own.
- **The fold widths hold for `€ 6,459,401`.** A longer figure wraps early rather than
  overlapping, which can leave a figure alone on a row. That was the trade: never broken
  over always balanced.
- **`basis` does two jobs.** It names what every change is measured against, and on a band
  with no changes it is the caption that says what period the figures cover. One prop, one
  sentence above the row.
- **The caption moved for every layout, not only for tiles.** A caller on A · Band sees its
  caption go from the bottom of the card to the top, without asking. The argument is under
  [Where the caption goes](#where-the-caption-goes); the alternative was a component that reads in
  a different order depending on its surface.
- **The value is set in the display face**, under the existing `readout` exception in
  `typeface-roles.test.js`. The portal's value was the text face.

## Changelog entry

- **Added** `statBand()`, a row of key figures in three layouts — `tiles`, a card per figure, is
  the default; `band` is one card and `open` draws no surface — and `<StatBand>` in the React
  subpath. A change is coloured by the tone you give it and never by its sign, and says what it is
  measured against in text a reader can reach: one caption above the row that every change points
  at, or a basis beside the one change measured against something else.
- **Added** Guidelines / Stat bands.
- **Changed** `Apps / Finance report` draws its cashflow figures with the stat band.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Y5a9hgu8cGAgN5hRDr2Uhd
