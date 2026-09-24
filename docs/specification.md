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
- **[Labels and titles](#labels-and-titles)** — sentence case, and six ranks in order
- **[Colour and contrast](#colour-and-contrast)** — what every accent clears
- **[The focus ring](#the-focus-ring)** — one declaration, derived from the accent
- **[Icons and glyphs](#icons-and-glyphs)** — size, stroke, and which bar a mark takes
- **[The page](#the-page)** — what one screen may hold, and what it may not
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

Every guideline page ships as plain Markdown under `guidelines/`. Storybook reads the
same documents, with live specimens attached to their rule ids. Reader-facing guidance
contains no source-file or line references. Decided in [#335](https://github.com/apliteni/apliteni-ui/issues/335)
and [#329](https://github.com/apliteni/apliteni-ui/issues/329).

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

The column comes in two widths, and they are names rather than numbers: `appShell({ width })`
takes `centered` — the capped, centred column the kit has always drawn — or `wide`, which takes
the cap off and fills the track beside the rail. Both are drawn in both layouts.

**`centered` is the default — Artur's call on 2026-09-14**, taken from both widths rendered in
both layouts and read side by side; the frames are under `docs/evidence/shell-layouts/` and the
verdict is on [#308](https://github.com/apliteni/apliteni-ui/issues/308). It also writes no class,
because it is the rule that was already there; `wide` is the one that adds `.ui-app__main--wide`,
and that rule's whole content is the cap it removes. Neither writes a second copy of a number.

`maxWidth` is the number under either name. The name picks the cap the column falls back to —
`var(--measure)` centred, `none` wide — and a caller who passes `maxWidth` replaces that fallback
on either, so the two options cannot disagree: there is one column, one cap, and the name says
which cap applies when nobody gave a number. Held by `stories/apps/shell.test.js` on the markup
and `stories/apps/shell-states.test.js` through the resolved cascade. Decided in
[#308](https://github.com/apliteni/apliteni-ui/issues/308); `wide` and `centered` are the
reference's `full` and `reading` under the kit's own names, and the reference's cap — the
container less the rail less the inset — was not taken, because `--measure` is where this kit
records a reading column and a third derived width would be a fourth number.

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

Component font sizes follow the `--text-*` scale. Sizes between tokens use the nearest
step plus a fixed pixel offset, preserving the default size while following a host
override. Equidistant sizes use the smaller step. The flat touch-field size remains
a safety exception described under [A field is 16px on a touch screen](#a-field-is-16px-on-a-touch-screen).
The landing hero and section display text in `layout.css` deliberately retain their
viewport-driven `clamp()` sizes.

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

**A panel that leaves its subtree states its own role.** `portal: true` moves a dropdown's panel
to the top of its trigger's own tree ([The dropdown panel](#the-dropdown-panel)), so what it
inherits is decided by where it landed rather than by the trigger it came out of. Measured on one
dropdown inside a display-face subtree: `var(--font-display)` in place, `var(--font-sans)` once
portalled. `.ui-dropdown__panel` names the text face itself, so both placements answer the same — a
flag that positions a panel does not change what it is set in.

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

**Six ranks, each under the one above it.** A screen stacks a page title, card titles,
running text, labels, captions and chips, and each takes one rank:

| rank         | size          | weight              | line-height        | what takes it |
| ------------ | ------------- | ------------------- | ------------------ | ------------- |
| `page-title` | `--text-2xl`  | `--weight-bold`     | `1.1`              | the page's `h1` inside `appShell()` |
| `card-title` | `--text-lg`   | `--weight-semibold` | `--leading-snug`   | a card's title |
| `body`       | `--text-base` | `--weight-normal`   | `--leading-normal` | running text |
| `label`      | `--text-sm`   | `--weight-medium`   | inherited          | an eyebrow, a table head, a nav or menu caption, a footer column title, a code sample's label, a confirmation's eyebrow |
| `caption`    | `--text-sm`   | `--weight-normal`   | inherited          | a sentence under a specimen, figure or screenshot |
| `chip`       | `--text-xs`   | `--weight-semibold` | inherited          | a badge, a pill, a menu row's badge, a version badge |

That is 30, 18, 14.5, 13, 13 and 11px on the kit's own scale. A rank is under the one above it by
size, or — where two share a size — by weight: `label` and `caption` are both 13px, and the label's
medium against the caption's normal is what separates them. A label sits one step under the body,
and its medium weight and spacing set it apart. Words use body ink, including labels and captions. A caption keeps
the body's weight because it is a sentence and not a label: at medium it reads as the bolder line of
the two, which runs the hierarchy backwards under a figure. A chip is the smallest because its fill
already sets it apart.

**A card title is a heading, one level under the page's.** `card()` and `<Card>` emit it as an
`h2`, and `level` moves it to `h3`–`h6` for a card inside a section with an `h2` of its own. The
page title is set in the display face because it is an `h1`; the card title keeps the text face
on any element because its own rule names it ([Typefaces](#typefaces)). An eyebrow above a card
title is a label and not a heading: it names the kind of thing, and the title names the thing.

Held by `stories/guidelines/letter-case.test.js`, which sweeps `src/`, `stories/`, `site/`,
`react/src` and `.storybook` for a case change in a stylesheet, a `<style>` block, an inline style
or a JSX style object; and by `src/styles/type-ranks.test.js`, which reads the table above at run
time, finds every rule that claims a rank with a `/* rank: … */` note — in the sheets the kit ships
and in the stories and pages this repo draws — and fails one that disagrees with its row, writes the
`font` shorthand or spaces its letters out, or a table whose ranks stop descending.

Decided in [#268][i268] and [#269][i269]. The label and chip sizes were the owner's choice between
three treatments rendered side by side, not a derivation. The caption row is [#310][i310]: 13px at
normal weight, the owner's call, so a caption under a figure stops outweighing the running text
beside it.

[i268]: https://github.com/apliteni/apliteni-ui/issues/268
[i269]: https://github.com/apliteni/apliteni-ui/issues/269
[i310]: https://github.com/apliteni/apliteni-ui/issues/310

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

## Text ink

Words use `--text` (or the full-strength foreground of their surface) at every size.
Do not rank descriptions, labels, captions, timestamps, counts, code comments or enabled
actions by fading them with `--muted`, `--dim` or opacity. A contrast pass is a floor:
small muted text can clear it and still read as decoration. Hierarchy comes from the
existing size ranks, weight and spacing; a secondary line still carries information.
Signal colours continue to report status and errors, and links retain their link ink.

Muted/dim ink has exactly three exception classes:

- **glyph** — a mark that is not words, such as an arrow, chevron or dismiss icon.
- **state** — colour reporting off, unset, disabled or archived state, rather than rank.
- **placeholder** — a slot has no value, such as an empty field or cell.

An empty-state explanation is not an empty slot; a keyboard shortcut is language the
reader must recognise; a count is not a status merely because its class says so. Generic
badges use body ink. Archive and disabled variants keep their state ink. Dropdown badges
use explicit `tone: 'state'` for these states, including translated labels. Only when tone is
omitted do exact English off, unset, disabled, archive or archived labels fall back to state
ink. Explicit neutral tone, unselected options and missing-comparison sentences use body ink.
To extend this closed list, open an issue and agree the new class before using it.

Every CSS `color` or `-webkit-text-fill-color` declaration that can reach muted or dim carries
an adjacent `/* muted-ink: glyph|state|placeholder — reason */` annotation, using one class.
`src/styles/muted-ink.test.js` discovers all CSS under `src/` and `react/src/`, follows alias
chains (including fallbacks), seeds every `--disabled-ink*` token and literal values equal to
muted/dim in tokens.css, and refuses an unannotated path. It also catches colour mixes and
explicit alpha syntax, directly or through aliases; even opaque alpha syntax needs review. It checks
containers as well as text selectors so inherited ink cannot evade it; no selector allowlist
is maintained. Annotation-removal mutations hold coverage.

The gate cannot infer whether caller-supplied words actually report a state: annotations need
semantic review. Inline styles, other literal colours, element opacity/filter and consumer
overrides are outside this declaration gate. Transparent text fill with background-clip: text
is exempt from declaration checking because its visible ink comes from the background; the
gate does not measure gradient opacity. The contrast walk still measures rendered pairs. Examples of the
rejected treatment are confined to guideline specimens. Labels and titles shows identical words
at xs, sm and base in body and muted ink, in either theme.

Decided by Artur on [#340](https://github.com/apliteni/apliteni-ui/issues/340), with the closed
exceptions from [#341](https://github.com/apliteni/apliteni-ui/issues/341), on 2026-09-23.

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

**Nothing in the kit casts a shadow except a surface that floats.** A card, a field, a chip and a
row say how high they are with two things: their step on a ladder of lightness, and the kit's
hairline around them. A floating surface keeps the step, draws the hairline **twice**, and adds
one soft drop. The drop is broad and faint, never tight and dark: it separates the panel from
what it covers, it does not draw its edge. All five deprecated `--shadow-*` tokens stay
transparent and unread; `--elev-drop`, under that second line, is the one shadow the kit paints.

**What floats is decided by the surface's job, not by its rung on the ladder.** A floating
surface is one whose whole purpose is to be temporarily above something else: a dropdown menu,
the account and workspace menus, the small-form popover, `confirm()`, the drawer, the React
modal, the three toast styles, the command palette, the hover readout, and the collapsed rail's
flyout label. Most of them paint the `--bg-elevated` step, and nothing *below* that step floats
— but the hover readout and the rail's flyout paint `--surface-3`, the rung above it, and they
float for the same reason the rest do. Reading the rule off the ladder instead would have
excluded the two surfaces that are most plainly temporary, and in light it would have excluded
them for being the *quiet fill* — see the note under the table.

`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-seg` and `--shadow-card` are still
published so a consumer reading one does not break, and all five are the transparent shadow
`0 0 #0000` in both themes. Nothing under `src/` reads them. **Transparent and not `none`**,
because a shadow token is read in a list: the kit's own pre-0.32 pattern was
`box-shadow: var(--shadow-lg), var(--ring)`, and `none` is valid only on its own — it invalidates
the whole declaration and takes the focus ring out with it.

A cast shadow is an **offset** layer of ink under a surface. A zero-offset layer of the signal's
own colour is a glow, not a shadow: it says *this is lit*, not *this is high*. `--glow-*`,
`--sheen`, `--ring` and the two `drop-shadow()` glows on the success mark are all that shape, and
none of them is what the rule above is about.

Decided on [#309](https://github.com/apliteni/apliteni-ui/issues/309), against the frames and the
numbers in `docs/reviews/295-popover-variants.html`. The complaint that opened it was that a
floating panel reads flat, and the measurements say why: a panel over a card differs by 1.11 in
dark and 1.05 in light, and its hairline runs at 1.14 / 1.24 against the panel it edges. The whole
separation rested on a one-pixel line at about 1.2. Five treatments were drawn; two were taken,
because each carries the theme the other cannot. A line is the only device that works in both,
and a drop is the only one that separates by **area** rather than by a pixel — which is what a
reader calling a panel flat is actually looking for.

The ladder, bottom to top:

| Token | The step | Dark | Light |
| --- | --- | --- | --- |
| `--bg` | the page | `#0e0d14` | `#eef0f5` |
| `--surface-2` | sunken — a field, a track, a disabled box, a code block | `#161520` | `#e3e6ee` |
| `--surface` | a card | `#211e2d` | `#f8f9fc` |
| `--bg-elevated` | floating — a menu, a panel, the drawer, a modal, a toast | `#2a2639` | `#ffffff` |
| `--surface-3` | the top step — the hover readout, a chip, the nav rail's hover | `#2d293c` | `#e7eaf1` |

**One field in the kit is not on the sunken step**: the topbar band's search field takes `--surface`,
because the band is `--bg` and a sunken fill on the bottom rung has nowhere to go but down into its
own ground — measured at 1.10:1 below the band in light before the change, and 1.08:1 above it after
(#318, chosen by the owner from four rendered alternatives;
src/styles/layout.css:365 `background: var(--surface);`).

**A sunken box is read against the surface it sits in, and a floating panel is a rung above a
card.** `--surface-2` is one rung under `--surface`, which is what makes a field on a card read as a
well. Inside a panel it is two rungs under `--bg-elevated`, and in light that panel is the only pure
white the kit paints, so the same token reads as a hole: the dropdown's search field measured
**1.249 against its panel and a 20.9-point drop in lightness**, where a kit field on a card measures
**1.186 and 15.6**. Reported on [#306](https://github.com/apliteni/apliteni-ui/issues/306)'s round 10
as the search box looking too dark, and the field was innocent — it paints exactly what `.ui-input`
paints. What moved was underneath it, when #314 took a light panel to white.

In light the field takes `--bg`, which puts it at **1.140 and 12.9** against the panel: a shallower
well than a card's, on a surface a step brighter than a card. Light needs its own value because its
top rungs are compressed — `--surface` inside the panel is only 1.053, a field flattened into the
surface with its border doing all the work. **Dark is unchanged and is an open question.** Its panel
is a middle step rather than white, so the same two-rung drop reads as a well and not a hole, and
nobody has been asked about it; `stories/dropdown-field-ground.test.js` holds light against the card
measurement and holds dark at the **1.234** this tree measures, so deepening dark is a decision
somebody writes rather than a drift, and bringing it in line lowers the number and passes.

The ladder measures lightness, not elevation. Two surfaces on its top step — the hover readout
and the collapsed rail's flyout label — float by role and take the treatment; the rest of that
step, a chip and a hovered row, does not.

Dark runs it upwards: the page is the darkest thing on screen, every step above it is lighter than
the one under it, and the order in the table is the order on screen. Light cannot, because nothing
is brighter than the white a card already was — so the page comes off white, the card comes off
white behind it, and white is kept for the top: **a floating panel is the only pure white on a
light screen.**

**In light the ladder is not monotonic, and the top step is the exception.** `--surface-3` is
`#e7eaf1`: below the page, and 1.04:1 above the sunken step. It cannot be above `--bg-elevated`,
because `--bg-elevated` is white and light has nothing brighter to give it. So in light the top
step means the **quiet fill** rather than the highest surface — a chip, a hovered row, the hover
readout's panel — and on its fill alone a light readout would read as a recessed surface rather
than a raised one. That is the case for deciding this by role rather than by rung: the readout's
drop and its two-step edge are what say *raised* in light, where its fill cannot.
This is the value the picked prototype carried and the one the approved frames were drawn
with; it is stated here rather than described as a ladder light does not run. Open on
[#295](https://github.com/apliteni/apliteni-ui/issues/295).

**Every floating surface keeps the hairline as well, and the card takes one in both themes.**
A step of lightness on its own is a contrast of about 1.1 — enough to read as a change of surface,
not enough to draw an edge. The line draws the edge; the step says which way is up. Dropping
either one leaves a theme carrying the whole separation on the half that is weak for it.

**A floating surface draws that line twice, and the second one is a pixel inside the first.**
`--border-strong` on the border, `--border` as an inset one-pixel line within it: an outer line
against what is behind, an inner one against the panel. One line measured 1.27 / 1.18 against the
card in dark / light; two measure **1.64 / 1.44**, and the two lines read 1.30 / 1.23 against each
other, which is what makes them two rather than one drawn thick.

**Then the drop, and it is the half that carries light.** A floating surface writes both devices
as one `box-shadow` list, in the order Primer's `--shadow-floating-*` uses — the inset line first,
then the two broad faint drops:

```css
box-shadow: inset 0 0 0 1px var(--elev-edge, var(--border)), var(--elev-drop);
```

`--elev-drop` is one token per theme, so there is one place to change the drop. The line is
**not** in it, and cannot be: a `var()` written inside a custom property is substituted at
computed-value time on the element that *declares* it, so an `--elev-edge` read inside a `:root`
token resolves once, at `:root`, always to the fallback — and every component below that
re-points it writes a declaration the browser ignores. The alphas are per theme because the
device is not worth the same in each. Dark spends 62% / 50% of `--shadow-ink` and still only reaches **1.20** at the
drop's core, because near-black ink on a near-black page has nowhere to go — dark is carried by
the edge. Light spends 18% / 10%, lands the core at `#d1d2d8`, and reads **1.44** on the card,
which is the strongest separation either theme gets from any device measured for #295. The page
measured 1.43 for the same drop, because its prototype wrote the ink as a literal `#101626` at 17%
rather than reading `--shadow-ink`, which is `#1e1e32` here; the kit's own token is what ships, and
1.43 is what the gate floors.

Three things follow from writing it as one list.

- **The focus ring composes with it.** A `box-shadow` list replaces the whole list, so a panel
  writing `box-shadow: var(--ring)` on focus takes off its own edge and its own drop for as long
  as it holds focus. Every floating panel writes the ring in front of the treatment rather than
  over it.
- **A tinted surface re-points the inner line.** `--elev-edge` is the hook, and because the layer
  reading it is written on the surface's own rule, the surface can set it: unset it is `--border`,
  which is what a neutral panel wants, and a status toast sets it to its own accent so the inner
  line does not come out violet-grey over a coloured surface. A solid toast sets it to
  `transparent` — the status at full fill strength is its own edge, and it keeps only the drop.
- **A flush panel draws the line in one direction.** The drawer sits against a screen edge, so it
  has one edge rather than four; a full inset ring would draw lines across the top and bottom of a
  full-height panel, where there is no edge. It is the one floating surface that writes no ring at
  all: it composes `var(--drawer-line), var(--elev-drop)`, and each `--drawer--<edge>` rule sets
  `--drawer-line` in the direction its border runs.

Held by `stories/elevation.test.js` and `react/src/elevation.test.ts`, over one reader and one
cascade resolver in `scripts/lib/box-shadow.js`, with their own tests in
`scripts/lib/box-shadow.test.js`. Both discover every `box-shadow` the kit declares rather than
naming a component, read each layer's geometry per theme, and refuse a cast layer that is not
`--elev-drop`. A layer is judged against every value the kit gives the properties it reads —
each gate resolving against its own workspace's declarations as well as the token files — not
against one guess at the cascade, because a reader that keeps one declaration per name can be
walked past by writing a second one. The drops are read there too, at the shape above rather than
at the cast rule — they are the one cast this rule sanctions, so the cast rule would refuse them —
and until #314's third review the gates counted that layer by its spelling and never resolved it,
which let a component sheet re-point `--elev-drop` at a tight dark cast and stay green. Three rules
hold the shape above as well: a `:root` token may not read a hook a component re-points, a
component may not re-point `--elev-edge` on an element that writes no inner line, and `--elev-drop`
is declared at `:root` in the palette and nowhere else, because a sheet re-pointing it there
changes what every floating surface casts. The numbers
above are floored there, so a treatment can get better and cannot quietly get worse.

**Inside a raised surface, a row or a chip that lifts takes the step above the panel.** A hovered
row, an active row, a chip and a key cap inside a floating panel paint `--surface-3`, never
`--surface`: `--surface` is the card step and sits *below* `--bg-elevated` in dark, so a hover
drawn with it sank while the panel it was in floated. In light that step is drawn downwards —
`--surface-3` is darker than the white panel — which is how a light theme has always shown a
hover. A field inside a panel goes the other way: it is the sunken step, `--surface-2`, the same
one `.ui-input` takes. The one field that takes neither is the topbar band's search field, which is
on `--surface` because its own ground is the bottom of the ladder — the exception stated under the
ladder above, and settled on #318.

**The accent wash is painted on a base surface, never a raised one.** A translucent wash over a
raised surface sits closer to the ink read on it than the same wash over the page, which is what
takes an accent counter under the floor inside a panel. Two rules state it:
`src/styles/nav.css:163` `.ui-nav__item.is-active .ui-nav__badge.is-accent`, and
`src/styles/dropdown.css:190` `.ui-dropdown__badge.is-accent`.

**The ladder is capped by ink, not by taste.** `--muted` still carries state and placeholder
information, so it has to clear AA on every step the ladder raises — and it is re-picked
against the TOP of the ladder rather than against the page. That is the standing cost of the rule:
a raised surface that gets lighter asks the ink to get lighter with it, and the next surface that
wants to float spends what is left.

Held by `stories/contrast.test.js` and `stories/accent-contrast.test.js`, which measure every
ground the two token files declare rather than a list typed into a gate.

Decided in [#295](https://github.com/apliteni/apliteni-ui/issues/295), after
[#284](https://github.com/apliteni/apliteni-ui/issues/284) made the card flat.

## The focus ring

The shared indicator is G2: a 1px surface-coloured gap, a 2px solid accent band,
and a soft outer halo. The band carries contrast; the halo is decorative.
Artur chose it on [#343](https://github.com/apliteni/apliteni-ui/issues/343), after
comparing the three glow treatments. Glow alone did not reach 3:1 in that evidence.

```css
--ring-width: 2px;
--ring-color: var(--accent);
--ring-gap-width: 1px;
--ring-gap: var(--bg);
--ring: 0 0 0 var(--ring-gap-width) var(--ring-gap),
        0 0 0 calc(var(--ring-gap-width) + var(--ring-width)) var(--ring-color),
        0 0 12px 2px color-mix(in srgb, var(--ring-color) 45%, transparent);
```

`--ring` remains a composed shadow for `box-shadow: var(--ring)` consumers.
Tune the width, colour and gap at `:root`, or at a surface that composes the ring.
A descendant-only change to one of those inputs cannot alter an already inherited
shadow: CSS resolves custom-property references where the composition is declared.

Every kit surface that paints `--bg-elevated`, including surfaces using a local
alias and the React modal, sets `--ring-gap` to its background and recomposes
`--ring`. Cards and the application rail do the same for their own surface colours.
Custom surfaces must do both too; changing only the gap leaves the inherited shadow
unchanged. One grouped rule composes the ring on painted containers. The app shell keeps
the root composition because it uses the page background. A discovery gate follows
background aliases, surface tokens and colour mixes through both workspaces; each
subject either sets its gap or states locally why it inherits one. Controls keep the
containing gap, not their own fill. Transparent washes keep the opaque containing
gap rather than layering a translucent gap over the halo. Focusable cards and
dialog/drawer panels inherit their outside gap while focused themselves; when focus
moves inside, their children use the inside gap.

**Compatibility boundary:** a direct `--ring` override still works. An ancestor's
legacy `--ring` override does not cross a surface that recomposes it; apply the override
on that surface as well, or tune the component tokens at the root. Focus rings compose
in front of an existing floating panel's edge and drop, rather than replacing them.

Controls use native `:focus-visible`, including inputs, textareas, selects and invalid
fields. Text-entry controls can match it on mouse focus because the browser expects
keyboard input there; this is not a promise of keyboard-only rings. Invalid borders
keep their error colour while focus uses the shared band. No JavaScript modality
tracker is required. Every shared-ring consumer retains a transparent 2px outline,
which becomes a visible system outline when forced colours remove box shadows.

The solid band's unchanged colour is still held at 4.22:1 against the story-derived
flat grounds. That arithmetic gate does not measure the gap or blur. Chromium pixel
measurements must additionally check both actual band neighbours across every shipped
accent, both themes, and the page and elevated grounds. Where the surface is itself near the accent, the band takes that surface's contrast ink:
solid toasts use `--toast-ink` for `--ring-color`, retaining the same gap and glow geometry.
The glow brightens or darkens the outer neighbour and therefore reduces that edge's contrast relative to bare ground.
The ring reserves no layout space; its 3px solid footprint and approximately 15px faint
halo can be clipped by an ancestor's overflow boundary.

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

### Busy button labels

Busy buttons replace the visible action label with three centered pulsing dots in the
variant's full label ink (#327). Dot size scales with xs, sm, md and lg buttons; the
brightest dot clears 3:1 against every variant fill in both themes.
The label slides down out of its clipped line; the dots enter after it clears, using
`--dur-med` (250ms). Completion removes the dots and returns the original or next
React label from below. Text does not fade or blink. The retained label and icons keep
the button's dimensions stable while busy; icons are hidden until completion.
Vanilla callers use `setButtonBusy(element, { busy })` without a busy label.
React callers use `<Button busy={saving}>Save changes</Button>`; children from the last
ready render remain in the hidden slot until completion. A different completion label
can change the width once it becomes the new action. No motion helper is public.

Dots pulse on a 1.4-second cycle, staggered by 0.2 seconds, matching Discord's web
client loading indicator. The downward label exit follows Artur's requested direction.
All variants and sizes share the treatment. Reduced motion switches immediately
between label and static dots; no translation, padding change or pulse runs.

Wired vanilla and React busy buttons keep focus: `aria-disabled` communicates the
state, while click, Enter and Space activation are blocked, and hover/press styling
stays inert. Ordinary factory buttons have no status region; static busy markup has
an empty sibling region, and `setButtonBusy` creates it lazily when entering busy.
React returns one button element and lazily shares one page-level announcer across
busy buttons, removing it when its users unmount. Both use
`role="status" aria-live="polite"` outside `aria-busy`, which would defer updates.
Regions persist through completion so progress and completion can be announced. Explicitly disabled buttons remain natively
disabled. Unwired static `button({ busy: true })` markup retains native disabled as
a safe fallback; `setButtonBusy` replaces it with guards when wiring the control.

### Extra-small buttons

`button({ size: 'xs' })` and React `<Button size="xs">` draw a 13px glyph at
stroke-width 2.8, with a minimum 24×24px target. An icon-only xs button is 24×24px;
a labelled button grows to fit its label and uses `--text-xs`. Other sizes retain
their 16px glyph at stroke-width 2.4. Busy bars fit inside the smaller target.

The xs effective stroke is 13 × 2.8 ÷ 24 = 1.517 CSS px, above the 1.5px graphic
floor, matching the toast's size/stroke pairing. The enabled ghost glyph inherits
`--text` from its button; on `--bg` this measures 14.63:1 in light and 15.79:1
in dark, above the 3:1 graphic bar.
The size changes neither the variant's colour nor its interaction states.

Chosen by Artur on [#339](https://github.com/apliteni/apliteni-ui/issues/339).
The Button Sizes story compares xs, sm, md and lg, including inline copy controls
beside `--text-sm` body text. The glyph-stroke and contrast walks cover that story.

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
  `.ui-btn__dots` inside a busy button, `.ui-fbspin` inside the feedback composer — and a third
  would be a third thing to keep in sync. At screen scale a skeleton says more anyway: it says
  what shape is coming.

```js
const el = document.querySelector('#report');
el.innerHTML = busyRegion({ label: 'Loading your report…', lines: 4 });
const rows = await fetch(…);
setBusy(el, { busy: false, message: `${rows.length} rows`, body: table(rows) });
```

## The page

`appShell()` draws a page's chrome and what goes inside it is the caller's. Guidelines / The page
shows the ten choices a designer makes for each screen, with five Do and Don't pairs.
The shared page layout and navigation names are already decided and are described here.
The guideline page contains no code references; the table below is the only rule-to-code mapping.

- **`layout` — a product takes one shell layout and every screen keeps it.** The shared layout
  comes in two: the rail on its own, and the rail with a bar over the page carrying search and the
  reader's menu. Which one a product takes is a decision for the product, not for a screen. On a
  page, what this means is that the parts a layout moves are drawn once: one block naming the
  signed-in reader, one way into the command palette, one bar.
- **`width` — the content column comes in two widths, and the page picks one.** Wide fills the
  space beside the rail; centred is capped and sits in the middle of it. Tables and boards take
  the wide one, reading and forms the centred one. A page does not write a width of its own inside
  the column.
- **`shell` — use the shared layout for application pages.** Sign-in and other authentication
  cards do not need a sidebar, and marketing pages are not application screens. The header order,
  introduction and card limit apply to application pages. The title, heading order, navigation
  names, closed overlays and table spacing rules apply to all three kinds of page. The primary
  action limit applies to all except marketing pages.
- **`head` — put the way back first, then the title, introduction and page content.** Only the
  way back goes above the title. Put filters, date controls, search and key figures at the start
  of the content below the introduction.
- **`one-h1` — give each page exactly one page title, at heading level one.** All other headings
  belong beneath it.
- **`outline` — the heading order moves down one level at a time and stops at `h3`.** Use the
  levels for the page, a card or section, and a group within one. Drawers and other overlays have
  their own heading order. On the page itself the kit draws no `h4`. A fourth-level heading
  inside a feedback dialog does not belong to the page's outline. Footer column titles use level two so they cannot skip a level.
- **`one-primary` — one primary action at most.** Give the main action a filled button and
  give other actions less emphasis. An overlay can have its own main action, separate from the
  page's. This limit does not apply to marketing pages.
- **`stacking` — six stacked cards at most, with no card inside another.** Beyond six, use
  sections, tabs or another page. Grouping cards together does not reduce their count. A band
  of key figures counts as one item, even when each figure has its own card. An empty state or
  an access-denied message also sits in its own card.
- **`navs` — name each navigation area and use each name only once per page.** The shared
  layout provides the sidebar and breadcrumb trail, with a name for each. Do not add another
  copy of either.
- **`at-rest` — show the page with nothing covering it until the reader asks.** Keep drawers,
  confirmation dialogs, notifications, hover details and the command palette closed on arrival.
  They can be ready to open without being visible. When the page itself asks for consent or
  confirmation, show that request in the page content.
- **`density` — use compact rows in every table on the page, or in none of them.**
  `.ui-table--dense` is all of a page's tables or none of them, and no screen writes cell padding
  of its own — in a style attribute, or in a rule of its own naming `.ui-table`'s cells.
  A table inside a drawer follows the drawer's spacing rather than the page's.
- **`lede` — include a short introduction; it is two sentences at most.** Add information
  the title does not give, without repeating it in the opening sentence.

### Which line of the kit holds each of them

The table is the only place that maps these rules to code. It names files and symbols instead
of line numbers, so moving a line does not break a reference.

`stories/guidelines/the-page.test.js` checks that every rule has exactly one row, every named
file exists, and every listed symbol or selector appears in one of that row's files. This
checks that the references exist; it does not prove that the referenced code enforces the rule.
`stories/guidelines/refs.test.js` checks the page's explicit declaration that its references
belong only here, and rejects citations, file paths and selectors in the rendered page.

| Rule | Where the kit holds it |
|---|---|
| `layout` | the `layout` option on `appShell()` in `src/components/shell.js`, which draws `.ui-app__bar` in `src/styles/layout.css` |
| `width` | the `width` option on `appShell()` in `src/components/shell.js`, and `.ui-app__main--wide` in `src/styles/layout.css` |
| `shell` | `appShell()` in `src/components/shell.js`, and `financeShell()` in `stories/apps/_finance-nav.js` as the caller's side of it |
| `head` | the slot order `appShell()` writes in `src/components/shell.js` — the way back, `<h1>`, `.ui-app__sub`, `.ui-app__body` |
| `one-h1` | `card()` and its kin refuse an `h1` (`src/components/index.js`); `success()` takes its rank from its layout (`src/components/success.js`) |
| `outline` | the two title sizes the scale has: `rank: page-title` in `src/styles/layout.css` and `rank: card-title` in `src/styles/card.css` |
| `one-primary` | `.ui-btn--primary` in `src/styles/button.css` |
| `stacking` | `.ui-card` in `src/styles/card.css` |
| `navs` | `sidebarNav()` and `breadcrumbs()` in `src/components/nav.js`, both named by `appShell()` in `src/components/shell.js` |
| `at-rest` | `drawer()`, `confirm()`, `commandPalette()` and `tooltip()` each render closed unless asked — `src/components/drawer.js`, `confirm.js`, `command-palette.js`, `tooltip.js` |
| `density` | `.ui-table--dense` and the cell padding it overrides, in `src/styles/table.css` |
| `lede` | `.ui-app__sub`, written by `appShell()` in `src/components/shell.js` |

`stories/guidelines/the-page.test.js` renders every example screen under `stories/apps/` and
checks all twelve rules. It matches checks to rule ids: ten from the guideline page and two
from `GATED_ELSEWHERE`. A missing rule or check fails the build. The success screen component
has no example in that collection, so `src/components/success.test.js` checks its title level
separately.

The card limit, primary action limit, heading depth and choice of compact rows are design
decisions. [The comparison page](reviews/275-page-limits.html) shows the alternatives as
complete screens, and [#275](https://github.com/apliteni/apliteni-ui/issues/275) records the
decisions and their reasons.

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
- **The reader can fold the rail, and the control is drawn by default.** `appShell()` draws a
  toggle in the rail's head band — at the far end of the brand row, on the wordmark's own line and
  above the rule that closes the band — that folds the rail to the same icon strip and opens it
  again. The head is where a reader looks for the control that changes the panel they are looking
  at, and the end of that line is where a reader looks for it in the head: both are Artur's calls
  on 2026-09-13. Before them it stood at the rail's foot, as the reference's does, and then for one
  round under the wordmark. `collapsible: false` is the way out, for a page that will never call
  `wireShell()` and would otherwise ship a control that does nothing. It is a native `<button>`
  outside the navigation landmark, named for what the press will do — "Collapse sidebar", "Expand
  sidebar" — with `aria-expanded` saying what the rail is now. Below 720px the toggle is not drawn,
  because the strip is the only layout there, and the band goes with it when the wordmark has
  already gone to a topbar.
- **The toggle stands at the end of the brand row, and the fold rides it back onto the glyph
  column.** The band is one line: the product's mark at its start, the rail's own control at its
  end. That is the one place on the rail where a mark does not stand on the glyph column, and the
  toggle is the only mark that gives the column up — so the fold cannot simply clip the band, or it
  would clip away the one control that opens a folded rail. The control rides the closing edge
  instead. The band keeps the open column and the control sits at its end, so an offset of exactly
  `--ui-nav-strip - --ui-nav-col` lands it on the strip, and the strip *is* the glyph column: when
  the travel stops, the toggle's mark stands on the line every glyph above it stands on. The offset
  is on the width's own clock, so the control and the edge arrive together — measured frame by
  frame, the mark is 37.5px from the rail's closing edge on every frame, which is the rail's
  hairline plus its inset plus a glyph's own centre in its row. What the toggle keeps is the closing
  edge rather than a column; what the edge lands it on is the column. Nothing else on the rail
  moves: a nav glyph and the reader's avatar each hold one centre from the first frame to the last.
  The lockup goes whole on that fold rather than only its words, because the column the control
  lands on is the column the mark stands on and a folded rail is one column wide — `visibility` as
  well as `opacity`, so the link leaves the tab order instead of standing invisible under the
  control that replaced it, and the box keeps its space so the band keeps its height. Below 720px
  the toggle is not drawn, nothing arrives on the mark's column, and the band is the lockup alone
  with its words folded away.
- **The toggle is one mark, and the mark is the state.** The control is a frame that holds still
  and a seam that crosses it — `lessly-ui`'s `RailToggle`, which this rail is reworked on — so what
  a reader takes from it is which arrangement the panel is in rather than a direction to press. No
  words beside it and no tooltip of its own: it takes the same name chip every other row takes on a
  folded rail, and it takes that chip on an open rail too. Every other row reads its own name on an
  open rail; the toggle is the one row that is its mark at both widths, so it is the one row whose
  chip is not scoped to the fold — on hover and on keyboard focus, at both widths, the label leaves
  the flow and lands beside the rail. The glyph box carries the line the name vacates, so the button
  keeps its height in both states: a hover readout overlays the page and never reflows it, and
  without that the toggle fell 35.39px to 35px under the pointer and took every row of the nav up
  the rail with it. The name is squeezed to nothing by its own `overflow: hidden` until a pointer or
  the keyboard lifts it out, which is what makes the name the chip rather than a second copy of it
  in a tooltip. Only the frame and the seam are drawn by hand in `src/components/shell.js`, because
  a seam that travels has to be a child a stylesheet can reach and `icon()` emits one opaque string
  with no hook on an inner node; the `<svg>` around them is taken from `icon()` itself, so a rail
  glyph's box, stroke and `aria-hidden`/`focusable` pair are the factory's by construction, and
  `stories/apps/shell.test.js` compares the two attribute for attribute — which is what makes "by
  construction" a thing a reader can check. The box it is drawn in is the glyph column —
  `--ui-nav-strip`, a row's padding either side of a glyph, which is the width the closed rail is
  derived from — one box, written once, at both widths; where that box stands is the bullet above. The seam moves on `--dur-med`, the rail's own
  clock and not the words' `--dur-fast`, so the mark and the closing edge arrive together, and its
  distance is the frame's own mirror rather than a number: the seam is drawn at 9 in an 18-unit
  frame and lands at 15, so the narrow compartment changes sides.
  `stories/apps/shell-states.test.js` reads the frame and the seam out of the factory and refuses a
  travel the mark does not explain, a control wider or narrower than the column, a seam that holds
  still between the two states, an offset written as a number rather than as the two widths' own
  difference, and a band that stacks its marks again. The same file resolves the toggle's chip at both widths, under
  the pointer and under the keyboard, so the rule cannot be scoped back to the fold.
- **The fold travels, and no glyph moves while it does — except the one that rides the edge.** The
  rail's column keeps its open width and the box closes over it, so nothing inside is laid out a
  second way: the width goes from
  249px to 74px on `--dur-med` and `--ease`, and the words fade on `--dur-fast` so the closing edge
  slides over an empty row rather than cutting through a label. The strip is not a number somebody
  liked — it is twice a row's own glyph centre, its padding plus half a glyph, which is the one
  width that leaves the glyph standing in the middle of the closed rail. `--ui-nav-col` and
  `--ui-nav-strip` in `nav.css` are the only two places either is written, and
  `stories/apps/shell-states.test.js` derives the strip from the rules it is read off, holds the
  width's own travel to `--dur-med` and `--ease` in both sheets that write it, and resolves the open
  column on every block of the rail at both widths — the nav declares it for its own rows, and a
  block beside the nav that has not been given it wraps its contents on the press and steps every
  row under it down the rail. Under
  `prefers-reduced-motion` the kit's net takes both to 0.01ms, so the fold arrives in one frame —
  the same file refuses a travel written `!important`, which is the only way the net loses.
- **The two folds are one fold, with two named differences.** A media query cannot share a block
  with a class, so the reader's fold and the 720px fold are written twice in `layout.css` and each
  rule has its twin. The reader's copy sits behind `:where()`, which weighs nothing, so the pair
  rank alike and the media query's own precedence is what separates them. One declaration is
  deliberately not shared: below 720px the strip is the whole of the rail and a finger is the only
  pointer it has, so a row is held to 44px — WCAG 2.5.5 (AAA). The reader's fold cannot take that
  floor, because a row is 35.4px open and growing it on the press would step every glyph below it
  down the rail, which is the one thing the travel promises not to do; a pointer on a desktop is
  held to the kit's 24px floor there and clears it. The second runs the other way: the reader's fold
  hides the product's lockup and the 720px fold does not, because below 720px the toggle is not
  drawn and nothing lands on the mark's column. The two widths are not two shells, so the press's
  own class reaches a phone: a rail is `data-rail="auto"` by default and takes the choice the cookie
  holds, and `collapsed: true` is a documented argument. The 720px block therefore writes the lockup
  back rather than the press's rule being left unqualified — a folded rail on a phone that took the
  fade would be a 41px band with nothing in it, its hairline still under it, and no control anywhere
  on the rail to open it again. `stories/apps/shell-states.test.js` compares the two
  blocks rule for rule and element for element, and holds both halves of each — the touch floor is
  really in the 720px block and really not in the other, and the lockup really goes on the press and
  really stays on a phone, folded or open.
- **The rail's own skin is not a place to go.** The toggle is a `<button>` in a row of the rail
  outside the `<nav>`: folding a panel is not a place to go, and a row of the navigation list is
  what it would be read as inside one. The head band it stands in draws one rule under the line, not
  one above it — the product's mark and the rail's own control are one head, and a second hairline
  would box the toggle into a compartment of its own. The control is the band's last child as well
  as its last box, so the reading order, the tab order and what is on screen agree.
- **The reader's choice outlives the page.** A press is written to the `apliteni-ui-rail` cookie
  (a year, `path=/`, `SameSite=Lax`). `appShell()` itself reads nothing. A boolean `collapsed`
  is the caller's and is left alone, and it does nothing under `collapsible: false`, since a fold
  needs the control that undoes it. A collapsible shell drawn without one takes the stored choice
  when `wireShell()` runs, which a client-rendered route change does after mounting, as every
  `wire*` function asks. A cookie and not `localStorage`, because a server can read it:
  `appShell({ collapsed: railCollapsed(request.headers.cookie) })` paints the
  right width on a full page load, where waiting for `wireShell()` paints it open for a frame.
  `wireShell(root, { persist: false })` keeps every shell under that root out of the cookie, shells
  drawn there later included, and applies no stored choice to them; a later call without the
  option does not undo it. Each press sends a bubbling `ui-rail` event whose `detail.collapsed`
  says what the rail is now. Held by `stories/apps/shell-rail.test.js`.
- **A folded row gives its name back, to the keyboard as well as the pointer.** Fading a label
  costs a screen reader nothing, because the name is the row's `aria-label`, and the counter is
  spelled into it, so a badge that fades out is not a count that is lost. On hover or keyboard
  focus the label itself leaves the flow and lands beside the rail as a chip — one string on
  screen and in the accessibility tree, where a `title` was a second copy and showed to a pointer
  only. The rail is a scroll box and clips across as well as down, so the chip is `position:
  fixed` — and `fixed` rather than `absolute` because the rail is `position: sticky`, which makes
  it the containing block for every absolutely positioned descendant, so an `absolute` chip is
  clipped by it wherever the rest of the tree is positioned. Where the browser has CSS anchor
  positioning the chip is pinned to the rail's edge and to the row, which is what keeps it in place
  through a scroll of the rail, a scroll of the page and a resize — measured at the row's own
  centre, within a hundredth of a pixel, in all four.
  Without anchor positioning the chip keeps the place its row gave it when the rail was last laid
  out, so it is exact until the rail scrolls and then stands as far above its row as the rail has
  scrolled. That is the one thing anchor positioning buys and nothing else in CSS does: a box that
  escapes the rail's clip has left the rail's scroll, and a box that has not escaped it is not
  drawn. Every control in a folded rail clears the 24px target floor, wears the focus ring
  every row wears, and stays drawn, so Tab reaches it. Held by `stories/apps/shell-rail.test.js`,
  `stories/apps/shell-states.test.js` and `stories/guidelines/accessibility-floor.test.js`.
- **The signed-in reader is the trigger of a menu, and signing out is a row of it.** The account
  block at the rail's foot — the avatar, the name and the address — is a `dropdown()` trigger when
  the caller passes `signOutHref`, and the menu holds a head naming the reader and the rows that act
  on the session, Sign out among them. This is `lessly-ui`'s `UserMenu` and Artur's call on
  2026-09-13; before it, Sign out was the last row of the navigation list. It left because it does
  not go anywhere: it ends a session, and it was the one destructive thing standing among places to
  go. The menu is the kit's own `dropdown()` and not a second one written for the rail, so Enter,
  the arrows, Escape-closes-and-returns-focus and the click-outside are the wiring every panel in
  the kit shares; `wireShell()` wires it along with the fold and the nav's groups. It is
  `portal: true`, because the rail is `position: sticky` with `overflow-y: auto` and each of those
  traps a panel on its own, and it opens upward, because the block is the last thing in a
  full-height rail. On a folded rail the trigger is the avatar alone and takes the same name chip a
  folded row takes, with the reader's two lines in it. The trigger is named by the words inside it
  rather than by an `aria-label`, so there is no second copy of them to go stale; the initials are
  `aria-hidden`, since they are made of the name beside them. With no `signOutHref` there is no
  menu: a trigger that opens an empty panel is a control that does nothing, and the block is the
  plain reader block it has always been. With no `account` there is no block, so a `signOutHref`
  passed without one draws nothing at all — the menu hangs off the reader, and there is no session
  to end without one. Signing out needs `wireShell()`: it was a plain link in the nav list and it is
  a menu row now, so a page that will never wire the shell should not pass `signOutHref` — the same
  call `collapsible: false` is the way out of for the toggle. Held by `stories/apps/shell-rail.test.js`,
  and the upward direction by `stories/apps/shell.test.js`, which reads the marker off `dropdown()`
  rather than writing it out a second time.
- **One rule closes the rail, and one closes its head.** The nav's footer slot is empty now that
  Sign out is in the menu, so the hairline that fenced Sign out off is on the block that opens it.
  Two of them twenty pixels apart read as a third region of the rail rather than as its foot.
- **The account block stands on the rail's own column.** The avatar is inset by half the difference
  between the glyph column and itself, so its centre is on the line every glyph above it stands on
  and the fold moves it nowhere. Its box declares the height the mark inside it gives it — the
  avatar plus the trigger's own padding — because a floor written as a `calc()` over custom
  properties is a floor the target-size gate cannot read. Below 720px the block takes the 44px touch
  floor the rows beside it take; it cannot take that floor on the reader's fold, where growing it
  would move a box the travel promises holds still. Both halves are held by
  `stories/apps/shell-states.test.js`, and the floor is measured by
  `stories/guidelines/accessibility-floor.test.js`.
- **The icon-only `sidebarNav({ collapsed })` keeps the current page reachable.** A group opens
  over the page the reader is on, as it does at any width, and a row with no glyph is given a dot
  rather than left blank. Held by `stories/apps/shell.test.js`.
- **A nav entry carries the same icon and label everywhere it appears.**
- **The rail holds nothing that has to escape it.** `.ui-app__rail` is `position: sticky` with
  `overflow-y: auto`, and each of those traps a popover on its own — see
  [The dropdown panel](#the-dropdown-panel). A dropdown mounted in the rail passes `portal: true`.

### The second layout

`appShell({ layout: 'topbar' })` is the same shell with three parts in different places, and
`layout: 'rail'` — the default, and what every page already on the shell gets — is the
arrangement above. `accountShell()` passes the option through and settles nothing of its own.
Every guarantee in this section holds in both: the fold, the cookie, `wireShell()`, the name
chips, the 720px strip and the reader's menu keep the same behaviour and wiring; both layouts meet
the same accessibility minimums, and their existing gates were extended rather than duplicated.

What moves, and what each move buys:

- **The reader's block leaves the rail's foot for a band over the page, and the fold's control
  takes its place.** The toggle stands at the rail's foot, which is where the reference draws it
  and where it stood before Artur moved it to the head band on 2026-09-13 for the other layout.
  At the foot it needs no travel: it is on the glyph column from the first frame, so the fold
  moves it nowhere, and the ride along the closing edge belongs to the head band alone — the one
  place on the rail where a mark does not start on that column.
- **The band stands beside the rail, not across the top of both.** The rail keeps the viewport's
  own top edge and its whole height; the band is the first row of the column next to it. This is
  the reference's shape, and it is the arrangement in which the rail's head band and the band
  **close at the same height**: the product's mark at the left of that line, the search field and
  the reader at the right, and nothing stepping at the corner where the two meet. Stacked above
  the rail instead, the mark would sit in a second band under the first. The three boxes — the
  band, the rail's head, the rail's foot — are one height, `--ui-app-band`, and
  `stories/apps/shell-states.test.js` holds that height to the one `.topbar` is.

  **What that is not, measured at 1280 in Chrome:** the two rules land level — both boxes end at
  `52` — but they are **not one continuous stroke**. The rail insets its rule by the rail's own
  `--space-4`, so the rail's half runs `x 16→232` and the band's starts at `249`, a 17px break.
  And in the light theme the rail's half is effectively invisible: `--border` `#e4e7ee` on the
  rail's `--surface-2` `#e3e6ee` is 1.009:1, against 1.086:1 for the same rule on the band's
  `--bg`. Both are inherited — the ladder is [#295](https://github.com/apliteni/apliteni-ui/issues/295)
  and the inset is the rail's — and neither is repainted here: the rail's head, its foot and the
  reader block all take one hairline, so repainting the head alone would leave the rail's own two
  rules disagreeing, and bleeding the head's rule to the rail's edges would cost it the open
  column every block of the rail keeps. What the gate holds, and what this bullet claims, is the
  height.

  The band is not wrapped in `.ui-app-page`: that wrapper offsets the rail below the compatibility
  topbar, which does stand over it.
- **The band carries a search field and the reader, and nothing else.** A `<header>`, outside the
  navigation landmark, because neither of the two is a place to go.
- **The search field is a palette trigger drawn as a field.** It is `lessly-ui`'s
  `QuickSearchRow` and Artur's call on 2026-09-13: it looks like a search box, states the key that
  opens the same palette, and carries `[data-cmdk-open]` — the palette's own delegated trigger —
  so the kit has one search surface and not two. The caller names the palette they rendered, and
  with no palette named there is no field, the argument `signOutHref` takes. The key cap is the
  palette's own `.ui-cmdk__key`, and it is **inside** the button's accessible name rather than
  `aria-hidden` — Artur's call on 2026-09-14, recorded on
  [#308](https://github.com/apliteni/apliteni-ui/issues/308). A palette row hides its shortcut,
  because forty of them read after forty labels is noise, but there is one of these and the key is
  the fact it exists to teach. `paletteHotkey()`
  reads the platform, a server has none, so the markup ships `Ctrl K` and `wireShell()` writes the
  reader's own key into the cap — and therefore into the name — off the root's own window.
- **On the band the mark is the whole trigger, and it carries the name.** There is no room for the
  reader's two lines on a 52px row, so the block is the avatar, and the sentence the rail's two
  lines said is written on the control instead — the same sentence `readerFace()` writes when there
  is no menu and the avatar is the block. The address is in the panel's head, where a folded rail
  already put it. This is the reference's reading of a user menu in a top bar.
- **One band over a page, never two.** `layout: 'topbar'` and the compatibility `topbar` bag are
  not composed: the layout draws its own band and the bag is not drawn. A caller who passes both
  gets the layout they named rather than two headers stacked on one page — which costs that caller
  the version switcher and the theme toggle, and is the one thing the preset gives up for this
  layout.
- **A name the kit does not know is the layout it has always drawn.** `layout` and `width` are
  read strictly, against the one name each that is not the default. A typo must not draw half a
  second layout — a page with no reader on it — and neither option is read through `String()`,
  which turned `['topbar']` into a layout.

Held by `stories/apps/shell.test.js` (the markup and the parts that move),
`stories/apps/shell-states.test.js` (the three heights, the band's stick, and the two caps through
the resolved cascade) and `stories/apps/shell-rail.test.js` (the fold from the rail's foot, the
menu from the band, the field opening the palette, and the key `wireShell()` writes). The React
package publishes components and no shell, so there is no `<AppShell>` for the options to reach.
Decided in [#308](https://github.com/apliteni/apliteni-ui/issues/308), reworked on
`lessly-hub/lessly-ui` at `d1a25eda` — `app-shell.tsx`'s band and well, `app-sidebar.tsx`'s foot
band, `quick-search-row.tsx` and `user-menu.tsx`'s top-bar reading.

The nav's own rules beat a host stylesheet: `.ui-nav .ui-nav__item` is (0,2,0) and a host sheet's
`a:link` is (0,1,1), so dropping the kit into a page that styles its links does not restyle the
navigation.

Decided in [#127](https://github.com/apliteni/apliteni-ui/issues/127). `appShell()` was the
owner's choice between three shells built and rendered side by side, not a derivation. The fold is
[#277](https://github.com/apliteni/apliteni-ui/issues/277), reworked on `lessly-hub/lessly-ui`; the
toggle's move to the head, its place at the end of the brand row, and the reader's menu are
[#286](https://github.com/apliteni/apliteni-ui/issues/286), and both are ported from the same
reference — `app-sidebar.tsx`'s head band and `user-menu.tsx`.

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
- **A long name clips rather than wrapping.** The destination is whatever the sidebar calls
  the parent page, and the kit does not control its length. `.ui-back__label` takes the one
  line and ends in an ellipsis when the column is narrower than the words, as `.ui-nav__label`
  does in the rail: the link stands above the page title, and a second line would push the
  page down.
- **It takes the trail's place, above the title.** `appShell({ back })` draws the link where the
  breadcrumb trail would go and draws no trail: a page has one or the other. A `back` that
  `backLink()` refuses leaves the trail standing.
- **The section stays lit.** With a back link on the page, the shell keeps the sidebar row the
  caller marks `active` highlighted, and marks it `aria-current="true"` — the current section —
  rather than `"page"`, which would announce the list as the page on screen.
  `sidebarNav({ activeIs: 'section' })` does the same outside the shell.
- **It stays quiet whatever the host does to links.** The link rests in `--text` and takes no
  accent. Its colour rule is (0,2,0), so a host stylesheet's `a:link` at (0,1,1) does not repaint
  it.

When a page should take one, and what it says, are rules for the screen rather than guarantees of
the kit: they are on the Guidelines / Going back page in Storybook.

Decided in [#270][i270]. Four treatments were rendered side by side on the same page in
[docs/reviews/270-back-control.html](reviews/270-back-control.html), and the owner chose the quiet
link: a chevron and the destination's name in dim ink, in the slot the trail would take.
#340 subsequently moved its words to body ink while preserving that shape. The other three
stay on the review page as the historical comparison.

Held by `src/components/back.test.js` and `src/styles/back.test.js`. That every `__label`
the kit emits has a rule at all — the omission [#303][i303] reported — is held kit-wide by
`src/styles/label-coverage.test.js`.

[i270]: https://github.com/apliteni/apliteni-ui/issues/270
[i303]: https://github.com/apliteni/apliteni-ui/issues/303

## The dropdown panel

`dropdown()` places its panel; a consuming page never writes a rule to move it. Three things are
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

**One padding, and two blocks that bleed back through it.** `--ui-dropdown-pad` is declared on
`.ui-dropdown__panel` beside the offset, and the panel's own `padding` reads it —
src/styles/dropdown.css:79 `padding: var(--ui-dropdown-pad);`. A block pinned to an edge of the
panel has to come back out through that padding to reach the edge, and before
[#306](https://github.com/apliteni/apliteni-ui/issues/306) the only way to write that was to copy
the number: the head's bleed was `margin: -6px -6px 5px` and a page building its own footer wrote
the same `-6px` by hand, which its design-token guard refused as a magic number.

`.ui-dropdown__head` and `.ui-dropdown__foot` are that pair, and they are symmetrical by
construction. One rule gives both their inner padding, at
src/styles/dropdown.css:220-223 `padding: 11px 13px;`, so the two cannot drift; each then pulls
back to the edge it sits on with
`calc(var(--ui-dropdown-pad) * -1)`, draws its line on the edge it faces, and rounds the two corners
it stands in. `dropdown({ foot })` draws the foot; the head is the page's own markup through the
unwrapped `header` slot, which is the shape `railUser()` in `src/components/shell.js` has always
written one in. `footer` remains the unwrapped slot at the bottom and sits inside the drawn foot,
because the block that bleeds is the one that has to touch the edge it bleeds to.

**Only the foot is an option, and that is Artur's call rather than a symmetry argument.** #306 asks
for a foot; a `head` option was built beside it and rejected on review, on the ground that the kit
should not grow a second way to write a block it already draws correctly by hand. The class, the
bleed and the gate over the pair are what the issue is about, and they apply to a head written as
markup exactly as they apply to a drawn foot.

Held by `src/components/dropdown.test.js`, which sweeps every margin in the sheet: a negative length
written out rather than read from the property fails, whichever rule it is in, and the head and the
foot are compared term by term against each other.

**What goes in them is the page's, and the panel's role says what may.** The kit gives the pair the
bleed, the line and the corners, and no layout — a foot is a block, so a page laying out a
Save / Cancel pair lays it out. The one constraint is ARIA rather than taste: a `role="menu"` panel
takes menuitems and a `role="listbox"` panel takes options, so a control in either one's foot is
refused by axe's `aria-required-children`. `search: true` makes the panel a `role="dialog"`, which
is the same answer this component already gives for the field above the rows, and a control-bearing
foot goes there. Non-interactive content — a title, a count, a note — is at home in all three.

Measured by `stories/dropdown-foot-role.test.js`, which puts the same foot into each panel the
factory emits and records which axe refuses, so the sentence above cannot quietly stop being true.

**The trigger's caret is centred on its ink, not on its box.** The caret is two borders of a square
turned 45°, so the mark is an L and the corner opposite it carries nothing: centring the element
leaves the mark low when it points down and high when it points up. Measured in Chrome at a device
scale of 8, against the trigger's own middle, the ink sat **1.75px low closed and 3.88px high open**
— which is what [#306](https://github.com/apliteni/apliteni-ui/issues/306)'s round 10 reported as
the open arrow needing centring. `--caret-off` is that gap, `(--caret − --caret-ink) / 2√2`, derived
from the square and its stroke rather than typed, and it is applied **before** the rotation so it
lands in page space: written after it, `translateY` travels along the turned axis and moves the mark
sideways as well, which is what the two hand-tuned numbers it replaces were doing. Re-measured the
same way, both states land within **0.25px** of the middle — the antialiasing fringe, symmetric
about it.

Held by `src/components/dropdown.test.js`, which reads both transforms: each shifts by
`--caret-off`, each shifts before it turns, and the two shift opposite ways.

**A panel can leave its trigger's subtree.** `portal: true` has `wireDropdown()` move the panel to
the top of the tree its trigger is in, as `position: fixed`, with the trigger's viewport coordinates
written inline, repositioned on scroll and resize. Two ancestor properties make that the only
remedy, and `.ui-app__rail` has both:

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
is swept out of the tree it was put in rather than accumulating.

**The top of the trigger's tree, which is not always the page's `<body>`.** A document's top is its
`<body>`, a frame's is the frame's own `<body>`, and an open shadow root's is the root itself. The
panel never crosses one of those boundaries, because everything that keeps it working is scoped to
the realm it was drawn in:

- **Its stylesheet.** A sheet adopted by a shadow root, or loaded by a frame, does not reach the
  page's `<body>`. A panel lifted out there has none of its own rules — `position: fixed` and
  `--z-dropdown` among them, so it lands in the flow of whatever it was appended to, at no layer.
- **The viewport it is measured against.** A panel in a frame is laid out against the frame's
  viewport and not the page's, so the coordinates written inline, and the `scroll` and `resize` they
  are re-written on, come from the panel's own `defaultView`.
- **Its close handlers.** A listener on the page's document never fires for a click inside a frame,
  which is the same reason `wireShell()` listens once per document it is handed. Click-outside,
  Escape and the repositioning sweep are registered once per document that holds a dropdown.

Finding the dropdowns to close is the other half. The handlers walk a module-level `Set` of every
wired container rather than querying the page, because `document.querySelectorAll` enters no shadow root
and sees no other document: before it, opening a menu inside a shadow root left one open on the page
behind it, and a click on the page left the shadow root's open.

**Escape is scoped and click-outside is not**, which is a decision and not an oversight. Escape
dismisses what the reader is in, so it closes an open dropdown in the document the key landed in and
nothing in another — pressed in a frame it leaves the page's menu alone. A click closes every open
dropdown anywhere, because "I clicked elsewhere" is elsewhere wherever it happened. Either way
focus returns to the trigger, which a reader outside a shadow root meets retargeted to its host.

Held by `stories/apps/shell-rail.test.js`: *a shell in a frame is wired in its own document, and
reads its own cookie*, and *a shell inside an open shadow root folds, and keeps its menu inside the
root*. Moving the portal target back to the page's `body`, or the close handlers back onto the
module's own document, goes red there.

`portal: true` is opt-in and not the default because it has a cost: the panel leaves its trigger's
place in the reading order and lands at the end of the tree it was moved into. Opening it still moves focus onto a
row, and `aria-haspopup`, `aria-expanded` and the panel's own `role` and `aria-label` are unchanged,
so nothing is unreachable — but a reader moving linearly meets the two apart. Reach for it when an
ancestor traps the panel, which is what the rail does, and not otherwise.

The default renders byte-for-byte what it rendered before either variant existed. Both are opt-in,
so a page already working around this keeps working.

**A closing panel stops taking clicks before it stops being drawn.** `visibility` is held at
`visible` for the whole of the fade out, so the rows do not vanish mid-fade — and a box that is
drawn is a box that is hit. A menu row is an `<a>` or a `<button>`, so a click landing in that
window activates it invisibly — the topbar's account menu has had a Sign out row in it since long
before the rail did, and [#286](https://github.com/apliteni/apliteni-ui/issues/286) adds a second on
the rail. The closed panel is `pointer-events: none` and the open rules take it back, which is the
answer `.ui-drawer` and `.ui-cmdk` already give.

**A panel the keyboard opens is visible in the frame the key lands.** `visibility` is discrete, so
hidden → visible still resolves `hidden` in the frame the open class lands, and a browser will not
move focus into a box that is hidden. Every row carries `tabindex="-1"`, so the arrows opened the
panel, focus stayed on the trigger and the next Tab left the dropdown altogether. Measured in
Chrome: `getComputedStyle(panel).visibility` reads `hidden` in that frame and `visible` in the
next. An open panel therefore transitions `opacity` and `transform` only, leaving `visibility` off
the clock to apply at once; closing still fades on every property it always did. The rule was
written for the search variant, where opening puts focus in a field, and it belongs to every menu
the kit ships, because opening any of them with a key puts focus on a row. Held by
`stories/overlay-css.test.js`, which is the one gate that can see it — JSDOM focuses inside a hidden
box happily, so the gates that press the keys pass with the rule deleted.

**Every menu the kit ships owes both of those rules, in whichever sheet it is written in.** They are
written in two: `.ui-dropdown__panel` in `src/styles/dropdown.css`, and the topbar's `.vsw__menu` and
`.amenu` in `src/styles/topbar.css`, which are the same `wireDropdown()` in bespoke clothes — the
same hooks, the same keyboard, the same fade. A fix that keys on `.ui-dropdown__panel` reaches the
first and not the second, and a gate that reads one sheet cannot tell. So the gate reads a table of
`{ file, panel, open rules }`, asks every menu in it the same two questions, and asks each named open
rule on its own: the panel in place and the portalled panel carry one `pointer-events: auto` each,
and either alone used to satisfy one assertion standing for both.

Held by `src/components/dropdown.test.js`, which reads the offsets out of the stylesheet — any
panel rule that pins `bottom` has to release `top`, and every offset has to read the one custom
property — and feeds the wiring measured rects, JSDOM having no layout of its own.

## A dropdown row is a div, a link or a button

`.ui-dropdown__item` renders identically under all three tags, and which one a row is written as
is the page's decision rather than the kit's.

A destructive row rests quiet and turns `--pink` on the way to being pressed, in both states rather
than on hover alone: a pointer resting on the row is one way of being about to press it and the
keyboard landing on it is the other, and painting only the first made the destructive signal
pointer-only. The ring says where the reader is; it does not say that this row is the one that ends
something. It is the same two-step `.ui-nav__item` and `.ui-btn--danger` write.

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
field, with the selected row active or the first one. For that, the open panel is visible at
once rather than at the first step of its `visibility` transition — see
[The dropdown panel](#the-dropdown-panel), which is where that rule now lives for every panel.

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
- Under a coarse pointer the tap is the switch. A finger rests nowhere — it arrives already pressing
  and is gone when it lifts — so `pointerover` opens nothing there: a tap on a mark opens its
  readout, a tap on another mark moves it, and a tap on the same mark or anywhere else on the page
  closes it. The tap that opens the readout is captured and never reaches the mark's own `click`, so
  a chart that drills down on a bar does not drill down on the tap that asked what the bar says; the
  tap that closes the readout is let through, which puts the drill-down one tap further away. The
  document hears the opening tap all the same: it is handed on there, aimed at the root element, so
  an overlay that dismisses itself on a click outside — a dropdown panel standing open — closes
  under the tap that opens a readout as it would under any other tap, and a delegated trigger, which
  needs its own attribute on the target, is not fired by it. A tap that closes a readout dismisses
  that mark the way Escape does, whether it landed on the mark or on the host's ground beside it, so
  a chart sampling its own marks does not bring it straight back; another tap on the same mark does,
  because a tap is deliberate and a sample is not. A tap that lands outside the host is the pointer
  leaving instead, and dismisses nothing, the way `hideTooltip()` and a pointer crossing the host's
  edge do not. Which pointer is in play is read from the event rather than from the device —
  `pointerType`, falling back to `(pointer: coarse)` before any pointer event has arrived — so a
  laptop with a touch screen hovers under its mouse and taps under a finger, and a keystroke hands
  the readout back to focus. A pen taps with that finger: `pointerType` `pen` takes the tap path,
  because a stylus presses the screen rather than resting over it, and the mouse is the pointer that
  hovers. Focus opens the readout under a coarse pointer as well, unless it is the focus a tap lands
  on its way to the click that decides — the focus between a `pointerdown` and its `click`. A reader
  stepping onto a mark with a screen reader, which is focus no tap brought and no key either,
  therefore gets the readout and the `aria-describedby` that announces its value.
- A readout rendered with `open` is a picture of one, the way a documentation page shows it. Its
  host carries `.ui-tip-host` and no `[data-tip-host]`, so no wiring reaches it, and Escape leaves
  it alone because the kit never showed it.

**Not decided yet.** The wiring adds no tab stop to a mark, so whether a chart's marks should take
focus at all is open on [#282][i282] and waits on the owner. Until it is settled, the rule for
pages is that no value is reachable only by hovering.

The kit had no readout until [#282][i282]. The finance portal's overview drew two, on one screen:
its bar chart overlaid its readout and nothing moved, while each KPI sparkline inserted its
readout as a row, so the card grew by a line and everything under it moved whenever the pointer
landed on a point. The rules for pages are in Storybook, under Guidelines / Hover readouts. What
a tap does was settled on the same issue, after the readout had shipped.

Held by `src/components/tooltip.test.js`, which reads the stylesheet for the out-of-flow and
open-state rules, watches the page with a `MutationObserver` while marks are hovered, and feeds
the placement measured rects, jsdom having no layout of its own. The tap is driven against a
coarse pointer simulated from both sides the wiring reads — events carrying the `pointerType` a
browser puts on them, and a `(pointer: coarse)` answer for the gesture that arrives before any of
them — because jsdom dispatches no `PointerEvent` and answers no media query.

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
- **No density system.** `.ui-table--dense`, `.ui-table--compact` and `.ui-cmdk--roomy` are the only density
  modifiers and all are component-local, because a tighter rhythm in a ledger — or a looser one
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

## Dense financial tables

Tables paint `--table-bg`: white in light mode and the base canvas in dark mode. Zebra no
longer paints grey stripes; hover marks the row edge without tinting the data surface.
`dense` retains the existing spacing. `compact` uses a 33px minimum row and small text,
with extra-small unit suffixes in body ink. Larger text or wrapped content grows the row.

`numericValue` preserves the caller's formatted value and distinguishes missing from zero.
`deltaValue` prints the caller's sign, accepts an explicit success/danger/neutral judgement,
and leaves zero and missing comparisons neutral. Colour never supplies the sign. The caller
names the comparison through `basisId`. `rowIdentity` combines decorative logo, symbol and
name; missing or failed images retain a letter fallback after initialization.

A named scroll region holds the native table. Sticky headers and pinned identity cells have
opaque table backgrounds and the shared G2 focus composition. Narrow pinned identities show
the symbol, retain the full accessible name, and use a company link for disclosure. The
consumer supplies a real destination for that link. Columns scroll rather than disappear.

`FilterBar` is controlled by its consumer: selections, removal and clear-all request changes,
and never mutate the supplied filters. Updating the mounted host preserves the focused chip
control; after removal focus moves to the next chip, then the previous, then the bar when no
filter remains. Busy and disabled bars stop their native controls. Dropdown owns opening,
keyboard selection, Escape and focus return. Segmented controls support an underline appearance
for switching columns over one dataset; arrow keys, Home and End skip disabled choices.
