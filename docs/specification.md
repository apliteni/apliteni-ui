# What the kit ships and guarantees

This is the consumer contract. Every guarantee below is checked by a gate in `npm test`;
a broken guarantee fails the build.

This document states outcomes, not arguments. Where a number came from, what else was
considered and who chose between them belongs in the issue that settled it, and each section
below names its issue. Read [README.md](README.md) for where to record decisions, and
[CONTRIBUTING.md](../CONTRIBUTING.md) for how the gates work.

- **[The package](#the-package)** — what installing it gets you
- **[Widths](#widths)** — the page and the reading column
- **[Boxes below the page](#boxes-below-the-page)** — panels in px, prose in ch
- **[Breakpoints](#breakpoints)** — six literals, on purpose
- **[Spacing and rhythm](#spacing-and-rhythm)** — one scale, and how a tie breaks
- **[Typefaces](#typefaces)** — two roles, and which one an element takes
- **[Labels and titles](#labels-and-titles)** — sentence case, and five ranks in order
- **[Colour and contrast](#colour-and-contrast)** — what every accent clears
- **[The focus ring](#the-focus-ring)** — one declaration, derived from the accent
- **[Icons and glyphs](#icons-and-glyphs)** — size, stroke, and which bar a mark takes
- **[The page shell](#the-page-shell)** — one shell, and what it emits
- **[The back link](#the-back-link)** — the way up from a page, and what it names
- **[The drawer](#the-drawer)** — grouped by heading, and moving on open and on close
- **[The hover readout](#the-hover-readout)** — an overlay, never a row
- **[Pagination](#pagination)** — a page the caller computed, and what happens when nobody counted it
- **[Stat bands](#stat-bands)** — a row of key figures, and what a change beside one owes
- **[What the kit does not do](#what-the-kit-does-not-do)** — the boundaries, stated

## The package

`@apliteni/apliteni-ui` is tokens, component CSS and HTML-string factories, framework-agnostic.
There is no runtime dependency and no build step between the source and the stylesheet a consumer
reads: `src/index.css` is plain CSS with `@import`s, and a consumer may ship it as it stands.

A React wrapper is published under the `./react` subpath. It is a wrapper — the tokens and the CSS
are the same file the HTML entry point serves.

`docs/library.md` is the catalogue: the `src/` layout, the theming model, and every component the
kit exports. This page states what those components guarantee; that one states what they are.

## Widths

A page has two widths, and they are separate tokens because they answer different questions.

```css
--container: 1120px;   /* the page, gutter to gutter */
--measure:    860px;   /* the reading column inside a track */
```

`--container` is the page's outer bound and `--measure` is the column prose is set in. A box that
bounds the page takes the first; a box that bounds a line of text takes the second. Both are
declared once, in `src/tokens/tokens.css`, and nothing in `src/`, `stories/` or `site/` writes a
page-scale width as a literal.

`appShell()` writes no `--ui-app-main` when the caller passes none, so the reading column falls
through to `var(--measure)` rather than being copied into JavaScript. A caller who passes an
unusable `maxWidth` gets the property removed, not replaced — a custom property accepts any token
stream, so `--ui-app-main: wibble` would be a valid declaration that drops the column to the full
track.

Held by `stories/measure-tokens.test.js`, which discovers subjects by scanning the `max-width`
property across `src/styles/*.css` and the `<style>` blocks of `site/*.html` and `site/*.mjs`, and
reads its floor out of `tokens.css` at run time rather than carrying a number. A media query is
not a subject: `@media (max-width: 860px)` is a question about the viewport, not a width assigned
to a box.

Decided in [#198](https://github.com/apliteni/apliteni-ui/issues/198) and
[#208](https://github.com/apliteni/apliteni-ui/issues/208). 1120 over 1180 was the owner's call
between three options rather than a derivation: the site's number was the only recorded intent in
the tree, and 1180 was drift nothing argued for.

## Boxes below the page

Below the page there are two scales, and the unit says which one applies.

```css
--panel-sm: 320px;   --prose-display: 14ch;   /* not a measure: where a headline rags */
--panel-md: 420px;   --prose-caption: 44ch;   /* a sentence under a glyph */
--panel-lg: 560px;   --prose-lede:    54ch;   /* the line under a title */
                     --prose-body:    62ch;   /* a left-aligned column */
                     --prose-dense:   72ch;   /* reference prose set below 13px */
```

A box that holds a **component** takes a `--panel-*` step in px. A box that holds a **line** takes
a `--prose-*` step in ch. Choose the unit and scale by what the box holds.

The `--prose-*` steps are declared on the paragraph, never on a wrapper. `ch` resolves against the
font-size of the element carrying it, so the same token on a wrapper holding an `h2` and a `p`
means two different widths.

One literal survives: `.ui-footer__brand` keeps 300px, because it is a flex track in a wrapping
row whose width decides when the footer breaks into columns. It answers to the row rather than to
a scale.

Decided in [#208](https://github.com/apliteni/apliteni-ui/issues/208).

## Breakpoints

The kit has three breakpoints, and every media query in `src/styles/` and `site/` is at one of
them. This is the list:

| step    | what changes at it                                                                     |
| ------- | -------------------------------------------------------------------------------------- |
| `860px` | the page stops holding three tracks — a three-across grid drops to two, a side-by-side pair stacks |
| `720px` | the shell folds — the app rail becomes an icon strip, link columns halve, a secondary label drops out |
| `560px` | one column — every remaining grid is a single track, and a floating panel goes edge to edge |

A step is a viewport class, not a surface's preference. Three surfaces had a fourth, fifth and
sixth value of their own — 460, 600 and 760 — and each is now at the step above the one it wrote,
so each reflow happens at a wider viewport than before and no layout has less room than it had.

The values are written as literals, and that is a convention rather than an oversight. A media
query cannot read a custom property, so `@media (max-width: var(--panel-lg))` is invalid however
much token discipline is applied to it. The two ways out are a build step that inlines the value,
or a documented list with a gate over it. The kit takes the second, because its distribution story
is a plain stylesheet a consumer reads and edits, and putting a compiler between the source and
that file costs more than the duplication it removes.

`560` is also `--panel-lg` and `860` is also `--measure`. That is arithmetic and not a
relationship: a breakpoint asks about the viewport, a token bounds a box, and neither number
follows the other — move the reading column and the wide step stays where it is. Nothing marks the
coincidence at the query, because a comment claiming a link that does not exist costs a reader
more than the silence does.

Held by `stories/breakpoints.test.js`, which reads the three steps out of the table above at run
time and fails any `@media` prelude in the swept trees carrying a px value that is not one of
them. It fails the other way too: a step nobody queries is a list that has outgrown the kit, so
adding a fourth means adding the query that needs it. `site/public/` is build output and is not
swept.

Decided in [#208](https://github.com/apliteni/apliteni-ui/issues/208) and
[#221](https://github.com/apliteni/apliteni-ui/issues/221).

## Spacing and rhythm

Every padding, margin and gap in the kit's stylesheets is `0` or a `--space-*` step. That holds
for modifiers as well as base rules, so a density variant is the same scale at a different index
rather than a second vocabulary.

Where a value sat exactly between two steps, **the tie is broken by what the value is for** —
not by rounding half up, and not by whichever step is closer to the number that was there before:

- `.ui-table--dense` rounds **down**. The modifier exists so a many-column ledger fits more rows,
  and rounding a tie up would put it one step from the base rhythm and spend the distinction it
  is for.
- the hover inset rounds **up**. It exists so the rounded hover fill clears a container's border,
  and clearance rounds away from the edge.

Each value's job is stated where the value is written, and the job decides the direction.

Held by `stories/table-rhythm.test.js`. Decided in
[#211](https://github.com/apliteni/apliteni-ui/issues/211).

## Typefaces

The kit names **two** families, and the split is a role split rather than a preference:

```css
--font-display: 'Poppins', …;        /* headings, brand lockups, large readouts */
--font-sans:    'IBM Plex Sans', …;  /* text, tables, fields, chat — most of an app */
--font-mono:    ui-monospace, …;     /* code, identifiers, tabular figures */
```

**The element decides, never the size.** `h1`–`h6` take the display face from `base.css`; every
other element takes the text face from `body`. A size threshold was the obvious alternative and
is worse: it changes a heading's typeface halfway through a resize, which is the one thing a
reader notices. A component that wants a heading tag set in the text face says so on its own
rule, which outranks a bare element selector — `.ui-card__title`, `.ui-drawer__title`,
`.ui-drawer__section-title` and `.ui-confirm__title` are the four that do, and each says why
at the declaration.

**A brand mark is not text.** A wordmark keeps the display face at whatever size it is set at,
down to the 13px `.topbar .brand` runs at. That is the one exception to "the element decides",
and it is written where the exception is, in the shape the gate parses:

```css
/* display: brand — <why this one is a mark rather than text> */
font-family: var(--font-display);
```

**`b` and `strong` are `--weight-semibold`.** The browser default is 700, and at the 13px a
table or a chat feed runs at, 700 stops reading as emphasis and starts reading as a filled-in
shape. 700 stays available to anything that asks for it by name.

**Neither family is bundled.** The kit is CSS with no build step, so the host page loads the
fonts — and a family a token names but nothing loads resolves to the system fallback in
silence, which looks like a rendering bug rather than a missing link tag. So every place in
this repository that loads a font loads *both* families, and a gate holds that over whatever
places exist rather than over a list.

Poppins is a geometric display grotesque: wide, round counters, single-storey `a`, low stroke
contrast. It holds its character as a heading and smears as a paragraph, worst of all in
Cyrillic. Measured on one dense table, only the text face swapped: mean row height 62.27px →
56.40px, table height 778.08px → 707.63px, because three of twelve titles stopped wrapping to a
second line. On a 380px chat column, feed length 1567.45px → 1507.03px. Where nothing re-wraps
the two faces measure identically — the kit's line-heights are unitless, so a face only moves a
box by changing where a line breaks.

**A panel that leaves its subtree states its own role.** `portal: true` mounts a dropdown's panel
on `<body>` ([The dropdown panel](#the-dropdown-panel)), so what it inherits is decided by where it
landed rather than by the trigger it came out of. Measured on one dropdown inside a display-face
subtree: `var(--font-display)` in place, `var(--font-sans)` once portalled. `.ui-dropdown__panel`
names the text face itself, so both placements answer the same — a flag that positions a panel does
not change what it is set in.

Held by `src/styles/typeface-roles.test.js` and `scripts/font-loading.test.js`. Decided in
[#253](https://github.com/apliteni/apliteni-ui/issues/253).

## Labels and titles

**Text is never set in capitals by style.** No stylesheet, story or page in the kit changes the
case of the text it is given: no `text-transform` other than `none`, and no font setting that
draws small capitals. A label is written in sentence case and renders as it was written. A word
that is capitals in itself — an acronym, a currency code, a key name — is typed that way and
stays that way. The one case change left is in code and is not a label: `initials()` capitalises
the letters of an avatar mark.

That covers every label, not the eyebrow alone. Eleven rules set capitals until [#268][i268]:
the eyebrow, the table head, the badge, the pill, the nav caption, the menu group caption, the
menu row badge, the footer column title, the code sample's label, the confirmation's eyebrow and
the version badge. Each carried letter-spacing that only capitals need, and it went with them.
Where the displayed text was a key, the kit now writes the word: `versionSwitcher()` shows
`Live` and `Archive` for `live` and `archive`. Text a caller hands a badge is shown as handed,
so a status passed as `paid` reads `paid`.

**Five ranks, each smaller than the one above it.** A screen stacks a page title, card titles,
running text, labels and chips, and each takes one rank:

| rank         | size          | weight              | line-height        | what takes it |
| ------------ | ------------- | ------------------- | ------------------ | ------------- |
| `page-title` | `--text-2xl`  | `--weight-bold`     | `1.1`              | the page's `h1` inside `appShell()` |
| `card-title` | `--text-lg`   | `--weight-semibold` | `--leading-snug`   | a card's title |
| `body`       | `--text-base` | `--weight-normal`   | `--leading-normal` | running text |
| `label`      | `--text-sm`   | `--weight-medium`   | inherited          | an eyebrow, a table head, a nav or menu caption, a footer column title, a code sample's label, a confirmation's eyebrow |
| `chip`       | `--text-xs`   | `--weight-semibold` | inherited          | a badge, a pill, a menu row's badge, a version badge |

That is 30, 18, 14.5, 13 and 11px on the kit's own scale. A label sits one step under the body,
and its `--muted` ink and medium weight now set it apart, which capitals used to do. A chip is the smallest
because its fill already sets it apart.

**A card title is a heading, one level under the page's.** `card()` and `<Card>` emit it as an
`h2`, and `level` moves it to `h3`–`h6` for a card inside a section with an `h2` of its own. The
page title is set in the display face because it is an `h1`; the card title keeps the text face
on any element because its own rule names it ([Typefaces](#typefaces)). An eyebrow above a card
title is a label and not a heading: it names the kind of thing, and the title names the thing.

Held by `stories/guidelines/letter-case.test.js`, which sweeps `src/`, `stories/`, `site/`,
`react/src` and `.storybook` for a case change in a stylesheet, a `<style>` block, an inline style
or a JSX style object; and by `src/styles/type-ranks.test.js`, which reads the table above at run
time, finds every rule that claims a rank with a `/* rank: … */` note, and fails one that
disagrees with its row, writes the `font` shorthand or spaces its letters out, or a table whose
sizes stop descending.

Decided in [#268][i268] and [#269][i269]. The label and chip sizes were the owner's choice between
three treatments rendered side by side, not a derivation.

[i268]: https://github.com/apliteni/apliteni-ui/issues/268
[i269]: https://github.com/apliteni/apliteni-ui/issues/269

## Motion

**The drawer is the kit's default motion, and everything else copies it.** A panel that appears
takes 250ms, on `cubic-bezier(0.4, 0, 0.2, 1)`, moving `transform` and `opacity` and nothing else.
That is not a preference — it is the one transition in the kit whose reasoning was written down and
held by a gate, so it is the one the rest is reconciled against.

Every duration is one of four tokens. This is the list:

| token           | resolves to | what it times                                                        |
| --------------- | ----------- | -------------------------------------------------------------------- |
| `--dur-instant` | `80ms`      | a press: the frame of feedback under a finger, too short to read as motion |
| `--dur-fast`    | `150ms`     | a control changing state — hover, focus, a colour, a border, a caret turning |
| `--dur-med`     | `250ms`     | a surface arriving or leaving — drawer, confirm, dropdown, menu, toast, scrim |
| `--dur-slow`    | `400ms`     | an entrance or a reveal: the motion library's effects, scroll reveals   |

Every easing is a token too — `--ease` (symmetric, the default), `--ease-out` (arriving),
`--ease-in` (leaving), `--ease-sharp` (dismissing), `--ease-spring` (overshoot) — or `linear`.
All five alias the brand's `--easing-*` primitives, so the curve is one vocabulary and the
fallback is written once rather than at each use.

`linear` is not a lesser easing: `visibility` is a discrete property, so a curve buys nothing on
it, and one whose output leaves `[0, 1]` — `--ease-spring` does — flips it in the middle of the
fade. **Any transition of `visibility` is timed `linear`.**

**Anything that appears or leaves after the page has loaded moves.** A state rule that shows, hides
or moves an element — one keyed on `[hidden]`, `.is-open`, `.open`, `.show` and the like — has a
transition or an entrance animation between its states. Where a change is right to leave still, the
declaration says so and why, as `/* motion: still — why */`: a mark inside a row whose own
highlight already transitions, or a layout change that would reflow the page if it moved. Nothing
animates on first render; `playEntrance()` in `src/motion.js` plays an entrance only on the change
the reader caused. Text that changes in place — a count, a range — changes at once.

Content a script replaces wholesale is outside this guarantee: a toast stack closing the gap a
toast left, and the rows of a React table on a sort or a page turn.

Twenty-six declarations across six stylesheets wrote their own number instead, at five speeds —
`0.15s`, `0.16s`, `0.18s`, `0.2s`, `0.35s` — and thirty-six named a bare `ease`, which is
`cubic-bezier(0.25, 0.1, 0.25, 1)` and not the kit's curve. Two of the twenty-six
(`transition: 0.18s ease`) named no property at all, which is `all`, which includes
`visibility`. They are now the tokens above.

### The two kinds that keep a literal

A `transition` is a response: something the reader did, timed against how long they will wait for
it. It always reads a token. An `animation` is not always a response, and two kinds of it keep
their own numbers because a token would be the wrong unit:

- **ambient** — motion with no interaction origin, or whose length is set by something other than
  a response: a loader that loops until the work returns, a spinner, a skeleton sweep, a background
  glow drifting on a 14s period, a countdown ring spending a timer the caller set.
- **choreographed** — a fixed sequence whose parts are timed against each other. The success
  check's disc, tick and burst ring are `.5s`, `.5s @ .28s` and `.7s @ .2s`; retiming one piece to
  the nearest token breaks its relationship to the other two, which is the whole effect.

Each of these carries its reason at the declaration, as `/* motion: ambient — why */` or
`/* motion: choreographed — why */`. There is no third kind and no unannotated exception. The
`motion: still` note above answers a different question — whether a state change moves at all —
and is not a way to keep a hand-written duration.

`0.01ms` in the reduced-motion net is not a duration and is not tokenised. It is the kill-switch
idiom: short enough to be imperceptible, non-zero so `transitionend` and `animationend` still fire
for scripts that wait on a close animation.

### Reduced motion travels with the stylesheet

The net — `@media (prefers-reduced-motion: reduce)` neutralising every animation and transition —
lives in `src/styles/reduced-motion.css`, one copy. `src/index.css` imports it, so
`apliteni-ui/css` carries it. `react/src/index.ts` imports the same file, so `apliteni-ui/react/css`
carries it as well: a consumer who takes only the React stylesheet is not left with motion and no
net. Taking both is harmless — every rule in it is idempotent and `!important`.

**Under reduced motion, a change happens at once.** Nothing slides, fades or loops, and a one-shot
settles on its final frame. WCAG 2.3.3 would allow a fade here, since it does not count opacity as
motion; the kit does not keep one, because a single net over every sheet is the only version a new
component cannot forget.

The net gives every element a 0.01ms transition, and a child whose `visibility` is inherited then
turns visible one tick after its parent. An overlay that focuses a control in the frame it opens
would find that control still hidden. So an open drawer and an open confirm carry no transition
inside them at all — for as long as they are open, not only in the frame they open — and focus
lands where it does with motion on. Held by `stories/overlay-css.test.js`.

Held by `stories/motion-tokens.test.js`, which reads the four tokens out of the table above at run
time, resolves each through `tokens.css` into the brand primitive it aliases and checks the
milliseconds match, then fails any transition in the swept sheets that carries a literal time or a
bare easing keyword, any `visibility` not timed `linear`, any animation literal without its
`motion:` note, and any published CSS entry that ships motion without the net.
`stories/motion-coverage.test.js` discovers every state rule in the swept sheets that shows, hides
or moves an element and fails one that neither moves nor carries a `motion: still` note with a
reason. `stories/reduced-motion.test.js` holds the three declarations the net rests on, refuses an
`!important` duration outside a prefers-reduced-motion block — and inside a component's own block, any
that does more than switch motion off — and an `!important` loop count above one, and requires every
script that waits on `animationend` or `transitionend` to have a timer behind it.

Decided in [#200](https://github.com/apliteni/apliteni-ui/issues/200) and
[#271](https://github.com/apliteni/apliteni-ui/issues/271).

## Colour and contrast

**The accent is measured against its own wash, not against the surfaces.** Across all eight theme
× accent cells, the worst pair is the accent on the wash over a surface and never on a flat one —
which is why closing a failing cell means moving the wash or the ink under it rather than the
surfaces.

Every cell clears 4.5:1 on the worse of two composite models. The dark accent is `#b479ff` and
`--glow-purple` is that same rgb at a lower alpha, because the wash *is* the accent at low alpha
and re-tinting one without the other is half a change.

Held by `stories/accent-contrast.test.js` and `stories/signal-contrast.test.js`, both of which
take the accent list from `accents.css` rather than from a list typed into the gate.

Decided in [#157](https://github.com/apliteni/apliteni-ui/issues/157).

**A disabled control is painted, never faded.** `opacity` is a group property: it pulls a label
and the box under it toward the ground together, so what a reader is left with is wherever that
composite lands. A disabled primary button measured 1.48:1 that way — white on a washed-out accent
— and no disabled control in the light theme reached 3:1. Every disabled rule with a label under
it now takes `--disabled-ink` on `--disabled-surface` at full opacity, which composites
predictably, and every disabled label on a box of its own measures between 4.89:1 and 6.91:1.
A ghost button paints no box, on or off, so its label is read on whatever is behind it. It takes
`--disabled-ink-bare` instead, set for the dullest ground the kit paints, and reads between
5.20:1 and 7.49:1 depending on where it is put. That is still well under the enabled ghost beside
it. Settled in [#273][i273], and re-measured at
[#295](https://github.com/apliteni/apliteni-ui/issues/295), which moved every ground under both
inks — see Elevation above.

The floor is **3:1**, the bar WCAG uses for large text and for a graphic — a disabled label has to
stay identifiable as the word it is, and no standard sets this because 1.4.3 exempts the control
outright. It is not higher, because the other pressure turns out not to live on this axis: the
disabled primary reads 6.91:1 in dark and 4.89:1 in light, against 5.70:1 and 7.34:1 for the
enabled one — more contrast than the enabled button in dark and less in light — and nobody
confuses white on purple with grey on grey in either direction. Contrast carries legibility; the
paint carries the state. So the guarantee has a second half — **a disabled control never shows the
pair it shows enabled** — and that is what a control cannot satisfy by looking available.

The trio is neutral, so it does not move with the accent, and a disabled control drops the accent
by construction. One rule still fades: the switch track, which has no label inside it.

Held by `stories/guidelines/accessibility-floor.test.js`, which takes its subjects from every
disabled selector in the sheet rather than from every rule that sets `opacity` — the mechanism is
not the subject — and measures each one twice, once as a story renders it and once with the
disabled state taken off the element and the cascade read again.

Decided in [#220](https://github.com/apliteni/apliteni-ui/issues/220), measured in
[#201](https://github.com/apliteni/apliteni-ui/issues/201).

## Elevation

**Nothing in the kit casts a shadow.** A surface says how high it is with two things: its step on
a ladder of lightness, and the kit's hairline around it. `--shadow-sm`, `--shadow-md`,
`--shadow-lg`, `--shadow-seg` and `--shadow-card` are still published so a consumer reading one
does not break, and all five are the transparent shadow `0 0 #0000` in both themes. Nothing under
`src/` reads them. **Transparent and not `none`**, because a shadow token is read in a list: the
kit's own pre-0.32 pattern was `box-shadow: var(--shadow-lg), var(--ring)`, and `none` is valid
only on its own — it invalidates the whole declaration and takes the focus ring out with it.

A cast shadow is an **offset** layer of ink under a surface, and that is the thing this rule
refuses. A zero-offset layer of the signal's own colour is a glow, not a shadow: it says *this is
lit*, not *this is high*. `--glow-*`, `--sheen`, `--ring` and the two `drop-shadow()` glows on the
success mark are all that shape and all stay.

The ladder, bottom to top:

| Token | The step | Dark | Light |
| --- | --- | --- | --- |
| `--bg` | the page | `#0e0d14` | `#eef0f5` |
| `--surface-2` | sunken — a field, a track, a disabled box, a code block | `#161520` | `#e3e6ee` |
| `--surface` | a card | `#211e2d` | `#f8f9fc` |
| `--bg-elevated` | floating — a menu, a panel, the drawer, a modal, a toast | `#2a2639` | `#ffffff` |
| `--surface-3` | the top step — the hover readout, a chip, the nav rail's hover | `#2d293c` | `#e7eaf1` |

Dark runs it upwards: the page is the darkest thing on screen, every step above it is lighter than
the one under it, and the order in the table is the order on screen. Light cannot, because nothing
is brighter than the white a card already was — so the page comes off white, the card comes off
white behind it, and white is kept for the top: **a floating panel is the only pure white on a
light screen.**

**In light the ladder is not monotonic, and the top step is the exception.** `--surface-3` is
`#e7eaf1`: below the page, and 1.04:1 above the sunken step. It cannot be above `--bg-elevated`,
because `--bg-elevated` is white and light has nothing brighter to give it. So in light the top
step means the **quiet fill** rather than the highest surface — a chip, a hovered row, the hover
readout's panel — and a reader sees the light readout as a recessed surface rather than a raised
one. This is the value the picked prototype carried and the one the approved frames were drawn
with; it is stated here rather than described as a ladder light does not run. Open on
[#295](https://github.com/apliteni/apliteni-ui/issues/295).

**Every floating surface keeps the hairline as well, and the card takes one in both themes.**
A step of lightness on its own is a contrast of about 1.1 — enough to read as a change of surface,
not enough to draw an edge. The line draws the edge; the step says which way is up. Dropping
either one leaves a theme carrying the whole separation on the half that is weak for it.

**Inside a raised surface, a row or a chip that lifts takes the step above the panel.** A hovered
row, an active row, a chip and a key cap inside a floating panel paint `--surface-3`, never
`--surface`: `--surface` is the card step and sits *below* `--bg-elevated` in dark, so a hover
drawn with it sank while the panel it was in floated. In light that step is drawn downwards —
`--surface-3` is darker than the white panel — which is how a light theme has always shown a
hover. A field inside a panel goes the other way: it is the sunken step, `--surface-2`, the same
one `.ui-input` takes.

**The accent wash is painted on a base surface, never a raised one.** A translucent wash over a
raised surface sits closer to the ink read on it than the same wash over the page, which is what
takes an accent counter under the floor inside a panel. Two rules state it:
`src/styles/nav.css:128` `.ui-nav__item.is-active .ui-nav__badge.is-accent`, and
`src/styles/dropdown.css:166` `.ui-dropdown__badge.is-accent`.

**The ladder is capped by ink, not by taste.** `--muted` carries a dropdown row's description and
the readout's label, so it has to clear AA on every step the ladder raises — and it is re-picked
against the TOP of the ladder rather than against the page. That is the standing cost of the rule:
a raised surface that gets lighter asks the ink to get lighter with it, and the next surface that
wants to float spends what is left.

Held by `stories/contrast.test.js` and `stories/accent-contrast.test.js`, which measure every
ground the two token files declare rather than a list typed into a gate.

Decided in [#295](https://github.com/apliteni/apliteni-ui/issues/295), after
[#284](https://github.com/apliteni/apliteni-ui/issues/284) made the card flat.

## The focus ring

`--ring` is the accent at full opacity, declared once:

```css
--ring: 0 0 0 3px var(--accent);
```

**Opaque**, because alpha was the entire gap. No alpha under 0.75 clears 3:1 in dark and none
under 0.63 clears it in light, and both sit on the bar with nothing to spare. At full opacity the
worst of the eight cells measures 4.22:1 and the best 8.40:1. A focus ring is a graphic; a
translucent one is a glow, and the kit's glow is `--glow-purple`.

**Derived, not copied.** Re-pointing `--accent` re-points the ring. Light declares an accent and
inherits the ring, and so does every sub-theme — there is no second declaration to keep in step.

The gate sweeps all eight theme × accent cells and carries two numbers: the 3:1 the standard asks
for, and a 4.22 ratchet at what the kit actually reaches. The ratchet fires while the ring is
still legal, which is the only warning anyone gets before it is not.

Decided in [#218](https://github.com/apliteni/apliteni-ui/issues/218).

## A field is 16px on a touch screen

iOS Safari zooms the page into a focused field whose text is smaller than 16px, and it does not
zoom back out — the reader is left panning a page they were typing into. The kit's fields are
14.5px, the dropdown's search field 12.5px, the pager's two controls 13px, so every one of them
did it.

**One net, over elements rather than classes.** `src/styles/field-zoom.css` holds a single
`@media (pointer: coarse)` rule taking `input`, `select` and `textarea` to 16px, and `src/index.css`
and `react/src/index.ts` both import it, so either stylesheet carries it. The controls with nothing
to type into — checkbox, radio, range, colour, file, hidden, image, and the three button types —
are left out; none of them zooms. A list of kit classes would have needed an edit per component and
would have left a host page's own fields zooming on the kit's sheet, which is why the selectors are
elements. `!important`, for the reason `reduced-motion.css` takes it: a net has to outrank a
component rule it has never seen. Both nets are idempotent, so importing both stylesheets costs
nothing.

**The size is real, never a scaled 16px.** The zoom reads the computed font size, so a 16px field
shrunk back with a `transform` still zooms, and the transform takes the border and the focus ring
down with the text.

**`font-size` and not the viewport.** `<meta name="viewport" content="user-scalable=no">`, or a
`maximum-scale=1`, also stops the zoom. It does it by taking pinch-zoom away from every reader of
the page, which fails WCAG 1.4.4 and which Apple's own [Human Interface
Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility#Text-display)
argue against — text has to stay resizable. It is also not the kit's to set: a viewport tag belongs
to the host page, and a kit that needs one has moved a requirement onto every consumer. A font size
is the fix that lives in the stylesheet the fields already come from.

**What it costs.** A field on a touch screen is set larger than the design calls for, and the boxes
that hold one grow with it — the pager's size control and jump box most visibly. That is the trade,
and it is taken on every field rather than on the two a reader was reported to have hit.

**And what it costs a host page.** Reaching by element is what covers a component nobody has
written yet, and the same reach lands on fields the kit did not render. The net is a flat size
rather than a floor — a CSS floor on the element's own font size is not expressible — so a host
field *designed above 16px*, a 20px hero search among them, is made **smaller** on a touch screen
than it is with a mouse. Measured in Chromium under an emulated coarse pointer: a 20px host field
reads 16px with the net on the page.

The way out is the host's own `!important` rule, and it has to outrank the net rather than merely
repeat it:

```css
/* wins whichever sheet loads first — more specific than the net's bare element */
.hero-search input { font-size: 20px !important; }
```

A bare `input { font-size: 20px !important; }` ties the net on specificity and wins on source
order alone, so it holds only while the host's stylesheet is loaded after the kit's. A rule
without `!important` loses either way.

Held by `stories/field-zoom.test.js`, which mounts every story into a jsdom carrying no stylesheet,
asks each field whether the net's own selector reaches it, and weighs that against every
`font-size` rule read out of the kit's sheets as text — so a field sized under 16px fails, and so
does one sized above it, which this flat net would shrink. No cascade is resolved: jsdom does not
rank `!important` between rules, so the gate proves instead that the net is the kit's only
important font size. It also reads the net's own file: deleting the rule, or its `!important`,
fails there too.

Decided in [#294](https://github.com/apliteni/apliteni-ui/issues/294), after
[#291](https://github.com/apliteni/apliteni-ui/issues/291) answered it for the dropdown's search
field alone.

## Icons and glyphs

**An icon's size is settled by measuring the cascade, not by reading the stylesheet.** The kit
sizes icons in two places and they compete, so the gate mounts an element matching each rule's
selector against the kit's real stylesheets, in the order `src/index.css` imports them, and reads
`getComputedStyle` back. A subject is any rule setting `width` or `height` on an element that is
an `<svg>` — including a class the kit puts *on* an svg, which a selector-shape scan misses.

**A stroked glyph earns the graphic bar by its width.** What a reader sees is
`stroke-width × box ÷ viewBox`, so a stroke stated once and reused at a second box is two
different marks. At or above **1.5 CSS px** a mark is a graphic and takes the 3:1 bar. Below it a
stroke cannot put three quarters of its colour into any device pixel row at 1× — worst-case
sub-pixel phase splits it evenly across two rows — so the mark is optically a text stem and takes
the 4.5:1 text bar instead.

**Every stroked glyph in the kit clears 1.5 CSS px.** They land between 1.51 and 1.60, so a
glyph's weight does not depend on which slot it fell into. A rule that decides a glyph's box
decides its stroke, and both travel together.

Held by `stories/glyph-stroke.test.js`, which renders rather than reads: it builds every story
into a JSDOM carrying the kit's stylesheets and measures every `<svg>` that comes out, cascade
resolved. Its subjects are elements, so a stroke inherited from a rule seventy lines up and a
stroke that arrives from `icons.js` are both ordinary. It also refuses a sizing rule that no story
renders, which is how `.ui-feature__icon` turned out to be shipping with no specimen anywhere.

Decided in [#148](https://github.com/apliteni/apliteni-ui/issues/148),
[#171](https://github.com/apliteni/apliteni-ui/issues/171),
[#206](https://github.com/apliteni/apliteni-ui/issues/206) and
[#217](https://github.com/apliteni/apliteni-ui/issues/217).

## Pending and denied states

Two states every screen has: it is still fetching, and the reader is not allowed to see this.
`button({ busy: true })` had answered the first for one control — `aria-busy`, disabled — and
nothing said what the screen around that button does while the fetch is in flight, so every
consumer invented its own and none of them announced. `src/components/loading.js` is the kit's
answer for the screen.

What it guarantees:

- **One region, three renders.** `busyRegion()` is a live region that *outlives* the thing it
  reports on. It renders once, with `skeleton()` inside; `setBusy()` swaps its body and writes a
  line into the `ui-sr` node the region already contains. A live region whose text changes is
  the only thing assistive tech reliably speaks — inserting a fresh `role="status"` together
  with its text, the obvious shortcut, announces nothing on several screen readers, and that is
  the bug this file exists to stop. Whatever is in the body, the announcement comes from the
  region.
- **It reuses the announcement the kit already ships**, `role="status" aria-live="polite"` — the
  same pair `toast()` and `success()` carry. There is no second mechanism.
- **A skeleton is `aria-hidden`.** A shimmer is a picture of content, not content; what a screen
  reader gets is the region's message rather than a description of grey bars. The shimmer is
  `.m-skeleton` from the motion library, so it is inside that library's reduced-motion net.
- **`deniedState()` carries no role of its own.** Dropped into the region it is announced by the
  region; rendered as a whole page it needs no announcement, because nothing changed — that *is*
  the page. Two live regions racing over one event is how a screen says things twice.
- **No spinner factory.** The kit already spins in two places that own their context —
  `.ui-btn__bars` inside a busy button, `.ui-fbspin` inside the feedback composer — and a third
  would be a third thing to keep in sync. At screen scale a skeleton says more anyway: it says
  what shape is coming.

```js
const el = document.querySelector('#report');
el.innerHTML = busyRegion({ label: 'Loading your report…', lines: 4 });
const rows = await fetch(…);
setBusy(el, { busy: false, message: `${rows.length} rows`, body: table(rows) });
```

## The page shell

`appShell()` is the kit's one answer for composing a page, built from the kit's own nav
primitives. `accountShell()` stays as a preset over it for the `/account` pages already on it, and
`docs/library.md` marks it as such, so nobody has to be told which of two exported factories to
reach for.

What the shell guarantees:

- **A `<main>` landmark**, always.
- **The caller owns the breadcrumb trail.** `appShell()` renders `breadcrumbs()` from a `crumbs`
  array and invents nothing. Pass no crumbs and there is no trail and no breadcrumb landmark.
- **The topbar is off by default.** `appShell()` renders none unless the caller passes one;
  `accountShell()` passes one, because `versions`, `showSwitch` and `wireTopbar()` are published
  behaviour.
- **The narrow rail is CSS, not JavaScript.** `sideLeaf()` emits `aria-label` at every width, so
  `layout.css` folds `.ui-nav__label` out of view below 720px with the accessible name intact.
  Nothing re-renders on resize and the consumer wires no listener.
- **A nav entry carries the same icon and label everywhere it appears.**
- **The rail holds nothing that has to escape it.** `.ui-app__rail` is `position: sticky` with
  `overflow-y: auto`, and each of those traps a popover on its own — see
  [The dropdown panel](#the-dropdown-panel). A dropdown mounted in the rail passes `portal: true`.

The nav's own rules beat a host stylesheet: `.ui-nav .ui-nav__item` is (0,2,0) and a host sheet's
`a:link` is (0,1,1), so dropping the kit into a page that styles its links does not restyle the
navigation.

Decided in [#127](https://github.com/apliteni/apliteni-ui/issues/127). `appShell()` was the
owner's choice between three shells built and rendered side by side, not a derivation.

## The back link

A page that sits under another page — a record opened from a list — may carry a way back up to
it. `backLink()` draws that control, and `appShell()` places it when it is handed `back`.

What the kit guarantees:

- **It is a link to an address, never a step through the history.** `backLink()` renders an
  `<a href>` to the address its caller names. Given no address it renders nothing, and a
  `javascript:` address counts as none. The browser's own Back button keeps the history; this
  control goes to the parent page, in whatever state the caller writes into the address.
- **It names where it goes.** The visible text is the destination as the sidebar or the trail
  spells it. The arrow is `aria-hidden`, so the accessible name says "Back to" that name, and
  still contains the visible text. Given no name, or the word Back, it shows "Back" and nothing
  more. A name that already begins "Back to" is read as the place after those words, so the link
  is never named "Back to Back to" anything.
- **It takes the trail's place, above the title.** `appShell({ back })` draws the link where the
  breadcrumb trail would go and draws no trail: a page has one or the other. A `back` that
  `backLink()` refuses leaves the trail standing.
- **The section stays lit.** With a back link on the page, the shell keeps the sidebar row the
  caller marks `active` highlighted, and marks it `aria-current="true"` — the current section —
  rather than `"page"`, which would announce the list as the page on screen.
  `sidebarNav({ activeIs: 'section' })` does the same outside the shell.
- **It stays quiet whatever the host does to links.** The link rests in `--dim` and takes no
  accent. Its colour rule is (0,2,0), so a host stylesheet's `a:link` at (0,1,1) does not repaint
  it.

When a page should take one, and what it says, are rules for the screen rather than guarantees of
the kit: they are on the Guidelines / Going back page in Storybook.

Decided in [#270][i270]. Four treatments were rendered side by side on the same page in
[docs/reviews/270-back-control.html](reviews/270-back-control.html), and the owner chose the quiet
link: a chevron and the destination's name in dim ink, in the slot the trail would take. That is
the only one the kit builds; the other three stay on that page as the comparison it was chosen
against.

Held by `src/components/back.test.js` and `src/styles/back.test.js`.

[i270]: https://github.com/apliteni/apliteni-ui/issues/270

## The dropdown panel

`dropdown()` places its panel; a consuming page never writes a rule to move it. Two things are
guaranteed, and each exists because the page had to write one.

**One offset, both directions.** `--ui-dropdown-gap` is declared once on `.ui-dropdown__panel` and
read by the downward `top`, by the upward `bottom` and by the portal's JS. `direction` picks which:
`'down'` is the default, `'up'` opens into the space above the trigger, and `'auto'` measures on
each open and flips only when there is not room below and there is more room above.

The upward rule releases the kit's own `top`. That is the whole of
[#255](https://github.com/apliteni/apliteni-ui/issues/255): an absolutely positioned box with both
edges pinned is stretched between them, so a page that set `bottom` and left the kit's `top`
standing got a panel fourteen pixels tall. Measured in a browser at 1280×800, the same menu at the
foot of a 249px rail went from 128.8px tall and hanging 66px below the fold to 128.8px tall and
inside it, at the same 9px from the trigger.

**A panel can leave its trigger's subtree.** `portal: true` has `wireDropdown()` mount the panel on
`<body>` as `position: fixed`, with the trigger's viewport coordinates written inline, repositioned
on scroll and resize. Two ancestor properties make that the only remedy, and `.ui-app__rail` has
both:

- An `overflow` other than `visible` on one axis makes the other non-visible too, so the rail's
  `overflow-y: auto` clips the panel on X as well — a 304px panel in a 249px rail loses its right
  edge mid-word.
- `position: sticky` opens a stacking context whatever its `z-index`, unlike `relative`. The panel's
  `--z-dropdown` is then sealed inside the rail, and raising it to `--z-overlay` changes nothing.
  Reported in [#252](https://github.com/apliteni/apliteni-ui/issues/252) with the measurement:
  `document.elementFromPoint()` on the panel's right edge returned the page's `.ui-card`, which is
  positioned and later in the DOM.

A portalled panel cannot take its open state from `.ui-dropdown.open .ui-dropdown__panel`, because
that selector stops matching the moment the panel is moved. It carries `is-open` on itself instead,
and the wiring keeps `.open` on the container so the chevron, `aria-expanded`, click-outside and
Escape are unchanged. Keyboard handling is bound to the panel as well as the container, since a
keystroke on a row no longer bubbles to it, and a panel whose container has been re-rendered away
is swept off `<body>` rather than accumulating.

`portal: true` is opt-in and not the default because it has a cost: the panel leaves its trigger's
place in the reading order and lands at the end of `<body>`. Opening it still moves focus onto a
row, and `aria-haspopup`, `aria-expanded` and the panel's own `role` and `aria-label` are unchanged,
so nothing is unreachable — but a reader moving linearly meets the two apart. Reach for it when an
ancestor traps the panel, which is what the rail does, and not otherwise.

The default renders byte-for-byte what it rendered before either variant existed. Both are opt-in,
so a page already working around this keeps working.

Held by `src/components/dropdown.test.js`, which reads the offsets out of the stylesheet — any
panel rule that pins `bottom` has to release `top`, and every offset has to read the one custom
property — and feeds the wiring measured rects, JSDOM having no layout of its own.

## A dropdown row is a div, a link or a button

`.ui-dropdown__item` renders identically under all three tags, and which one a row is written as
is the page's decision rather than the kit's.

The kit had already said a row gets chosen — `.ui-dropdown__tick` is the listbox variant's trailing
check, and `.ui-dropdown__item.is-selected` is what shows it — and choosing is a `<button>`'s job.
The rule reset nothing the browser puts on one, so a hand-written
`<button class="ui-dropdown__item">` arrived wearing the browser's own skin. Measured in Chromium
150 on the dark theme, and reported against 0.23.3 in
[#251](https://github.com/apliteni/apliteni-ui/issues/251):

| | before | after |
|---|---|---|
| `background-color` | `rgb(107, 107, 107)` | `rgba(0, 0, 0, 0)` |
| `border`           | `2px outset rgb(255, 255, 255)` | `0px none` |
| `font-family`      | `Arial` | the panel's own face |
| `text-align`       | `center` | `left` |
| `width`            | `196.86px` | `226px`, the panel's own |

That reads as broken stacking rather than a missing reset, which is what it actually cost: twenty
minutes inside `z-index` before the computed styles were pulled.

The row answers the UA's `font` **shorthand** in kind, with `font: inherit` rather than
`font-family: inherit`. `font: 400 13.3333px Arial` is one declaration setting three things, so
replacing only the family leaves 13.3333px and `line-height: normal` behind. `.ui-nav__item` escapes
that only because it declares a size and a line-height of its own; this rule declares neither.

Inheriting is also what keeps the face in one place. `.ui-dropdown__panel` pins `--font-sans` on
itself so a portalled panel cannot take its typeface from wherever it was mounted — see
[Typefaces](#typefaces) — and the row reads that rather than naming the same token a second time.

One difference is left standing on purpose: a `<button>` keeps `appearance: auto` where a `<div>`
resolves `none`. It paints nothing once the background and the border are authored — the same two
rows shot before and after are pixel-identical — and `.ui-nav__item` and `.ui-toast__action` have
both shipped without it.

`dropdown()` emits a `<div>`, or an `<a>` when an item carries `href`. It emits no `<button>` and
takes no option asking for one, so a page that needs the row to be a real button writes that row
itself — which is the case this guarantee exists for.

Held by `stories/dropdown-tag-parity.test.js`, which mounts a row under each of the three tags
against the browser defaults transcribed out of that measurement, and goes red when any of the five
declarations is taken back out. It carries one gap it cannot close: jsdom pins `text-align: center`
onto a `<button>` above any author rule, whatever the specificity and whatever the source order, so
that one declaration is held on the other two tags and by name in the rule all three share.

## A dropdown with a search field

`search: true` puts a text field above a dropdown's rows and filters them as the reader types. It
is opt-in, and a dropdown without it renders byte-for-byte what it rendered before. Asked for in
[#283](https://github.com/apliteni/apliteni-ui/issues/283): the finance portal's filter dropdowns
hold between 12 and several hundred options each, with no way to narrow them.

**Typing filters, and focus stays in the field.** The field is a `role="combobox"` that controls
the list through `aria-controls`. The rows stay `role="option"`, and the row Enter would pick is
named by `aria-activedescendant`, so the reader can keep typing. The field has the focus and carries
`--ring`; the active row takes the hover fill and a 2px accent bar, because two rings of equal
weight leave the reader unable to tell focus from the pick. Opening the panel puts focus in the
field, with the selected row active or the first one. For that, the open search panel is visible at
once rather than at the first step of its `visibility` transition: a browser will not focus a field
in a box that is still `hidden`, so the focus call was lost. Closing still fades.

- ↑ and ↓ move through the rows still showing, skip a disabled row, and wrap at the ends.
- Enter picks the active row, writes it into the trigger and closes. With nothing showing, it does
  nothing.
- Escape closes and returns focus to the trigger. Tab closes.
- Home and End move the caret, because they belong to the text field.
- Moving the pointer over a row makes it the active row, so Enter never picks a row other than the
  one under the pointer. A move event with no change of position is ignored: a browser sends one
  after the list scrolls, and it would take the active row away from the arrows.
- While an input method is composing (Japanese, Chinese, Korean), every key in the field belongs to
  it. The Enter that commits the text picks no row, and the arrows and Escape do not reach the list.
  The field checks `isComposing` and `keyCode 229` both, because Safari sends the committing Enter
  with `isComposing` false.

**The match is anywhere in the label**, ignoring case and accents, and rows keep their order. A
match anywhere finds every row a start-of-label match would find, and it also finds the rows a
reader remembers by a later word: "dollar" finds the US, Canadian and Australian dollars, and a
label like "Acme Payments Ltd" is found by "payments". What it costs is a wider result for a
one-letter query, which the second letter narrows. Descriptions are not searched, because the match
is not highlighted and a row shown for text in its second line leaves the reader hunting for why.
Text a reader will search by, such as a currency code, goes in the label: `US dollar (USD)`.

**Every open starts from the whole list.** The query is cleared when the panel opens, not when it
closes, so a panel fading out after a pick does not flash back to every row.

**No match says so.** A query that matches nothing shows "No match for “…”" and a nudge, never a
blank panel. `search.empty` can reword the first line, and `{q}` in it stands for the query. The
state is a `role="status"` region, so a screen reader hears it. It carries no action, per
Guidelines / Microcopy: a filter gets a nudge.

**The field stays put.** The rows scroll inside `.ui-dropdown__list`, capped at 300px or at the
height `scroll` gives, and the field does not scroll with them. The panel keeps the width the
whole list needs, so it does not narrow as rows are filtered out. A group with no match is hidden,
and the divider sits only between groups still showing, never above the first of them.

**On a touch screen the field is 16px**, because opening the panel focuses it and a focused field
under 16px zooms the page. It is the kit's one net that does this, over every field the kit ships —
see [A field is 16px on a touch screen](#a-field-is-16px-on-a-touch-screen). With a mouse the field
stays at the rows' 12.5px, and this sheet holds no touch rule of its own that could disagree with
the net.

**The panel is a dialog.** A listbox may own only options and groups, so a field inside one fails
axe's `aria-required-children`. With search on, the panel is a `role="dialog"` named after the
dropdown, the trigger announces `aria-haspopup="dialog"`, and the listbox sits inside it beside
the field. For the same reason, a `menu` dropdown given `search` renders its rows as options, and
a row carrying `href` becomes a plain option rather than a link.

When a dropdown must have a search field is on Guidelines / Component choice, and it is a rule
rather than a recommendation: ten options or more, or any list fed by data, gets a field. The
number was settled on #283.

Held by `src/components/dropdown-search.test.js`, which drives the kit's own wiring with real
events. The rendering is held by the browser only: jsdom does not rank the UA sheet below author
rules, so it cannot show that `.ui-dropdown__item`'s `display: flex` would outrank `[hidden]`
without `.ui-dropdown__list [hidden]`.

## The drawer

A drawer is a panel against one edge of the screen, over a scrim, for looking at or changing one
thing without leaving the list it was opened from. `drawer()` renders it and `wireDrawer()` gives
it the keyboard.

**It groups by heading, never by card.** `drawerSection()` puts a heading over a `<dl>` of label
and value pairs, so a screen reader hears each label with its value. The value sits beside its
label rather than at the far edge of the panel, and no row carries a rule.

**It draws three lines and no others.** One under the header, one over the footer, and one between
each group and the next. A drawer's normal state is a long record scrolling, and the header's line
and the footer's are what say where that scrolling stops. Inside the body the one division worth
drawing is group from group, inset by the body's padding; no row carries a rule, and nothing else
inside the panel draws one.

**It moves on open and on close.** The panel slides in from the edge it is anchored to while the
scrim fades, both on `--dur-med` and `--ease`. It leaves the same way. Under reduced motion both
are instant; see [Reduced motion travels with the stylesheet](#reduced-motion-travels-with-the-stylesheet).

Held by `stories/drawer-rules.test.js`. It renders every story in both themes into a jsdom carrying
the kit's stylesheets and measures every drawer panel that comes out, cascade resolved. Anywhere
inside the panel a card fails — `.ui-card`, or any box with all four edges drawn that is not a form
control or a button and does not sit inside one — and so does an `<hr>`, and any element with a
border on its top or bottom edge that does not also draw both sides. The group separator is the one
exception: a `.ui-drawer__section` that follows another and draws a line on its top edge alone. The
gate reads the three lines in both directions, so a header with no line under it, a footer with none
over it, a group with none above it, and an edge the body draws for itself each fail too. Logical
borders are read as the physical ones they are in horizontal, left-to-right writing. A specimen
inside `[data-specimen="dont"]` is a picture of the fault rather than a subject; the gate uses those,
and one fault of each kind it writes itself — lines added and lines taken away — to prove it can see
every fault at all.

Decided in [#272](https://github.com/apliteni/apliteni-ui/issues/272) and
[#271](https://github.com/apliteni/apliteni-ui/issues/271).

## The hover readout

`tooltip()` is the readout a surface shows while a pointer rests on one of its marks: a bar, a
point on a sparkline, a cell. It is an overlay, and that is the guarantee. **Showing, filling or
moving a readout never changes the size or the place of anything else on the page.**

- The readout is one element, rendered once inside its host and absolutely placed there in every
  state the stylesheet gives it. Its open state changes `opacity` and `visibility` and nothing
  else, so it paints and takes no room. `wireTooltip()` fills and places that element and never
  inserts one on hover; a host rendered without a readout is given one when it is wired.
- The host is the box the readout is placed against. `.ui-tip-host` makes it one, and
  `wireTooltip()` gives `position: relative` to a host that has no position of its own, so a
  `[data-tip-host]` without the class still places its readout on the mark. A host wired before it
  is in the document has no style to read yet, so it is given that position the first time a
  pointer or focus reaches it. A host driven only through `showTooltip()` is not wired, and needs
  the class. Hosts nest: a mark and a readout belong to the nearest `[data-tip-host]` above them,
  so a chart that is a host inside a card that is one too opens one readout per mark, its own.
- It takes no pointer events. A readout covering the marks beside its own would otherwise become
  the hover target, hide, uncover the mark and come back, at pointer speed.
- It opens above its mark, centred on it, `--ui-tip-gap` away. It flips below only when the room
  above is too small for it and the room below is larger, and room is measured inside the
  viewport less its scrollbars and inside every ancestor whose overflow clips, the host included. A readout whose
  author asked for below flips up by the same test. It then slides along the mark's edge to stay
  inside that box, no further than it has to. A `[data-tip-anchor]` inside a mark is placed
  against instead of the mark, which is how a sparkline's full-height slice opens on its dot.
- What it says is text: a label, a value and one detail, written with `textContent` and never
  parsed. An empty part is hidden. An empty readout carries no `role` until its first value,
  because a tooltip with no text in it has no accessible name.
- Focus landing on a mark shows the readout too, and describes the mark with it through
  `aria-describedby` while it shows, unless the mark already has a description of its own.
- Escape dismisses every readout the kit is showing, whether `wireTooltip()` or `showTooltip()`
  showed it, without the pointer having to move, and the mark's description goes with it. The
  readout comes back on the next mark, not on the one it was dismissed from. Crossing the gap
  between marks and returning does not end that; the pointer leaving the host does, and so does
  `hideTooltip()`. `showTooltip()` keeps to it as well, so a chart that calls it on every pointer
  sample does not reopen what Escape closed.
- A readout rendered with `open` is a picture of one, the way a documentation page shows it. Its
  host carries `.ui-tip-host` and no `[data-tip-host]`, so no wiring reaches it, and Escape leaves
  it alone because the kit never showed it.

**Not decided yet.** The wiring adds no tab stop to a mark, and it treats touch like any other
pointer, so on a touch screen a tap shows the readout only while the finger is down. Whether a
chart's marks should take focus, and whether a tap should pin the readout or a finger scrub along
the line, is open on [#282][i282] and waits on the owner. Until it is settled, the rule for pages
is that no value is reachable only by hovering.

The kit had no readout until [#282][i282]. The finance portal's overview drew two, on one screen:
its bar chart overlaid its readout and nothing moved, while each KPI sparkline inserted its
readout as a row, so the card grew by a line and everything under it moved whenever the pointer
landed on a point. The rules for pages are in Storybook, under Guidelines / Hover readouts.

Held by `src/components/tooltip.test.js`, which reads the stylesheet for the out-of-flow and
open-state rules, watches the page with a `MutationObserver` while marks are hovered, and feeds
the placement measured rects, jsdom having no layout of its own.

[i282]: https://github.com/apliteni/apliteni-ui/issues/282

## Pagination

The pager renders a page its caller has already computed. Rows do not go into it: it is given
the current page, the page size and, where the caller knows it, the number of rows in the whole
result. A page a server counted and a page sliced out of an array in memory therefore produce
the same markup, and a surface that pages on the server does not have to defeat a second pager
inside the component to say so.

A result whose size is not known is a supported shape rather than a degraded one. Given no
total, the pager offers only the step before and the step after, because no other control can be
computed without a last page; whether a step after exists is the caller's to state. Nothing in
that shape claims a page count, and nothing invents one.

A control that would leave the result is disabled and stays where it is. It is never removed and
never swapped for text: a control that disappears moves the controls beside it under a pointer
already travelling toward one of them, and takes away the only evidence a reader has that they
are at the start or the end.

One page of content gets no steps. Offered no choice of page size, such a pager renders nothing
at all; offered one, it keeps its row count and that control and drops the steps alone.

The row range is announced. It is the only part of the pager that announces, and it announces
politely and as a whole, so a page turn is one statement rather than four. The announcement is a
rewrite of the range the pager already shows — `setPagerStatus()` in the HTML entry point, and
every render in the React one. A pager replaced wholesale arrives with its text already in it, and
is not announced, for the reason given under [Pending and denied states](#pending-and-denied-states).

The page size is a scale the kit names, and a table starts on the largest step a reader can
still take in at once. Which sizes a table offers is the consumer's, and so is remembering the
one a reader picked: the kit renders the choice and does not persist it.

A page turn does not move the ground under the reader. While the next page loads the pager keeps
its numbers legible, marks itself busy and stops taking input, and a table waiting on a page
reports that it is busy without discarding the rows it is showing. What replaces those rows is
the consumer's — the kit renders what it is handed — so the guarantee here is that nothing the
kit draws collapses on its own while the wait lasts.

The kit shipped none of this until [#273][i273]. Its one pager sliced the rows it was
handed, drew itself whether or not a second page existed, and could not be turned off — so
a consumer paging 4,812 transactions a hundred at a time passed its own row count as a page
size to stop the second slicing, and then hid the strip with `display: none` on the two
surfaces where `Page 1 of 1 · 100 rows` sat under a server pager reading `1–100 of 4,812`.

Held by `src/components/pagination.test.js` and `src/styles/pagination.test.js`.

[i273]: https://github.com/apliteni/apliteni-ui/issues/273
[i274]: https://github.com/apliteni/apliteni-ui/issues/274

## Stat bands

`statBand()` renders a row of key figures. Each figure is a label and a value, and may carry a
change and a trend. A figure is only ever rendered inside its band, because its label and values
are only valid inside the band's list. The band is a description list: a figure's label is the term and everything
after it is a value of that term, so a screen reader reads each figure as one statement.

A figure is never broken across lines and never truncated. A band too narrow for its figures moves
a figure onto the next row rather than let it overlap the one beside it. It also folds before
plain wrapping would leave one figure alone on a row: four figures become two rows of two, and an
odd count becomes one column. The band decides this from its own width and not the window's, because a band beside a rail and a band
across a page are different widths at the same viewport. Six or more figures wrap as they fit.
Because it sizes from its own box, the band takes the width of the box it sits in: in a flex row or
an `auto` grid track it has no width of its own, and the caller gives it one. The widths below are the band's own
content box, measured in a browser over each layout at two, three and four figures of
`€ 6,459,401`:

| Layout | Four fold two by two at | An odd count stacks at | One column at |
|---|---|---|---|
| Band and tiles | 56rem | 42rem | 28rem |
| Open | 66rem | 50rem | 32rem |

A change shows which way it went with an arrow read off the sign the caller printed. Whether it is
good news is the caller's to say, and colour follows that alone: a cost that rose is not painted as
a success because it went up. Colour is a verdict, and not every figure is judged: a change nobody
gives a tone, and one given the tone `neutral`, are the same neutral change — the arrow is drawn and
the colour withheld. A change with no earlier figure says so in words and is never shown
as `+0%`, and takes no tone, because there is no news to colour.

A change says what it is measured against, in text a reader can reach: once for the whole band, in
the band's caption, which every change points at, or beside the change when one figure is measured against
something else. A hover `title` does not count, because a phone never shows one. On a band with
no changes, the caption says what the figures cover instead, such as the period.

The caption comes **before** the figures, in every layout, the way a table's `<caption>` does. It is
one statement about all of them, so it is read before the numbers it explains and it sits outside
every figure. Under a row of tiles it would read as a note on the last card, and inside the first
tile it would read as that figure's own comparison — which is a different thing the band already
says beside the change.

The trend is a slot. The kit sizes and colours the caller's `<svg>` and draws no chart.

Three layouts ship. `tiles`, the default, puts each figure on a card of its own, so a figure can
be read, moved or linked on its own. `band` is one card with the figures divided by space. `open`
draws no surface; it rules a line over each figure and sets the value larger.

The kit had no stat band until [#267][i267]. The finance portal built three of its own, which
disagreed on the size of a value, the case of a label and what held the figures, and the one on
its Company Overview showed each change as a status chip with its comparison in a hover title.

Held by `src/components/stat.test.js`, `src/styles/stat.test.js` and `stories/stat-basis.test.js`.

[i267]: https://github.com/apliteni/apliteni-ui/issues/267

## React tables

A table may omit selection controls when its consumer has no selection action. Existing
selection-enabled tables keep their row and visible-page selection behavior.

Sorting may be controlled by the consumer or managed by the table. The default remains the
first sortable column, descending. A controlled sort reports header activation to its owner;
the owner supplies the next state. One table stays in one of those two modes for as long as
it is on the page: a table that is given a sort and later left to manage its own is not
supported, and returns to its default order rather than to the order it was showing.

An absent sort key preserves input order. Equal values retain input order, and ordering
hands back a list of its own, so the rows a caller supplies are never reordered through the
result. Sortable columns require consistently typed, comparable values. Ordering of mixed types,
missing values and NaN is not guaranteed. The same ordering
function is available for another presentation of those rows.

Changing the sort returns the reader to the first page, whether the change came from a
header or from anything else the consumer offers. Sort headers keep their column roles,
keyboard buttons and sort direction announcements, and the column a table is sorted by
announces its direction whether or not its own header offers a sort control.

Paging may be controlled by the consumer or managed by the table, on the same terms as
sorting, and one table stays in one of those two modes for as long as it is on the page. A
table left to manage its own paging holds the rows it was given and shows one page of them
at a time. A controlled table shows the rows it was given and shows all of them: they are
the page, the consumer chose them, and the table neither reorders nor divides them again.
The count such a table reports is the consumer's, because the rows in front of it are not
the whole result — and a consumer that cannot count the whole result says so, which is the
shape the pager already has an answer for.

A table that pages under its own control returns the reader to the first page when the
sort changes. A controlled one asks its owner to, exactly as it asks for a sort change,
because only the owner can fetch what the first page holds.

A table may render no pager at all, for a surface that supplies its own. A table whose rows
fit on one page renders none either, on the pager's own terms rather than by a second rule
here.

The page a table starts on shows as many rows as the kit's largest page size, not as many
as fit a demonstration.

## The command palette

The kit ships the palette's shell, its ranking and its keyboard, and names no result kinds.
What a result *is* — an invoice, a campaign, a domain — is the product's vocabulary, and a kit
that enumerated those would need a release before a product could add one. Groups are the
caller's, named in the caller's words.

What the kit does name is the three ways a row can behave, because each one answers Enter
differently: a row that goes somewhere carries an `href`, a row that runs something reports a
`ui-command` event, and a row that destroys something names a confirm and opens it. A
destructive row that names no confirm is rendered disabled rather than run — the palette is the
fastest surface in a product and the one where a reader is looking at the text box rather than
at the list.

Results are ranked on how the query meets the item, and the caller breaks every tie. A whole
label beats a prefix, a prefix beats a word start, a word start beats a substring, a keyword
beats a note, and initials come last; groups are ordered by their best row, so the row under
Enter is the best answer in the palette rather than the best answer in the first group. Where
scores are equal the order the caller passed stands — with nothing typed that is the whole
list, unchanged, which is where a product puts the four things somebody actually does here. The
kit remembers nothing between openings: a palette that should show recents is a palette that
was passed a recents group.

A palette a server feeds does not rank at all. It reports what was typed, renders the results it
is handed in the order it is handed them, and the ranking rule above becomes the server's to
apply — the same function, exported, rather than a second one written next to it.

The same markup is rendered by the HTML factory and by the React component, and the React one
imports the kit's ranking rather than repeating it, so a palette rendered on a server and the
same palette after a keystroke cannot disagree about what comes first.

The keyboard is six keys and no more: Cmd or Ctrl+K opens it, the arrows move the active row and
wrap at both ends, Enter runs it, Escape closes the top overlay, and Tab does not leave. Home and
End stay with the text caret, which is what the ARIA combobox pattern gives them for. Ctrl+K
inside another text box is left alone, because it is kill-to-end-of-line there.

DOM focus opens in the text box and never leaves it while the palette is up: the active row is
named by `aria-activedescendant`, each row is an `option` out of the tab order, and the page
behind is inert. The number of results is announced politely, as a count and never as the rows —
a live region holding the list would read all of it out again on every keystroke. On the way out
focus goes back to whatever opened it, and to the page when the command that ran took the opener
with it.

The palette joins the same stack every kit overlay is on, and paints one step above the drawer
and one below the confirm. Three steps and not two, because at equal levels paint order falls
back to document order while the keyboard follows the stack, and the overlay a reader can see
then stops being the one that answers the keys. A palette is summoned deliberately and has to be
seen, so it goes over a drawer that was already open; a confirm a row opens is a question about
what is under it, so it goes over both, answers the first Escape, and leaves the palette
standing underneath.

That last sentence is the vanilla half. The React palette and the React `Modal` each register
their own document listener rather than sharing a stack, so one Escape closes the modal and the
palette under it; the React half joins the shared dialog stack when the drawer branch lands.

It opens empty. A palette that comes back holding the last query shows a list answering a
question the reader has already finished asking, and the next keystroke appends to it.

Held by `src/components/command-palette.test.js` (the markup, the three behaviours and the
ranking), `stories/palette-keyboard.test.js` (the keys, the focus and the announcement),
`stories/guidelines/command-palette.test.js` (the guidelines page against the component, and
every palette row any story renders), `react/src/CommandPalette.test.tsx` (the React face against
the factory, shape by shape) and `stories/overlay-css.test.js` (the layer, and the rules JSDOM
cannot run). Settled in [#274][i274].

## What the kit does not do

Stated so nobody has to discover it by trying:

- **No JavaScript framework.** The factories return HTML strings. Anything stateful is the
  consumer's, and the React subpath is a wrapper over the same CSS rather than a second kit.
- **No build step.** No Sass, no PostCSS, no token compiler. The consequence is
  [breakpoints as literals](#breakpoints), and that is the trade taken deliberately.
- **No density system.** `.ui-table--dense` and `.ui-cmdk--roomy` are the only density
  modifiers and both are component-local, because a tighter rhythm in a ledger — or a looser one
  in a list of invoices that need a sentence to tell apart — is a property of the data rather
  than of the page around it.
- **No container scale.** There is one `--container`, not a narrow/wide set. Naming a
  disagreement is not settling it, and the next width would land on whichever step is closest
  rather than on the one that is right.
- **No second bar for a control's glyph.** 1.5 CSS px is the line for every stroked mark. A glyph
  inside a button is not exempt for being small.
- **No charts.** A stat band's trend is a slot for the caller's `<svg>`. The kit sizes and
  colours it, and a line, a dot or a readout inside it is the consumer's.
- **No hand-written markup contract, except a row the kit renders as a control.** `.ui-side` and
  `.ui-shell` were layout scaffolding nothing emitted. A control row — a `<div>` with a role and
  a tabindex, or an `<a>` — is a consumer's to rewrite as a `<button>` when it must be operable
  from the keyboard, so those class names are a supported surface, and cancel a button's chrome.
- **No support for a vertical writing mode.** The icon gate folds `inline-size` onto `width`,
  which is only correct horizontally, and asserts the assumption rather than taking it: a
  `writing-mode` declaration anywhere in these stylesheets stops the gate.
