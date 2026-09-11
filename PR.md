# [waiting: Artur's pick of the default layout] A stat band for key figures, in three layouts

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
  finance #632 (`docs/portal-replatform-m2-plan.md:325`).
- The rejected card's faults are kit parts used for the wrong job. The value is 18px, the same
  step as a card title. The change is a `ui-badge`, a 10px uppercase status chip, and what it is
  measured against lives only in a hover `title` (`web/src/components/KpiBand.tsx:151`).

**What I did.** Added a stat band to the kit (`statBand()`, `.ui-stats`, and `<StatBand>` in
React), built it in three layouts, and put them in front of Artur to choose the default.

**The verdict: Changed.** The problem is real, but it is in what the card holds, not in the card.

**Does it depend on #268?** No. The band's labels are its own class, `.ui-stat__label`, set
in sentence case. `ui-eyebrow` is untouched, and so is its only appearance here: the "before"
don't on the guidelines page, which shows the rejected card as it is.

## Proof

- [ ] A person meets it in something running: the Storybook gallery, in both themes, is what
      Artur is choosing the default from. Ticked when he has chosen.
- [x] The three layouts are compared over the same four figures, with the same sparklines.
- [x] Nothing overlaps at any width: every layout at two, three and four figures, measured in
      Chrome from 1500px down to 300px in 10px steps.
- [x] Every guideline cites kit code, and `refs.test.js` resolves each citation.
- [ ] Exercised in the finance portal. Not done and not claimed: the portal installs a
      published version, so this can only be proven after a release. What would settle it is
      `KpiBand.tsx` rendering `<StatBand>` and `overview.css` losing its `fin-kpi` rules.

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

## The layouts, and which is the default

**[waiting: Artur's pick.]** All three layouts are built, tested and rendered, and the question
is with him. My recommendation is A, and it is the default in this branch today. If he picks B
or C, the default is one value in `src/components/stat.js` and one in
`react/src/primitives/StatBand.tsx`, and the screenshots are retaken.

Storybook: **Components / Stat band → Gallery** shows all three over the same four figures, in
both themes.

![The three layouts, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-variants-light.png?raw=true)
![The three layouts, dark](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-variants-dark.png?raw=true)

| | Surface | Value | On Overview |
|---|---|---|---|
| **A: Band** | one card, figures divided by space | 30px | the same footprint as today: one card at the top of the stack |
| B: Tiles | a card per figure | 30px | four boxes where there was one; each could become a link |
| C: Open | none; a rule over each figure | 40px | leaves the card stack; its numbers outsize the 30px page title |

```js
statBand({ stats, basis })                     // A, the default
statBand({ stats, basis, variant: 'tiles' })   // B
statBand({ stats, basis, variant: 'open' })    // C
```

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

- `src/components/stat.js`: `statBand()`. A `<dl>`, one `<div>` group per figure. A single figure is not
  exported, because its `<dt>` and `<dd>`s are valid only inside the band's list.
- `src/styles/stat.css`: the three layouts and the folds.
- `react/src/primitives/StatBand.tsx`: `<StatBand>`, with a parity test against the factory.
  `value` and `trend` take React nodes, so the portal's drill-down link and its interactive
  sparkline fit in unchanged.
- `stories/components/Stat.stories.js`: Playground, Gallery, States, Narrow.
- **Guidelines / Stat bands**, three rules.
- `docs/specification.md#stat-bands`: the guarantees, the fold table, and "No charts" under what
  the kit does not do. `docs/library.md` has a catalogue row.
- `Apps / Finance report` now uses the band. Its local style block and the gate that pinned its
  620px are gone; the fold lives in the component and is pinned there.

## Before / After

**Before**, reconstructed from the portal's own code: `KpiBand.tsx` markup and `overview.css`
at `finance.apli.tech@db8e4c808`, over this branch's kit CSS, with the same figures.

![Before, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-before-light.png?raw=true)
![Before, dark](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-before-dark.png?raw=true)

**After**: the chosen layout above, and in the app story:

**Apps / Finance report**, the kit's own example screen, on `origin/main` and on this branch:

![Finance report before, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-finance-report-before-light.png?raw=true)
![Finance report after, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-finance-report-after-light.png?raw=true)

Dark: `docs/evidence/stat-finance-report-before-dark.png`, `docs/evidence/stat-finance-report-after-dark.png`.

**States** (no earlier figure, a figure with its own comparison, figures only) and **Narrow**
(640px and 360px columns):

![States, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-states-light.png?raw=true)
![Narrow, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-narrow-light.png?raw=true)

Dark: `docs/evidence/stat-states-dark.png`, `docs/evidence/stat-narrow-dark.png`.

**Guidelines / Stat bands:**

![Guidelines page, light](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-guidelines-light.png?raw=true)
![Guidelines page, dark](https://github.com/apliteni/apliteni-ui/blob/feat/267-stat-band/docs/evidence/stat-guidelines-dark.png?raw=true)

**The gates**

```
                       main (c9a48c8)   this branch
root  npm test          1126             1155   (0 failing)
react npm test           213              234   (0 failing)
npm run build            ok               ok

main skips 2 tests, this branch 1. The second one on main is the built-Storybook id check,
which skips when storybook-static/ is absent and ran here because it was built.
```

## Gates

| Guarantee | Held by |
|---|---|
| a band is a `<dl>`, text is escaped, tone never follows the sign, the caption id is unique | `src/components/stat.test.js` |
| a figure never breaks; wraps rather than overlaps; folds from its own width; colour only from tone; fold widths equal the spec's table | `src/styles/stat.test.js` |
| every change in every story names its comparison in reachable text | `stories/stat-basis.test.js` |
| React renders what the factory renders | `react/src/primitives/StatBand.test.tsx` |
| the arrow clears the 1.5 CSS px stroke line | `stories/glyph-stroke.test.js` (existing) |
| contrast and axe in both themes | `stories/contrast.test.js`, `stories/a11y.test.js` (existing) |

**Every gate was broken on purpose and went red.** Twenty-four mutations over two rounds, each
restored from git afterwards. Two survived the first time, and both were gate holes, now closed:

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

Two independent reviews ran on this branch: a diff review with a red-team pass, and a prose review.

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

**Not fixed, on purpose.**
- `aria-describedby` on a `<dd>` is not announced by every screen reader. The visible caption is
  what reaches everyone; the reference is the addition for those that do announce it.
- The Storybook inspector labels a tile "card", because a tile is one.
- A trend `<svg>` that strokes its root rather than its line would slip past the glyph-stroke gate.
  The kit draws no trend, so this is the caller's.

**The prose review** found nothing machine-made and the hard-word rate at or under the repo's
floor. Two sentences in the spec were split and one caption was reworded on its notes.

## What a reviewer should push on

- **The fold widths hold for `€ 6,459,401`.** A longer figure wraps early rather than
  overlapping, which can leave a figure alone on a row. That was the trade: never broken
  over always balanced.
- **`basis` does two jobs.** It names what every change is measured against, and on a band
  with no changes it is the caption that says what period the figures cover. One prop, one
  sentence under the band.
- **The value is set in the display face**, under the existing `readout` exception in
  `typeface-roles.test.js`. The portal's value was the text face.

## Changelog entry

- **Added** `statBand()`, a row of key figures in three layouts (`band`, `tiles`,
  `open`), and `<StatBand>` in the React subpath. A change is coloured by the tone you give it
  and never by its sign, and says what it is measured against in text a reader can reach.
- **Added** Guidelines / Stat bands.
- **Changed** `Apps / Finance report` draws its cashflow figures with the stat band.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WGtSGFCuDEfHZXeDK8UJdq
