# What the kit ships and guarantees

This is the contract. Everything below is a statement a consumer may build on, and every one of
them is held by a gate that runs on `npm test` — so a guarantee that stops being true turns a
build red rather than quietly becoming a lie in a document.

What this is not: an argument. Where a number came from, what else was considered and who chose
between them lives in the issue that settled it, and each section below names its issue. Read
[README.md](README.md) for where a decision gets recorded from now on, and
[CONTRIBUTING.md](../CONTRIBUTING.md) for how the gates that hold these guarantees are built.

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
- **[The drawer](#the-drawer)** — grouped by heading, and moving on open and on close
- **[Pagination](#pagination)** — a page the caller computed, and what happens when nobody counted it
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
a `--prose-*` step in ch. Nothing has to be looked up to choose — the thing being bounded picks
the unit, and the unit picks the scale.

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
would find that control still hidden. So the drawer and the confirm cancel every transition inside
them as they open, and focus lands where it does with motion on. Held by
`stories/overlay-css.test.js`.

Held by `stories/motion-tokens.test.js`, which reads the four tokens out of the table above at run
time, resolves each through `tokens.css` into the brand primitive it aliases and checks the
milliseconds match, then fails any transition in the swept sheets that carries a literal time or a
bare easing keyword, any `visibility` not timed `linear`, any animation literal without its
`motion:` note, and any published CSS entry that ships motion without the net.
`stories/motion-coverage.test.js` discovers every state rule in the swept sheets that shows, hides
or moves an element and fails one that neither moves nor carries a `motion: still` note with a
reason. `stories/reduced-motion.test.js` holds the net's three declarations, refuses `!important`
on a duration outside a prefers-reduced-motion block, and requires every script that waits on `animationend` or
`transitionend` to have a timer behind it.

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
predictably, and every disabled label on a box of its own measures between 5.56:1 and 6.11:1.
A ghost button paints no box, on or off, so its label is read on whatever is behind it. It takes
`--disabled-ink-bare` instead, set to clear 5.56:1 on the dullest ground the kit paints, and
reads between 5.60:1 and 7.00:1 depending on where it is put. That is still well under the
enabled ghost beside it. Settled in [#273][i273].

The floor is **3:1**, the bar WCAG uses for large text and for a graphic — a disabled label has to
stay identifiable as the word it is, and no standard sets this because 1.4.3 exempts the control
outright. It is not higher, because the other pressure turns out not to live on this axis: the
disabled primary reads 5.56:1 and the enabled one reads 5.70:1, and nobody confuses white on
purple with grey on grey. Contrast carries legibility; the paint carries the state. So the
guarantee has a second half — **a disabled control never shows the pair it shows enabled** — and
that is what a control cannot satisfy by looking available.

The trio is neutral, so it does not move with the accent, and a disabled control drops the accent
by construction. One rule still fades: the switch track, which has no label inside it.

Held by `stories/guidelines/accessibility-floor.test.js`, which takes its subjects from every
disabled selector in the sheet rather than from every rule that sets `opacity` — the mechanism is
not the subject — and measures each one twice, once as a story renders it and once with the
disabled state taken off the element and the cascade read again.

Decided in [#220](https://github.com/apliteni/apliteni-ui/issues/220), measured in
[#201](https://github.com/apliteni/apliteni-ui/issues/201).

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

## The drawer

A drawer is a panel against one edge of the screen, over a scrim, for looking at or changing one
thing without leaving the list it was opened from. `drawer()` renders it and `wireDrawer()` gives
it the keyboard.

**It groups by heading, never by card.** `drawerSection()` puts a heading over a `<dl>` of label
and value pairs, so a screen reader hears each label with its value. The value sits beside its
label rather than at the far edge of the panel, and no row carries a rule.

**It draws no line inside itself.** There is no rule under the header, over the footer or between
groups; the panel's edge is the only line. The header holds its place by spacing and weight, and a
long body scrolls under it.

**It moves on open and on close.** The panel slides in from the edge it is anchored to while the
scrim fades, both on `--dur-med` and `--ease`. It leaves the same way. Under reduced motion both
are instant; see [Reduced motion travels with the stylesheet](#reduced-motion-travels-with-the-stylesheet).

Held by `stories/drawer-rules.test.js`. It renders every story in both themes into a jsdom carrying
the kit's stylesheets and measures every drawer panel that comes out, cascade resolved. A card
inside the body fails, and so does any element inside it with a border on its top or bottom edge
that does not also draw both sides; a box with four edges is a control. So does a rule under the
header or over the footer. A specimen inside
`[data-specimen="dont"]` is a picture of the fault rather than a subject, and the gate uses those
to prove it can see both faults at all.

Decided in [#272](https://github.com/apliteni/apliteni-ui/issues/272) and
[#271](https://github.com/apliteni/apliteni-ui/issues/271).

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

## What the kit does not do

Stated so nobody has to discover it by trying:

- **No JavaScript framework.** The factories return HTML strings. Anything stateful is the
  consumer's, and the React subpath is a wrapper over the same CSS rather than a second kit.
- **No build step.** No Sass, no PostCSS, no token compiler. The consequence is
  [breakpoints as literals](#breakpoints), and that is the trade taken deliberately.
- **No density system.** `.ui-table--dense` is the only density modifier and it is
  component-local, because a tighter rhythm in a ledger is a property of the data rather than of
  the page around it.
- **No container scale.** There is one `--container`, not a narrow/wide set. Naming a
  disagreement is not settling it, and the next width would land on whichever step is closest
  rather than on the one that is right.
- **No second bar for a control's glyph.** 1.5 CSS px is the line for every stroked mark. A glyph
  inside a button is not exempt for being small.
- **No hand-written markup contract, except a row the kit renders as a control.** `.ui-side` and
  `.ui-shell` were layout scaffolding nothing emitted. A control row — a `<div>` with a role and
  a tabindex, or an `<a>` — is a consumer's to rewrite as a `<button>` when it must be operable
  from the keyboard, so those class names are a supported surface, and cancel a button's chrome.
- **No support for a vertical writing mode.** The icon gate folds `inline-size` onto `width`,
  which is only correct horizontally, and asserts the assumption rather than taking it: a
  `writing-mode` declaration anywhere in these stylesheets stops the gate.
