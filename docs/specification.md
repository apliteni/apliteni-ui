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
- **[Colour and contrast](#colour-and-contrast)** — what every accent clears
- **[The focus ring](#the-focus-ring)** — one declaration, derived from the accent
- **[Icons and glyphs](#icons-and-glyphs)** — size, stroke, and which bar a mark takes
- **[The page shell](#the-page-shell)** — one shell, and what it emits
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
`/* motion: choreographed — why */`. There is no third kind and no unannotated exception.

`0.01ms` in the reduced-motion net is not a duration and is not tokenised. It is the kill-switch
idiom: short enough to be imperceptible, non-zero so `transitionend` and `animationend` still fire
for scripts that wait on a close animation.

### Reduced motion travels with the stylesheet

The net — `@media (prefers-reduced-motion: reduce)` neutralising every animation and transition —
lives in `src/styles/reduced-motion.css`, one copy. `src/index.css` imports it, so
`apliteni-ui/css` carries it. `react/src/index.ts` imports the same file, so `apliteni-ui/react/css`
carries it as well: a consumer who takes only the React stylesheet is not left with motion and no
net. Taking both is harmless — every rule in it is idempotent and `!important`.

Held by `stories/motion-tokens.test.js`, which reads the four tokens out of the table above at run
time, resolves each through `tokens.css` into the brand primitive it aliases and checks the
milliseconds match, then fails any transition in the swept sheets that carries a literal time or a
bare easing keyword, any `visibility` not timed `linear`, any animation literal without its
`motion:` note, and any published CSS entry that ships motion without the net.

Decided in [#200](https://github.com/apliteni/apliteni-ui/issues/200).

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
predictably, and every disabled label in the kit measures between 5.56:1 and 6.11:1.

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

The nav's own rules beat a host stylesheet: `.ui-nav .ui-nav__item` is (0,2,0) and a host sheet's
`a:link` is (0,1,1), so dropping the kit into a page that styles its links does not restyle the
navigation.

Decided in [#127](https://github.com/apliteni/apliteni-ui/issues/127). `appShell()` was the
owner's choice between three shells built and rendered side by side, not a derivation.

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
- **No hand-written markup contract.** `.ui-side` and `.ui-shell` were removed when nothing
  emitted them. Call the factory; the class names are not a supported surface on their own.
- **No support for a vertical writing mode.** The icon gate folds `inline-size` onto `width`,
  which is only correct horizontally, and asserts the assumption rather than taking it: a
  `writing-mode` declaration anywhere in these stylesheets stops the gate.
