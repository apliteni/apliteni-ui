# Foundations

The values the kit ships and the floors every component meets.
[library.md](library.md) is the other half — what each component is and what it promises.
The design rules for a screen are in [the guidelines](../guidelines/overview.md), and why a
number is what it is lives in the issue that settled it.

Everything here is a CSS custom property you can read and re-point. Take the tokens with
`@apliteni/apliteni-ui/tokens` and `/accents`, or the whole stylesheet with `/css`.

## Widths

```css
--container: 1120px;   /* the page, gutter to gutter */
--measure:    860px;   /* the reading column inside a track */
```

A box that bounds the page takes the first; a box that bounds a line of text takes the second.
Nothing in the kit writes a page-scale width as a number.

`appShell({ width })` names the content column: `centered` caps and centres it, and is the
default; `wide` takes the cap off and fills the track beside the rail. `maxWidth` replaces the
cap under either name, and a value the kit cannot use drops it.

## Boxes below the page

```css
--panel-sm: 320px;   --prose-display: 14ch;   /* where a headline rags */
--panel-md: 420px;   --prose-caption: 44ch;   /* a sentence under a glyph */
--panel-lg: 560px;   --prose-lede:    54ch;   /* the line under a title */
                     --prose-body:    62ch;   /* a left-aligned column */
                     --prose-dense:   72ch;   /* reference prose below 13px */
```

The unit says which scale applies: a box holding a **component** takes a `--panel-*` step in
px, a box holding a **line** takes a `--prose-*` step in ch. Put a `--prose-*` step on the
paragraph, never on a wrapper — `ch` resolves against the font size of the element carrying it.

## Breakpoints

The kit has three breakpoints, and every media query it ships is at one of them.

| step    | what changes at it                                                                     |
| ------- | -------------------------------------------------------------------------------------- |
| `860px` | the page stops holding three tracks — a three-across grid drops to two, a side-by-side pair stacks |
| `720px` | the shell folds — the app rail becomes an icon strip, link columns halve, a secondary label drops out |
| `560px` | one column — every remaining grid is a single track, and a floating panel goes edge to edge |

A step is a class of viewport, not one surface's preference. The values are written as
literals, because a media query cannot read a custom property and the kit has no build step to
inline one. `560` is also `--panel-lg` and `860` is also `--measure`: arithmetic, not a
relationship — move the reading column and the steps stay where they are.

## Spacing and rhythm

Every padding, margin and gap in the kit is `0` or a `--space-*` step, modifiers included — a
density variant is the same scale at a different index. Where a value sat between two steps,
what it is *for* decided the direction: a dense table rounds down, clearance rounds up.

**A padding modifier moves the vertical rhythm and keeps the horizontal inset**, so cards of
different padding stacked in one column line their text up, and a dense or zebra table inside a
card starts its first column on the card's own text edge.

## Typefaces

Two families, and the split is a role split:

```css
--font-display: 'Poppins', …;        /* headings, brand lockups, large readouts */
--font-sans:    'IBM Plex Sans', …;  /* text, tables, fields, chat — most of an app */
--font-mono:    ui-monospace, …;     /* code, identifiers, tabular figures */
```

- **The element decides, never the size.** `h1`–`h6` take the display face; everything else
  takes the text face from `body`. A card, drawer or confirmation title is a heading tag set in
  the text face, and each says so on its own rule.
- **A brand mark is not text**: a wordmark keeps the display face at any size. That is the one
  exception.
- **`b` and `strong` are `--weight-semibold`.** 700 is still there by name.
- **Neither family is bundled.** Your page loads both; a family a token names and nothing loads
  falls back in silence.

Component sizes follow the `--text-*` scale, and a size between two steps is the nearest step
plus a fixed pixel offset, so a host override still moves it. The 16px touch-field size is the
one safety exception; see
[A field is 16px on a touch screen](#a-field-is-16px-on-a-touch-screen).

## Labels and titles

**Text is never set in capitals by style.** No stylesheet in the kit changes the case of the
text it is given: no `text-transform`, no small capitals. A label is written in sentence case
and renders as written, and a word that is capitals in itself stays that way.

**Six ranks, each under the one above it.**

| rank         | size          | weight              | line-height        | what takes it |
| ------------ | ------------- | ------------------- | ------------------ | ------------- |
| `page-title` | `--text-2xl`  | `--weight-bold`     | `1.1`              | the page's `h1` inside `appShell()` |
| `card-title` | `--text-lg`   | `--weight-semibold` | `--leading-snug`   | a card's title |
| `body`       | `--text-base` | `--weight-normal`   | `--leading-normal` | running text |
| `label`      | `--text-sm`   | `--weight-medium`   | inherited          | an eyebrow, a table head, a nav or menu caption, a footer column title, a code sample's label |
| `caption`    | `--text-sm`   | `--weight-normal`   | inherited          | a sentence under a specimen, figure or screenshot |
| `chip`       | `--text-xs`   | `--weight-semibold` | inherited          | a badge, a pill, a menu row's badge, a version badge |

That is 30, 18, 14.5, 13, 13 and 11px on the kit's scale. Where two ranks share a size, weight
separates them: `label` and `caption` are both 13px. Words take body ink, labels and captions
included; see [Text ink](#text-ink).

**A card title is a heading, one level under the page's.** `card()` and `<Card>` emit an `h2`,
and `level` moves it to `h3`–`h6`. An eyebrow above a card title is a label, not a heading.

## Motion

**The drawer is the kit's default motion and everything else copies it.** A panel that appears
takes 250ms on `cubic-bezier(0.4, 0, 0.2, 1)`, moving `transform` and `opacity` and nothing
else. Every duration is one of four tokens:

| token           | resolves to | what it times                                                        |
| --------------- | ----------- | -------------------------------------------------------------------- |
| `--dur-instant` | `80ms`      | a press: the frame of feedback under a finger, too short to read as motion |
| `--dur-fast`    | `150ms`     | a control changing state — hover, focus, a colour, a border, a caret turning |
| `--dur-med`     | `250ms`     | a surface arriving or leaving — drawer, confirm, dropdown, menu, toast, scrim |
| `--dur-slow`    | `400ms`     | an entrance or a reveal: the motion library's effects, scroll reveals   |

Every easing is a token too — `--ease` is the default, with `--ease-out`, `--ease-in`,
`--ease-sharp` and `--ease-spring` beside it — or `linear`.

- **Any transition of `visibility` is timed `linear`.**
- **Anything that appears or leaves after the page has loaded moves**, and nothing animates on
  first render. Text that changes in place — a count, a range — changes at once.
- A `transition` always reads a duration token. An `animation` may keep its own number in two
  cases, named at the declaration: **ambient** motion with no interaction origin, and
  **choreographed** sequences timed against each other. There is no third kind.

### Reduced motion travels with the stylesheet

Under `prefers-reduced-motion: reduce` nothing slides, fades or loops, and a one-shot settles
on its final frame. The net lives in one file and **both** published stylesheets carry it, so a
consumer who takes only `@apliteni/apliteni-ui/react/css` is not left with motion and no net.
Taking both is harmless — every rule in the net is idempotent.

The net gives every element a 0.01ms transition. So an open drawer, confirm, palette or
dropdown panel carries no transition inside it at all while it is open, and focus lands where
it does with motion on.

## Text ink

Words use `--text`, or the full-strength foreground of their surface, at every size. Do not
rank descriptions, labels, captions, timestamps, counts, code comments or enabled actions by
fading them with `--muted`, `--dim` or opacity — hierarchy comes from size, weight and spacing.
Signal colours still report status and errors, and links keep their link ink.

Muted and dim ink have exactly three uses:

- **glyph** — a mark that is not words: an arrow, a chevron, a dismiss icon.
- **state** — colour reporting off, unset, disabled or archived, rather than rank.
- **placeholder** — a slot with no value, such as an empty field or cell.

An empty-state explanation is not an empty slot, a keyboard shortcut is language, and a count
is not a status. Generic badges take body ink; archive and disabled variants keep their state
ink, and a dropdown badge asks for it with `tone: 'state'`. A neutral dropdown chip tints by
mixing muted ink into the panel — the one soft fill under words the kit draws, and its text
still clears 4.5:1.

## Colour and contrast

- **The accent is measured against its own wash, not against the surfaces**, and every one of
  the eight theme × accent cells clears 4.5:1. The wash *is* the accent at low alpha, so
  re-tinting one without the other is half a change.
- **A disabled control is painted, never faded.** Every disabled rule with a label under it
  takes `--disabled-ink` on `--disabled-surface` at full opacity; a ghost button paints no box
  and takes `--disabled-ink-bare`. One rule still fades, the switch track, which has no label
  inside it.
- **The floor is 3:1, and a disabled control never shows the pair it shows enabled.** Contrast
  carries legibility; the paint carries the state.
- **A field has no fill step, so the ground you put it on decides whether its box is seen.**
  `--field-bg` and `--disabled-surface` are both `--surface` in both themes: a field is drawn
  by its edge. On the page ground a disabled field measures 1.12:1 — a white box on a grey
  page. **Put a form on a card.**
- **The box reports the state, so a field that is off draws the fainter edge of the two.** The
  same two tokens paint a button, so a button that is off drops a rung with the field.
- **A disabled select carries the kit's own paint and no fade**, because the kit's disabled
  field rule resets the `opacity: 0.7` Chromium's user-agent stylesheet fades one with.

## Elevation

**A surface casts a shadow only to say it is higher, and each theme says it its own way.** A
level keeps its step on a ladder of lightness in both themes, and **dark draws the kit's
hairline while light casts a soft drop and draws no neutral line at all.** A line that divides
two regions of one surface is not a level and stays a line in both themes — a card's row
dividers, a table's row rules, the rail's head band, the topbar's bottom rule — and a field is
not a level either, because its edge is what says "type here". **A level draws a line or casts
a drop, and never neither**: a step of lightness on its own is a contrast of about 1.1.

The ladder, bottom to top:

| Token | The step | Dark | Light |
| --- | --- | --- | --- |
| `--bg` | the page | `#0e0d14` | `#f2f3f6` |
| `--surface-2` | non-text sunken marks and tracks | `#161520` | `#e9ecf3` |
| `--surface` | a card | `#211e2d` | `#ffffff` |
| `--bg-elevated` | floating — a menu, a panel, the drawer, a modal, a toast | `#2a2639` | `#ffffff` |
| `--surface-3` | non-text quiet fills | `#2d293c` | `#eef0f5` |

**Text sits on the page, card or floating panel surface, never on a grey inset.** Fields, code
blocks, neutral badges, navigation labels and segmented controls use those reading surfaces in
both themes; `--surface-2` and `--surface-3` are for non-text fills and tracks.

**What floats is decided by the surface's job, not by its rung**: a floating surface is one
whose whole purpose is to be temporarily above something else. It writes both devices as one
`box-shadow` list, the inset line first and then the drops, with one token per rung per theme —
`--elev-rest` under a card, `--elev-rail` beside the rail, `--elev-drop` under a floating
surface, and `--elev-edge` to re-point the inner line:

```css
box-shadow: inset 0 0 0 1px var(--elev-edge, var(--float-edge-inner)), var(--elev-drop);
```

**The focus ring composes with that list.** A `box-shadow` list replaces the whole list, so
every floating panel writes the ring *in front of* its own edge and drop.

`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-seg` and `--shadow-card` are still
published, and all five are the transparent shadow `0 0 #0000` in both themes — transparent
rather than `none`, which would invalidate any list it appears in. A zero-offset layer of a
signal's own colour is a **glow**: `--glow-*`, `--sheen` and `--ring` are that shape.

**An inline code chip paints the reading surface its container is not on.** A container says
which one that is in `--code-bg`, and the chip reads it — it never declares it:

| The ground | What it hands a chip | Token |
| --- | --- | --- |
| the page | the card | `--code-bg: var(--surface)` on `:root` |
| a card, a panel, any painted container | the page | `--code-bg: var(--bg)` |
| a table | the card in dark, the page in light | `--table-code-bg`, the pair of `--table-bg` |
| a tinted card or snippet | the card it is a variant of | `--code-bg: var(--surface)` |
| a translucent wash over any of them | the page in dark, the card in light | `--wash-code-bg` |

If you paint a reading surface of your own, hand `--code-bg` the other one; a table surface
sets `--table-bg` and `--table-code-bg` together, and a wash that takes caller markup sets
`--code-bg: var(--wash-code-bg)`. The chip keeps at least 1.065 against every ground the kit
draws, in both themes.

**A tinted card stays above the page.** `.ui-card--accent` and `.ui-card--live` mix their
colour into `--surface` through `--card-tint`: dark can spend 9%, light 5%. Each variant edges
itself in its own colour.

**The ladder is capped by ink.** `--muted` carries state and placeholder information, so it
clears AA on every step the ladder raises, re-picked against the top of the ladder rather than
against the page.

## The focus ring

One indicator: a 1px surface-coloured gap, a 2px solid accent band, and a soft outer halo. The
band carries the contrast; the halo is decoration.

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

**Every focusable control the kit ships draws it**, including a roving row the keyboard
reaches with an arrow key rather than Tab, so none falls back to the browser's own outline,
which ignores the accent and is black in both themes. The command palette's input is the one
exemption, declared at its own rule, because it holds focus for as long as the dialog is up.
**A control of your own wears `.ui-focusable`**, the kit's opt-in class — a router link or a
plain `<a>` acting as an action needs it.

Tune the width, colour and gap at `:root`, or at a surface that composes the ring; a
descendant-only change to one of those inputs cannot alter an already inherited shadow. **If
you paint a surface of your own, set `--ring-gap` to its background and recompose `--ring`** —
changing only the gap leaves the inherited shadow unchanged. Every `--bg-elevated` surface does
both, and so do cards and the application rail; controls keep the containing gap, not their own
fill. **A focus rule also has to outrank every always-on rule writing `box-shadow` on the same
element**, which is why a panel's focus declaration repeats its own edge and drop beside
`var(--ring)`.

**`--ring-scroll` is the indicator a scroll region inside a surface takes**: the same 1px gap
and 2px band, drawn inward, and no halo. It is an `outline` drawn inward by
`--ring-scroll-offset` — take one without the other and the band lands outside the box. A box
that scrolls is a keyboard stop of its own unless its children are focusable, so every
scrolling box the kit ships either takes that ring, with padding for the band to land in, or
holds its own tabbable rows and takes none.

Controls use native `:focus-visible`, inputs and invalid fields included; an invalid border
keeps its error colour while focus uses the shared band. Every shared-ring consumer also keeps
a transparent 2px outline, which forced colours repaint as the focus signal once they remove
box shadows. A direct `--ring` override still works, but an ancestor's does not cross a surface
that recomposes the ring. The ring reserves no layout space, so an ancestor's overflow boundary
can clip its 3px solid footprint and roughly 15px halo.

## A field is 16px on a touch screen

iOS Safari zooms the page into a focused field whose text is smaller than 16px, and it does not
zoom back out.

- **One net, over elements rather than classes.** A single `@media (pointer: coarse)` rule
  takes `input`, `select` and `textarea` to 16px, and both published stylesheets import it. The
  controls with nothing to type into are left out; none of them zooms. It takes `!important`,
  because a net has to outrank a component rule it has never seen.
- **The size is real, never a scaled 16px.** The zoom reads the computed font size, so a 16px
  field shrunk back with a `transform` still zooms.
- **`font-size` and not the viewport.** `user-scalable=no` also stops the zoom, by taking
  pinch-zoom from every reader of the page, which fails WCAG 1.4.4.
- **It is a flat size rather than a floor**, so a host field *designed above 16px* — a 20px
  hero search — is made smaller on a touch screen. The way out is your own `!important` rule,
  outranking the net rather than repeating it:

```css
/* more specific than the net's bare element, so it wins whichever sheet loads first */
.hero-search input { font-size: 20px !important; }
```

A bare `input { font-size: 20px !important; }` ties the net on specificity and holds only while
your stylesheet loads after the kit's.

## A tap reaches the floor below the phone step

A finger covers more than a cursor, and below the phone step the kit's own small controls
measure under 44px on at least one axis. **Two floors:** `--tap-min` is 44, the target the
sheet reaches for, and `--tap-aa` is 24, WCAG 2.5.8, which the kit holds at every width.

**The extra size goes outside the drawn shape** — a transparent, centred layer per
small-control family — and **the control keeps the size it draws.** A layer never crosses a
neighbour's drawn edge: `--tap-clear-x` and `--tap-clear-y` are the clear space to the nearest
neighbour on each axis, a layer takes **half** of that on each side and stops, and the clamp is
declared by the container, the only thing that knows its own gap. **Both default to zero**, so
if you build a row of small controls, declare its clearance — otherwise its controls keep the
targets they draw.

**Where the kit packs tighter than a zone needs, the gap opens** to `--tap-gap`, which is 20:
**the controls do not change size**, the space between them does. A row opens down unless it
cannot overflow — only a row whose marks are each a fixed square, a drawer header, or a dense
table's action cell opens across. Some families get no layer at all, and all of them are named
on the Accessibility minimums page: rows that share an edge have nothing outside a row to put
one in, `input`, `select` and `textarea` generate no pseudo-element and are reached by their
own height, and a back link draws 24 on both axes because it cannot know what the shell puts
above it.

The whole thing is behind `@media (max-width: 560px) and (pointer: coarse)`: a transparent
layer is also a hover surface, and a coarse pointer has no hover. The sheet is imported
**last** and its openings take `!important`, because each overrides a gap a component already
set. `--tap-min` is declared in that sheet rather than the token file, because the React entry
imports these nets without `tokens.css`; it is still a token and you can move it.

## Icons and glyphs

**A stroked glyph earns the graphic bar by its width.** What a reader sees is
`stroke-width × box ÷ viewBox`, so a stroke stated once and reused at a second box is two
different marks. At or above **1.5 CSS px** a mark is a graphic and takes the 3:1 bar; below it
the mark is optically a text stem and takes the 4.5:1 text bar instead.

**Every stroked glyph in the kit clears 1.5 CSS px.** A rule that decides a glyph's box decides
its stroke, and both travel together. There is **no second bar for a control's glyph**: a glyph
inside a button is not exempt for being small.

**A select draws one chevron, on its right edge, in every theme and every state.** The glyph is
a background image, so it is three longhands — `background-image`, `-repeat` and `-position` —
and any `background` shorthand reaching the same element resets all three. A rule repainting
such an element sets `background-color`, not `background`. Controls that paint nothing but a
colour keep the shorthand.

`iconOnlyAllowed` and `iconMeanings` publish the two icon rulings as data: which glyphs may
stand without a word, and what each one means.
