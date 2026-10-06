# Foundations

The kit ships these values, and every component meets these minimums.
[components.md](components.md) is the other half. It explains each component and its promise.
The design rules for a screen are in [the guidelines](../guidelines/overview.md). The issue that
settled a number explains why it has that value.

Everything here is a CSS custom property that you can read and re-point. Take the tokens from
`@apliteni/apliteni-ui/tokens` and `/accents`, or take the full stylesheet from `/css`.

## Widths

```css
--container: 1120px;   /* the page, gutter to gutter */
--measure:    860px;   /* the reading column inside a track */
```

Use the first value for a box that bounds the page. Use the second for a box that bounds a line
of text. The kit does not write a page-scale width as a number.

`appShell({ width })` sets the content column. `centered` limits and centres it, and is the
default. `wide` removes that limit and fills the track beside the rail. `maxWidth` replaces the
limit under either name. If the kit cannot use a value, it drops that value.

## Boxes below the page

```css
--panel-sm: 320px;   --prose-display: 14ch;   /* where a headline rags */
--panel-md: 420px;   --prose-caption: 44ch;   /* a sentence under a glyph */
--panel-lg: 560px;   --prose-lede:    54ch;   /* the line under a title */
                     --prose-body:    62ch;   /* a left-aligned column */
                     --prose-dense:   72ch;   /* reference prose below 13px */
```

The unit tells you which scale to use. A box holding a **component** uses a `--panel-*` step in
px. A box holding a **line** uses a `--prose-*` step in ch. Put a `--prose-*` step on the
paragraph, not on a wrapper. `ch` uses the font size of the element that carries it.

## Breakpoints

The kit has three breakpoints, and every media query it ships uses one of them.

| step    | what changes at it                                                                     |
| ------- | -------------------------------------------------------------------------------------- |
| `860px` | the page stops holding three tracks — a three-across grid drops to two, a side-by-side pair stacks |
| `720px` | the shell folds — the app rail becomes an icon strip, link columns halve, a secondary label drops out |
| `560px` | one column — every remaining grid is a single track, and a floating panel goes edge to edge |

A step describes a viewport class, not a preference for one surface. The values are written as
literals because a media query cannot read a custom property, and the kit has no build step to
inline one. `560` is also `--panel-lg`, and `860` is also `--measure`. This is arithmetic, not
a relationship. If you move the reading column, the steps stay where they are.

## Spacing and rhythm

Every padding, margin and gap in the kit is `0` or a `--space-*` step, including modifiers. A
density variant uses the same scale at a different index. When a value fell between two steps,
its purpose decided the direction: a dense table rounds down, and clearance rounds up.

**A padding modifier changes the vertical rhythm but keeps the horizontal inset**, so cards with
different padding can stack in one column while their text lines up. It also lets a dense or
zebra table inside a card start its first column at the card's own text edge.

## Typefaces

The kit uses two families, and the split is based on role:

```css
--font-display: 'Poppins', …;        /* headings, brand lockups, large readouts */
--font-sans:    'IBM Plex Sans', …;  /* text, tables, fields, chat — most of an app */
--font-mono:    ui-monospace, …;     /* code, identifiers, tabular figures */
```

- **The element decides, never the size.** `h1`–`h6` use the display face. Everything else uses
  the text face from `body`. A card, drawer or confirmation title is a heading tag in the text
  face, and its own rule states this.
- **A brand mark is not text**: a wordmark keeps the display face at any size. This is the one
  exception.
- **`b` and `strong` are `--weight-semibold`.** 700 is still available by name.
- **Neither family is bundled.** Your page loads both. If a family named by a token is not
  loaded, the browser falls back silently.

Component sizes use the `--text-*` scale. A size between two steps uses the nearest step plus a
fixed pixel offset, so a host override still moves it. The 16px touch-field size is the one
safety exception. See
[A field is 16px on a touch screen](#a-field-is-16px-on-a-touch-screen).

## Labels and titles

**Text is never set in capitals by style.** No stylesheet in the kit changes the case of the
text it receives. It does not use `text-transform` or small capitals. A label is written in
sentence case and renders as written. A word that is capitalised in itself stays that way.

**Six ranks, each under the one above it.**

| rank         | size          | weight              | line-height        | what takes it |
| ------------ | ------------- | ------------------- | ------------------ | ------------- |
| `page-title` | `--text-2xl`  | `--weight-bold`     | `1.1`              | the page's `h1` inside `appShell()` |
| `card-title` | `--text-lg`   | `--weight-semibold` | `--leading-snug`   | a card's title |
| `body`       | `--text-base` | `--weight-normal`   | `--leading-normal` | running text |
| `label`      | `--text-sm`   | `--weight-medium`   | inherited          | an eyebrow, a table head, a nav or menu caption, a footer column title, a code sample's label |
| `caption`    | `--text-sm`   | `--weight-normal`   | inherited          | a sentence under a specimen, figure or screenshot |
| `chip`       | `--text-xs`   | `--weight-semibold` | inherited          | a badge, a pill, a menu row's badge, a version badge |

On the kit's scale, these are 30, 18, 14.5, 13, 13 and 11px. When two ranks share a size,
their weight separates them. `label` and `caption` are both 13px. Words use body ink, including
labels and captions. See [Text ink](#text-ink).

**A card title is a heading, one level under the page's.** `card()` and `<Card>` emit an `h2`.
`level` moves it to `h3`–`h6`. An eyebrow above a card title is a label, not a heading.

## Motion

**The drawer is the kit's default motion, and all other motion follows it.** A panel that
appears takes 250ms on `cubic-bezier(0.4, 0, 0.2, 1)`. It moves `transform` and `opacity`
only. Every duration is one of four tokens:

| token           | resolves to | what it times                                                        |
| --------------- | ----------- | -------------------------------------------------------------------- |
| `--dur-instant` | `80ms`      | a press: the frame of feedback under a finger, too short to read as motion |
| `--dur-fast`    | `150ms`     | a control changing state — hover, focus, a colour, a border, a caret turning |
| `--dur-med`     | `250ms`     | a surface arriving or leaving — drawer, confirm, dropdown, menu, toast, scrim |
| `--dur-slow`    | `400ms`     | an entrance or a reveal: the motion library's effects, scroll reveals   |

Every easing is also a token. `--ease` is the default. The other options are `--ease-out`,
`--ease-in`, `--ease-sharp` and `--ease-spring`. `linear` is also available.

- **Any transition of `visibility` uses `linear`.**
- **Anything that appears or leaves after the page has loaded moves.** Nothing animates on
  first render. Text that changes in place, such as a count or a range, changes immediately.
- A `transition` always reads a duration token. An `animation` may keep its own number in two
  cases, named at the declaration: **ambient** motion with no interaction origin, and
  **choreographed** sequences timed against each other. There is no third kind.
- **A published motion helper accepts a missing element.** `transitionMs(el)` returns the
  stylesheet's transition time for `el`: the longest duration plus its own delay, in
  milliseconds. It returns `0` for no element, for anything that is not an element, and `0`
  again where there is no window to ask for a computed style. `playEntrance()` and `replay()`
  do nothing for a missing element. None of the three ask whether the element is still in the
  document, so a node you detached gets no promise here: what `transitionMs()` answers for one
  is whatever the engine's style API says about it. A caller sizing a backstop timer for a fade
  can read the stylesheet instead of copying a duration token, and an unmounted ref gets a timer
  that fires immediately instead of an exception.

### Reduced motion travels with the stylesheet

With `prefers-reduced-motion: reduce`, nothing slides, fades or loops. A one-shot animation
settles on its final frame. The net is in one file, and **both** published stylesheets include
it. A consumer who takes only `@apliteni/apliteni-ui/react/css` therefore gets the net as
well as the motion styles. Taking both is harmless because every rule in the net is
idempotent.

The net gives every element a 0.01ms transition. As a result, an open drawer, confirm,
palette or dropdown panel has no transition inside it while it is open. Focus also lands
where it does when motion is enabled.

## Text ink

Words use `--text`, or the full-strength foreground of their surface, at every size. Do not
show hierarchy by fading descriptions, labels, captions, timestamps, counts, code comments
or enabled actions with `--muted`, `--dim` or opacity. Use size, weight and spacing for that
hierarchy. Signal colours still report status and errors. Links keep their link ink.

Muted and dim ink have exactly three uses:

- **glyph** — a mark that is not words: an arrow, a chevron, a dismiss icon.
- **state** — colour reporting off, unset, disabled or archived, rather than rank.
- **placeholder** — a slot with no value, such as an empty field or cell.

An empty-state explanation is not an empty slot. A keyboard shortcut is language. A count is
not a status, so a metadata pill keeps body ink. The neutral status chip, Archive and disabled
variants keep their state ink. A dropdown badge asks for state ink with `tone: 'state'`. A chip
tints by mixing muted ink into its ground. This is the one soft fill under words that the kit
draws, and its text clears 4.5:1 on every ground the kit hands it.

## Colour and contrast

- **The accent is measured against its own wash, not against the surfaces.** Every one of
  the eight theme × accent cells clears 4.5:1. The wash *is* the accent at low alpha, so
  changing one without the other is only a partial change.
- **A disabled control is painted, never faded.** Every disabled rule with a label under it
  uses `--disabled-ink` on `--disabled-surface` at full opacity. A ghost button paints no box
  and uses `--disabled-ink-bare`. One rule still fades: the switch track, which has no label
  inside it.
- **The floor is 3:1, and a disabled control never shows the pair it shows enabled.** Contrast
  provides legibility. The paint provides the state.
- **A field has no fill step, so the ground you put it on decides whether its box is seen.**
  `--field-bg` and `--disabled-surface` are both `--surface` in both themes. A field is
  therefore drawn by its edge. On the page ground, a disabled field measures 1.12:1. This is
  a white box on a grey page. **Put a form on a card.**
- **The box reports the state, so a field that is off draws the fainter edge of the two.** The
  same two tokens paint a button, so a button that is off drops a rung with the field.
- **A disabled select carries the kit's own paint and no fade.** The kit's disabled field
  rule resets the `opacity: 0.7` that Chromium's user-agent stylesheet applies to one.
- **A neutral chip is a wash, because no flat colour reads on every ground it is handed.** A
  badge lands on four of them — the page, a card, a floating surface and a table — and in light
  three of those are `#ffffff`, so a flat fill is the ground it stands on. The tone is a pair:
  `--chip-neutral-fill` separates from all four at 1.18–1.23:1 in both themes, and
  `--chip-neutral-ink` is state ink, so the chip reporting nothing to do is the quietest in the
  set. Its ink clears 4.5:1 on all four, 4.51:1 at its worst. The sunken grey would take it to
  4.25:1, and nothing in the kit hands a chip that ground: a data row paints the table's own
  surface, hovered as well as at rest, and a menu panel floats. Soon and Archive stay ink on
  the card.

## Elevation

**A surface casts a shadow only to show that it is higher, and each theme expresses this in
its own way.** A level keeps its step on a ladder of lightness in both themes. **Dark draws
the kit's hairline. Light casts a soft drop and draws no neutral line at all.** A line that
divides two regions of one surface is not a level. It stays a line in both themes. Examples
include a card's row dividers, a table's row rules, the rail's head band and the topbar's
bottom rule. A field is not a level either because its edge says "type here". **A level draws
a line or casts a drop, and never neither**. A step of lightness on its own has a contrast of
about 1.1.

The ladder, from bottom to top:

| Token | The step | Dark | Light |
| --- | --- | --- | --- |
| `--bg` | the page | `#0e0d14` | `#f2f3f6` |
| `--surface-2` | non-text sunken marks and tracks | `#161520` | `#e9ecf3` |
| `--surface` | a card | `#211e2d` | `#ffffff` |
| `--bg-elevated` | floating — a menu, a panel, the drawer, a modal, a toast | `#2a2639` | `#ffffff` |
| `--surface-3` | non-text quiet fills | `#2d293c` | `#eef0f5` |

**Text sits on the page, card or floating panel surface, never on a grey inset.** In both
themes, fields, code blocks, navigation labels and segmented controls use
those reading surfaces. `--surface-2` and `--surface-3` are for non-text fills and tracks. A
neutral chip is the one exception and takes a wash instead; see **Colour and contrast** above.

**A selected item is the one exception.** Selection is marked by a background highlight, and the
only fills that step off a reading surface are the grey ones. A chosen segmented pill fills
`--surface-3` on its track; a chosen menu row and the palette row the keyboard is on fill
`--surface-2` on their panel. A chosen pill is therefore the one place in the kit where a label
rests on a quiet grey fill.

**What floats depends on the surface's job, not on its rung.** A floating surface has the
whole purpose of being temporarily above something else. It writes both devices as one
`box-shadow` list. The inset line comes first, followed by the drops. Each rung has one token
per theme: `--elev-rest` under a card, `--elev-rail` beside the rail, `--elev-drop` under a
floating surface, and `--elev-edge` to re-point the inner line:

```css
box-shadow: inset 0 0 0 1px var(--elev-edge, var(--float-edge-inner)), var(--elev-drop);
```

**The focus ring does not touch that list.** The band is an `outline`, so a focused panel keeps
the edge and the drop it rests on without restating them.

`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-seg` and `--shadow-card` are still
published. All five are the transparent shadow `0 0 #0000` in both themes. They are
transparent rather than `none`, because `none` would invalidate any list in which it
appears. A zero-offset layer in a signal's own colour is a **glow**. `--glow-*` and `--sheen`
have that shape. `--ring` does not: it is an `outline` value, so no box-shadow answers focus.

**An inline code chip paints the reading surface that its container is not on.** The container
states which surface that is in `--code-bg`, and the chip reads that value. The chip never
declares it:

| The ground | What it hands a chip | Token |
| --- | --- | --- |
| the page | the card | `--code-bg: var(--surface)` on `:root` |
| a card, a panel, any painted container | the page | `--code-bg: var(--bg)` |
| a table | the card in dark, the page in light | `--table-code-bg`, the pair of `--table-bg` |
| a tinted card or snippet | the card it is a variant of | `--code-bg: var(--surface)` |
| a translucent wash over any of them | the page in dark, the card in light | `--wash-code-bg` |

If you paint your own reading surface, give `--code-bg` the other surface. A table sets
`--table-bg` and `--table-code-bg` together. A wash that takes caller markup sets
`--code-bg: var(--wash-code-bg)`. The chip keeps at least 1.065 against every ground the kit
draws, in both themes.

**A tinted card stays above the page.** `.ui-card--accent` and `.ui-card--live` mix their
colour into `--surface` through `--card-tint`. Dark can spend 9%. Light can spend 5%. Each
variant edges itself in its own colour.

**The ladder is capped by ink.** `--muted` carries state and placeholder information. It
clears AA on every step that the ladder raises. It is re-picked against the top of the
ladder, rather than against the page.

## The focus ring

One indicator: a 2px solid accent band, drawn as a real `outline`, with 1px between it and the
control. There is no halo. The offset is left **unpainted**, so what shows in that 1px is
whatever surface the control is already standing on.

```css
--ring-width: 2px;
--ring-color: var(--accent);
--ring-gap-width: 1px;
--ring: var(--ring-width) solid var(--ring-color);
--ring-offset: var(--ring-gap-width);
--ring-scroll: var(--ring);
--ring-scroll-offset: calc(-1 * (var(--ring-gap-width) + var(--ring-width)));
```

A consumer takes the band and the offset that places it. Take one without the other and the band
is drawn flush against the control, closing the gap it is read across:

```css
.my-control:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); }
```

Tune it at `--ring-width`, `--ring-color` and `--ring-gap-width`. The four values built from them
are declared once each, at `:root`, and **no surface recomposes any of them**: a direct `--ring`
override reaches every control. There is no gap colour to hand down.

**`--ring-scroll` is the indicator a scroll region inside a surface takes.** It is the same band,
drawn inward by `--ring-scroll-offset`. You need both values, or the band appears outside the box.
A scrolling box is its own keyboard stop unless its children are focusable, so every scrolling box
the kit ships either takes that ring and has padding for the band, or contains its own tabbable
rows and takes no ring.

**Every focusable control the kit ships draws the band**, including a roving row the keyboard
reaches with an arrow key rather than Tab. None falls back to the browser's own outline, which
ignores the accent and is black in both themes. The command palette's input is the one exception,
and its own rule says why: it keeps focus while the dialog is open. **A control of your own wears
`.ui-focusable`**, the kit's opt-in class. A router link or a plain `<a>` used as an action needs
it.

**A focused control draws the band and nothing beside it.** Every other edge keeps its resting
ink. Where a resting or hover rule would outrank the focus rule, it stands aside with
`:not(:focus-visible)` rather than painting a second accent edge one pixel inside the first. A
control that is hovered and focused at once therefore draws the band alone. A drop zone still
recolours its dashed edge while a file is over it: that edge is the drop target, not a focus mark.

**An outline means focus; selection is a background highlight.** A selected, current or active
item is marked by its fill, its ink and its weight, never by an edge drawn around it — an edge on
a selected row is the band's own shape one pixel further in. Two marks are deliberate exceptions
and say so beside their rules: the current page in a pager keeps a `--border` hairline, because no
fill marks it on both the page and a card; and the date picker's current period keeps its accent
hairline at rest, which stands aside while the cell holds focus.

Controls use native `:focus-visible`, including inputs and invalid fields. An invalid border keeps
its error colour while focus uses the shared band. **Forced colours needs nothing extra**: the band
is a real outline, which is what the system repaints, so no consumer carries a transparent stand-in
outline. The ring uses no layout space, so an ancestor's overflow boundary can clip its 3px
footprint.

**Migrating from the box-shadow ring.** `--ring` was a `box-shadow` value and is an `outline`
value. A sheet that writes `box-shadow: var(--ring)` draws nothing — the declaration is invalid —
and has to write the pair above instead. `--ring-gap` is gone with the painted gap it coloured; if
you set it on a painted container of your own, or recomposed `--ring` there, delete both.
`--ring-width`, `--ring-color` and `--ring-gap-width` are unchanged.

## A field is 16px on a touch screen

iOS Safari zooms the page into a focused field when its text is smaller than 16px. It does not
zoom back out.

- **One net, over elements rather than classes.** A single `@media (pointer: coarse)` rule
  sets `input`, `select` and `textarea` to 16px. Both published stylesheets import it. Controls
  with nothing to type into are excluded because they do not zoom. The rule uses `!important`
  because it must outrank a component rule that it has not seen.
- **The size is real, never a scaled 16px.** The zoom uses the computed font size. A 16px field
  that is made smaller with a `transform` still zooms.
- **`font-size` and not the viewport.** `user-scalable=no` also stops the zoom. It removes
  pinch-zoom for every reader of the page, which fails WCAG 1.4.4.
- **It is a flat size rather than a floor**, so a host field *designed above 16px* — a 20px
  hero search — becomes smaller on a touch screen. Use your own `!important` rule, with higher
  specificity than the net, instead of repeating it:

```css
/* more specific than the net's bare element, so it wins whichever sheet loads first */
.hero-search input { font-size: 20px !important; }
```

A bare `input { font-size: 20px !important; }` has the same specificity as the net. It works
only while your stylesheet loads after the kit's.

## A tap reaches the floor below the phone step

A finger covers more area than a cursor. Below the phone step, the kit's own small controls
measure under 44px on at least one axis. **Two floors:** `--tap-min` is 44, the target the
sheet aims for, and `--tap-aa` is 24, WCAG 2.5.8, which the kit keeps at every width.

**The extra size goes outside the drawn shape**. The kit adds a transparent, centred layer for
each small-control family. **The control keeps the size it draws.** A layer never crosses a
neighbour's drawn edge. `--tap-clear-x` and `--tap-clear-y` define the clear space to the
nearest neighbour on each axis. A layer uses **half** of that space on each side and then
stops. The container declares the clamp because it is the only part that knows its own gap.
**Both default to zero**, so declare the clearance when you build a row of small controls.
Otherwise, their targets stay at the size they draw.

**Where the kit packs tighter than a zone needs, the gap opens** to `--tap-gap`, which is 20.
**The controls do not change size**. Only the space between them changes. A row opens down
unless it cannot overflow. Only a row whose marks are each a fixed square, a drawer header,
or a dense table's action cell opens across. Some families get no layer. The Accessibility
minimums page names all of them. Rows that share an edge have no space outside a row for a
layer. `input`, `select` and `textarea` generate no pseudo-element and use their own height.
A back link draws 24 on both axes because it cannot know what the shell places above it.

The whole system is behind `@media (max-width: 560px) and (pointer: coarse)`. A transparent
layer is also a hover surface, and a coarse pointer has no hover. The sheet is imported
**last**, and its openings use `!important` because each one overrides a gap already set by a
component. `--tap-min` is declared in that sheet rather than the token file because the React
entry imports these nets without `tokens.css`. It is still a token, and you can move it.

## Icons and glyphs

**A stroked glyph earns the graphic bar from its width.** A reader sees
`stroke-width × box ÷ viewBox`. So, when the same stroke is stated once and reused at a
second box, the result is two different marks. At or above **1.5 CSS px**, a mark is a graphic
and uses the 3:1 bar. Below that, it looks like a text stem and uses the 4.5:1 text bar instead.

**Every stroked glyph in the kit clears 1.5 CSS px.** The rule that sets a glyph's box also sets
its stroke. The two values stay together. There is **no second bar for a control's glyph**. A
glyph inside a button is not exempt because it is small.

**A select draws one chevron on its right edge in every theme and state.** The glyph is a
background image. Its settings use three longhands: `background-image`, `-repeat` and
`-position`. Any `background` shorthand applied to the same element resets all three. A rule
that repaints this element sets `background-color`, not `background`. Controls that paint only
a colour keep the shorthand.

`iconOnlyAllowed` and `iconMeanings` publish the two icon rules as data. They state which
glyphs may appear without a word and what each glyph means.
