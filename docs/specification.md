# What the kit ships and guarantees

This is the consumer contract. Every guarantee below is checked by a gate in `npm test`;
a broken guarantee fails the build.

This document states outcomes, not arguments. Where a number came from, what else was
considered and who chose between them belongs in the issue that settled it, and each section
below names its issue. Read [README.md](README.md) for where to record decisions, and
[AGENTS.md](../AGENTS.md#verification) for agent verification rules.

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

### The React stylesheet does not re-emit a kit sheet

A React consumer imports `apliteni-ui/css` and then `apliteni-ui/react/css`. Both, and in that
order: the React stylesheet carries what React's own components add, not a second copy of the kit.

**The kit CSS is a peer, not a dependency of a React component.** A sheet a React module imports
out of `src/styles/` is re-emitted into `react/dist/index.css`, and in the consumer's document
that copy lands *after* the kit's own, where at equal specificity it wins. The kit then overrules
itself from a second position. That is what took `.ui-pager__size-select` back to a full-size form
field in a row of `sm` buttons: `pagination.css` had given it its compact width, padding, type
size, radius and chevron offset, and the re-emitted `input.css` took all five back. Nothing in
`react/dist` restored them, and no counter-rule is wanted — one would only move the contest.
Decided in [#551](https://github.com/apliteni/apliteni-ui/issues/551).

**A kit sheet travels with the React bundle only where its second copy can decide nothing.** That
is a measurement, not a list. Three nets qualify because order cannot change what they decide:
`src/index.css` reads `reduced-motion.css` and `field-zoom.css` before any component sheet and
`tap-zone.css` after every one of them, every declaration they make is behind a media query, and
the ones that have to win are written `!important` or inside `:where()` at no specificity at all.
`tooltip.css` qualifies because nothing the kit reads after it styles `.ui-tip`, so its copy
contests no kit rule — measured over the whole story catalogue in both themes, not asserted.
`input.css` does not qualify, and is imported nowhere under `react/src`.

**The React-only consumer is why those four are there.** A consumer who takes
`apliteni-ui/react/css` and not `apliteni-ui/css` is not the documented install — they get no
tokens, no reset and none of the kit's controls — but what the React stylesheet can carry for
them without cost, it carries. Without `tooltip.css` every `Tooltip`'s text renders inline and
permanently visible, which is the defect
[#408](https://github.com/apliteni/apliteni-ui/issues/408) fixed; without the nets they get
motion with no reduced-motion net and fields that zoom an iPhone. The same reasoning covers all
four, and it is the only reason any of them is there; see
[Reduced motion travels with the stylesheet](#reduced-motion-travels-with-the-stylesheet).

Held by `stories/react-bundle-cascade.test.js`, which walks the React entry's imports to
reconstruct the sheets `react/dist/index.css` concatenates, requires every re-emitted sheet whose
rules a cascade ranks to reach the story catalogue, and measures the document a consumer actually
gets — kit CSS, then that bundle — against the same document with the re-emitted copies removed.
`scripts/packaging.test.js` holds the tooltip panel in the packed React stylesheet.

`docs/library.md` is the catalogue: the `src/` layout, the theming model, and every component the
kit exports. This page states what those components guarantee; that one states what they are.

### Supported surface after vanilla removal

The following stay supported under [#429](https://github.com/apliteni/apliteni-ui/issues/429):

- React components and their shared logic.
- All CSS and tokens, inline strings (`/inline`), and motion helpers (`/motion`).
- `esc`, `icon` and its name tables, `sun`, `moon`, `prism`, `seedling`, `brand`, and `illo`.
- The Markdown guidelines.

**Removal-bound:** all vanilla HTML factories, initializers, and the vanilla overlay
stack described below will be removed. Their contracts still apply in this release;
React, CSS, token, and helper guarantees continue after removal.

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

A card header is two gaps: `var(--space-2)` under the title and `var(--space-5)` under the
description. The first was `5px` until [#499](https://github.com/apliteni/apliteni-ui/issues/499)
— off this scale, and tight enough that the description read as part of the heading rather than
as a line under it. `--space-2` is the step the page header already uses between its own title
and sub, and a gap whose job is to separate two text ranks rounds away from collision. Held by
`src/styles/card-header.test.js`, which checks those two declarations and not the sheet: the
icon gap and a setting row's hint offset are a component's interior, and the argument about
which of `src/styles` is rhythm is the one `stories/table-rhythm.test.js` declines to have.

**A padding modifier moves the vertical rhythm and keeps the horizontal inset**, so cards of
different padding stacked in one column line their text up. `.ui-card` pads `var(--space-6)` and
`.ui-card--pad-sm` pads `var(--space-5) var(--space-6)`. `.ui-card` used to pad
`var(--space-6) 26px`; 26 is off the scale this section is about, and against `--pad-sm`'s 20 it
put a stat tile's text 6px out from the card under it. `.ui-card--pad-lg` keeps its own roomier
inset — it is the centred landing card and is never stacked with plain ones.

**A `dense` or `zebra` table inside a card starts its first column on the card's own text edge.**
Both recipes inset their end cells by `--space-3` so a row's highlight has room at its ends (see
Dense financial tables), and that inset was being paid for by the grid: a ledger's first column
sat 12px inside the card's title. The table's own box hangs out by the same `--space-3`, into the
card's 20–24px padding and never past it, so the inset stays and the columns line up. The card's
scroll region is empty at rest at 1280; a ledger too wide for its column still scrolls.

For a dense table in a direct scroll wrapper, the wrapper offsets its 4px focus
clearance and the 12px cell inset; the nested table adds no further padding.
Segmented strips also keep their content width inside grid parents; block and
underline variants stretch. These extensions are covered by browser measurements on
[#435](https://github.com/apliteni/apliteni-ui/pull/435).

Both decided on [#451](https://github.com/apliteni/apliteni-ui/issues/451).

**A table footer is a row of totals, not a second head.** A `tfoot` label takes the body
cell's padding for its density, so it sits on the body rhythm; it is right-aligned against
the figure it names rather than against the first column it spans, because a label that
spans two columns and hugs the left edge leaves the reader crossing the row. The totals
open with the 2px `--border-strong` rule the zebra head already uses, in every density and
in zebra tables, which have no body rules of their own: five identical hairlines told a
reader nothing about where items end. Borders are collapsed, so that rule meets the last
body row's hairline and the wider of the two wins — no doubled line. A final body row keeps
its separator when a footer follows, and the last footer row ends without a partial rule.
`.ui-table__num--strong` carries ink and weight on either cell type, so a Total row reads as
one row instead of a bold figure beside a body-weight label. A caller who left-aligned
`tfoot th` to work around the old behaviour can drop that override.

**A numeric header holds one line.** Its column is sized to its content while
`.ui-table__title` claims the rest, so a two-word header such as `Amount (EUR)` was the only
cell in the column that could wrap.

Held by `src/styles/table.test.js` for the shipped rules and their cascade, across every
modifier in the sheet and with a failing mutation per claim; jsdom has no layout, so
rendered edges are checked in the browser captures. Decided in
[#385](https://github.com/apliteni/apliteni-ui/issues/385).

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
so a status passed as `paid` reads `paid`. Ten of those eleven are left: [#429][i429] removed the
confirmation's eyebrow outright, so the rank table below lists six labels rather than seven.

**Six ranks, each under the one above it.** A screen stacks a page title, card titles,
running text, labels, captions and chips, and each takes one rank:

| rank         | size          | weight              | line-height        | what takes it |
| ------------ | ------------- | ------------------- | ------------------ | ------------- |
| `page-title` | `--text-2xl`  | `--weight-bold`     | `1.1`              | the page's `h1` inside `appShell()` |
| `card-title` | `--text-lg`   | `--weight-semibold` | `--leading-snug`   | a card's title |
| `body`       | `--text-base` | `--weight-normal`   | `--leading-normal` | running text |
| `label`      | `--text-sm`   | `--weight-medium`   | inherited          | an eyebrow, a table head, a nav or menu caption, a footer column title, a code sample's label |
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
[i429]: https://github.com/apliteni/apliteni-ui/issues/429

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
would find that control still hidden. So an open drawer, an open confirm, an open palette and an
open dropdown panel carry no transition inside them at all — for as long as they are open, not only
in the frame they open — and focus lands where it does with motion on. Held by
`stories/overlay-css.test.js` for the first two, and for every curtain in the kit by
`stories/reveal-focus.test.js`, which discovers them rather than listing them. The dropdown panel
was the one nothing asked, and #519 is what that cost.

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
ink. Dropdown state and neutral chips share the standard badge's size, weight,
pill shape and padding, with no edge. Their neutral tint mixes muted ink at 15%
in light and 12% in dark over the panel, giving roughly the same fill separation
in both themes while keeping text at least 4.5:1. This soft badge fill is an
explicit exception to the text-surface rule, requested in the r18 review of
[#445](https://github.com/apliteni/apliteni-ui/issues/445).
Held by `stories/dropdown-state-contrast.test.js`.
Dropdown selection uses an accent checkmark and a body-ink title. Non-status badges,
including the legacy accent tone, use body ink; live badges retain status colour.
Explicit neutral tone, unselected options and missing-comparison sentences use body ink.
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
predictably, and every disabled label on a box of its own measures between 6.11:1 and 6.24:1.
A ghost button paints no box, on or off, so its label is read on whatever is behind it. It takes
`--disabled-ink-bare` instead, set for the dullest ground the kit paints, and reads between
5.44:1 and 7.49:1 depending on where it is put. That is still well under the enabled ghost beside
it. Settled in [#273][i273], and re-measured at
[#295](https://github.com/apliteni/apliteni-ui/issues/295), which moved every ground under both
inks — see Elevation above.

The floor is **3:1**, the bar WCAG uses for large text and for a graphic — a disabled label has to
stay identifiable as the word it is, and no standard sets this because 1.4.3 exempts the control
outright. It is not higher, because the other pressure turns out not to live on this axis: the
disabled primary reads 6.24:1 in dark and 6.11:1 in light, against 5.70:1 and 7.34:1 for the
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

**A field has no fill step, so the ground it is shown on decides whether its box is seen.**
`--field-bg` and `--disabled-surface` are both `--surface` in both themes: a field is drawn by
its edge, never by standing off what is behind it. On the card that edge measures 1.52:1 enabled
and 1.24:1 disabled in light, and 1.27:1 and 1.16:1 in dark. On the PAGE ground the same disabled
field measured 1.12:1 in light — a white box on a grey page, under an edge a shade off the page
itself — which is what Artur reported in round r28: "Disabled fields almost invisible." So the
kit's own gallery pages show a field on the card, which is where a form lives, and
`stories/field-ground.test.js` holds them there and records the four readings above. A consumer
owes a field the same: a form on the page ground gets no help from these tokens.

**Both catalogues, not one.** The React catalogue is held to the same rule by
`react/src/field-ground.test.tsx`, over the reading both gates share in
`stories/lib/field-ground.js`. It mounts every story the workspace exports in both themes and
reads the ground under each field, so a React story that stages a field on `--bg` fails. The rule
is the kit's, so a gate that walked only the HTML galleries left the published React stories free
to break it, and 27 stories in six files did.

Decided in [#551](https://github.com/apliteni/apliteni-ui/issues/551) round r28; the React half
in [#568](https://github.com/apliteni/apliteni-ui/issues/568).

**The box reports the state, so a field that is off draws the fainter edge of the two.** Dark
answered both states with `--border` until [#564][i564]: `--field-edge` and `--disabled-border`
resolved to the same hairline, the fill is `--surface` either way, and the words were the whole
of the difference. `--disabled-border` now drops a rung in dark, to the quiet-fill grey
`--surface-3`, which is where the headroom ends — the card is `#211e2d` and the hairline
`#332f45`, so there is 0.27 of ratio between a field's edge and no edge at all, and the rung
under this one is the 1.12:1 above. Light needed no move: its field edge is `--border-strong`
and its disabled edge `--border`, a rung apart already. The same two tokens paint a button, so a
button that is off drops a rung with the field. A ghost button draws no box in either state and
is unaffected; a switch track has no label and fades instead.

**A disabled select carries the kit's own paint and no fade, so the browser's grey-out is
answered rather than inherited.** A token is only half of what a reader sees here: the kit
finishes painting the control and the engine then paints over the result. Chromium's
user-agent stylesheet declares
`select:disabled { opacity: 0.7 }`, and an opacity is not a colour the cascade hands a property:
the control is painted whole and then mixed into the card behind it, so the edge and the words
come down together. Measured in Chromium, that cost the dark edge 1.16:1 → **1.11:1**, under the
1.12:1 above, and the dark words 6.24:1 → **3.78:1**; in light the edge read 1.16:1 and the words
**3.15:1**, both below the 4.5:1 a disabled label still owes a reader. Only an author declaration
outranks a property the kit does not otherwise set, so the kit's disabled field rule resets
`opacity` to 1 and a select reads exactly what the text field beside it reads: 1.16:1 edge and
6.24:1 words in dark, 1.24:1 and 6.11:1 in light. No token moved for this, so light's
declarations are unchanged and light gained the legible words with dark.

`stories/field-ground.test.js` asserts the gap rather than the sizes: for every disabled boxed
field in the galleries, measured against every enabled one on the same card, the off edge is the
fainter, the two colours differ, and neither state is drawn at a reduced opacity. The boxed
fields are the three that take `--field-edge` — text field, textarea and select — and the
galleries draw the first and the last of them off, the textarea live only; the gate counts each
and fails if one leaves. Neither edge reading reaches the 3:1 non-text floor, which 1.4.11
exempts a disabled control from and which dark's hairline has never met on a near-black page.

The gate has two halves, and this is why: JSDOM ships no user-agent stylesheet, so the source
half writes Chromium's one declaration out and installs it under the kit's sheet, which is an
emulation of a declaration and not of an engine. The browser half, off unless `FIELD_PAINT=1`,
puts the same galleries in front of Chromium and takes the readings from it. Both halves strip
the `opacity` reset back out and require the faded numbers to come back, so a reset that stopped
working fails the gate rather than passing quietly.

Decided by Artur in [#564][i564], Amberstone round r30; the select was found by the independent
review of [#567](https://github.com/apliteni/apliteni-ui/pull/567).

[i564]: https://github.com/apliteni/apliteni-ui/issues/564

## Elevation

**A surface casts a shadow only to say it is higher, and each theme says it its own way.**
A level — a card, the shell's rail, a floating surface — keeps its step on a ladder of lightness
in both themes. What marks its edge is the theme's: **dark draws the kit's hairline, light casts
a soft drop and draws no neutral line at all.** Chosen by Artur on round t3 of
[#490](https://github.com/apliteni/apliteni-ui/issues/490) — *"It's better"* — against a reference
app he supplied, after rejecting a stronger hairline on round t2: *"Fuck how I hate hairlines."*

**A line that divides two regions of one surface is not a level, and stays a line in both
themes.** A card's `__row` dividers, a table's row rules, the rail's head band and the topbar's
bottom rule all separate parts of the same sheet. Only a surface that is *higher* may cast, so a
drop keeps exactly one meaning. A field is not a level either: its edge is what says "type here",
`guidelines/colour-and-theming.md#keep-text-off-grey-fills` asks for it, and a drop under a control inside a
card would read as a raised button — the opposite of a well.

The drop is broad and faint, never tight and dark: it separates a surface from what it covers by
**area**, not by a pixel. All five deprecated `--shadow-*` tokens stay transparent and unread.

**What floats is decided by the surface's job, not by its rung on the ladder.** A floating
surface is one whose whole purpose is to be temporarily above something else: a dropdown menu,
the account and workspace menus, the small-form popover, `confirm()`, the drawer, the React
modal, the three toast styles, the command palette, the hover readout, the collapsed rail's
flyout label, the signed-out auth card, the success panel and the feedback composer. The last
three painted `--bg-elevated` and took the plain hairline instead of the treatment until #490's
review found them; `stories/elevation.test.js` now discovers every rule that paints that step and
requires the rung with it, so the step and the treatment cannot come apart again. They paint a reading surface and float because of their role. Hover readouts
use `--bg-elevated`; collapsed rail labels use the card surface with the same
floating edge and shadow treatment.

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
| `--bg` | the page | `#0e0d14` | `#f2f3f6` |
| `--surface-2` | non-text sunken marks and tracks | `#161520` | `#e9ecf3` |
| `--surface` | a card | `#211e2d` | `#ffffff` |
| `--bg-elevated` | floating — a menu, a panel, the drawer, a modal, a toast | `#2a2639` | `#ffffff` |
| `--surface-3` | non-text quiet fills | `#2d293c` | `#eef0f5` |

**Text sits on the page, card or floating panel surface, never on a grey inset.**
Fields, code blocks, neutral badges, navigation labels and segmented controls use
these reading surfaces in both themes. Grey fills remain for non-text marks and
tracks. Inputs use `--field-bg: var(--surface)` and their field edge tokens;
disabled text controls use the same reading surface with disabled ink. Status
colours keep their meaning, and badge text must clear 4.5:1 in both themes.

`--surface-2` and `--surface-3` remain available for non-text fills. A control's
hover or selected state uses its edge, text weight or a meaningful accent instead
of a grey text background. Floating readouts use `--bg-elevated` and keep their
existing edge and shadow treatment. Decided in
[#455](https://github.com/apliteni/apliteni-ui/issues/455).

**An inline code chip paints the reading surface its container is not on.** A container says
which one that is in `--code-bg`, and the chip reads it — it never declares it:

| The ground | What it hands a chip | Token |
| --- | --- | --- |
| the page | the card | `--code-bg: var(--surface)` on `:root` |
| a card, a panel, any painted container | the page | `--code-bg: var(--bg)` |
| a table | the card in dark, the page in light | `--table-code-bg`, the pair of `--table-bg` |
| a tinted card or snippet | the card it is a variant of | `--code-bg: var(--surface)` |
| a translucent wash over any of them | the page in dark, the card in light | `--wash-code-bg` |

A consumer painting a reading surface of its own hands `--code-bg` the other one; a consumer
painting a table surface sets `--table-bg` and `--table-code-bg` together, and one painting a
wash that takes caller markup sets `--code-bg: var(--wash-code-bg)`. The chip's focus gap is its
own paint, so a link written inside a chip takes the ring over the surface it is really on.

**The chip keeps at least 1.065 against its ground on every ground the kit draws, in both
themes** — 1.110 on a card or the page, 1.127 at worst under a wash, and 1.065 and 1.083 on the
two light tinted cards, which are the floor. That is 792 measured pairs: every ground, every
wash composited over every ground, both themes, and the one context a ground token is
re-pointed in. `stories/code-chip.test.js` holds them and `scripts/evidence/code-chip.mjs`
samples the rendered pixels they are checked against; the two agree within 0.012.

*Why the container has to say it.* The chip cannot read the ground it stands on: a `var()`
inside a custom property is substituted on the element that **declares** it, so a chip reading
`--ring-gap` would read back its own. And one value cannot serve both grounds, because in light
they are `#ffffff` and `#f2f3f6` with nothing between them — a chip that reads on the page is
invisible on a card and the other way round. A table needs a pair because it is the page in dark
and white in light and follows its card into one. A tinted surface takes the card because light
mixes its tint **down from white**, which moves it toward the page and leaves the page 1.02
away. A **wash** needs its own pair for the opposite reason to a rung: it paints *behind* the
chip, so it moves the ground and not the chip, and it moves it in opposite directions in the two
themes — dark's washes lift a near-black ground away from the page, light's darken white toward
it. Decided on [#537](https://github.com/apliteni/apliteni-ui/issues/537).

**A tinted card stays above the page, and `--card-tint` is what buys that.** `.ui-card--accent`
and `.ui-card--live` mix their colour into `--surface`. Dark mixes upward off a mid-grey card and
can spend 9%. Light mixes **down from white**, so every point of tint is a point of lightness the
card loses: at 9% a light accent card landed at **1.043:1 below** the page and a live card at
1.026:1 below it — two sunken slabs between two white cards, which is the ladder upside down.
Light spends **5%**, the most a tinted card can pay and still sit above the page (1.022:1 for the
accent, 1.041:1 for live), and each variant edges itself in its own colour rather than one of the
two keeping the neutral line. The rule this states is the section's own: **a card is a step above
the page, whatever it is tinted with.**

### The three rungs, and which device each theme spends on them

A step of lightness on its own is a contrast of about 1.1 — enough to read as a change of surface,
not enough to draw an edge. Something has to draw it. **A level draws a line or casts a drop, and
never neither**; losing both at once is the flat card #284 and #295 were opened about, and the gate
refuses it.

| Level | The token sheets paint | Dark | Light |
| --- | --- | --- | --- |
| a card | `--card-edge` + `--elev-rest` | `--border`, no cast | transparent, `--elev-rest` |
| the shell's rail | `--rail-edge` + `--elev-rail` | `--border`, no cast | transparent, `--elev-rail` |
| a floating surface | `--float-edge`, `--float-edge-inner` + `--elev-drop` | `--border-strong` outside, `--border` a pixel inside, then the drop | both transparent, the drop alone |

Every rung is two layers: a wide faint one that separates by area, and a short one that keeps the
surface from floating free of its own footprint. Each layer is offset along **one** axis, blurred
at least twice as wide as it is offset, and held inside the surface's footprint by a negative
spread, so none of them reaches out on every side as a halo. **None of them is a glow**: a glow is
a zero-offset layer of the signal's own colour and says *this is lit*, not *this is high*.
`--elev-rail` is the one rung that falls sideways, because the rail is flush to a screen edge and
full height — the same reason the drawer draws its line in one direction.

The widths come from the reference. Measured off it, a card's penumbra runs 12–13 CSS px, a
floating control's 25, and a popover's 35–40, at cores of 1.03–1.12 against the ground. The kit's
rungs are built to those widths: 26 px off a 2 px offset under a card, 24 px off 10 px beside the
rail, 46 px off 20 px under a floating surface.

**A level carried by its rung alone marks every side it exposes.** A shadow falls one way, so
the side it falls *away* from is the one it can miss, and a layer only clears the surface there
when `blur ÷ 2` beats `|spread| + offset`. The first pass of #490 shipped `0 10px 22px -14px`
under a card: that arithmetic is `11 − 24`, thirteen pixels **inside** the card, so its top edge
had nothing at all while the reference marks its own card on all four sides. A level that still
draws a line can afford a directional rung, because the line marks every side; a level carried by
the rung alone cannot. `--elev-rest` is near-ambient for that reason — a small offset under a
wide blur — and the rail is exempt by geometry rather than by taste: it is flush to a screen edge
and full height, so its left, top and bottom are off the screen and its right edge is the only one
a reader can see.

**What keeps a rung from reading as a line is its width, not its peak.** Measured at 1x on a
card in light, against a page the card sits **1.110** above: the rung peaks at **1.064** at the
top, **1.084** at the sides and **1.134** under the bottom, which is the lit-from-above side.
Each of those is the strongest sample of a gradient that runs **16 to 20 px**, where the hairline
it replaced was 1.116 over exactly one pixel. So the bottom peak is above the card's own step and
is meant to be: a drop that separates by area can be stronger at its core than the step and still
read as a lift, because a reader sees the gradient rather than the sample. Peak alone was the
wrong measure of an edge, and it is why the line went.

These are measurements, not guarantees. What the kit guarantees about a rung is the shape the
gate holds: two layers, offset on one axis, `blur ≥ 2 × offset`, a negative spread, ink written as
an alpha, and — for a level with no line — a trailing reach above zero.

**In dark, a floating surface draws its line twice, and the second one is a pixel inside the
first.** `--border-strong` on the border, `--border` as an inset one-pixel line within it: an outer
line against what is behind, an inner one against the panel. One line measured 1.27 against the
card; two measure **1.64**, and the two lines read 1.30 against each other, which is what makes
them two rather than one drawn thick. Light writes the same two layers and resolves both to
`transparent`, so the composition is one shape in both themes and only the palette differs.

**In light a floating panel has no step to stand on, and the drop carries all of it.** `--surface`
and `--bg-elevated` are both `#ffffff`, so a panel over a card differs by 1.000. The second pass on
#490 concluded from that a drop could not replace the line there. The reference answers it: its
popover sits at a **1.002** surface step with no border at all and still reads as floating, because
its drop is three times wider than the kit's was. Width was the variable that pass held fixed. The
one honest cost is the **top** edge, which a downward drop reaches least; the evidence in the PR
measures it rather than claiming otherwise.

**Then the drop, and it is the half that carries light.** A floating surface writes both devices
as one `box-shadow` list, in the order Primer's `--shadow-floating-*` uses — the inset line first,
then the two broad faint drops:

```css
box-shadow: inset 0 0 0 1px var(--elev-edge, var(--float-edge-inner)), var(--elev-drop);
```

Each rung is one token per theme, so there is one place to change each. The line is **not** in
them, and cannot be: a `var()` written inside a custom property is substituted at computed-value
time on the element that *declares* it, so an `--elev-edge` read inside a `:root` token resolves
once, at `:root`, always to the fallback — and every component below that re-points it writes a
declaration the browser ignores. The alphas are per theme because the device is not worth the same
in each. Dark spends 62% / 50% of `--shadow-ink` on `--elev-drop` and still only reaches **1.20**
at the drop's core, because near-black ink on a near-black page has nowhere to go — dark is carried
by the edge, and its other two rungs are the transparent shadow. Light spends **22% / 12%**, lands
the core at `#ceced2` and reads **1.57** on the card. That is up from the 18% / 10% #295 shipped,
and deliberately: there the drop sat behind two lines, and here it carries the separation alone, so
the gate's floor rises with it from 1.43 to **1.50**. `--elev-rest` and `--elev-rail` spend 16% /
7%, which puts a card's core at 1.38 before the blur spreads it — the reference's card measures
1.05 rendered, and these rungs land in the same band.

The treatment has these composition rules.

- **The focus ring composes with it.** A `box-shadow` list replaces the whole list, so a panel
  writing `box-shadow: var(--ring)` on focus takes off its own edge and its own drop for as long
  as it holds focus. Every floating panel writes the ring in front of the treatment rather than
  over it.
- **A tinted surface re-points the inner line.** `--elev-edge` is the hook, and because the layer
  reading it is written on the surface's own rule, the surface can set it: unset it is
  `--float-edge-inner`, which is what a neutral panel wants. Toasts use the neutral border and drop
  across all styles. A re-pointed tint is a *signal* colour, not a neutral hairline, so it survives
  in light — a tinted card (`.ui-card--accent`, `.ui-card--live`) keeps its own coloured edge in
  both themes for the same reason, and takes `--elev-rest` beneath it.
- **A flush panel draws the line in one direction.** The drawer sits against a screen edge, so it
  has one edge rather than four; a full inset ring would draw lines across the top and bottom of a
  full-height panel, where there is no edge. It composes `var(--drawer-line), var(--elev-drop)`,
  and each `--drawer--<edge>` rule sets `--drawer-line` in the direction its border runs.
- **The Modal uses only the drop.** Its deep scrim separates the surface without a border or
  inset edge. Decided in [#448](https://github.com/apliteni/apliteni-ui/issues/448).

Held by `stories/elevation.test.js` and `react/src/elevation.test.ts`, over one reader and one
cascade resolver in `scripts/lib/box-shadow.js`, with their own tests in
`scripts/lib/box-shadow.test.js`. Both discover every `box-shadow` the kit declares rather than
naming a component, read each layer's geometry per theme, and refuse a cast layer that is not one
of the three rungs. The count of declarations reading each rung is pinned, a planted cast on a card
proves the walk rejects one, and three more cases carry their own mutations: the line-or-drop rule
for every level in every theme, the reach rule above, and a sweep of every rule that paints
`--bg-elevated` against the rung that has to come with it. A layer is judged against every value the kit gives the properties it reads —
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

**Inside a floating panel, text retains a reading surface.** Neutral rows and
chips use the card surface; fields use the same field tokens as elsewhere.
Accent counters use accent ink on that surface, without stacking translucent
washes on a selected row.

**The ladder is capped by ink, not by taste.** `--muted` still carries state and placeholder
information, so it has to clear AA on every step the ladder raises — and it is re-picked
against the TOP of the ladder rather than against the page. That is the standing cost of the rule:
a raised surface that gets lighter asks the ink to get lighter with it, and the next surface that
wants to float spends what is left.

Held by `stories/contrast.test.js` and `stories/accent-contrast.test.js`, which measure every
ground the two token files declare rather than a list typed into a gate.

Decided in [#295](https://github.com/apliteni/apliteni-ui/issues/295), after
[#284](https://github.com/apliteni/apliteni-ui/issues/284) made the card flat. Reopened and split
by theme on [#490](https://github.com/apliteni/apliteni-ui/issues/490): Artur chose the soft drop
over the hairline on triage round **t3** (`rev_fc04893b8bfc`), having rejected a stronger hairline
on round t2 and a surface step with it. The reference analysis the light rungs are measured
against is recorded on that issue. This also reopens
[#454](https://github.com/apliteni/apliteni-ui/issues/454), whose round r22 answer was "no visual
change to the light rail" — the rail's edge is one of the hairlines round t3 decided against.

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
--ring-scroll: var(--ring-width) solid var(--ring-color);
--ring-scroll-offset: calc(-1 * (var(--ring-gap-width) + var(--ring-width)));
```

`--ring` remains a composed shadow for `box-shadow: var(--ring)` consumers.
Tune the width, colour and gap at `:root`, or at a surface that composes the ring.
A descendant-only change to one of those inputs cannot alter an already inherited
shadow: CSS resolves custom-property references where the composition is declared.

`--ring-scroll` is the indicator a SCROLL REGION inside a surface takes: the same 1px
gap and 2px band, drawn inward, and no halo. It is an `outline` rather than a shadow,
and `--ring-scroll-offset` is what draws it inward — take the one without the other and
the band is painted outside the box. Both are declared once, at `:root`, and recomposed
nowhere, because neither reads `--ring-gap` or any other token a surface re-points: the
band leaves its 1px gap UNPAINTED, so the gap is whatever surface the region is already
standing on. Tune it where you tune `--ring`; it is built from the same `--ring-width`,
`--ring-color` and `--ring-gap-width`. Gates hold the offset on every consumer and hold
the tokens clear of the surface colours.

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

The ring is claimed by a selector list in `base.css`, so a control that wears none of the
kit's control classes has to join it. The theme toggle is the one that did not: `.toggle`
is a real button with its own paint in `topbar.css` and neither `.ui-btn` nor
`.ui-focusable`, so keyboard focus on it fell back to the browser's own outline in the
vanilla topbar, React `ThemeToggle` and the React shell's bar alike. It is on the list now
([#385][i385]). The shell's brand link, `.ui-app__brand`, has the same gap and is open as
[#482](https://github.com/apliteni/apliteni-ui/issues/482).

Controls use native `:focus-visible`, including inputs, textareas, selects and invalid
fields. Text-entry controls can match it on mouse focus because the browser expects
keyboard input there; this is not a promise of keyboard-only rings. Invalid borders
keep their error colour while focus uses the shared band. No JavaScript modality
tracker is required. Every shared-ring consumer retains a transparent 2px outline,
which becomes a visible system outline when forced colours remove box shadows. A
`--ring-scroll` consumer owes none: its band already is a real outline, and that is what
the system repaints.

**Every focusable control the kit ships draws it.** The ring is not opt-in: a control
this kit styles is a control it gives a focus rule, so none falls back to the browser's
own outline, which ignores the accent, differs between browsers and is black in both
themes. This covers a control the keyboard reaches with an arrow key rather than Tab: a
roving row inside a menu or listbox takes the ring like any other stop. Eighteen of them
shipped without one until [#482](https://github.com/apliteni/apliteni-ui/issues/482),
so every page that used those components inherited the gap. One control is exempt and states it on its
own declaration: the command palette's input holds focus for as long as the dialog is up,
so a ring there would be painted the whole time and mark nothing. A bare `a` in host copy
is the host's; the kit's own `a` rule sets its colour and nothing else. A gate walks the
keyboard stops of the marketing landing page and of the shell and footer stories, and
fails a stop with no ring, or with an outline of its own instead of or beside it.

**Writing the ring is not enough; it has to win.** A focus rule paints only if it
outranks every always-on rule that writes `box-shadow` on the same element, so a
component that re-states the property at equal specificity further down its sheet
silences the ring without removing it. Where the ring is composed with a surface's own
elevation — the dropdown, drawer and command-palette panels — the focus declaration
repeats that treatment beside `var(--ring)`, because a `box-shadow` list replaces the
whole list. The gate resolves the cascade for each keyboard stop, by specificity and
then document order over the sheets as a page loads them, and fails a stop whose ring
loses.

**A box that scrolls is a control.** A browser gives a scroll container a keyboard stop
of its own, with no `tabindex` and no author rule, so an overflowing box needs the ring
as much as a button does — unless its own children are keyboard-focusable, in which case
it is given no stop, because the keyboard already reaches into it. Every scrolling box
the kit ships is one or the other, and
[#531](https://github.com/apliteni/apliteni-ui/issues/531) settled which.

Ten carry the ring, and they draw one of two pictures.

**Eight are scroll regions inside a surface** and take `--ring-scroll`: the scrolling
table wrapper, a card around a table, a dropdown's search list, a drawer's body, a
confirm's consequence, the command palette's list, React's modal body, and the date
picker's shortcut row in its phone sheet. Each draws the band on itself. Artur chose
that picture on #531 after the kit's own `--ring` was measured around these boxes: drawn
for a 32px control, its halo spreads 14px past the band, which on a 400px region lights
the surface rather than the box that scrolls. Three of the eight also could not have
drawn an outset ring at all — the drawer's body is flush with a panel that is flush with
a screen edge, the palette's list sits inside a panel that clips, and the dropdown's
list sits 6px inside a 16px corner.

The band is an `outline` and not a `box-shadow`, which is what makes it survive the
scroll it is drawn for: an inset shadow is painted under a box's own children, so a
table scrolled sideways under one erases the band — measured in Chrome at scrollLeft
300, where the left and right sides went. An outline is painted over the children, stays
on the border box while content scrolls beneath it, and follows the radius. A region
needs its own room for the band to land in rather than on its glyphs: the drawer's body
has 20px of padding, the modal's 16px, the palette's list 8px, the dropdown's rows 9px,
the card 24px, and a confirm's consequence and the picker's shortcut row each carry
`--space-1` for it.

**One keeps `--ring` on the box AROUND the scroller:** a snippet's code region, which is
flush with its card on three sides and has no radius of its own, so a ring drawn on it
overhung the rounded corners and cut a line across the card. That card is the outermost
box, where the halo falls on the page rather than on a surface of its own. A delegated
ring is one indicator and not two: the scroller keeps the transparent outline that
suppresses the browser's own, and drops it under `forced-colors: active`, where the
card's outline is the one the system repaints. The dropdown panel is the tenth, and
keeps `--ring` for the same reason — it is itself the outermost box.

Two boxes are not a keyboard stop at all and carry no ring: the underline tab strip and
the application rail, each of which holds its own tabbable rows and overflows only once it
holds more of them than fit.

The gate discovers every box the kit makes scrollable and holds both lists exactly, with
the reason beside each entry, so a new overflowing box is triaged rather than shipping
with the browser's outline. A box excused as no stop is also rendered from its own
factory and checked to still hold a tabbable row. What each ringed box DRAWS is resolved
from the source separately, in both themes and both accents: a region that stops drawing
the band, or a box around one that starts drawing a second indicator, fails there.

The solid band's unchanged colour is still held at 4.22:1 against the story-derived
flat grounds. That arithmetic gate does not measure the gap or blur. Chromium pixel
measurements must additionally check both actual band neighbours across every shipped
accent, both themes, and the page and elevated grounds. The gap follows the containing surface:
toasts retain the shared focus ring, with `--surface` as the gap colour.
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

## A tap reaches the floor below the phone step

A finger covers more than a cursor. Below the phone step the kit's own controls measure under
44px on at least one axis — a segmented pill 31, a tab 38, an `sm` button 27, an `xs` icon button
24 — and a consumer cannot fix that at the call site for a part the kit sizes or portals.

**The extra size goes outside the drawn shape.** `src/styles/tap-zone.css` gives each of those
families a transparent, centred `::after`, and the control keeps the size it draws. The kit had
already run this device on two controls for six weeks — a 24px `::before` over a 19px checkbox and
the same over the toast's 19px close mark — and this sheet is that pattern generalised and raised
to `--tap-min`. Growing the controls instead was the first answer and was rejected: every row that
holds one grows with it, which is a visible change to a page a reader already knows, and the
issue's own acceptance line asks that no row grow unless its content does.

**A layer never crosses a neighbour's drawn edge.** A centred layer over a control of drawn size
*s* reaches `(44 − s) / 2` past each edge, so a 24px mark in a row gapped at 8 takes 2px of the
control beside it. Which of the two then wins those pixels is paint order, and with both layers at
`z-index: auto` that is **source order** — the control written later in the markup. Measured on
#488's first pass: the bottom 3px of a menu's `Duplicate` row started running `Revoke`. A
hit-target change that routes taps into a destructive row has made the screen worse.

So the layer is clamped to the room the layout says it has. `--tap-clear-x` and `--tap-clear-y`
are the clear space to the nearest neighbour on each axis; a layer takes **half** of that on each
side and stops, so two neighbouring layers meet at the midpoint of the gap and the nearer control
wins it rather than the later one. The clamp is declared by the container — the only thing that
knows its own gap — and inherits down.

**Where the kit packs tighter than a zone needs, the GAP opens.** A layer may take at most half
the gap, so a row at 8px carries a zone 4px past each edge and no further. The second half of
#488's answer is therefore spacing: below the step, to a coarse pointer, the kit's own rows of
small controls open to `--tap-gap`, which is 20 — `44 − 24`, where 24 is the smallest mark the
kit draws in a row of its own. The filter row, a table's row actions and a toast's action row
open across; a segmented strip, a pager and a tabs strip keep their packed track and open down,
where the room is free until the strip wraps. **The controls do not change size**; the space
between them does, by a few pixels, on a phone, under a finger. That is the cost the issue
accepted, and it is the half that a floor made of zones alone cannot buy.

**Two floors, and the lower one never moves.** `--tap-min` is 44, the target this sheet reaches
for; `--tap-aa` is 24, WCAG 2.5.8 and the target the kit holds at every width. The second is
there because a zone is clamped by its container's clearance, and `100%` on an absolutely
positioned pseudo-element resolves against the **padding box** — on a 19px checkbox with a 1.5px
border that is 16, so a clamp with nothing opened would take the hit layer `input.css` already
draws from 24 down to 22. The two layers this sheet raises are floored at `--tap-aa`, so they
can only ever grow.

**A zone grows only where a container has opened the room for it.** `--tap-clear-*` defaults to
**zero**, which is the honest default: the sheet cannot see a layout it has never met, and the
earlier draft assumed `--tap-gap` everywhere and was wrong outside the rows it opened — the
review of #488 measured the confirm dialog's `Keep the workspace` losing a pixel of its own box
to `Delete it permanently`. So a container either opens and says so, or says nothing and its
controls keep the targets they draw. A row that cannot open but does give something — a chip
whose value and remove mark share an edge by design, a dense table's rows — declares what it
gives, and the browser gate fails a declared number that is not true.

**Rows open down unless they cannot overflow.** A row of labelled buttons at 390 is often
already full, and widening its column gap there does not move the buttons apart: it makes them
narrower, and a control drawn narrower is the half #488 rules out. Measured on a toolbar holding
three buttons and a dropdown, and on a toast, where the column half took 24px out of the message
and bought no reach at all. So the action rows open `row-gap` only — which is also where their
collision was, since they wrap — and only a row whose marks are each a fixed square, a drawer
header whose column gap is spent on a title rather than a control, or a dense table's action
cell, which is the one pair that has to open across, opens the other axis.

**An opening that buys no reach is not an opening.** The accent picker's swatches are bare
buttons on no carrier list, so spreading that row moved four marks and gained nothing; it was
reverted. The hero's call to action holds `lg` buttons already drawn 44 tall, so its row gap was
reverted too. The gate now measures this directly: every container the sheet opens must contain
a target that reaches further for it.

This sheet is imported **last**, after every component sheet, and its openings take `!important`:
each one overrides a `gap` a component already set, and the React bundle ships this sheet without
those component sheets at all, where load order belongs to the consumer. Same trade as
`field-zoom.css` — a host packing one of these rows tighter at phone width does not win.

**A carrier's pseudo-element must be free.** `.ui-nav__tab::after` is the active underline
`nav.css` draws, and an earlier draft listed that family: the zone's `top` and `width` landed on
the indicator, over-constrained it, and moved it from under the label into the middle of it,
where it read as a strikethrough. The tab is drawn 86x45 and already clears the floor, so it is
not a carrier. The checkbox and the toast close go the other way — their `::after` is spoken for
by the tick and the glyph plate, so it is the `::before` each already has as a hit layer that
grows. Both directions are now held by the gate rather than by a comment.

**Four families get no layer, three cannot carry one, and two are clipped.** A menu's rows, the command palette's
list and a sidebar's rows share an edge: there is nothing outside a row to put a layer in, and a
44px one only moves the boundary — the first rows lose a sliver and the last takes the whole gain.
`input`, `select` and `textarea` generate no pseudo-element at all, with or without
`appearance: none`; padding with a negative margin is not invisible on a control that paints a
border and a background, so the only remaining device is a wrapper, which is markup a consumer
cannot add to a part the kit portals. `.ui-input` and `.ui-textarea` already draw taller than the
floor; `.ui-select` is 42px and is reached by its own height or not at all. A back link is the fourth family left alone: it stands at the top of a page
where what sits above it belongs to the shell rather than to the link, so it cannot declare a
clearance it has no way to know — measured in the app shell at 390, a zone reaching up from it
met the wordmark. It draws 24 on both axes and clears 2.5.8 as it is. A toast is the third
case of the other kind: it clips to its own rounded corners so the timer bar can run along the bottom edge, and
both its controls sit against that clip, so their zones are trimmed rather than stopped. Opening
the toast's padding was measured and rejected — it bought four marks and cost every toast 8px of
height, which grows a surface rather than the space between two controls. All of them are named
on the Accessibility minimums page.

**The pointer clause is not decoration.** A transparent layer is also a hover surface, so under a
mouse the control lights up with the cursor 8px off it, which reads as the page being misaligned.
`@media (max-width: 560px) and (pointer: coarse)` is the whole gate: a coarse pointer has no
hover, so the clause that earns the layer is the clause that removes the side effect. The focus
ring is unaffected either way — it is a `box-shadow` on the control, drawn on the drawn box, and a
transparent descendant neither clips it nor moves it.

**`--tap-min` is declared in this sheet rather than in the token file.** `reduced-motion.css` and
`field-zoom.css` carry their own numbers for the same reason: a net has to reach every bundle the
kit publishes, and `react/src/index.ts` imports these three sheets without `tokens.css`. A `var()`
resolving to nothing there would size the layer to `auto` in silence. It is still a token and a
consumer can move it; the clearances reference the spacing scale with a literal fallback for the
same reason.

Held by `stories/tap-zone.test.js` in two halves. The source half runs in CI and reads the sheet:
the floor is a token, the query carries the pointer clause, every carrier has a containing block,
every clearance names a container the kit declares, and every entry on the exempt ledger is real
and is not also a carrier. The browser half is the measurement and runs only under `TAP_ZONES=1`,
because Playwright is deliberately not a dependency of this package. It drives every story at 390
and 1280, with and without the sheet, asking `elementFromPoint` who owns each pixel of each
control's drawn box: no control is drawn at a different size, the set of controls whose own box
runs a different control does not grow, each family the sheet names reaches further than it did,
and 1280 and a fine pointer are identical either way. That middle claim is stated as a set and
not as coordinates on purpose — opening a row's gap moves the controls in it, so "the point this
control owned before" stops being a question with an answer, and what survives the move is who
collides with whom. It proves its own rejection by unclamping the layer and failing on the result.

The viewport is sized to each story before anything is asked of it. `elementFromPoint` answers
about the viewport and returns null below the fold, so a fixed box reported every control on the
lower half of a long story as having no reach and no owner — a rig artefact that reads exactly
like a layer that was never applied.

What a green run does not prove: one browser, one theme, and only what the kit's own stories
render. Two controls whose drawn boxes already overlap — a showcase grid at 390 where a `nowrap`
label outgrows its column — are left out of the loss check, because between two controls that
already overlap, which one wins a pixel is undetermined before anybody adds a layer.

Decided in [#488](https://github.com/apliteni/apliteni-ui/issues/488), building on
[#219](https://github.com/apliteni/apliteni-ui/issues/219), which put the first hit layer over the
checkbox.

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

**A select draws one chevron, on its right edge, in every theme and every state.** The glyph is a
background image, so it is three longhands — `background-image`, `-repeat` and `-position` — and
any `background` shorthand reaching the same element silently resets all three. Whether that reads
as a lost chevron or a tiled one depends on which rule outranks which, so a disabled select showed
both at once: no chevron in dark, and a chevron repeating across the whole field in light. So a
rule that repaints an element whose look depends on the other `background-*` longhands sets
`background-color`. Controls that paint nothing but a colour — the checkbox, the radio, the switch
track — keep the shorthand, and the resting field rule keeps it because source order already puts
it under the chevron. Held by `stories/select-chevron.test.js`, which resolves the real cascade
rather than reading declarations; what it sweeps, and what it does not, is stated there.

Decided in [#511](https://github.com/apliteni/apliteni-ui/issues/511).

### When a button drops its words

**Words are a button's default, and a glyph is the optional part.** Guidelines / Button labels
states it as three rules: keep the words; let a glyph beside a label repeat that label's verb, and
treat every button in a row the same way; and drop the words only when all three tests hold at
once — the glyph is learned everywhere, the action is on the closed list in `src/assets/icons.js`,
and the control keeps a name assistive technology reads and a hover shows. A crowded row is a
reason to ask, not an answer.

Three parts of that are the kit's own decision rather than a reading of any source: that the list
is closed, which actions are on it, and what counts as learned everywhere. What the cited systems
support is the default — words first, a glyph as help — and the requirement that a wordless control
be named.

- [Nielsen Norman Group](https://www.nngroup.com/articles/icon-usability/): "a text label must be
  present alongside an icon"; home, print and the magnifying glass are the few it names as having
  mostly universal recognition. It also says not to rely on hover to reveal a label, because that
  raises interaction cost and fails on touch, and it argues against hiding navigation labels at
  all. The folded rail is where this kit knowingly differs; see
  [The page shell](#the-page-shell).
- [Carbon](https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines)
  uses icons beside labels sparingly, takes icons on all of a group's buttons or none, keeps its
  own table of universal actions, and still requires a tooltip on an icon-only button "regardless
  of how recognizable an icon may or may not be, or whether that action lies within the universal
  actions list".
- [Atlassian](https://atlassian.design/components/button/icon-button/usage) allows icon-only where
  space is limited and the glyph is clearly associated with the action, and recommends visible
  words where space allows or importance warrants them. Its five-second rule states a likelihood,
  not an impossibility: "if it takes you more than five seconds to think of an appropriate icon, it
  is unlikely that an icon can effectively communicate that action".
- [Primer](https://primer.style/product/components/icon-button/) documents an accessible label and
  a descriptive tooltip as parts of an icon-only button. It certifies no particular glyph.
- [GOV.UK](https://design-system.service.gov.uk/components/button/) ships no icon-only button; its
  one glyph, the start button's arrow, is `aria-hidden` beside words that carry the action. That is
  evidence about one component, not about every component in that system.
- [USWDS](https://designsystem.digital.gov/components/button/) keeps action labels short and adds a
  glyph only to signal a specific action, such as Download or Open in a new window. It requires a
  glyph on no particular button.

Material 3 and Apple's Human Interface Guidelines were not checked; both pages render client-side,
so nothing is attributed to them here.

**The funnel keeps its word.** `filter` is Lucide's funnel. Depicting a thing is not the fault:
`copy` is on the list and depicts one too. The kit's reading is that the funnel alone does not say
whether the control filters, sorts or exports, so it fails the first test and is not on the closed
list. That is this kit's inference from the sources above, not a measured recognition finding.
Filter is therefore a labelled button, and the glyph beside the word stays optional: Showcases /
Empty states ships Filter as text alone.

**What the list claims, and what it does not.** Each entry is an action allowed to drop its
visible text, not a glyph certified as universal. `x` and the chevrons repeat per row or per
section; `copy` sits in the snippet's narrow bar, where the word repeated what the glyph already
said; `moreHorizontal` and `moreVertical` are the standard overflow affordance. A control built
from the list through `button({ iconOnly })` gets `aria-label` and `title` together, so its name
reaches a screen reader and a hovering pointer, and neither a keyboard reader who is not running
one nor a finger: on keyboard focus the kit shows the ring, not the name.

`stories/guidelines/iconography.test.js` checks both halves of the rule at every call site: that
the glyph is on the list, and that the name the control answers to opens with a word
`iconOnlyNames` allows for it, so `copy` cannot be borrowed for Duplicate.

**The shell's wordless controls are the exception, and two of them carry no title.** The theme
toggle has one. The sidebar toggle and the folded rail's links do not: they show the label itself
beside the glyph on hover and on keyboard focus, which `stories/apps/shell-rail.test.js` requires,
because a `title` would be a second copy of a name the row already carries and would reach a
pointer only. That is better than a title and still not a visible label, which is the cost NN/g
names. The rail is a deliberate trade for the width, recorded here rather than presented as agreed
practice.

Decided in [#565](https://github.com/apliteni/apliteni-ui/issues/565).

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
Regions persist through completion so progress and completion can be announced.
React callers can set `completionMessage` to describe the outcome, or to an empty
string when a form error or another live region announces it (#388).
React field errors use `role="alert"` as well as a linked description, so a new
error is announced without moving focus back to the field. Explicitly disabled buttons remain natively
disabled. Unwired static `button({ busy: true })` markup retains native disabled as
a safe fallback; `setButtonBusy` replaces it with guards when wiring the control.

### React Button links and leading artwork

React `Button` accepts `href` to render an anchor using the existing button classes.
Without `href` it renders a native button, defaulting to `type="button"`. Refs and
native attributes belong to the selected element. `leading` accepts decorative
React content before the label wrapper and takes precedence over `icon`. Callers
supply vendor artwork without focusable descendants and name icon-only controls
with text children, `aria-label`, or `aria-labelledby`. An icon-only control
mirrors string children, then the icon name, into `aria-label` and `title`. With
neither it stays nameless rather than carrying an invented one: an identifier
reads as a name to a checker and says nothing to the person hearing it, so the
gap has to stay visible.

`className` merges with the kit's classes instead of replacing them, matching
React `BackLink`. The component's state wins over the caller's spread props:
`aria-disabled`, `aria-busy`, the `data-btn-*` hooks, a link's `role`, and the
`href` and `tabIndex` a disabled or busy control drops. No caller can leave a
busy or disabled control reading as idle. `type` stays the caller's on a button
and defaults to `button`; an anchor has none. Every other native attribute
passes through. `ButtonProps` is the union of both roots and spreads back into
`Button`; `ComponentProps<typeof Button>` resolves to that union rather than to
the link alone, and `Button.displayName` stays typed.

Disabled links have `aria-disabled`, no href, and `tabIndex=-1`. Busy links keep
their tab position and focus, remove their href, and retain the last idle label.
Both block clicks, auxiliary clicks, and Enter activation in capture and bubble
handlers. Space is blocked on button roots only: it never activates an anchor, and
a focused busy link that swallowed it would cost the reader the page scroll and
prevent nothing. When enabled, the destination and caller tab index return.
Native buttons remain natively disabled when explicitly disabled. Busy artwork
uses the shared CSS to stay in layout while hidden. Covered by
`react/src/primitives/Button.test.tsx`; browser captures check layout, while these
JSDOM tests check semantics and activation rather than screen-reader speech. The
exported types are a gate of their own: `react/src/primitives/Button.types.tsx`
compiles the consumer patterns under `react/tsconfig.types.json`.
Part of [#429](https://github.com/apliteni/apliteni-ui/issues/429).

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

`stories/guidelines/the-page.test.js` renders every Showcases example screen under `stories/apps/` and
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
primitives. It is the only one: `accountShell()`, the compatibility preset for the `/account`
pages, was retired in 0.81.0 along with its Showcases screen, because account and settings belong
in a modal over the product rather than on a page of their own — see
[Guidelines / Account and settings](../guidelines/account-and-settings.md). A product still on the
preset calls `appShell()` with a `topbar` bag, its own `nav` and `crumbs` built from the `cap` and
`crumb` strings it used to pass.

What the shell guarantees:

- **A `<main>` landmark**, always.
- **The caller owns the breadcrumb trail.** `appShell()` renders `breadcrumbs()` from a `crumbs`
  array and invents nothing. Pass no crumbs and there is no trail and no breadcrumb landmark.
- **The topbar is off by default.** `appShell()` renders none unless the caller passes one.
  `versions`, `showSwitch` and `wireTopbar()` are published behaviour inside that bag, and
  Components/Topbar is the story that draws the composition.
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
- **The toggle is one mark, and the mark says what the press will do.** The control is Lucide
  `panel-left-close` on an open rail and Lucide `panel-left-open` on a folded one: a frame, a seam
  at 9 that never moves, and a chevron pointing the way the press moves the rail's edge. The seam
  holds still because it IS the rail — the compartment it cuts off stays on the side the rail is
  on. Until #429 the seam was what travelled, mirrored about the frame's centre as `lessly-ui`'s
  `RailToggle` mirrors its own, and it landed at 15: a WIDE left compartment beside a rail that had
  just become narrow, which is the mark reporting the opposite of what happened. Artur rejected that
  mark on 2026-09-30 and named Cloudflare's dashboard and `lessly-ui` as the references; the panel
  frame is what both draw, and Lucide's own pair is the frame with the direction added. No
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
  derived from — one box, written once, at both widths; where that box stands is the bullet above. The chevron turns over on `--dur-med`, the rail's own
  clock and not the words' `--dur-fast`, so the mark and the closing edge arrive together, and the
  turn is a reflection rather than a number: `panel-left-close`'s chevron is drawn at 13..16 and
  mirrored about 15, the centre of the compartment it stands in, which lands it at 14..17 — exactly
  where Lucide draws `panel-left-open`'s. So both states are a shipped glyph and the CSS between
  them is one axis.
  `stories/apps/shell-states.test.js` reads the frame, the seam and the chevron out of the factory
  and refuses a seam past the frame's centre, a seam that moves at all, a chevron that holds still
  between the two states, a mirror that does not land on Lucide's own open glyph, a control wider or
  narrower than the column, an offset written as a number rather than as the two widths' own
  difference, and a band that stacks its marks again. The same file resolves the toggle's chip at both widths, under
  the pointer and under the keyboard, so the rule cannot be scoped back to the fold.
- **One accent signal per rail row, and on a folded rail it is a plate rather than a bar.** An open
  rail marks the current row with the accent marker in its left padding, and with nothing else in
  the accent: the glyph takes the row's own ink at full strength — which is the step that says
  "current" whatever `--accent` is doing — and an accent counter on that row reads as the neutral
  one beside it. Before #429 a current row could carry all three at once, and the counter's pair
  (accent ink on `--surface`) was the one #157 recorded under WCAG AA in four of the eight theme x
  accent cells; nothing paints it now. On a folded rail the marker is dropped and the row takes one
  plate instead: `--surface-3`, the kit's quiet non-text fill, `--ui-nav-strip` wide at the row's
  own edge — twice a glyph's centre, so the plate is centred on the glyph. The bar cannot serve
  there, because the padding it stands in is the rail's own edge on a strip and a nested row puts it
  `--space-3` further out again; nor can the resting hairline, which is drawn on a row that keeps
  the open column and so has its right edge off the strip. Both references mark current the same
  way and with no hue: Cloudflare's docs rail paints a flat plate, and `lessly-ui`'s rail is a plate
  and the weight step. Artur asked for it on 2026-09-30. The plate sits behind the glyph on the
  row's own stacking context, so the focus ring is untouched.
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
- **The rail stands on a reading surface, one measured step off the page — and in light that step
  is at its ceiling.** `.ui-app__rail` paints `--surface`, the card, because every label, section
  caption and the reader block inside it reads on that ground and
  [#455](https://github.com/apliteni/apliteni-ui/issues/455) keeps text off grey fills. The step
  that ships is **1.186:1 in dark** and **1.110:1 in light**, identical under all four accents —
  neither accent re-points `--bg` or `--surface`. `stories/apps/shell-states.test.js` holds both
  numbers to ±0.01 from both sides, so a drop is a regression and a rise is a decision written into
  that gate rather than a number that moves on its own.

  **Light cannot go further with the tokens that exist.** Perceptually the light step is half the
  dark one — ΔL\* 4.16 against 8.33 — and that residual gap is what
  [#454](https://github.com/apliteni/apliteni-ui/issues/454) was filed on. White is the furthest a
  light *reading* surface gets from `--bg` `#f2f3f6`, and the rail is already on it; `--surface-2`
  and `--surface-3` are nearer the page, not further, and are non-text fills besides. Matching
  dark's step means bringing `--bg` down to about `#e5e7ed`, which is the token
  [#448](https://github.com/apliteni/apliteni-ui/issues/448) pinned at `#f2f3f6` and moves every
  light surface in the kit — a theme decision, not the rail's.

### The second layout

`appShell({ layout: 'topbar' })` is the same shell with three parts in different places, and
`layout: 'rail'` — the default, and what every page already on the shell gets — is the
arrangement above.
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
  In the light theme the rail's half is now the stronger of the two: `--border` `#e4e7ee` on the
  rail's `--surface` `#ffffff` is 1.238:1, against 1.116:1 for the same rule on the band's `--bg`.
  It ran the other way while the rail stood on `--surface-2` `#e9ecf3` — 1.047:1, and 1.009:1
  before [#448](https://github.com/apliteni/apliteni-ui/issues/448) lifted the sunken step off the
  border, a rule that was there and could not be seen. Both are inherited — the ladder is [#295](https://github.com/apliteni/apliteni-ui/issues/295)
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
  `sidebarNav({ activeIs: 'section' })` does the same outside the shell. React `AppShell`
  reads the same `back` prop for the same decision, so a flow's steps report their parent
  section identically in both faces of the kit ([#385][i385]).
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
[i385]: https://github.com/apliteni/apliteni-ui/issues/385
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
src/styles/dropdown.css:81 `padding: var(--ui-dropdown-pad);`. A block pinned to an edge of the
panel has to come back out through that padding to reach the edge, and before
[#306](https://github.com/apliteni/apliteni-ui/issues/306) the only way to write that was to copy
the number: the head's bleed was `margin: -6px -6px 5px` and a page building its own footer wrote
the same `-6px` by hand, which its design-token guard refused as a magic number.

`.ui-dropdown__head` and `.ui-dropdown__foot` are that pair, and they are symmetrical by
construction. One rule gives both their inner padding, at
src/styles/dropdown.css:240 `padding: 11px 13px;`, so the two cannot drift; each then pulls
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

**And nothing inside it is held either.** The rule above answers for the panel and not for its
contents, and under reduced motion an element that names no property of its own still transitions
the inherited `visibility` — the mechanism is
[Reduced motion travels with the stylesheet](#reduced-motion-travels-with-the-stylesheet). So an
open panel carries no transition inside it at all, for as long as it is open.
[#519](https://github.com/apliteni/apliteni-ui/issues/519) is what that cost: the search field was
hidden in the frame `openDropdown()` focused it, so the panel stood open with the reader's focus
left on the trigger, and the topbar's account menu lost its first row the same way. Measured in
Chrome with reduced motion forced, before and after. One rule says it for all three menus, keyed on
the hook they share rather than on any one sheet's class: `.open > [data-dropdown-panel] *`, with
`[data-dropdown-panel].is-open *` for the portalled panel.

Held by `stories/reveal-focus.test.js`, which finds every `visibility: hidden` curtain in the kit's
sheets rather than taking a list, opens each one that takes focus with the kit's own wiring and
fails any element inside it that the net does not reach — so the next component to hide itself this
way is asked the question too. A curtain that holds nothing focusable is named there with the reason
it is exempt. `react/src/Dropdown.test.tsx` asks the React panel the same question, because the rule
is in the sheet both faces load and what the React side owes is markup the rule can reach.

Held by `src/components/dropdown.test.js`, which reads the offsets out of the stylesheet — any
panel rule that pins `bottom` has to release `top`, and every offset has to read the one custom
property — and feeds the wiring measured rects, JSDOM having no layout of its own.

## A menu panel does not cut off its rows' ring

The kit ring is drawn outside the border box of whatever has focus: one pixel of gap and two of
ring, from `--ring-gap-width` and `--ring-width`. A row that fills its panel from edge to edge draws
that ring on the panel's own border and past it. So a menu panel has to leave it one of two ways
out, and there are only two: **keep the three pixels inside the panel as padding, so the ring lands
in the padding; or clip nothing at the panel's edge, so the ring crosses it.** A panel that does
neither cuts the ring away, and the reader gets two accent bars, above and below the row, where a
ring was meant to be.

`.ui-dropdown__panel` takes the first way out, padding by `--ui-dropdown-pad` and rounding its rows
with `--radius-sm`; `.vsw__menu` pads by the same six pixels. `.amenu`, the account menu, did
neither: it padded by nothing and set `overflow: hidden`, which is why it was the one menu in the
kit whose ring had a single pixel to draw in.
[#519](https://github.com/apliteni/apliteni-ui/issues/519) is where that became visible, because
that is the fix that put a reduced-motion reader's focus on the row in the first place.

**`.amenu` takes the second way out: it clips nothing.** Its rows keep the geometry they had — the
same padding, the same full-bleed band, the header and the separators still reaching the panel's
edges — and the ring crosses the panel's edge instead of being cut at it. Two things follow from
that and are accepted: the ring stands two pixels outside the panel's border on each side, which no
other ring in the kit does, and the hovered last row's square fill reaches past the panel's 14px
radius at the bottom two corners. Artur chose that over padding the panel and moving its rows; the
alternative and the rejected third option are recorded on #519.

Measured in Chrome, both themes, at 1280 and 390: the ring is whole on all four sides of the focused
row, where before it was two bars.

Held by `stories/panel-ring-room.test.js`, which asks every panel the dropdown wiring opens for one
of the two ways out, reading the ring's spread from `--ring-gap-width` and `--ring-width` at run
time. It discovers its subjects twice and requires the two readings to agree. It reads the kit's own
sources, `src/` and `react/src/`, for every place that writes `data-dropdown-panel` into markup,
naming each panel by the first class on the marked element itself — whichever order that element
writes the two attributes in, and stopping rather than borrowing a class off a neighbouring element;
and it reads back the panels its own fixtures render through the factories. Every panel in the first
reading has to be in the second. So a factory that marks a fourth panel stops the gate until
somebody renders it here and it is measured with the rest — the case a list of hand-picked examples
cannot see, and the one the gate proves by building that factory in a string, in either attribute
order, and failing on each. What it cannot see is pixels: it reads the sheet, and the ring itself was
measured in a browser. It also asks the panel and not its ancestors, none of which clips here. The
limits are written beside it.

## A folded rail takes the pointer only where it draws

A folded sidebar rail is `--ui-nav-strip` wide — one glyph column — and every box inside it is laid
out in that strip: the sections, the lists, the rows and the rule the footer draws above itself. The
one exception is a section heading, which keeps `--ui-nav-col` so that its line breaks are the ones
the open rail gives it and the fold changes no height. A heading is `pointer-events: none` at either
width and `opacity: 0` at this one, so the column it keeps draws nothing and takes no pointer.

**What a consumer can rely on.** A folded rail takes the pointer only where it draws. Compose one
beside a page and give it any `position` — `static`, `relative`, `sticky` or `absolute` — and every
click and tap on the page beside it still lands on the page, at rest and in every frame of the fold.

The fold is part of that promise because the rail's width is what travels, and a box inside it that
travelled on a different clock was a hit area the rail no longer drew. Every box in the rail takes
the rail's own clock — `--dur-med`, no delay, `--ease` — so the rail's box is the row's box in every
frame, on the way in and on the way out. The words are what the old arrangement was protecting: a
row used to wait out their fade before closing, which held the open column's hit area inside a rail
already half shut. They hold their own width instead (`min-width: max-content`), so the closing row
cannot squeeze them and they fade where they were laid out. That puts a label past the strip while
it fades, and a label takes no pointer at either width — nor does a section heading, a count or a
group's caret. None of them is a control; the row or the rail behind them answers the pointer.

Both halves of that were learned in opposite directions. Until
[#575](https://github.com/apliteni/apliteni-ui/issues/575) the rail laid every row out from the open
column and clipped itself to the strip with `overflow-x: clip`. The kit draws the focus ring
`--ring-gap-width` + `--ring-width` outside the row, so that clip took both ends of it and a keyboard
reader met two accent bars above and below the glyph — the shape
[#519](https://github.com/apliteni/apliteni-ui/issues/519) had just left on the account menu.
Closing the rows and dropping the clip drew the ring whole, and left the blocks around them 216px
wide inside a 41px rail, painting nothing and hit-testable again. Beside a `position: sticky` rail a
band probe at 4px spacing found 5,848 of 7,840 points on the page where the rail took the
pointer, and 0 of 5 targets beside it reachable. The page shell escaped it only because `.ui-app__rail`
carries `overflow: hidden auto`; the standalone component no longer contained itself. Closing the
blocks as well is what makes the rail's hit area the rail, and it needs no clip, so the ring stays
whole.

**What a folded rail does not promise: its scrollable width.** The heading's 216px box is laid out,
and a laid-out box counts towards the page's scrollable width however invisible and inert it is — the
same arithmetic as the filter row below. A folded rail flush to a page's right edge adds up to 175px
to that width — `--ui-nav-col` less `--ui-nav-strip` — measured at 1280 and 390 in both themes. A
page that keeps its own padding beside the rail absorbs part of it: the React showcase, which pads by
16px, measures 159px of the same box.

That 175px is new in this release, and it is the price of the whole ring. Before it the rail carried
`overflow-x: clip`, which contained the heading along with everything else, so the same composition
measured 0px — and that clip was the one cutting the rows' focus ring, which is #575. The heading is
the one box the fold does not close, because its line breaks are the rail's height and closing it
would make the fold change that height whenever a heading wraps. Three ways of closing the residual
without closing the heading were measured and none of them works: clipping the section puts the clip
back beside the ring, and a negative `margin-inline-end` or a `clip-path` on the heading leaves the
page's scrollable width at 175px either way, because a laid-out box contributes its border box
whatever is done to its margins or its painting. So the residual stands and is named here. A
left-hand rail has at least `--ui-nav-col` of page beside it, so the heading's box lands inside the
viewport and the page does not scroll; a right-hand folded rail is the one composition that pays.

Held by `stories/rail-strip-hits.test.js` for the hit area — its boxes at rest and the clock they
travel on — and `stories/rail-ring-room.test.js` for the ring. The two are a pair, because the clip
that contained the rail was the clip that cut the ring, and a gate that reads one of them cannot see
the other go wrong. Measured in Chrome at 1280 and 390 in both themes, vanilla and React: 0 probe
points on the page beside a positioned folded rail, 5 of 5 targets reachable, and the ring whole on
all four sides of all 13 rows. The fold itself was walked frame by frame in both directions, with
and without `prefers-reduced-motion: reduce`: 0 of 1,920 probe points taken in every frame of all
four walks, and the rail's height unchanged throughout.

## A filter row holds its panels

A filter chip's dropdown panel is as wide as the chip's trigger. It is the one place in the kit
where `min-width: 240px` on `.ui-dropdown__panel` does not apply, and the reason is arithmetic
rather than taste: a panel is absolutely positioned at its trigger's inline start, so its right
edge is wherever the chip happens to sit plus 240px, and on a phone the second chip already sits
far enough along the row for that sum to pass the screen.

It passes the screen whether the panel is open or shut. A shut panel is `visibility: hidden`, which
hides it and still lays it out, and a laid-out box counts towards the page's scrollable width. So a
filter bar nobody had touched scrolled the page sideways. Measured on the React `FilterBar` story:
a page 398px wide on a 390px view — the 8px of
[#467](https://github.com/apliteni/apliteni-ui/issues/467) — and 23px over at 375px. The chips
themselves were never the problem; `.ui-filter-bar` wraps, and at both widths they fitted.

**What a consumer can rely on.** At any viewport, a filter bar's *panels* add nothing to the page's
scrollable width, and each panel opens inside the row that holds it. The bound is `min-width: 100%;
max-width: 100%` against the panel's own containing block, so it needs no measuring, no resize
listener and no JavaScript, and vanilla and React get it from the same rule. What a consumer gives
up is panel width: a filter whose options are longer than its chip wraps them over more rows
instead of widening. That suits the values a filter shows — a filter's options are the short words
its chip already carries — and a list that needs more room than that is a dropdown rather than a
filter.

A bounded box is not the whole guarantee, because a panel is `overflow: visible`. A value with no
break opportunity in it — `utm_campaign_blackfriday_2026_eu_retargeting`, a URL, an API key — would
run out of a narrow panel and off the page while the box itself stayed put, shut as well as open,
which is #467's mechanism arriving by another route. The same rule therefore carries
`overflow-wrap: anywhere`, which inherits to an option's label and its description alike. Such a
value breaks mid-token rather than overflowing, which costs row height instead of page width: the
gate's 44-character campaign key takes five line boxes and a 119.3px row, and 180.6px where its
description is as unbreakable. Every other option row stays 38.3px, and the panel stays the chip's
width — 113.3px — at every viewport. Without the hint the same page is 473px wide on a 390px view
and on a 375px one, 83px and 98px over.

On a phone that is the right trade: nothing is hidden and nothing is clipped. On a wide screen the
same column fragments with the screen empty beside it, because the rule binds the panel to the
chip's width and not to the room the viewport left. Reading the available room is the measurement
[#502](https://github.com/apliteni/apliteni-ui/pull/502) introduces on the height axis, and this
bound is one declaration that it can later replace. Recorded here as a known limit rather than
widened here.

The guarantee holds against stylesheets, the kit's own and a consumer's: the bound carries more
classes than any floor that could outrank it. It does not survive an inline `min-width` on the
panel, which beats a stylesheet `max-width` whatever its specificity, so a consumer style or script
that writes one re-opens [#467](https://github.com/apliteni/apliteni-ui/issues/467). The one writer
inside the kit, `ddResetSearch()`, sets it to the panel's already-bounded `offsetWidth`, so a search
dropdown composed inside a filter bar stays inside the row.

The chip's own width is a separate question this rule does not reach. `.ui-dropdown__trigger` is an
`inline-flex` without `min-width: 0`, and `.ui-dropdown__value` carries no wrap hint, so a chip
cannot shrink below its selected value's min-content width: a filter showing
`utm_campaign_blackfriday_2026_eu_retargeting` makes a 437px page with nothing open at all — 47px
over at 390, 62px at 375, 117px at 320. That is true with this rule, without it, and on `main`;
the bound is on the panel. A filter whose applied value can be that long wants a shorter display
value, or a change to the trigger, which is a change to every chip in the kit.

**The clear action is offered only when there is something to clear.** `filterBar` and React
`FilterBar` write it with the first chip and drop it with the last. It used to stand in an empty
bar, disabled, as the only thing in the row, which reads as a bar that has been switched off
rather than one with no filters on it — the kit's own `one-page` rule, which says a control with
no action to offer is not shown. The layout-stability argument behind `ends-disable` does not
reach it: applying a filter adds a chip to the same row, so the row reflows either way. A consumer
reading `[data-filter-clear]` finds nothing while no filter is set. A disabled or busy bar that
*has* chips keeps the control, turned off by the fieldset, so nothing leaves the row while a
refresh is in flight.

**It wears the kit's bordered skin without the fill, in every state.** The ghost skin it used to
take draws no box at all, and the action was asked to read louder than that; the bordered skin's
edge is that, and its `--surface` fill is not, because text on a grey block is what
`guidelines/colour-and-theming.md` keeps off a reading surface — in dark it resolved to
`rgb(33, 30, 45)` on a `rgb(14, 13, 20)` page.

The first attempt turned only the resting fill off, at element specificity, and left every state
the kit paints over it alone — on the argument that `:disabled` and `[aria-busy]` outranking that
one declaration kept them the kit's own. It did, including their fill, which is the thing being
turned off: a disabled bar, and a busy one, put the label straight back on the block. So
`filter-bar.css` now answers each state that paints a NEUTRAL fill on this control — `:disabled`,
`[aria-disabled]`, `[aria-busy]` with its hover and active pair, and busy-and-disabled together —
each at a specificity that beats the kit rule writing it and no more. Hover stays out of it,
because its fill is an accent wash rather than a grey block, and so stays the kit's own and cannot
drift from it.

With no fill the label is read on whatever is behind the bar, so a disabled clear action takes
`--disabled-ink-bare`, the ink `src/styles/button-disabled.test.js` measures against every ground
the kit paints, for the reason a disabled ghost button takes it. Its edge is untouched: the kit's
`--disabled-border` is what still says "off" here. Held by `src/styles/filter-bar.test.js`, which
reads the fills out of `button.css` rather than from a list, so a fill the kit adds later fails
until this sheet answers it; the paint itself is measured in a browser and reported in the pull
request.

**An emptied bar hands the focus on rather than keeping it.** Clear the last filter, or remove the
last chip, from the keyboard and the control that had the focus is gone. The bar is not a
substitute for it: once the chips go, its fieldset has only an out-of-flow legend left, so it
measures 0 high and a ring on it is a floating dot or a line above the next control. Both faces
therefore move the focus to the control a reader's next <kbd>Tab</kbd> would reach — forward in
document order, else the nearest one behind. On the Stock screener that is the caller's own
`Add filter` beside the bar; in the React Finance composition, which has no such action, it is the
view strip's chosen tab under it.

**A control a reader cannot reach is not a place to put the focus.** `focus()` is a request, and a
refused one is silent: the focus lands on the body, with no ring on anything and the next
<kbd>Tab</kbd> starting over at the top of the page. A control that is `hidden`, `inert`,
`visibility: hidden`, `display: none`, disabled, inside a disabled fieldset or out of the tab order
refuses it, and the first four of those keep a box, so no test made of rectangles catches them.
Every candidate is therefore filtered against the document and the cascade, and then — because
being reachable is not the same as taking the focus — asked and checked, with the next one tried
if it did not arrive. With nothing reachable beside it the focus goes nowhere rather than onto the
empty box, which is the one case where the body keeps it.

While the bar still holds chips it does keep the ring, even with every control in them turned off,
because it still draws a box around them; it is made focusable for that moment. `nextFocusStop` is
exported, so a consumer that wants to place the focus itself reads the same answer, and
`focusNextStop` places it the same way and answers with the element it ended on, or `null` if
nothing took it. Held by `src/components/finance.test.js`, `react/src/FilterBar.test.tsx` and
`react/src/Finance.test.tsx`, which name the control that ends up focused in each of those cases;
they read the document and not the layout, JSDOM having none, so the 0-high fieldset itself is
measured in a browser and reported in the pull request.
Decided on [#527](https://github.com/apliteni/apliteni-ui/issues/527).

Held by `stories/filter-bar-fit.test.js`, which reads every width floor the kit writes for a panel
— resolving one spelled as a token — and requires each to be answered inside the bar, and measured
in a browser by `scripts/evidence/filter-bar-fit.mjs` at 320px, 375px and 390px in both themes.
That gate sweeps both Storybook indexes for every story rendering a filter bar, measures each panel
against the `.ui-dropdown` that contains it, asks every option row whether its own text fits it,
and puts the floor back to require a panel in every case that carries one to widen. Its fixture
page carries an unbreakable value so the wrap hint is measured rather than assumed.

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

**It draws header and group lines.** The header separates the scrolling body, and a line
between groups separates content. The footer shares the panel surface without a fill or
rule; actions stay outside the scrolling body. Decided in [#448](https://github.com/apliteni/apliteni-ui/issues/448).

**It moves on open and on close.** The panel slides in from the edge it is anchored to while the
scrim fades, both on `--dur-med` and `--ease`. It leaves the same way. Under reduced motion both
are instant; see [Reduced motion travels with the stylesheet](#reduced-motion-travels-with-the-stylesheet).

Held by `stories/drawer-rules.test.js`. It renders every story in both themes into a jsdom carrying
the kit's stylesheets and measures every drawer panel that comes out, cascade resolved. Anywhere
inside the panel a card fails — `.ui-card`, or any box with all four edges drawn that is not a form
control or a button and does not sit inside one — and so does an `<hr>`, and any element with a
border on its top or bottom edge that does not also draw both sides. The group separator is the one
exception: a `.ui-drawer__section` that follows another and draws a line on its top edge alone. The
gate checks both missing and extra lines: a header or following group with no line,
a footer rule, and an edge the body draws for itself each fail. Logical
borders are read as the physical ones they are in horizontal, left-to-right writing. A specimen
inside `[data-specimen="dont"]` is a picture of the fault rather than a subject; the gate uses those,
and one fault of each kind it writes itself — lines added and lines taken away — to prove it can see
every fault at all.

Decided in [#272](https://github.com/apliteni/apliteni-ui/issues/272) and
[#271](https://github.com/apliteni/apliteni-ui/issues/271).

React `KeyValueList` owns its grid and resets its outer margin. Its root now uses
`.ui-kv` instead of `.ui-drawer__rows`; update custom selectors targeting the old
class on React lists. Vanilla drawer lists retain `.ui-drawer__rows`. Only a list inside
`.ui-drawer` adds `--space-3` before its following sibling; elsewhere the container
owns that gap, including the Modal's `--space-4`. The vanilla drawer retains the
same spacing. Held by `react/src/KeyValueList.test.tsx` and browser measurements of
its InDrawer and InModal stories. Decided in [#449](https://github.com/apliteni/apliteni-ui/issues/449).

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

React StatBand deltas accept `tooltip` text, rendered by the kit Tooltip on the change value.

`statBand()` renders a row of key figures. Each figure is a label and a value, and may carry one
row of words under that value — a change, a caption, or a caption leading a change — and a
trend. A figure is only ever rendered inside its band, because its label and values
are only valid inside the band's list. The band is a description list: a figure's label is the term and everything
after it is a value of that term, so a screen reader reads each figure as one statement.

A figure's value is never broken across lines and never truncated — the words under it give way
instead, as the row below records. A band too narrow for its figures moves
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
the colour withheld. A figure with nothing to compare draws no row at all: it shows its value,
and the caption the caller gave it if there is one, and stops. It is never shown as `+0%`, it
takes no tone, and the band does not say in words that it has nothing to say — beside figures that
do carry a change, that sentence is noise. The band said `No earlier figure` there until Artur
struck it on 2026-10-02 with one word, "Noise?"; `delta.none`, which worded it, went with it. He
wrote it against `of income   No earlier figure`, so it reached the caption in that row too, and
the rule a caption now has to meet is below.

A change says what it is measured against, in text a reader can reach: once for the whole band, in
the band's caption, which every change points at, or beside the change when one figure is measured against
something else. A hover `title` does not count, because a phone never shows one. On a band with
no changes, the caption says what the figures cover instead, such as the period.

React `StatBand` can reference a caption shared with another view through `basisId`.
The caller places that caption before the figures. Passing `basis` instead renders
the band's own caption and takes precedence over `basisId`. The period showcase
uses this to share one comparison with its ledger; React tests check the references.

The caption comes **before** the figures, in every layout, the way a table's `<caption>` does. It is
one statement about all of them, so it is read before the numbers it explains, it sits outside
every figure, and it takes the `caption` rank — it governs the whole row, so it is never set
smaller than a caption inside one figure. Under a row of tiles it would read as a note on the last
card, and inside the first tile it would read as that figure's own comparison — which is a
different thing the band already says beside the change.

**A figure says at most one thing under its value, and it says it in one row.** A change is that
row. **A figure's own caption** — words about one value, such as what it is a share of — is that
row when there is no change, and leads it when there is. The row then reads in that order: what
the value is, how it moved, and what it moved against. A second row would drop every change that
sat under a caption a line below the rest of the band, which is the layout the band exists to
keep, and four lines of text around one number read as a paragraph with a figure in it rather
than a figure.

**A caption earns that row only by giving a unit, a period or a limit the figure cannot.** That is
the test `guidelines/text-length.md` already sets for a caption, and a figure's caption is held to
it: a rate could be a share of income or of orders, so it says which, and a figure whose label
already names its denominator takes no caption — `Gross margin 36.1%` is complete, and `of income`
under it only repeats the word `margin`. Artur wrote **"Noise?"** against one row on 2026-10-02;
read against `useful-captions`, every caption the showcase drew then failed the same test, and
this is the rule that replaced them: the kit still offers the row, and a caption that tells a
reader nothing the figure and its label already tell them does not belong in it. The row is a slot
the caller may leave empty, and most figures should.

**A caption never costs a reader the comparison.** A change's own `basis` is printed whether or
not the figure has a caption, because a `basis` is passed exactly when a figure is measured
against something the band's caption does not cover — so the band's caption cannot stand in for
it, and the kit never drops it. A change with no `basis` of its own still points at the band's
caption, with or without a caption beside it.

**A row holding a change is one line.** A caption is a short phrase and not a sentence, because it
shares that line with the change. Wrapping is what such a row may not do: it would put the
change's arrow at the end of one line and its number at the start of the next, and it would drop
that change below the changes beside it — the defect a second row caused, reached by length
instead of by presence. The arrow and the number cannot give way, so a caption or a basis too long
for the figure's width is clipped with an ellipsis there, and the whole string stays in the
markup, where a screen reader and a copy still reach it.

**A caption standing alone keeps every word.** With no change beside it, it has no arrow and no
number to keep together, so it takes a second line rather than lose words. Clipping it would buy
no alignment — its figure still starts its row at the same height as the rest of the band — and
cost a reader the words. The clip belongs to the row that cannot afford a second line, and to no
other.

Where a tile is too narrow to show a comparison whole, React's `delta.tooltip` carries it: the
kit Tooltip opens on hover, on keyboard focus and on touch, which is what the Hover readouts
guideline (`guidelines/hover-readouts.md`) asks for beside a truncated cell. A `title` attribute
is not that, and is never the answer here.

A caption is not a change, so it draws no arrow and takes no tone — nothing went up or down, so
there is no news to colour — and it is not a trend, so it stays out of the slot a sparkline
takes. It takes the `caption` rank's size and weight ([Labels and titles](#labels-and-titles)) in
body ink on no fill, and keeps the figure's tighter leading the way the label does. Alone it is
the row, so it takes the step down a change takes and renders in the same line box: that is what
holds a band of unlike figures on one line.

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

Column labels accept React content, including a kit Tooltip for a header explanation.

Scrollable React DataTables show Previous columns and More columns controls when their columns overflow, disabling each control at its corresponding edge. Tables inside cards use the card reading surface for their body, sticky header and pinned cells.

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

The React palette, Modal and Drawer also share one dialog stack: Escape closes only the top
one and leaves the palette beneath it open. The React and vanilla stacks are separate, so
mixing their overlays on one page is not supported. `Modal` names itself with an `h2`, as the
vanilla drawer and confirm do, so heading navigation reaches the title the dialog is labelled
by; its head keeps a gap, so a long title does not meet the close button.

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
**A link inside a cell takes the row's ink, underlines on hover, and wears the shared `--ring` on
`:focus-visible`.** That is what `.ui-identity` has always done: a link in a ledger is a value
that happens to open something, and colouring every one of them spends the accent on the column
that needs it least. A plain link — one carrying no class — is also an inline-block box at the
kit's `--radius-xs` corner, so a title-cell link long enough to wrap draws one ring around the
whole link rather than one per line; the box is as wide as its longest line, which can overhang
shorter ones. An anchor the kit already styles keeps the box, the corner and the paint its own
component sets: `.ui-btn` and `.ui-identity`, and a `.ui-dropdown__item`, `.ui-nav__item` or crumb
composed into a cell. In a revoked row (`tr.is-dead`) the struck name reaches a link in it, at rest and on hover,
where the link carries both lines.
Decided on [#451](https://github.com/apliteni/apliteni-ui/issues/451) and
[#510](https://github.com/apliteni/apliteni-ui/issues/510).
`dense` retains the existing spacing. `compact` uses a 33px minimum row and small text,
with extra-small unit suffixes in body ink. Larger text or wrapped content grows the row.
Dense, compact and zebra recipes give headers and values matching horizontal insets in
every column. Numeric headers and values stay right-aligned. Held by
`src/styles/table.test.js`; decided in [#452](https://github.com/apliteni/apliteni-ui/issues/452).

`numericValue` preserves the caller's formatted value and distinguishes missing from zero.
`deltaValue` prints the caller's sign, accepts an explicit success/danger/neutral judgement,
and leaves zero and missing comparisons neutral, including signed zero with a unit suffix
such as `+0 EUR` or `−0.00 %`. Colour never supplies the sign. The caller
names the comparison through `basisId`. `rowIdentity` combines decorative logo, symbol and
name; missing or failed images retain a letter fallback after initialization.

A named scroll region holds the native table. Sticky headers and pinned identity cells have
opaque table backgrounds and the shared G2 focus composition. Narrow pinned identities show
the symbol, retain the full accessible name, and use a company link for disclosure. The
consumer supplies a real destination for that link. Columns scroll rather than disappear.

Below the one-column step a table marked `.ui-table--stack` lays each row out as a block
instead of scrolling: the identity and the short cells on the first line, the cell marked
`.ui-table__long` on a line under them, and the header row clipped rather than removed, so a
cell still reads with its column's name. The marked column holds running text at any width;
the line of its own is what the modifier adds. Pinning, sticky headers and the end-cell inset
all come off — there is no column left to pin — and a pinned identity shows its full name
there rather than the symbol the 720px fold leaves it. The card bleed stays, re-pointed: it
pays for the row's own inset instead of the end cells', so a stacked row's hover outline keeps
its clearance off the text while the text still lands on the card's text edge. A scroll
wrapper owns that bleed when it is the card's child, and owes one step more than the table,
because the wrapper keeps its own focus clearance.

The row pays `var(--space-3)` on all four sides: sideways it is the step a dense cell already
paid, so the hover outline and the row separator keep the clearance they had at the width
above, and down the page it is what puts two rows 25px apart — two paddings and the hairline
— against the `var(--space-1)` between a row's own lines. The values sit `var(--space-3)`
apart along a line and the paragraph `var(--space-1)` below the last of them, so a row reads
as one block and not as two; two lines of values are two flex lines, so the step from one to
the next is that same `var(--space-1)`. Those readings are taken in Chromium at 320 and 390
by `scripts/evidence/table-stack.mjs`, which reads each line's box rather than counting the
lines, takes the step between two rows off the boxes as well as off the padding, measures the
compact composition beside the one the stories ship in, shoots the before and after frames,
and checks that the 1280px frame is the same pixel for pixel with the modifier and without it.

A stacked cell is as tall as its own text, whatever density the table carries.
`.ui-table--compact` sets a row height for a cell holding one line, and a cell laid out as a
block reads that as a cap rather than as a floor, so the paragraph the modifier exists for runs
out of the bottom of the cell, through the row's separator and onto the next entry — 71.56px of
text in a 33px cell, which is where
[#532](https://github.com/apliteni/apliteni-ui/pull/532)'s re-review found it. The stacked
cell rule takes that height off along with the padding and the `nowrap`; above the step a
compact table keeps the row height it has always had.

With the header clipped, a short cell is read on a line of facts with nothing above it, so a
value whose meaning came from its column heading has to carry that meaning itself: the unit in
the cell, as `.ui-value__unit` draws it, and an abbreviation expanded once in the caption above
the table. The kit cannot write that — the value and its unit are the consumer's — so it is a
rule in the dense tables guideline, and the pinned story is what it looks like.

A clipped header is read and not operated, so a stacked table's header cells hold text. A
control left in one is a focus stop with no ring drawn anywhere, because there is nothing on
screen to draw it on; a sort or filter control belongs on the row above the table instead,
where it can draw one, and names the table in `aria-controls`. `aria-sort` still announces the
column the rows are ordered by, and that naming is what keeps the announcement honest: it is
the difference between a reader being told the order and a reader being able to set it.

A stacked table carries `role="table"`, `rowgroup`, `row`, `columnheader` and `cell` in its
own markup, at every width, because a stylesheet cannot write a role and 560px is not a
moment markup can react to. How much of that is load-bearing depends on the engine, and less
is lost than changing `display` is usually said to cost: measured in Chromium at 390px with
these rules applied, stripping every role still leaves `table`, `row`, `cell` and
`columnheader` in the accessibility tree, and the one role lost is the `tbody`'s `rowgroup`.
WebKit and Gecko are not measured here, so the kit asks for all five rather than for the one
Chromium is known to drop: the attributes are cheap and a missing role fails silently.

React is not served yet. `DataTable` builds its own table class list and takes no
`className`, and it is the only table React ships, so a React consumer reaches the modifier
only by leaving the component and hand-writing the table and its roles. `DataTable` also
renders its sort control inside the header cell, which a stacked table clips, so opting it in
means moving that control above the table first.

Held by `src/styles/table-stack.test.js` and `stories/table-stack.test.js`; decided in
[#499](https://github.com/apliteni/apliteni-ui/issues/499).

`FilterBar` is controlled by its consumer: selections, removal and clear-all request changes,
and never mutate the supplied filters. A chip shows the chosen value alone, and the field's
name only while no value is chosen; `filterChipText`, `filterChipName` and `filterChipUnset`
hold that choice for both faces. A chip with nothing chosen prints its field name in
placeholder ink and is named `field: any`. Beside a chosen value the field is deliberately not
drawn: it reaches a reader through the trigger's accessible name and the chip's visually hidden
legend, which carry it in every state, and nowhere on screen. A filter's `value` is display
text, because it is the chip's only visible line: a consumer answers a change with text a
reader can read, not with a row's code. Decided in
[#535](https://github.com/apliteni/apliteni-ui/issues/535). Updating the mounted host preserves the focused chip
control; after removal focus moves to the next chip, then the previous, then the bar when no
filter remains. Busy and disabled bars stop their native controls. Dropdown owns opening,
keyboard selection, Escape and focus return. A chip's panel stays inside the row that holds it at
every viewport, which is what bounds its width — see A filter row holds its panels. Segmented
controls support an underline appearance for switching columns over one dataset; arrow keys, Home
and End skip disabled choices.

## Vanilla HTML boundaries

**Removal-bound under #429.** These factory contracts apply until the factories are removed.

Factories return HTML strings. Text and attribute values are escaped where written;
quotes and angle brackets in a name, identifier, class modifier or label cannot add
an attribute or element. Enum options still select the same variants and retain
existing fallbacks. Escaping an attribute is not CSS validation: caller-supplied CSS
lengths and class names remain the caller's presentation choices.

URL slots reject `javascript:`, `data:` and `vbscript:` case-insensitively, including
leading ASCII controls and embedded tabs or newlines. Relative paths, fragments,
HTTP(S), mail, telephone and other non-script schemes keep their original values.
All `data:` image URLs, including raster images, are rejected by this rule.
Rejected navigation URLs render as `#`; rejected image sources render as an empty
`src`, retaining the identity's letter fallback. `backLink` keeps its existing
refusal shape (no markup) for rejected URLs. This rule applies only to URL slots,
not ordinary text or identifiers. Trusted HTML is not sanitized; its author must
supply safe markup, including any URLs inside it.

The public string-slot inventory is below. **Text** includes identifiers, attribute
values and CSS lengths. **Enum** includes keys used only to select markup, icons or
classes; numeric and boolean controls are not string slots. Nested options inherit
the contract of the factory they invoke (for example, success actions use `button`).

| Factory | Text | URL | Enum | Trusted HTML (unchanged) |
| --- | --- | --- | --- | --- |
| `button` | label | href | variant, size, type, icon, iconRight | iconSvg |
| `badge`, `pill` | label | — | variant | — |
| `statusDot` | — | — | — | — |
| `card` | — | — | variant, pad, icon, level | title, sub, body |
| `segmented` | name, ariaLabel, options strings / label / value | — | size, appearance | — |
| `accentPicker` | — | — | active, options | — |
| `field` | label, hint, error, id | — | — | control |
| `input` | placeholder, value, name, id, ariaLabel | — | type, icon | — |
| `textarea` | placeholder, value, name, id, ariaLabel, rows | — | — | — |
| `select` | name, id, ariaLabel, value, options strings / label / value | — | — | — |
| `checkbox` | name | — | type | label |
| `switchToggle` | name, label | — | — | — |
| `callout` | — | — | variant, icon | body, actions |
| `toast` | title, body, action string / label | — | variant, style, icon | — |
| `successPanel` | title, sub | — | — | — |
| `emptyState` | title, sub | — | icon, named art | SVG art, actions |
| `snippet`, `hlShell`, `shellTokens` | label, copyLabel; hlShell / shellTokens raw | — | — | snippet code (use hlShell for raw source) |
| `tabs` | name, ariaLabel, className | — | — | items.label, items.panel |
| `dropdown` | label, value, placeholder, ariaLabel, id, triggerClass, panelClass, scroll; item label / value / description / target / badge text; section label; search placeholder / label / empty / hint / query | item href | variant, align, direction, item icon / badge tone | triggerContent, header, footer, foot |
| `sidebarNav` | id, ariaLabel, active; item id / label / target / badge text; section label | item href | activeIs, item icon / badge tone | footer |
| `navTabs` | id, ariaLabel, active; item id / label / target / badge text | item href | variant, item badge tone | — |
| `breadcrumbs` | id, ariaLabel; item label / target | item href | item icon | — |
| `nav` | inherits selected navigation factory | inherits | variant | inherits |
| `backLink` | label | href | — | — |
| `drawer` | title, id, ariaLabel, closeLabel | — | side, size | body, footer |
| `drawerSection` | title, row label / scalar value | — | — | body, row value.html |
| `confirm` | title, body, id, confirmLabel, cancelLabel | — | variant | — |
| `tooltip` | id, label, value, detail | — | placement | — |
| `commandPalette`, `commandPaletteList` | label, placeholder, query, empty, id; list uid; group label; item id / label / description / keywords / shortcut / badge / confirm | item href (data-href navigation) | density, item icon | — |
| `footer` | tagline, legal; column title; link label / target; social label | column / social / legal href; brand href | variant, social icon | switcher; nested brand word |
| `themeToggle`, `themeIcon`, `themeName`, `deckTextSwitch` | — | — | theme, active | — |
| `versionSwitcher` | — | — | badge live/archive mapping | version label, meta, custom badge |
| `accountMenu` | object nav fields are escaped by its adapter | tuple href (already encoded), object href | active, nav icon | name, email, initials, tuple label; tuple id/target are already encoded attribute text |
| `topbar` | inherits nested factories | inherits | view | word, nested account/version slots |
| `appShell` | word, navLabel, active, account name/email, search palette/placeholder, maxWidth; nested nav/crumb/back/topbar text inputs | brandHref, signOutHref, nested navigation | layout, width | title, sub, body; topbar version label/meta/custom badge |
| `skeleton`, `skeletonTable` | lines array entries, width (scalar/array), height, radius, className | — | — | — |
| `busyRegion` | label, readyLabel, className, lines array entries | — | — | body |
| `deniedState` | title, sub, need, className | action href | icon, action enums | — |
| `success`, `successCheck` | title, body, className, countdown label/seconds; action label | action href | layout, check, level, action enums | — |
| `feedbackWidget` | label, placeholder, doneTitle, doneBody | — | — | — |
| `pagination` | label, id | href(page) result | variant | — |
| `statBand` | basis, label, id; stat label/value; delta value/basis/none | — | variant, delta tone/direction | stat trend |
| `numericValue`, `deltaValue` | value, unit, missing, basisId | — | tone | — |
| `rowIdentity` | symbol, name | logo, href | — | — |
| `filterBar` | label, clearLabel; filter id/label/value; nested dropdown fields | nested dropdown href | nested dropdown enums | — |
| `icon`, `illo` | icon class | — | name | — |
| `brand`, `prism`, `seedling` | p, size | brand href | — | brand word |

The legacy topbar and brand text slots still accept pre-escaped HTML. Their shared
attribute copies preserve existing entities while encoding literal quotes and angle
brackets; account-menu tuple URLs are scheme-checked after decoding character
references. Pass raw text to `appShell`: its compatibility adapter already prepares
the legacy topbar's HTML. Do not escape ordinary text or
URL slots before passing them to a factory.

Held by `src/components/attribute-boundaries.test.js`, which parses the emitted HTML
and checks quote/angle-bracket probes across the factories, URL schemes, attribute
round-trips and retained trusted markup. It does not promise that arbitrary trusted
HTML or caller-supplied CSS is safe.

## React tabs

Tabs is controlled through `value` and `onChange`. Pass items with unique values, labels, optional counts, and React panel content. Provide a label for the tablist and a value that matches one item. Inactive panel content is unmounted.

Arrow keys move between tabs and wrap from the last tab to the first. They also activate the selected tab. Home and End select the first and last tabs. Tab moves to the selected panel. New panels use the kit’s fade animation, which is shortened when reduced motion is enabled.

## React confirmation

`Confirm` builds on `Modal` and uses the kit's ghost, primary, danger, and busy buttons.
The consumer provides both action labels and controls the open and busy states. The safe
action appears before the committing action. Danger buttons keep the shared quiet
resting state and use the shared danger hover and focus styles.

`Confirm` renders an `alertdialog`, named by its title and described by its body.
When it opens, focus goes to the safe action. Modal
keeps focus inside the dialog, returns focus when the dialog closes, and controls enter
and exit motion, including reduced motion. Escape, the scrim, and both safe controls
call `onCancel`, including while busy. Closing the dialog does not cancel a pending
write.

`onConfirm` only reports that the user pressed the button. The consumer handles saving,
errors, and closing. A busy action keeps focus, prevents repeated activation, and
announces progress. Use a toast with Undo when the action can be undone.

The behavior is covered by `react/src/Confirm.test.tsx`, the existing Modal and Button
tests, and the React story accessibility gate. DOM tests do not measure visual
transitions. Modal's timing tests and browser evidence cover those separately.

## React timeline

`Timeline` renders an ordered list in the caller's event order, oldest first.
Each event shows an actor, a `time` element, a change description and optional
metadata. Event text uses body ink; the rail and markers are decorative.
Timeline leaves its reading surface to the caller; compose it on a page or card
surface, never a grey fill. The standalone stories use the shared Card.

Optional `kind` is `person`, `rule`, or `reversal`, using the existing `user`,
`bolt`, or `refresh` glyph in a 20px (`--space-5`) ring. Only the last event’s
kind marker is filled: `--accent-strong` with `--accent-contrast`, or `--pink`
with `--danger-contrast` for a reversal. Other rings use `--muted` on `--surface`;
older reversal glyphs retain `--pink` and other glyphs use `--muted`. Missing kinds keep the existing dot; dot-only
histories keep the original indent and colour. Mixed histories align dots and
rings on the same rail and mute older dots; only the newest marker has an accent
or danger fill.

Initial history is still, including the first non-empty history after loading or
clearing the list. New IDs added to a non-empty history call `playEntrance()` on
the row and marker: `m-slide-up`, `--dur-slow` (400ms), `--ease-out`, `--space-2` travel;
then `m-scale-in`, `--dur-med` (250ms), `--ease-out`, `--delay-1` (60ms).
Editing or reordering existing IDs does not replay them. Reduced motion skips
the entrance. Optional `relativeTimestamp` renders beside the absolute timestamp
only on the newest row, with `--accent` ink at `--text-xs`. The caller supplies
and updates both formatted timestamps; the component does not run a clock.
Decided in [#425](https://github.com/apliteni/apliteni-ui/issues/425).

Undo is an optional named button for a reversible batch. The app owns permission,
batch reversal and the new reversing event. A reversible action runs without a
confirmation dialog, as shown in the privileged story.
The component calls the supplied handler without changing or sorting history.
Events do not collapse or paginate.

## React fields

`TextField`, `TextArea`, `SelectField` and `FileField` generate their control and
message IDs. Labels name the controls; an error marks the control invalid and is
described before the hint rather than in its place, so a hint carrying a consent,
safety or legal detail stays on screen while the reader decides whether to retry.
The vanilla `field()` factory still swaps the two; React is the side that keeps
both (#388). Required markers are decorative; native controls carry `required`.
Text, textarea and select reuse the vanilla field classes. Number inputs request a
decimal keyboard and may show a unit.

`TextField` also accepts password and search, forwards its ref to the native input,
and places a decorative kit glyph, named through `icon`, in the existing
input-group classes. The kit suppresses the browser's own clear button on a
search field, the way it already refuses the native select chrome.
Artwork can accompany a numeric unit without losing its description. `Field`
exposes the existing frame for one caller-rendered labelable control: its child
function receives a stable ID, `required`, `aria-invalid` and `aria-describedby`.
The caller spreads these attributes onto that control and supplies its control
class and invalid styling. An explicit frame ID must be unique. Errors remain
before hints, and resolving an error removes its invalid state and description.
Covered by `react/src/Field.test.tsx`; DOM tests do not check screen-reader speech
or native password-manager behavior. Part of #429.

`FileField` accepts one file by picker or drop. A new file replaces the previous
one, updates the native input and calls `onFileChange`. The native file input stays
focusable over the visible button. Disabled fields reject drops. The consumer
supplies file type and size guidance and validates files before upload; `accept`
only filters the system picker.

## React toasts

Toast tone uses the existing unfilled status glyph without a left-edge accent stripe.
All legacy styles share a neutral `--surface` card with `--border`, `--elev-drop`,
`--radius-sm` and `--space-3` padding. Glyphs use `--space-4` and the existing
`--toast-action-ink` tone mapping. Actions retain that tone ink. Body content and
compact markup remain supported; no SVG paths or interaction contracts change.
Vanilla and React share this styling.

`Toast` and `useToast()` render the vanilla toast classes in a fixed stack, newest
at the bottom, anchored to the bottom-right corner. The provider measures the stack
and publishes how far it reaches up the viewport as `--rx-toast-stack` on the
document root — `0px` while it is empty — so a fixed page action can sit clear of
any number of notices instead of an offset tuned to the height of one (#388).
Use one `Toast` provider per document, because `--rx-toast-stack` is a document-root global.
The property is removed when the provider unmounts. Notices without actions
dismiss after five seconds. Their countdown
and timer bar pause while hovered or focused, then resume with the remaining time.
Notices with an action stay until it is selected or the reader dismisses them.
Ordinary notices are polite; danger notices are assertive. Adding a notice does
not move focus. Dismissal uses the kit's leave animation, or removes the notice
immediately under reduced motion.

## React AppShell

`AppShell` reuses the topbar shell’s classes. The caller supplies the router pathname;
the longest matching section path wins, with matches ending at a path boundary.
Router links receive the same classes, accessible name, count and navigation handler
as native links. The rail shares the vanilla fold cookie and 720px fold breakpoint.
Below 560px, a bottom bar replaces it: up to four sections, or three plus More.
More opens the React Drawer and closes on navigation. Search uses the React
CommandPalette; page actions should include no more than one primary action.
The fold glyph copies the vanilla shell’s frame and moving seam.

`react/src/AppShell.test.tsx` checks route matching, persistence, search, account
actions and sheet dismissal. Story accessibility and contrast gates cover both
themes; browser evidence covers responsive layout, which JSDOM cannot measure.

## React empty states

`EmptyState` uses vanilla's markup and CSS. Its optional copy presets can be
overridden with `title`, `sub` and `icon`. `art` accepts a vanilla illustration
name, trusted SVG string, or a decorative React node; `actions` accepts React
buttons or links. The page supplies its own h1, including on a not-found page.

## React theme control

`ThemeToggle` preserves the existing topbar button styles and accessible naming.
React and vanilla theme glyphs use the control text color and clear 3:1 against
the button surface in both themes, checked by `react/src/ThemeToggle.contrast.test.tsx`
and `src/components/topbar.test.js`.
Its only prop is `labelled?: boolean` (default `false`); it has no controlled value
or callback props. Pressing it cycles dark, light, auto, then dark.

Explicit choices are stored under `apliteni-strategy-theme`. Existing dark and
light values keep their meaning without migration. Auto, missing and invalid
values follow the OS. Mounting does not rewrite storage. Auto remains stored as
`auto` when the OS changes.

On mount, React sets `data-theme-choice` on `html` to the choice and `data-theme`
to the resolved dark or light theme. An existing `data-theme-choice` takes
precedence; unknown attribute values become auto.
Auto resolves to light when `(prefers-color-scheme: light)` matches, otherwise dark.
Mounted controls follow live OS changes in auto mode and storage changes from other
tabs. Storage failures leave the control usable with a page-local choice.

A press dispatches a plain `apliteni-theme-choice` event on `window`, with no
payload. Read the root attributes for the choice and resolved theme. OS and storage
updates do not dispatch that event. There is no React callback.

`THEME_INIT_SCRIPT` is an exported string for a head script before styles load.
It reads the same stored values and sets only `data-theme`, without writing storage
or listening for OS changes. React handles later updates after mounting. Server
rendering starts with the Auto label and does not set root attributes.

The contract is checked by `react/src/ThemeToggle.test.tsx`; JSDOM checks state and
events, not first-paint timing or appearance.

## The modal

The React Modal caps its height at 96% of the dynamic viewport. The body scrolls while
its title, close control and footer remain visible. It has a borderless raised surface,
`--elev-drop`, `--radius-md`, a `--text-base` title and an 82% shadow-ink scrim without blur.
Its header keeps a divider; its footer shares the surface without a rule. The vanilla
entry point has no general Modal; its separate confirmation component is unchanged.
Decided in [#448](https://github.com/apliteni/apliteni-ui/issues/448).

`stories/overlay-css.test.js` checks the cap, scrolling body and fixed slots, including
mutations that remove each. Browser captures check their actual viewport geometry; the
source test does not render layout. Existing Modal tests cover focus, dismissal and motion.

## React tooltip

React Tooltip renders `ui-tip-host`, `ui-tip`, and `ui-tip__label`. The focusable trigger refers to the tooltip through its ID. Pressing Escape keeps focus on the trigger. The panel does not change the layout or intercept pointer events. Shared reduced-motion styles remove the fade.
## React segmented labels

Segmented options may supply `ariaLabel` to give a short visible label a fuller
accessible name. Without it, the visible label names the button.

## Segmented strips that outgrow their column

A pill strip lays its choices out in one row while they fit, and wraps onto further
rows when they do not. It never widens past its container: a twelve-month picker in
a phone column becomes three rows of pills rather than a track that pushes the page
sideways and drags every other block with it. Below 560px the standard-size pills also tighten
their side padding, which is what keeps six three-letter months on one row in a
390px column; the type rank is unchanged at every width.

The underline appearance wraps the same way, and is not a scroll box. It used to
keep one row and scroll, on the reading that the order is the reader's map; a
strip that scrolls hides the tabs past the fold at rest and shows nothing that
says they are there. With no scroll box the focus ring's glow is no longer
clipped against the strip's own 4px padding.

A label too long for the column wraps inside its own tab, as it already does
inside a pill, and a single unbreakable word narrows with it, which a pill's
does not. Nothing a caller can put in a tab widens the strip past its column or
the page past the viewport.

Its rows stand at the track's own `--space-1`, across and down alike, so a
wrapped strip reads as one block rather than as a row and a heading under it.
That is tighter than the `--tap-gap` a coarse pointer opens for the pill strip
below the phone step, and the strip opts out of it: a pill draws 31px tall and
its zone needs the room, while an underline tab draws the 44px floor itself. Its
padding is the scale's own `--space-3` and its height is
`min-height: var(--tap-min)`, so the floor is drawn rather than found in the
space around it, and it holds whatever line box the font supplies. The clearance
is still declared, and declared small — 4px, the row this strip actually has,
against the 20px the pill rule would otherwise hand it — so a layer here can
never reach past its own gap. Both pointers therefore draw the strip
identically.

## The chosen tab in an underline strip

It is its own label and 2px of accent under it. No plate, no hairline, no upright
rail: the tab keeps the ground the strip stands on, its label steps to `--strong`
at `--weight-semibold` while a reading label sits at `--weight-medium`, and the
bar spans the label's own width — inset from the tab's edges by the same
`--space-3` its padding is, and standing 3px clear of its bottom edge.

**Why so little.** The strip was first drawn as the sidebar's selected row: a
reading-surface plate, a hairline around it, and a 3px accent bar standing in the
tab's leading padding. Artur, round r29: *"Looks like draggable element."* That
pair — a lone card raised off the grey page with a vertical bar at its leading
edge — is the kit's own list-row grip, so the eye offered to drag the strip, and
the bar was the only mark in it that cleared a contrast floor (the plate reads
1.11:1 against the page). Round r31 took both away and left the two marks that
were doing the reading: the type step, and the bar re-pointed under the label.

**What a consumer can rely on.** The chosen tab paints the accent exactly once.
No tab in the strip draws a box — no background a reader can see against the
strip's ground, no border, no inset shadow — so nothing in it reads as a card
lying on the page. And every mark that says "chosen" is inside that tab's own
box, clear of its edges, which is what lets the strip wrap: a tab on a further
row carries its whole highlight with it, and nothing has to be read against the
row above or the row below. The strip itself draws no rule under its tabs — the
chosen tab carries the selection, so a line there marked nothing — and a consumer
that wants one draws it on the container.

The accent is spent once because the underline rule cancels the 1px accent
outline `.ui-seg button.is-active` gives every chosen segmented button, which was
the second of the two marks [#544](https://github.com/apliteni/apliteni-ui/issues/544)
reported. The pill appearance keeps that outline; it is a separate decision on a
rule every segmented control in the kit shares.

**Every tab reserves the bar, and the chosen one draws it.** The slot sits on
every tab at `opacity: 0` and `scaleX(0.4)`, and the chosen tab's rule turns it
on, so the mark grows in place when the choice moves instead of appearing. That
is `.ui-nav--tabs.is-underline`'s own structure and timing for the same 2px bar,
and `src/styles/segmented.test.js` reads the two rules against each other: the
kit draws underline tabs one way, and a strip that snapped the mark between tabs
would be the exception. Only the chosen tab's slot is ever drawn, so the accent
is still spent once — a hover rule that turned a second slot on would be #544
again, reached by a state rather than by a rule, which the browser gate measures
under a real pointer.

**Hovering is a small ink step, and the step is the kit's answer rather than
this strip's.** `.ui-seg button:hover` takes the ink from `--text` to `--strong`:
1.16:1 in light, 1.22:1 in dark. `.ui-nav__tab:hover` does exactly the same, so
a tab with no box of its own answers the pointer with the cursor and that step.
Whether a reader notices it is a design judgment and not something these figures
settle: a ratio between two text colours measures how far apart they are, not a
threshold below which seeing stops.

Raising it with a neutral token runs into the ladder. Measured against the page,
`--border` is 1.12:1 in light and 1.50:1 in dark, `--border-strong` 1.37 and
1.95, and the first that clears a text floor is `--muted`, at 5.51:1 in light
and 7.40:1 in dark — which in dark is above the accent bar's own 6.55:1 and in
light below its 6.62:1. So the loudest neutral ink the kit has outweighs the
selection in one theme and not the other, which is the cost to weigh rather than
a closed door. Nor is a token the only avenue: neutral shape — a hairline, a
dotted rule, a hover underline of its own — is paint that does not compete with
the accent on contrast at all. The strip keeps the kit's hover for now, and
changing it is a decision about both underline tabs rather than about this one.

**The tab's box comes from the scale and the floor.** `padding: var(--space-3)`
across and down, and `min-height: var(--tap-min)` for the height. The padding
this replaced was `--space-3` plus one pixel, which
`guidelines/layout-and-density.md` rejects by name — the declared step is 12 —
and which also left the drawn height to the font: 44px with the kit's webfont
loaded and 41px without it, so the 44 it claimed depended on a font having
arrived. Reading the height off the floor token makes it 44 either way, and
`stories/segmented-wrap.test.js` now measures every tab at every width against
that floor, with the `min-height` taken away as its mutation.

**Two consequences worth knowing.** The weight step is a drop, not a rise: the
kit draws every segmented label at `--weight-semibold`, so the chosen tab is the
weight it always was and a reading one went down a step. A chosen tab is
therefore exactly as wide as it was before this change, and a tab that becomes
chosen widens by about a pixel — measured on the screener's strip, 106.66 against
107.73, and no strip changes its row count across selections. And `outline: 0` on
the chosen tab reaches further than the kit's own `:focus-visible` rule, so that
rule is restated for the chosen tab — without it the chosen tab focuses with no
indicator at all, which is worse than the native outline
[#457](https://github.com/apliteni/apliteni-ui/issues/457) refused.

In forced colours the bar is restated in `Highlight`. The mode repaints an author
colour, so `var(--accent)` comes back as the same ink the labels are drawn in,
leaving the stroke weight as the only difference between two labels — which is
not a selection a reader should have to find by comparison. `Highlight` is kept
where it is named, so one painted mark survives the mode. The block is inert in
normal rendering.

The bar is drawn on `::before`. Below the phone step `tap-zone.css` owns
`.ui-seg button::after` and sizes it to the 44px floor; a bar drawn there collapses
that layer to its own 2px — measured both ways, 85×44 against 61×2. The hit test
still passed, because an underline tab draws 44px on its own, so the loss is latent
rather than visible; it is the zone the kit relies on the moment a strip is drawn
tighter.

Held by `src/styles/segmented.test.js` for the declarations and
`stories/segmented-wrap.test.js` for what is drawn, which renders the shipped
sheet in a browser at 320, 390 and 1280 on a fine pointer, at 390 on a coarse one
and at 1280 in forced colours, and nine mutations beside them. It reads the
chosen tab's accent count, its label's weight and ink against a resting tab's,
whether any tab draws a box, the accent bar against the tab that carries it and
against that tab's bottom edge, the strip's own borders, the row gap against the
track's, the tap zone against the 44px floor — including with the bar moved to
`::after` — a resting tab under a real pointer, which must still draw no bar, and, in forced colours, the
painted marks that are left against a resting tab's, with every tab's bar drawn
so the chosen one cannot be found merely by having one. A mark counts only once
it is drawn, so the reserved slot on a resting tab is not read as paint. Limits:
the marks come from the computed cascade, so what is finally painted is the
screenshots' evidence; the forced-colours half reads painted marks only and
deliberately ignores the weight step; hover is measured on one strip rather than
every one, the rule being shared; and no React strip is measured, the sheet being
shared.
Decided on [#527](https://github.com/apliteni/apliteni-ui/issues/527) and
[#544](https://github.com/apliteni/apliteni-ui/issues/544).

## Shared React logic and declarations

The main entry exports `dropdownMatch`, `dropdownFiltering`, `rankGroups`,
`rankCommands`, `scoreCommand`, `paletteHotkey`, `segmentedNextIndex`, `PAGE_SIZES`,
`DEFAULT_PAGE_SIZE`, and `calloutIcons` from shared logic modules. Vanilla factories
use the same logic and retain their exports during the removal migration.
`formatNumericValue` returns plain text, a unit, and an optional missing-value label;
`formatDeltaValue` returns plain text, the delta classes, and the comparison basis ID.
React table values render these as JSX. These helpers do not produce HTML.

The main entry and motion subpath ship TypeScript declarations. React FilterBar
uses React Dropdown directly, preserving the filter-bar classes, controlled change
callbacks, disabled fieldsets and removal focus. React tests check these DOM behaviors;
they do not measure the rendered appearance or browser focus styling.

## React metadata and status

`Pill` renders a span with `.ui-pill` and optional `live` or `soon` modifiers,
using the existing pill CSS. It accepts React children and does not add an
interactive role. `StatusDot` renders an empty `.ui-dot` span; `live` adds
`.is-live` and its shared pulse, subject to the kit’s reduced-motion rules.
An unlabelled dot is decorative (`aria-hidden`); `aria-label` or
`aria-labelledby` gives it an image role and accessible name. Keep visible status
text beside the dot. Neither primitive creates a live region. Both forward span
refs, native attributes, and additional classes.

Held by `react/src/primitives/Pill.test.tsx` and
`react/src/primitives/StatusDot.test.tsx`; these check DOM behavior and semantics,
not visual rendering or assistive-technology announcements. Part of
[#429](https://github.com/apliteni/apliteni-ui/issues/429).
## React success confirmations

Under [#429](https://github.com/apliteni/apliteni-ui/issues/429), React `SuccessPanel`
provides the inline title/subtitle confirmation and `SuccessCheck` provides the bare
shared decorative mark, the same markup as vanilla `successCheck()`. Its size and
colours come from the containing box, which the inline panel owns. `Success` keeps the
hero, split and compact layouts and optional confetti, and takes `check` for the mark,
as described under Success confirmations. They use the shared CSS and reduced-motion
behavior, without vanilla factories. Actions are React nodes; routing remains with the
consumer. An omitted or
empty `actions` omits the actions row. The page confirmation has a polite status region
and defaults to h1 for hero/split, h2 for compact; `level` allows an explicit rank of
1 to 6, and any other value takes that layout default. The inline panel keeps its
existing div title.

An optional countdown calls `onCountdownEnd` once when it reaches zero. Removal or
unmount cancels it. Changing duration restarts it; changing label or callback keeps
elapsed time. Durations round down to whole seconds; missing, non-finite, or
sub-one values use five seconds. `react/src/Success.test.tsx` checks semantics,
action access and timer ownership; it does not measure browser paint or prove
screen-reader announcements.

## Success confirmations

A confirmation carries **one title and at most one short line under it**. There is
no eyebrow: `success()`, `<Success>` and `successPanel()` take a title and a single
line of detail, and nothing stacks a third tier of text above or between them. A
label, a headline and a paragraph are three voices reporting one outcome, and the
block carries more weight than the outcome needs. Put the outcome in the title —
`Feedback sent`, not `Thanks — it goes straight to the strategy owner` with
`Feedback sent` as a label above it — and let the line under it add the one detail
the reader still needs.

`success()` and React `Success` draw that confirmation on a plain elevated card: the
kit surface, its border, and nothing behind it. There is no backdrop layer, and no
`backdrop` option — the blurred aurora blobs and the ambient green glow were
removed under [#429][i429] because they read as smudges rather than depth. The split layout
keeps its flat tinted visual panel, and the inline `successPanel()` keeps its
`--glow-green` wash; both are single flat fills, not blurs.

The mark is one of two, chosen with `check` on any of the three — `success()`,
`successPanel()`, `<Success>`, `<SuccessPanel>` — or with `variant` on `SuccessCheck`
directly:

| `check` | Mark | Size | Motion |
| --- | --- | --- | --- |
| `line` (default) | Lucide `check`, bare, in the success colour | 56px hero, 72px split, 28px compact, 28px inline panel | strokes itself on over `--dur-slow` |
| `circled` | Lucide `circle-check-big` (the kit's `circleCheck`) | 20px, the kit's label size — every `success()` layout **and** the inline `successPanel()` | at rest |

`line` is sized by the layout it lands in; `circled` is one size everywhere, because a
status mark that changes size reads as an illustration. The inline panel's box narrows
to 20px for it rather than stretching it to the 28px the line mark fills.

Both are unmodified Lucide paths at Lucide's own `stroke-width: 2`, in a 24 box.
Any other `check` value takes `line`. Neither mark has a filled disc or a burst
ring behind it.

**Guidelines / Iconography reserves a circled glyph for a state and a bare one
for an action, and a confirmation reports a state.** `circled` is therefore the
mark that rule asks for; `line` is the default because it carries the moment at
page size, where a 20px mark does not. A surface that wants the rule met passes
`check: 'circled'`.

An action that is not a kit `Button` — a router link, a plain `<a>` — takes
`.ui-focusable`, the kit's opt-in focus class. Without it the browser paints its own
focus outline, which [#457](https://github.com/apliteni/apliteni-ui/issues/457)
rejected. The confirmation adds no focus rule of its own; both actions and the link
are painted by the one shared rule in `src/styles/base.css`.

`src/components/success.test.js` reads the emitted markup: it holds both paths
against `src/assets/icons.js`, holds the root class against the mark drawn, holds
the removed backdrop layers out of all three layouts, and counts the text tiers each
layout emits so a third one cannot return unnoticed. It does not paint, so it cannot
say how large either mark renders or whether the tick animates.

## React sidebar navigation

`SidebarNav` renders the shared sidebar classes without a vanilla initializer.
It accepts flat items or captioned sections, nested groups, counts, optional artwork,
a footer slot and router-link rendering. A group holds leaves: nesting stops one level
deep, the depth `sidebarNav()` renders, and a deeper child is dropped as it is there. Each row retains its accessible name and
count when collapsed; disclosures remain keyboard operable and use unique controlled
list IDs. Current links use `aria-current="page"`, or `"true"` for `activeIs="section"`.
Disabled leaves render non-interactive spans. Groups containing the current item
open unless `defaultOpen` or a user toggle sets their state. Folding does not reset it.
AppShell composes this navigation in its desktop rail and More drawer.

Held by `react/src/SidebarNav.test.tsx`; browser captures verify presentation separately.

## React checkbox, radio and switch

`Checkbox` and `Switch` render native inputs inside the existing `ui-check` and
`ui-switch` labels and use the shared `input.css` without overrides. `Checkbox`
accepts `type="radio"`; same-name radios retain native exclusive selection and
arrow navigation. Its `label` is visible text. `Switch` requires a text `label`
for its accessible name and retains native checkbox semantics.

Both forward refs and native input attributes, including controlled `checked`
with `onChange`, uncontrolled `defaultChecked`, form names and values, and
`disabled`. Disabled controls do not activate, submit, or enter the Tab order.
Uncontrolled inputs reset with their form. `Checkbox` passes `className` to the
input; `Switch` passes it to the `.ui-switch` label, because its input is a
hidden zero-size box. A `Switch` given an empty `label` takes the vanilla
factory's "Toggle" default, so it always has an accessible name.

A disabled checkbox or radio now takes the same paint as every other disabled
control in the kit: `--disabled-surface`, `--disabled-border`, quiet
`--disabled-ink` words and `cursor: not-allowed`, with a checked box dropping the
accent for an opaque fill and inverting its tick or dot. Hover no longer lights
the border of a control that cannot be clicked. The vanilla `checkbox()` factory
takes `disabled` and its specimen renders the state, so
`stories/guidelines/accessibility-floor.test.js` measures it.

Tests in `react/src/Checkbox.test.tsx` and `react/src/Switch.test.tsx` check
semantics, events, the class split and the label fallback in JSDOM, not browser
paint or screen-reader speech. `src/styles/check-disabled.test.js` reads the two
things the story walk cannot: the hover qualification and the pseudo-element mark.
Part of [#429](https://github.com/apliteni/apliteni-ui/issues/429).

## React date and month picker

`DatePicker` picks one month, a range of months, one date, or a range of dates. At its
ordinary width it wears the dropdown's shell — the same `.ui-dropdown` trigger, chevron and
`.ui-dropdown__panel` surface — and adds only the grid inside it, so a picker and a
select standing beside it are the same control at rest. The panel is a `dialog`, because
a calendar is a grid and a listbox may own only options. It is mounted while closed, the
way every dropdown panel is, and `inert` while it is: a grid nobody opened is out of the
tab order, out of the pointer's way and out of the accessibility tree.

**The grain and the span are two questions, not one.** `month` and `day` pick a single
period; `range` and `day-range` pick a start and an end in the same two presses. Every
rule below reads which of the two is being asked rather than naming a mode, so the two
range modes behave alike and a day range is the month range one grain down.

Periods are ISO strings in the mode's own grain — `YYYY-MM` for `month` and `range`,
`YYYY-MM-DD` for `day` and `day-range` — and every step, bound and comparison is
arithmetic on one integer per period, so no part of the component walks a `Date` across a daylight-saving
boundary.

**A period written in the other grain still counts.** `min`, `max` and `disabledPeriods`
are typed `string`, which is all a type can say about a date, and a bound that fails to
parse must not quietly mean "no bound". A month read in day grain is its whole span —
`min="2026-09"` is the 1st and `max="2026-09"` the 30th, so the month it names is
included whole — and a date read in month grain is the month it falls in. A blocked month
blocks every day in it. A string that is neither is still no bound.

`min`, `max` and `disabledPeriods` mark a cell `aria-disabled` and refuse the press; the
cell stays focusable, so a reader meets the bound rather than losing it. A page step that
could only land outside the bounds is disabled rather than silently doing nothing.

**One tab stop in the grid, on the cell the keyboard is on.** Left and Right move one
period, Up and Down one row, Page Up and Page Down one year in month modes and one month
in day mode. **Home and End go to the ends of the row the reader is in, and never leave
the page**: a day grid pads its first row with blanks, so the slot at the start of week
one belongs to the month before, and both keys are held to the cells the page actually
shows. A move that leaves the shown page turns the page and keeps the reader on the
period they moved to. The shown page is derived from that cell and is not state of its
own, so the two cannot drift. The head's two steps move the page without taking focus off
the button that was pressed, and each names where it goes — "Previous year, 2025" — so a
consumer's "Previous year" shortcut is not a second control with the same name.

**Every cell says what it is in its own accessible name.** The pick lives on the
gridcell's `aria-selected`, which is the wrapper rather than the element focus lands on,
so the name on the button carries it too: `selected` in every mode, and `range start`,
`range end` and `in range` besides, in range mode.

**A range mode takes a start, then an end, and stays open in between.** A second press
below the first is the same range read backwards, so the ends swap. A range may run past
the page it started on: the grid turns under it and the span is painted on both pages. `onRangeChange` fires
on each end, so a half-picked range is visible to the host. Consumer presets set both ends
at once and carry no selected state of their own, because the grid already says what is
chosen; a preset is held to the same bounds the cells are, clamped where the two overlap
and switched off where they do not.

**A range is a pair, so it spans what lies between its ends — blocked periods
included.** `{ start, end }` has no way to say "all of this but not that", and inventing
one would make a range something a host cannot round-trip. A blocked period between the
two ends therefore stays in the value and says so in its accessible name, while
`aria-disabled` says it cannot be picked; what it loses is only the tint, because the
disabled ink over the span's own ground measured 4.43:1 under the green accent on dark
and cannot be made readable. That is the one place the paint and the name differ, and it
differs by withholding rather than by claiming. A host that must exclude a period splits
the range itself and shows two pickers.

**Blocked beats every other state in the paint, and its label is struck through.** A host
may block the period its own value names, or one between the two ends of a range. Such a
cell goes bare rather than keeping the fill or the tint under disabled ink; a
blocked pick keeps its place by weight instead, spending no second colour. The strike is
what makes unavailable read as unavailable with the pointer nowhere near it: quieter ink
beside a marked cell reads as "less important", not as "you cannot have this". It sits on
the label, so the mark's dot beside it is not struck with it. The cell still says
`selected` in its name and still carries `aria-selected`, because it is still the value —
it simply cannot be pressed. A shortcut whose end lands on a blocked period is refused
rather than walked inwards to a range nobody asked for.

**Hover is the kit's row hover.** A cell under the pointer takes the neutral edge and
reading surface `.ui-dropdown__item` takes, not a tint of the accent: an accent hover sat
within six of 255 per channel of the range's own tint, so on a seven-column grid the
pointer made an outside day read as part of the span. The accent is spent on the pick and
on the span, and not on a state the reader is passing over.

The span inside a range is an opaque accent tint rather than a grey fill, and a blocked
cell is a boxless ghost in `--disabled-ink-bare`.

**Nothing is drawn under the grid.** The panel had a legend: the current period's ring at
reading size beside "This month", and a swatch beside each of a consumer's own notes on a
period. Both are gone. A key is a second place to read for a signal the grid is already
making, and the words it spent were the ones the cell's accessible name already carries.
The consumer's notes went with it rather than outliving it: a 5px dot can be read only
against a key, and a note about a period — "restated", "estimate" — is domain data that
belongs on the surface showing that period's numbers, not on the control that picks it.
A picker that cannot say a thing without a key under it does not say it.

**The trigger shows the value and nothing else.** No field name sits in front of it:
"Period: Apr 2026 – Aug 2026" says "period" twice, and the second one is the word the
reader could already read off the value. `ariaLabel` names the trigger and the panel where
the screen around them leaves the control unexplained, and draws nothing.

**The current period is a ring, and the cell's name says so.** The cell the reader is in
now wears a hairline ring in the accent and nothing else, and its accessible name ends in
"this month" or "today", for whichever grain the grid is in. Weight was the device before
and carried no meaning a reader could recover — it was also the bold a blocked pick wears,
so one mark stood for two things. Hollow for the period you are in and filled for the one
you chose is the pair a calendar has always drawn, which is why it needs no key; a ring
cannot be mistaken for the neutral edge hover paints, and the name keeps it off colour
alone. A blocked cell keeps the ring: blocked sends the fills away, because disabled ink
over them cannot be read, and a hairline carries no ink over a ground.

**The twelve months are drawn at one length.** ICU abbreviates September to four letters
in en-GB and the other eleven to three, and in a three-column grid the long one reads as
emphasis. Each name is cut to the shortest of the twelve when
they are letters alone and the cut keeps them apart — "Sep", and "сен" beside "окт" — and
a locale that counts its months, where a name carries a numeral and a counter, is left as
it writes them. The trigger is prose rather than a lattice and keeps the locale's own
abbreviation.

**Below 560px the panel is a sheet, and a sheet is the kit's drawer.** It renders
`Drawer` anchored to the bottom edge, so it arrives with the scrim, the close control, the
focus trap, the inert page behind it and the restored focus that every other sheet in the
kit has. The shortcuts sit above the grid instead of beside it. `sheet` forces that layout at any width, for a host that
already knows it is on a phone or renders where no viewport can be read.

**The panel is the width of what is in it.** The dropdown's panel has a floor under its
width, because a list of option rows reads badly narrow; a grid is not that list, and at
the floor a twelve-month panel ended 80px to the right of December, which reads as a
fourth column that failed to draw. The picker takes the floor off and sizes to its
content, so the panel is the grid, the shortcuts beside it where there are any, and the
padding around them — a month panel is narrower than a day one, and both are as wide as
their own grid.

Day grids show only the month in view. The slots before the first and after the last are
empty cells rather than a neighbouring month's dates, because numbers in the same grid
read as pickable; the arrows cross the boundary instead.

Below the phone step the grid reaches the kit's 44px tap floor: the cells stay packed
across, which is the shape `.ui-seg` and `.ui-pager__steps` already take, and the gap
between weeks opens to `--tap-gap` so each cell's layer has the room to grow down. The
browser half of `stories/tap-zone.test.js` sweeps vanilla stories and reports no subject
here, so `react/src/DatePicker.test.tsx` holds those declarations instead and the
measurement is reported on the pull request.

Held by `react/src/DatePicker.test.tsx`, which also discovers every focusable part the
picker renders and holds it against the kit's own ring selectors, read out of the
stylesheets, and holds the component's one breakpoint literal against the table in
Breakpoints above. A gate of its own measures every combination of cell states in both
themes and under every shipped accent, because the workspace's contrast walk exempts a
disabled control and a blocked cell can also be the value. A second one measures what is
not ink: that the current period's ring clears 3:1 on every ground it lands on. A third
holds the panel empty under its grid and the cells free of swatches, and rejects a legend
or a dot put back. Browser captures verify presentation separately.
Part of [#429](https://github.com/apliteni/apliteni-ui/issues/429); asked for on
[#506](https://github.com/apliteni/apliteni-ui/issues/506).

## React search field

A toolbar above a list opens with a search box, then its filters, then its view
switch. `SearchField` is that box. Every other field in the React package draws
a visible `<label>`, so a screen that wanted the unlabelled one had to
hand-write `<input className="ui-input">`.

It renders one `.ui-input-group`: the leading `search` glyph, decorative and
hidden from assistive technology, and a native `type="search"` control on the
shared `.ui-input` class. `ariaLabel` is required and is the control's only
name, because nothing in the row shows one. The component declares no CSS of
its own, so the toolbar's row rule and the field's focus ring reach it from the
kit's stylesheet: above one column it grows into the slack the other controls
leave and keeps their height, and at one column it takes a line of its own. A
labelled field in that slot adds its label's height to the whole row, and
because the row stretches its children, every filter and button in it grows
with the field.

There is no clear button. The browser paints its own near-black on the light
field and white on the dark one, beside the kit's `--muted` magnifier, so
`input.css` suppresses it the way the kit already refuses the native select
chrome; #517 kept the field at one glyph.

`SearchField` forwards its ref to the native input and accepts the native input
attributes, including controlled `value` with `onChange`, `placeholder`, `name`,
`disabled` and `required`. `className` joins `.ui-input` rather than replacing
it. `type` and the glyph are fixed, so a caller cannot turn it into a different
field.

Held by `react/src/SearchField.test.tsx`: the group, glyph slot and control it
renders, the searchbox role and name with no visible label, the absent clear
button, the forwarded ref and props, and axe. JSDOM reads structure and names,
not paint or screen-reader speech; the focus ring and the row's measured height
are browser captures on
[#517](https://github.com/apliteni/apliteni-ui/issues/517).

## A toolbar at one column

`.ui-toolbar` gives its text field a `6rem` flex basis so the row breaks only
once the field would be squeezed under it. At `560px` that basis becomes the
field's size rather than its floor: a row holding two narrow chips beside it has
room to keep all three on one line, and the control the row is built around ends
up the narrowest thing on it, with its own placeholder cut off. At that step the
field takes `flex-basis: 100%`, so it has the line and the rest of the row wraps
under it — the shape a row with one wider control already fell into at this
width. Decided in [#517](https://github.com/apliteni/apliteni-ui/issues/517).

## React Snippet

`Snippet` displays `code` as plain text by default. Optional React `children` replace
only the displayed content; copying always writes the original `code` string.
Token spans use the existing `.k`, `.f`, `.s`, `.u`, and `.c` styles without parsing
HTML strings. Callers keep displayed tokens consistent with their source text, and
`codeTokens(raw, lang)` is how: it returns the vanilla highlighters' own tokens as
`{ cls, text }`, where `cls` is one of those five classes or `null` between tokens
and the `text` values concatenate back to the string passed in. Deriving children
from the same string the component copies removes the need to keep a second copy
in step. `copy={false}` removes the copy button and its tab stop, leaving the label
and selectable content. Changing `code` or `copy`, or unmounting, invalidates pending
copy feedback. Held by `react/src/Snippet.test.tsx`, which also compares the
rendered classes against the `snippet()` factory across `reveal` and `copy`;
`react/src/snippet-stories.test.tsx` holds the kit's own stories to copying what
they display, and `src/components/snippet-tokens.test.js` holds `hlShell`'s output
and the token round trip for every language. These check DOM behavior and strings,
not browser layout or colour contrast.
Part of [#429](https://github.com/apliteni/apliteni-ui/issues/429).

## Code highlighting

`hlCode(raw, lang)` returns highlighted HTML and `codeTokens(raw, lang)` returns the
same tokens as data; `hlShell(raw)` is the shell case under the name it has always
had. `codeLanguages` lists what `lang` accepts — `shell`, `json` and `ts` — and an
unrecognised name is read as shell, the way the kit reads every other unknown
option name. One tokenizer serves both, so vanilla HTML and React spans cannot
drift apart.

The five classes carry different meanings per language and are listed here because
a caller reading the colours needs to know what they stand for:

| Language | `.k` | `.s` | `.f` | `.u` | `.c` |
| --- | --- | --- | --- | --- | --- |
| `shell` | the command | a quoted string | a flag | a URL | a `#` comment |
| `json` | a property key | a string value | a number, `true`, `false`, `null` | — | — |
| `ts` | a keyword | a string or template | a number or literal | — | a `//` or `/* */` comment |

These are deliberately small. They colour the short snippets the kit's own docs
show, not arbitrary programs: no nested template expressions, no regular-expression
literals, and in TypeScript a `//` inside a string reads as a comment unless a `:`
precedes it, which is what keeps a URL in a string whole. The patterns run over
escaped text and hand back unescaped text, which is safe only while no token splits
an HTML entity; `src/components/snippet-tokens.test.js` holds that property, the
round trip and `hlShell`'s unchanged output for every language it discovers from
`codeLanguages`.

Three of the five classes miss WCAG AA on the light card and are carried as
recorded debt, not as a claim of compliance: `.f` and `.u` at 3.81:1 and `.s` at
4.45:1. `.k` clears it at 5.95:1, and every class clears it in dark. The accepted
failures and their reasoning live in `stories/contrast.test.js` and
`react/src/contrast.test.tsx`.

The copy button is icon-only in both implementations. `copy` is on the closed list
in `src/assets/icons.js`, the bar it sits in is narrow, and the word repeated what
the glyph already said. `copyLabel` is therefore the accessible name and the
`title` tooltip rather than visible text, written the way every other icon-only
control in the kit is written, and it should name what is being copied — “Copy
command”, “Copy configuration”. It defaults to “Copy code”. The button keeps the
24px target floor on both axes, which the width now carries alone: 4 + a 13px glyph
+ 4 is 21px without it.

Confirming a copy does not change the control's size or its name. The glyph swaps
from `copy` to `check` inside the same 24px box, and the word goes to a
visually-hidden live region beside the button — `.ui-sr.ui-snippet__status`, with
`role="status"` and `aria-live="polite"`, shipped empty because a `role="status"`
inserted together with its text is silent on several screen readers. Both
implementations emit that region and the same classes.

Two things follow from putting the word there rather than in the button. The bar
does not move: words in the button widened a 24px control to 59–87px on every
click, in a bar that is `justify-content: space-between`, so its left edge jumped
and came back. And the confirmation is actually announced: a permanent
`aria-label` outranks an element's contents, so a word written into the button
would have changed the pixels and left the computed name frozen. The button's own
name stays the action, which is still available after a copy.

Vanilla announces `Copied` and has no failure state, because its write is not
awaited; React announces `Copied` or `Copy failed`. The vanilla restore reads the
markup the button started with, so the glyph comes back rather than the label as
words; `data-orig` still records the resting label for a caller that wants it.
Held by `src/components/snippet-copy.test.js`, which resolves the announced name
with axe-core's accname and rejects three mutations: restoring the label text,
writing the confirmation into the button, and dropping the live region.

Snippet descendants use the shared `--ring` on `:focus-visible`, including copy
buttons in vanilla and React. The browser-focusable code region is the exception:
a `<pre>` sits flush with its card and has no radius, so a ring on it would paint
a square that overhangs the rounded card. The card paints that ring instead, with
`--ring-gap` taken from the page rather than from its own surface, and keeps
`overflow: hidden`. One focus signal is drawn either way.

Forced colors is the same guarantee by a different route. That mode drops
box-shadow, so both boxes fall back to their outlines: the card's transparent one
is repainted as the focus signal, and the code region declares none at all, because
an outline on it would be the square ring again, inside the card's rounded one.
Every other focusable part of a Snippet keeps its own outline there.

Held by `stories/snippet-focus.test.js`, which emulates forced colors by flattening
the media block and dropping every box-shadow; keyboard reachability, the gap
colour, the colour the system repaints an outline as, and pixels are checked in
Chromium because JSDOM cannot prove any of them.

## React file drop

`FileDrop` is the compact drop: at rest, one row holding the button that opens the
system picker and, beside it, the accepted types and the size limit in the
consumer's words. The field-sized dashed box stays with `FileField`, which is a
labelled form control. `guidelines/file-drop.md` states when a page uses a row, a
region or a dialog.

The consumer owns the upload. `FileDrop` reports a chosen or dropped file through
`onFile` and renders the `file` it is given: name, an already-written `size`, and
the status. A file with no `status` is uploading, so the kit never reports a
success the consumer has not claimed.

A status the row draws carries a circled mark and a word — "Uploading",
"Uploaded", or the `error` — because colour alone is not a status. A measurable
upload is the one exception: where `progress` is given the track is the status, so
the row spends no word on it and the word travels instead as the track's own
accessible name, `"Uploading statement-2026-08.pdf"`. An upload with no
measurable progress keeps the word, because nothing else there says what it is
doing. `state` replaces the word on an uploading or uploaded file, and replaces it
in the track's name too. `Remove` and `Retry` appear only when `onRemove` and
`onRetry` are supplied, so no row offers an action nobody handles. Both carry a
visible word: Remove is the kit's small text button, worded by `removeLabel`,
which defaults to "Remove". `x` is on the kit's icon-only list for close and
dismiss, and taking a file off a row is neither — the row stays and the file
leaves it — so nothing in the row is wordless. A failed file keeps its name and
puts its message under it with `role="alert"`, and drops its size, because the
tier has room for the message or the size and only one of them says what to do
next. The kit does not announce the change from uploading to uploaded; a
consumer that needs that announcement owns the live region. `accept` filters the system picker only, and the consumer still validates
type and size.

A file in hand is a stack of one-line tiers, not a line. The name owns the top
tier with the actions at its end; what the page has a rule about — the size while
it uploads, the message when it is refused — sits on the tier under it; and the
progress track runs the full width below both. One line asked to carry the name,
the size, a status word, a track and the buttons at 320px gave the name 62px and
truncated the failure message, which is the one string on the row that has to be
read in full. The stack is after Uppy's Dashboard, and Carbon, Drive and Dropbox
each refuse the same trade: the name gets a line, and the state is said once.

No tier ever takes a second line. The name truncates instead, and it truncates
its stem while keeping its extension — `frankfurt-settlement-state….pdf`, the way
Finder, Drive and Dropbox cut a name — because a row cut to
`frankfurt-settlement-state…` has stopped saying what kind of file it is holding.
The cost is a small gap before the extension while the stem is cut. The full name
stays in a `title`, as does a truncated status word. The tiers are one spacing
step apart, the step below it inside a tier; the actions are the kit's small
buttons at the size the resting row already uses, and they close the name's line
on the edge it ends on.

One layout at every width: nothing is hidden, dropped or moved at a breakpoint,
so the sheet carries no container query. Measured in Chromium with IBM Plex Sans
loaded, at 1280, 390, 360 and 320 and in both containers alike, a row with a
measurable upload is 69.55px over three tiers, a failed one is 59.05px over two,
and a starting or uploaded one is 55.55px over two. A resting row is 32px, the
kit's small-control row, wherever its note sits beside its button; below about
250px of block width the note wraps under it and the row is 59.05px.

The containers are the two the kit draws a row into: a plain row given the whole
block, and a panel inset by `--space-4` on each side — the inset the guideline
specimens draw and the one `.ui-app__main` takes at the phone step. At 320
`stories/row-height.test.js` measures the truncated stem at 210px in a plain row
and 178px in a panel while uploading, and at 119px and 87px when the upload has
failed. The failed row is the narrower because it carries two worded actions on
the name's line. `--panel-sm`, the narrowest panel the kit names, is 320px, so
the panel row at 320 — a 288px line — is also the line a 320px panel gives at
any viewport. The stem and height numbers this section carried before #566 were
taken in the engine's fallback font and in no panel at all; they are withdrawn
rather than adjusted.

A name being cut is held to one floor: 150px, and it is met wherever at most one
worded action shares the name's line. A row carrying two does not reach it and
cannot. What the stem gets is the line less `Retry` and `Remove` with the space
between them, 165px, less the extension, 24px and never shrinking, less the
name's own gap, 12px — so 150px needs a 351px line. 1280 and 390 have one; a
panel at 360 and either container at 320 do not. Those rows are held to what
they measure instead, as four shortfalls the gate records and asserts: 127px in
a panel at 360, 119px in a plain row at 320, and 87px in a panel at 320 both for
a long name and for `statement-2026-08.pdf`, which is an ordinary name and is cut
there too. No second floor is published. What a failed upload's name may be cut
to in a narrow panel is open in
[#566](https://github.com/apliteni/apliteni-ui/issues/566) and is Artur's to
decide: reaching 150px means wrapping the actions under the name, which is the
layout #541 rejected, or dropping `Remove`'s word, which #566 rejected because
`x` is the kit's glyph for close and dismiss and taking a file off a row is
neither. The extension is never cut, at any width or in either container.

Below the phone step a coarse pointer gets the kit's 44px target on `Retry` and
`Remove`: the pair opens to the tap gap and each button's transparent layer
grows into the clearance the row's floor leaves around it. The buttons are not
drawn any larger.

The drop target is painted only while a file is over the region, and it covers
that region rather than joining it, so the row keeps its place while the reader
aims. Children render above the row inside the same region, which is how one
panel — or a whole page — becomes the target. The component tracks drag events
over its own root and ignores a drag that carries no file; passing `dragging`
overrides that, so a parent listening on its own region decides. A disabled drop
paints no target and takes no file, and it does not call `preventDefault` on
`dragover`, so it never declares itself a drop target the pointer can aim at.

The picker opens from a real kit button, and the native input is hidden rather
than laid over it: a one-row control has no field label to name an overlaid
input, and the button keeps the kit's own focus ring. The input is cleared after
each choice, so choosing the same file again reports it; nothing is submitted
with a form, because the file travels through `onFile`.

Covered by `react/src/FileDrop.test.tsx`, which does not open the system picker,
measure the target's cover or the focus ring, or check screen-reader speech, and
by `stories/row-height.test.js`, which reads the sheet in CI with its ledger of
measured shortfalls, and under `ROW_HEIGHTS=1` measures the tiers, the heights
and the truncation in a browser — in both containers, at four widths, and with
IBM Plex Sans loaded, which that half needs the network for.
Closes [#507](https://github.com/apliteni/apliteni-ui/issues/507).

## React accent picker

`AccentPicker` exposes the four shipped accents as a controlled group of named
buttons using the existing `.ui-accent-picker` styles. `value` determines the
pressed state; `onChange` reports a click, Enter, or Space without applying a page
accent or accessing storage. Tab visits each button. The host owns application and
persistence. Optional `options` selects and orders the unique accent values; an
absent value leaves all buttons unpressed. The group forwards its ref and native
attributes. It emits no `data-accent-pick`, so `wireTopbar(document)` on a
half-migrated page cannot adopt it, apply the accent and persist it behind the
host's `onChange` — the decision `Dropdown`, `Drawer` and `ThemeToggle` make for
their own hooks.

Both pickers read one accent list and one set of swatch paints from the kit, so
neither can drift from the other or from the accent tokens. A swatch button carries
one paint, the gradient its circle wears: the accent's dark ramp in both themes,
because a swatch shows you an accent you are not currently looking at.

Which swatch is selected is a tick drawn inside the circle — the mark `.ui-check`
draws for a checked box, at the same 2px stroke — and focus stays the kit ring. One
element carries one accent signal, and on a focusable control that signal is the
ring, so the tick is painted in `--signal-contrast`, the kit's ink for a saturated
colour once it becomes a fill, and the ring is the only accent edge a swatch ever
draws. The selected swatch's own box-shadow is the unselected swatch's.

The tick takes `--signal-contrast` rather than the `--accent-contrast` the checkbox
takes because the circle wears the dark ramp in both themes, and
`--accent-contrast` is the ink for an `--accent-strong` fill: white on emerald's
`#16c98a` reads 2.15:1. One near-black ink clears 6.63:1 on the dullest of the eight
gradient stops — the default accent's `#b479ff` — and 10.82:1 on the brightest, in
both themes, so it needs no value per theme or per accent and no swatch button
carries a selection paint for a caller to keep in step. The focus ring's own band reads 5.83:1 or better
against the ground it stands on, across all four accents and both themes.

Rejected, on [#472](https://github.com/apliteni/apliteni-ui/pull/472): a selection
ring in the selected swatch's own accent, drawn outside the focus ring. Laid
straight against the kit's band the two measured 1.05:1 in light and 1.06:1 in dark
with the page on Ocean and Phoenix selected — one smear rather than two signals.
Given the ring's own gap width as a separator they cleared the 3:1 floor, and were
still two accent edges on one 26px circle. Decided by Artur's standing rule of one
selection signal per element.

Held by `react/src/AccentPicker.test.tsx`,
`react/src/AccentPicker.mark.test.tsx`, `react/src/AccentPicker.focus.test.tsx`,
`stories/accent-mark.test.js`, `stories/accent-focus.test.js` and
`stories/accent-swatch.test.js`. Part of
[#429](https://github.com/apliteni/apliteni-ui/issues/429).
