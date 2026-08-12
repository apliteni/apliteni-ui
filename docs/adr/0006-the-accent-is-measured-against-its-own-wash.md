# 0006. The accent is measured against its own wash, not against the surfaces

- **Date:** 2026-08-12
- **Status:** accepted
- **Code:** `src/tokens/tokens.css`, `src/tokens/accents.css`, `src/styles/nav.css`,
  `stories/accent-contrast.test.js`, `stories/foundations/SubThemes.stories.js`,
  `.storybook/manager.js`, `.storybook/manager-head.html`, `.storybook/preview.js`
- **Issues:** #157

## What we ran into

The default accent in the dark theme, `#9b5dff`, did not clear WCAG AA as text. On `main`, measured
against the five opaque grounds the kit paints under body text, and against `--glow-purple` washed
over each of them:

| ground | `--accent` on it | `--accent` on the wash over it |
|---|---|---|
| `--bg` | 4.65 | 3.76 |
| `--bg-elevated` | 4.40 | 3.53 |
| `--surface` | 4.15 | 3.32 |
| `--surface-2` | 4.45 | 3.57 |
| `--surface-3` | 3.73 | 3.00 |

Two things are visible in that table and only one of them was expected. The flat surfaces are close
to the bar — one of the five clears it. The **wash is a whole point worse than the surface it sits
on**, every time, and it is the wash that decides the cell.

That is not a coincidence of these particular values. `--glow-purple` is the accent's own colour at
low alpha, so painting it over a dark ground moves the ground *toward the ink* while leaving the ink
where it is. Spending more alpha on an accent wash always closes the pair. The surfaces were never
the binding constraint, and a fix aimed at them would have been aimed at the wrong thing.

The story walk agreed: 116 distinct failing pairs in dark, 25 of them with `--accent` as the
foreground, worst 3.20.

**One of those five grounds was outside both gates.** `--surface-3` is what paints an **active**
sidebar row (`src/styles/nav.css:52`), and the accent counter on that row painted `--glow-purple`
over it (`:100`) — the accent wash laid on an already-raised surface, two tints stacked. The token
gate measured four grounds because a person had written four down; no story renders an active nav
item with an accent badge, so the story walk in `stories/contrast.test.js` did not see the pair
either. It was found by reading CSS by hand. It failed on `main`, and it still failed against every
token this change moved:

| cell | on `main` | against the shipped tokens |
|---|---|---|
| dark default | 3.00 | 4.08 |
| dark phoenix | 3.93 | 4.12 |
| dark ocean | 3.88 | 4.06 |
| light emerald | 4.16 | 4.23 |
| light ocean | 3.98 | 4.76 |
| dark emerald | 4.86 | 4.86 |
| light phoenix | 4.95 | 4.95 |
| light default | 5.50 | 5.50 |

Five cells under the floor on `main`, four against the tokens shipped here — light Ocean is the one
that crossed, and only because its ink was deepened for a different reason. Lifting the accent moved
these numbers and did not fix them.

## What we decided

Every figure below is measured against the tokens this change ships unless it says otherwise; where
a before-and-after is worth having, both baselines are named.

In the dark theme only:

- `--accent` becomes `#b479ff`
- `--glow-purple` becomes `rgba(180, 121, 255, 0.12)` — the new accent's rgb at a lower alpha
- `--ring` follows the accent's rgb, at its existing `0.35`
- the violet ramp moves up a step behind it: `--purple-light` becomes `#b479ff` and `--purple-mid`
  becomes `#bd8cff`

Both halves of the first pair move together. The wash is the accent at low alpha, so re-tinting it is
not an extra change but the same change — `stories/signal-contrast.test.js` already requires that the
dark glow be an exact tint of `--accent`, and a lifted accent with the old wash would have failed it.

`#b479ff` was not a new colour: it was `--purple-mid`, already shipping on the "soon" badge and pill.
Left there, `--accent` and `--purple-mid` would have resolved to one value and the ramp would carry a
duplicate step, so the ramp moves up and `--accent` is `--purple-light` again — the shape light
Nebula and light Ocean already ship, and the one dark Nebula held before this change. `#bd8cff`, the
value rejected as the accent further down, becomes the ramp's top step instead. Light Nebula's ramp
does not move. `--grad-from` is pinned to the literal `#9b5dff` rather than left tracking
`--purple-light`, because following the ramp would lighten the hero gradient's first stop, which
nobody asked for; every `--grad-from` in `accents.css` is already written as a literal.

The result across all eight theme × accent cells: the accent on each of the five flat grounds, and on
the wash over the four base ones. Every number is the worse of the two composite models described
below:

| cell | before | after |
|---|---|---|
| dark default | fails, worst 3.32 | passes, worst 4.54 |
| dark phoenix | fails, worst 4.31 | passes, worst 4.56 |
| dark ocean | fails, worst 4.28 | passes, worst 4.53 |
| dark emerald | passes, worst 5.35 | unchanged |
| light default | passes, worst 5.89 | unchanged |
| light phoenix | passes, worst 5.30 | unchanged |
| light ocean | fails, worst 4.26 | passes, worst 5.10 |
| light emerald | fails, worst 4.44 | passes, worst 4.54 |

In all eight cells, before and after, the worst pair is the accent on the wash over a surface and
never on a flat one. That is the finding this record is named for, and it survives every value this
change moved: closing a cell meant moving the wash or the ink under it, not the surfaces.

The other three accents fail on the wash and nowhere else. Two are closed by lowering that cell's
alpha rather than by moving a hue that #96 chose — dark Phoenix and dark Ocean from `0.18` to `0.15`,
light Emerald from `0.10` to `0.08` — with their hues untouched.

**Light Ocean's accent deepens instead, and its wash stays at `0.10`.** `#1568d6` becomes `#005bc8`:
hue and chroma unchanged in OKLCH (H 258, C 0.185), four points of lightness off. It repeats the move
#96 made on light Phoenix (`#d64a12` → `#a8370c`) and light Emerald (`#0b9c68` → `#087a52`) — deepen
a light accent until it clears — and light Ocean is the one light accent #96 skipped, because that
cell happened to clear plain white. It is a smaller move than either: both of #96's took about ten
points of lightness and gave up 16–18% of the accent's chroma, where this takes four and gives up
none. Clearing plain white was never the whole test, and the old blue does not clear the raised grey
panel: `#1568d6` reads 4.54 flat on `--surface-3` and 3.98 on the wash over it, where `#005bc8` reads
5.43 and 4.76 — both washed figures at the `0.10` this cell ships. White on the deeper blue is 6.31,
so `--accent-contrast` still clears AA. Because the ink is what closed the pair, the wash does not
have to be the thing that gives, and it stays at `0.10`. Its rgb stays `21, 104, 214` —
`--purple-light`, which is what a light glow tints.

**No alpha reaches the stacked pair.** Solving for the largest wash that clears with `--surface-3`
counted, dark Nebula needs `0.06` — half the `0.12` this change chose — and light Emerald needs
`0.02`, a wash nobody would see. Spending the wash to rescue this pair means spending the wash
entirely. So the rule changed rather than the alpha: **the accent wash is painted on a base surface,
never stacked on a raised one.** The accent counter on an active row was the one place in the kit
that stacked it, and `src/styles/nav.css:113` is where it stops: on an active row the counter takes
the row's own `--surface-3`, the same shape the neutral badge two lines above it already had. Read on
the flat surface instead of the stacked pair, every cell clears — 4.92 in dark Nebula, 5.10 Phoenix,
5.15 Ocean, 6.74 Emerald; 6.33 light Nebula, 5.62 Phoenix, 5.43 Ocean, 4.62 Emerald.

`--surface-3` therefore joins the grounds as a flat one, and the wash is measured over the four base
grounds only. **That exclusion is a claim about the kit, not a gap in the gate**, and the gate's
header says so in those words: nothing paints the accent wash on a raised surface any more.

**The grounds stopped being a list.** Adding `--surface-3` by hand would have fixed this instance and
left the defect: a gate that derives its accents and derives its token family, and then enumerates
the one list a person happened to write. [0004](0004-the-gates-discover-their-subjects.md) is the
record of exactly that failure mode, and the missing ground is what it predicts — a list is a claim
about the world that nothing keeps true.

The candidates are now swept out of `tokens.css` and `accents.css` by NAME: `--bg…`, `--surface…`,
or anything ending `-bg`. What a person writes is no longer the list but the pattern, plus a reason
for every candidate the pattern finds that the gate does not measure. Both are asserted — the
candidate count exactly, so a surface joining the token files fails the gate until somebody decides
which kind it is, and a stale exemption fails rather than quietly excusing nothing.

The sweep is a name pattern rather than a property of the value on purpose. "Every opaque token", or
"every token used as a background", pulls in `--control-knob`, the chip fills and the brand ramp —
none of which the accent is ever read on — and buries the real grounds under a page of exemptions.
Naming is the kit's own signal for what a surface is, and it is the narrowest honest one available
from the token files alone.

The sweep finds six candidates, and the sixth is one nobody had measured: **`--seg-active-bg`**
(`#34314a`), the active pill of a segmented control, where `--accent` reads **4.23** flat in dark
Nebula. Nothing paints accent ink there today — the active pill's label is `color: var(--strong)` —
so it is a latent risk rather than a live failure, and it is the exemption list's first and only
entry. That entry is the shape the mechanism was built for: a claim about what the kit paints, which
no measurement can confirm or refute, written where the next person has to read it.

**Two composite models, and a value is only chosen when it clears in both.** A wash over a ground can
be composited at full precision, or rounded to 8 bits per layer. The gate does both and judges a pair
on the worse reading. Rounding is in there because it is closer to a framebuffer than full precision
is — but it is not the framebuffer, and neither model is: rendered in headless Chromium and read back
out of the screenshot, `rgba(180, 121, 255, 0.12)` over `#221f2e` paints `rgb(51, 42, 71)`, where
rounding predicts `rgb(52, 42, 71)` and full precision gives `(51.52, 41.80, 71.08)`. The dark
default's binding pair therefore reads 4.555 against the painted pixel, 4.540 rounded and 4.555
exact. The models disagree by at most a few hundredths, which is why taking the worse of them costs
nothing and why no number here is claimed past two decimals.

**The ramp move carried the "soon" badge with it.** `src/styles/card.css:36` mixes the accent into
`--surface`, an opaque token rather than into transparency, and the ink on it is `--purple-mid`, not
`--accent` — so it is neither a token pair this gate measures nor one of the color-mix rows further
down. `--purple-mid` at `#bd8cff` takes it from 3.94 to 4.67 on the pair the story walk actually
renders — `--glow-purple` over an accent-tinted card — so the DARK row clears. The light row does not
move and does not clear: it is bucket F of the ledger in `stories/contrast.test.js`, at 4.48, and it
is the only row that entry now holds. Bucket B ends this change at four rows, down from 25 on `main`.

**Light's `--accent` does not move.** `#6a2dcc` already clears every ground, washed and flat, at
worst 5.89.

**The workbench chrome follows.** `.storybook/manager.js` hand-copies the dark palette and says so —
"Values mirror `src/tokens/tokens.css` (dark block)" — which this change made false. `colorPrimary`,
`colorSecondary` and `barSelectedColor` are the accent, and they move to `#b479ff` with it. Two more
copies of the retired value sit outside that file and move with it: the selected sidebar row's tint
in `.storybook/manager-head.html`, the accent's rgb at `0.13`, and the `--accent` fallback in
`.storybook/preview.js` that the Inspect overlay reads when the property resolves empty. The prism
mark in the sidebar logo keeps `#9b5dff` on purpose: that violet is the brand ramp's `--purple-500`,
the mark's own colour, and it never tracked `--accent`. Nothing gates any of the three.

**The floor is held by a test, not by this record.** `stories/accent-contrast.test.js` measures all
eight cells on every `npm test` — the accent on five flat grounds and on the wash over the four base
ones, nine pairs a cell. Its accents are derived the same way its grounds are, from the
`[data-accent="…"]` blocks in `src/tokens/accents.css`, so a fifth accent is judged the day it is
declared, and both derivations have their size pinned, so one that stopped matching would fail rather
than pass by measuring nothing. It asserts that the ink is opaque and each ground is opaque, because
the ratio it computes is only the ratio the browser paints if both are. Its other exemption list
holds pairs rather than grounds — a single cell allowed under the floor — and it is empty, which is
the correct state for a gate nobody has had to excuse yet and makes it harsher rather than weaker:
nothing was excused to close `--surface-3`, which was added at full strength.

**One accent surface the token gate could not see: a story that copies the tokens by hand.**
`stories/foundations/SubThemes.stories.js` pins a whole accent family inline per preview panel, so
all four accents can be shown at once under one toolbar theme — 10 properties × 4 panels × 2 themes,
80 declarations, every one of them a literal somebody typed. Measured on `main` against `main`, **19
of the 80 stated a value the kit did not ship**: 15 because every panel read `--purple` and `--ring`
from the wrong field of its own table, and 4 because #96 had deepened light Phoenix and light Emerald
and nobody followed. (15 rather than 16 because light Nebula's wrong field happened to hold the right
value — a mirror can be right by accident.) Against the tokens this change ships the count is **28 of
80**, the difference being the values #157 itself moved. The same test now resolves what that page
paints against the two token files, property by property, deriving both sides rather than restating
either.

## Why not the alternatives

**`--accent: #bd8cff`, leaving the wash at `0.18`.** This passes too, and it was the closer call. It
costs more of the colour: against `#9b5dff` it gives up 27.1% of the violet's chroma in OKLCH, where
`#b479ff` gives up 15.2%. It also leaves the wash as the binding constraint for every future move.
Rejected for the chroma. It is the ramp's top step now, as `--purple-mid`; it is still not the accent.

**Drop the wash's alpha further — `0.10`, or `0.09`.** Measured by running the whole story walk at
each, before the ramp moved — so five surviving failures rather than today's four, the "soon" badge
still being one of them. The walk reported the same five at `0.12`, `0.10` and `0.09`, with the same
worst at 3.97, and three of the five did not move by a single hundredth between the three runs. Only
the "soon" badge moved at all, and it still failed at `0.09`. Alpha below `0.12` bought nothing and
spent the wash's visibility.

**Thin light Ocean's wash instead of deepening its ink.** The largest alpha a search found was `0.06`,
which clears at full precision (4.501) and fails both other ways — 4.491 rounded, 4.483 against the
pixel Chromium paints. It was never a value that had cleared, only a failing pair reported by
whichever model was asked, and the worse-of-two rule is what refused it. `0.05` did clear in all
three, at 4.56 — the thinnest wash in either theme, and it would still have left the stacked
`--surface-3` pair under the floor, which no alpha closes. Deepening the ink closed the cell instead.

**Move the flat surfaces instead.** They are not what fails. Darkening `--surface` to rescue the
accent would repaint every card in the dark app to fix a problem the cards do not have.

## What this does not cover

**Grounds a component mixes for itself out of the accent.** A rule that writes
`color-mix(in srgb, var(--accent) N%, transparent)` builds the ground out of the ink that will be
read on it. `--glow-purple` cannot reach these, because they do not use it. Lightening the accent
moves such a ground too, but only by a fraction: the ground is the ink at `N%` over an opaque
surface, so when the ink moves the ground moves by `N%` of that. The pair opens. On
`src/styles/dropdown.css:106`, 14% over `--surface`, holding everything else fixed:

| `--accent` | ground | ratio |
|---|---|---|
| `#9b5dff` | rgb(51, 40, 75) | 3.50 |
| `#b479ff` — shipped | rgb(54, 44, 75) | 4.41 |
| `#bd8cff` | rgb(56, 46, 75) | 5.03 |
| `#d9bcff` | rgb(60, 53, 75) | 6.99 |

The ink's relative luminance runs 0.2202 → 0.5794 across that range while the ground's runs 0.0271 →
0.0400. `#bd8cff` — a colour this kit already ships, as the top of the dark ramp — clears the bar on
its own badge. So these rows are **closable by lightening the accent, and expensive**. What holds
them here is the brand, not the mathematics: the accent that closes all of them is well past the
point where it is still this violet, and both #96 and #157 chose the hue first and the ratio second.
That is why they are carried as debt.

Three rules remain in dark, over the four rows of bucket B in `stories/contrast.test.js`:

- `src/styles/dropdown.css:106` — `.ui-dropdown__badge.is-accent`, at 14%. Two rows, hovered and
  focused, and only those two: the badge's mix sits over whatever the row beneath it is, and
  `.ui-dropdown__item` lightens from the panel's `--surface-2` to `--surface` in exactly those two
  states. At rest the pair clears.
- `stories/foundations/Motion.stories.js:98` — the story's own `.mz-replay:hover`, at 20%. One row.
  The base rule at `:95` is 12% and clears at 4.56; only the hover fails.
- the copy control on the green-tinted snippet bar of a live card. One row, and not purple at all —
  it fails under every accent including Phoenix and Ocean, so it is a surface problem rather than an
  accent one, shared by the snippet and card owners.

`.ui-nav__badge.is-accent` (`src/styles/nav.css:100`) is the counter-example: the ground it reads on
is a token the kit ships rather than a mix of the ink itself, which is the shape the others should
take. It is also why the rule changed rather than a value — on an active row it stacked the wash on
`--surface-3` and read 4.08 in dark Nebula, and no token this change moved closed that pair.

**The token gate cannot see any of them.** It measures tokens against tokens; a ground a component
mixes for itself is only visible to the story walk, and only where a story renders it.

**A token declared only in `tokens.css`'s theme blocks is neither mirrored nor gated as accent
family.** `FAMILY` — the set of properties the sub-theme mirror is held to — is derived from the
`[data-accent="…"]` blocks in `accents.css`, because those blocks are what an accent overrides. A
property added to the theme blocks of `tokens.css` alone is therefore in no accent's family: the
mirror is not required to paint it, and the drift check never asks about it. `--accent` itself is
declared that way and is caught only because the sub-theme panels happen to pin it. This is a real
limit of the gate rather than an oversight in a value, and closing it means deciding what the accent
family IS — the union of both files, or the intersection — which this change does not decide.

**Nothing enforces the base-surface rule.** It is held by one edited stylesheet and a paragraph in
the gate's header. A token gate cannot see a component that stacks the wash again. The story walk
could, but only if a story rendered it, and the pair that started all this went unmeasured precisely
because no story does. Enforcing the rule would take a gate that reads the stylesheets for
`--glow-purple` on a raised surface. That is a follow-up, not this change.

**The focus ring.** `--ring` follows the accent's rgb here, and that is all this change does to it. As
a focus indicator it sits far under the 3:1 that WCAG 1.4.11 asks: 1.61 against `--bg` before this
change, 1.81 after. The alpha, not the hue, is what holds it there — `0.35` of a light violet over a
near-black page. Clearing 3:1 would need roughly `0.61`, which is a visible redesign of every focus
state in the kit under every accent, and nothing here decides it.

**The accent hues of Phoenix and Emerald, and dark Ocean's.** Untouched. Only their washes move, and
only where a cell needed it. Whether those accents want a lifted hue the way the default one got is a
question this record leaves open — it closed them the cheap way, on the wash alone.

**Whether light Ocean's deeper blue reads as the same blue.** Hue and chroma are held exactly and
lightness comes down four points. The precedent is that #96 twice deepened a light accent for the
same reason and nobody objected — but those two moves were bigger than this one, so "nobody objected"
was said about a larger change than the one being justified here. That makes this the safer end of an
accepted move, which is an argument from precedent either way, and not from anyone having looked at
the two side by side under the light theme's surfaces.

**Half the exemption machinery still has nothing proving it works.** The PAIR list is empty, so the
test that fails a stale pair entry currently measures nothing. That is the price of a gate with no
excuses in it, and the cheaper half of the trade — the alternative was leaving a failing pair in the
list to keep the mechanism exercised. The GROUND list is no longer in that position: `--seg-active-bg`
is a live entry, and removing it puts four cells under the floor, so the path through that half of
the code is exercised on every run.

**Whether `--seg-active-bg` should be excused at all.** The entry rests on a reading of the
stylesheets — that the active segmented pill sets `color: var(--strong)` and that nothing else in the
kit paints on that token. That was checked by hand, on one day, by one person. Nothing re-checks it,
and nothing can: it is a claim about what components do, and this is a token gate. If it is wrong, or
becomes wrong, the gate stays green while a pair sits at 4.23.

**Whether the colour is right.** AA is a floor. This record says the dark accent now clears it; it
does not say the violet is the correct violet.
