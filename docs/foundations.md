# Foundations

Use this page when you write CSS of your own beside the kit, or when you need to know what a
component keeps on every screen. The kit ships these values, and every component meets these
minimums. [components.md](components.md) tells you which component to use and how. The design
rules for a screen are in [the guidelines](../guidelines/overview.md). The issue that settled a
number explains why it has that value.

Everything here is a CSS custom property that you can read and re-point. Take the tokens from
`@apliteni/apliteni-ui/tokens` and `/accents`, or take the full stylesheet from `/css`.

## Widths

```css
--container: 1120px;   /* the page, gutter to gutter */
--measure:    860px;   /* the reading column inside a track */
```

Use the first value for a box that bounds the page. Use the second for a box that bounds a line
of text. The kit does not write a page-scale width as a number.

The `width` of `AppShell` sets the content column. `centered` limits and centres it, and is the
default. `wide` removes that limit and fills the track beside the rail.

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
| `560px` | one column — every remaining grid is a single track, and a floating panel goes edge to edge, except the account window, which keeps a gap on each side |

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

**Two gaps space a page.** The inner gap, `--space-2` (8px), separates the parts of one group:
a title and what it names, a control row and the table it filters, wrapped rows of controls. The
group gap, `--space-8` (32px), separates groups: the page head and its first block, one section
and the next. On a touch phone the inner gap of a group of small controls is `--tap-gap` (20px),
and the view strip wraps its rows `--space-1` (4px) apart. A control that draws no box starts its
first label on the page title's edge.

## Control corners

**Every control that a reader presses is a pill.** This covers each button size, each dropdown
trigger, also in a form, a filter chip and the filter bar's add control, a select, the back
link, and a notice's action and dismiss control. The corner is `--radius-pill`. A wordless button is square, so the pill makes it a circle.
The account button in the band is a 40px circle. In a toolbar beside a full field or a filter
bar, a wordless button takes the row's height and stays a circle. The kit's padding keeps text,
glyphs, units and the focus ring inside the rounded edge. Give a control of your own the same
corner.

**Every one-line field that a reader types into has the field corner, `--radius-lg`.** This covers
a text field, a search field of each size, the search field in a dropdown panel and the page
field of a pager. A text area and message box use `--radius-2xl`. In a form, a dropdown trigger
has the height of the text field beside it, but it keeps the pill and fits its longest option up to
the field width. Give a field of your own the same corner.

**Cards and floating panels use `--radius-md`.** This includes dialogs, dropdown panels, menus,
callouts, toasts, success surfaces, code blocks and hover readouts. The round corner is the
fallback. Where the browser supports it, these surfaces and typed fields use a squircle corner.

These parts keep another corner:

- A segmented strip keeps its own rounded track.
- A menu row, a palette row and a date picker's day cell keep their small corner. They are rows
  and cells in a panel, not controls on the page.
- The account row in the side rail keeps the corner of the rail rows.
- The search line of the command palette is the top edge of the palette, so it follows the
  palette's corners.
- A file drop area keeps its large dashed corner. The button in it is a pill.

## Typefaces

The kit uses two families, and the split is based on role:

```css
--font-display: 'Poppins', …;        /* headings, brand lockups, large readouts */
--font-sans:    'IBM Plex Sans', …;  /* text, tables, fields, chat — most of an app */
--font-mono:    ui-monospace, …;     /* code */
```

- **The element decides, never the size.** `h1`–`h6` use the display face. Everything else uses
  the text face from `body`. A card, drawer or confirmation title is a heading tag in the text
  face, and its own rule states this.
- **A brand mark is not text**: a wordmark keeps the display face at any size. This is the one
  exception.
- **`b` and `strong` are `--weight-semibold`.** 700 is still available by name.
- **Neither family is bundled.** Your page loads both. If a family named by a token is not
  loaded, the browser falls back silently.

**Each component size is one step of the `--text-*` scale, with no offset.** A host that
changes a step moves every part on it. Three kinds of size stay off the scale:

- A field is 16px on a touch screen. See
  [A field is 16px on a touch screen](#a-field-is-16px-on-a-touch-screen).
- The landing page's hero title, hero line and section heading are fluid display sizes.
- Inline code is 0.9 of its sentence, and never smaller than `--text-xs`.

The smallest step, `--text-xs`, is 12px. No kit text is smaller.

## Labels and titles

**Text is never set in capitals by style.** No stylesheet in the kit changes the case of the
text it receives. It does not use `text-transform` or small capitals. A label is written in
sentence case and renders as written. A word that is capitalised in itself stays that way.

**Six ranks, each under the one above it.**

| rank         | size          | weight              | line-height        | what takes it |
| ------------ | ------------- | ------------------- | ------------------ | ------------- |
| `page-title` | `--text-2xl`  | `--weight-bold`     | `1.1`              | the page's `h1` inside `AppShell` |
| `card-title` | `--text-lg`   | `--weight-semibold` | `--leading-snug`   | a card's title |
| `body`       | `--text-base` | `--weight-normal`   | `--leading-normal` | running text |
| `label`      | `--text-sm`   | `--weight-medium`   | inherited          | an eyebrow, a table head, a footer column title |
| `caption`    | `--text-sm`   | `--weight-normal`   | inherited          | a sentence under a specimen, figure or screenshot; a code block's title |
| `chip`       | `--text-xs`   | `--weight-semibold` | inherited          | a badge, a pill, a menu row's badge, a version badge |

On the kit's scale, these are 30, 18, 14.5, 13, 13 and 12px. When two ranks share a size,
their weight separates them. `label` and `caption` are both 13px. Words use body ink, including
labels and captions. See [Text ink](#text-ink). A group label is outside the ranks: a dropdown's
group label, a sidebar's section caption and a command palette's group heading. Each is 13px, bold
and in muted ink, so it stands apart from the rows under it.

**A card title is a heading, one level under the page's.** `<Card>` draws an `h2`. `level`
moves it to `h3`–`h6`. An eyebrow above a card title is a label, not a heading.

## Motion

**The drawer is the kit's default motion, and all other motion follows it.** A panel that
appears takes 250ms on `cubic-bezier(0.4, 0, 0.2, 1)`. It moves `transform` and `opacity`
only. Every duration is one of four tokens:

| token           | resolves to | what it times                                                        |
| --------------- | ----------- | -------------------------------------------------------------------- |
| `--dur-instant` | `80ms`      | a press: the frame of feedback under a finger, too short to read as motion |
| `--dur-fast`    | `150ms`     | a control that moves: focus, a turning caret, a lift or a press. Never a hover's paint |
| `--dur-med`     | `250ms`     | a surface arriving or leaving — drawer, confirm, dropdown, menu, toast, scrim |
| `--dur-slow`    | `400ms`     | an entrance or a reveal: the motion library's effects, scroll reveals   |

Every easing is also a token. `--ease` is the default. The other options are `--ease-out`,
`--ease-in`, `--ease-sharp` and `--ease-spring`. `linear` is also available.

- **Any transition of `visibility` uses `linear`.**
- **Hover is the one state change that does not fade.** A hover changes its fill, ink and
  border at once. No `transition` gives a hover's `background`, `color`, `border-color`,
  `box-shadow` or `filter` a duration. A response within about 0.1s feels instant: Robert B.
  Miller, "Response time in man-computer conversational transactions", AFIPS Fall Joint
  Computer Conference, 1968, and Jakob Nielsen, *Usability Engineering*, 1993, chapter 5,
  "Response times: the 3 important limits". A 150ms fade ends after that limit, so the fill
  trails the pointer and reads as lag. A press, a focus edge, a turning caret and a lift keep
  their motion. A field's edge has an ink and a focus veil. A state sets the ink at once, and
  focus fades the veil in and out, so the focus edge fades also while the pointer stays on the
  field. A selected, checked or current fill that a hover also paints changes at once too,
  because it answers a click. A table row changes at once in every table form: plain, zebra,
  dense and selected.
- **Anything that appears or leaves after the page has loaded moves.** Nothing animates on
  first render. Text that changes in place, such as a count or a range, changes immediately.
- A `transition` always reads a duration token. An `animation` may keep its own number in two
  cases, named at the declaration: **ambient** motion with no interaction origin, and
  **choreographed** sequences timed against each other. There is no third kind.
- **Use `transitionMs(el)` to time a fallback for a fade.** It returns the transition time
  that the stylesheet gives `el`, in milliseconds: the longest duration plus its delay. Read it
  instead of copying a duration token. It returns `0` for a missing element, for anything that
  is not an element and where there is no window, so a timer for an unmounted ref fires at once.
  `playEntrance()` and `replay()` do nothing for a missing element. None of the three checks
  that the element is still in the document.

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

Muted and dim ink have exactly four uses:

- **glyph** — a mark that is not words: an arrow, a chevron, a dismiss icon.
- **state** — colour reporting off, unset, disabled or archived, rather than rank.
- **placeholder** — a slot with no value, such as an empty field or cell.
- **chrome** — the furniture around a drawing: a chart's value axis, its period row
  and its legend. Exact data values must remain reachable at full strength through
  pointer readouts and keyboard announcements. The values table is optional and opens
  on request. A field's label, a caption and a timestamp keep body ink. Another use
  is the title of a supporting card, such as a document beside the data read from it:
  add `ui-card__title--muted` so it ranks below its neighbour. Its size and weight stay
  the card title's. A group label is chrome too: a dropdown's group label, a sidebar's
  section caption and a command palette's group heading. Each names the rows under it, and
  its group keeps the name as the group's accessible name.

An empty-state explanation is not an empty slot. A keyboard shortcut is language. A count is
not a status. Generic badges use body ink. Archive and disabled variants keep their state
ink. A dropdown badge asks for state ink with `tone: 'state'`. A neutral chip uses
`--chip-neutral-fill`, a low-alpha muted wash. Badge, pill, dropdown chip and archived
version badge all use that token when the tone carries no verdict. The wash leaves its
ground in the same direction as status chip fills. It is lighter in dark and darker in light.
Its text still clears 4.5:1. The theme alphas differ because muted ink differs between themes.
The neutral fill separates from a card by about 1.22:1 in dark and 1.20:1 in light.

## Colour and contrast

**A status chip's ink and fill form one pair.** Change them together and check the result
on the page, a card and a floating panel in both themes. Keep text at least 4.5:1.
Light success has a stronger aim of **7:1** on its fill. It measures 7.17:1. The other light
status pairs meet 4.5:1 but do not all meet 7:1. Dark danger measures at least 6.30:1 on these
three grounds.

**A status word has its own ink in light.** A word with no fill stands on a selected row's accent
wash, so `--status-warn-ink`, `--status-info-ink` and `--status-danger-ink` are deeper than the
chip inks. They measure at least 7.01:1 on a plain, a selected and a selected hover row under
every accent. In dark they are the chip inks, at 7.42:1 or more.

**Archive has little contrast to spare.** Its muted ink measures 4.64:1 on the light page
and 4.56:1 on a dark floating panel. These are the narrowest Archive pairs.
Check both before changing muted ink, the neutral fill or a containing surface.
Do not fade Archive further or assume that a card measurement covers these grounds.

On the light page, warn and pending fills separate by only 1.043:1, and live by 1.047:1.
Their status ink also identifies them. The neutral fill separates by 1.188:1 on that ground.
These fill ratios describe separation, not text contrast.

- **The accent is measured against its own wash, not against the surfaces.** Every one of
  the eight theme × accent cells clears 4.5:1. The wash *is* the accent at low alpha, so
  changing one without the other is only a partial change.
- **A disabled control is painted, never faded.** Every disabled rule with a label under it
  uses `--disabled-ink` on `--disabled-surface` at full opacity. A ghost button paints no box
  and uses `--disabled-ink-bare`. A disabled option in a dropdown panel uses
  `--disabled-ink-option`, which is paler than the panel's muted group label and keeps 3.5:1.
  One rule still fades: the switch track, which has no label inside it.
- **The floor is 3:1, and a disabled control never shows the pair it shows enabled.** Contrast
  provides legibility. The paint provides the state. The kit keeps every disabled label at
  4.89:1 or more on the surface it sits on. A disabled dropdown option is the one exception: it
  keeps 3.5:1 or more, so it stays paler than the group label above it. If you repaint a
  disabled label, keep it at these figures.
- **A field has no fill step, so the ground you put it on decides whether its box is seen.**
  `--field-bg` and `--disabled-surface` are both `--surface` in both themes. A field is
  therefore drawn by its edge. On the page ground, a disabled field measures 1.12:1, because
  the light page is now as white as the field's fill, so only the edge draws the box.
  **Put a form on a named surface: a card, a drawer panel or a modal.** A filter bar above a table is the one exception. See
  [Forms](components.md#fields).
- **The box reports the state, so a field that is off draws the fainter edge of the two.** The
  same two tokens paint a button, so a button that is off drops a rung with the field.
- **A disabled select carries the kit's own paint and no fade**, also in Chromium, which fades
  a disabled select by default.
- **A dropdown trigger uses the live control edge while it is live.** It uses
  `--control-edge`, as `.ui-btn` does. When it is off, it uses `--disabled-border`,
  `--disabled-ink`, and `cursor: not-allowed`. Hover does not take the accent from an
  off trigger. A native disabled trigger also leaves the tab order and does not open.

## Elevation

**A surface casts a shadow only to show that it is higher.** A level keeps its step on a
ladder of lightness in both themes. **Each raised level draws a line. Light adds a faint short
shadow. Dark draws the line only.** In light, the line is `--level-line`, half way between
`--border` and `--border-strong`. A floating surface in dark draws the outer line and an
inner line, and it keeps `--elev-drop`. A line that divides two regions of one surface is not
a level. It stays a line in both themes. Examples include a card's row dividers, a table's
row rules, the rail's head band and the topbar's bottom rule. A field is not a level either
because its edge says "type here". A scroll shade is not a level. A table shades the edge
where columns scroll under its frame or its pinned column, in both themes. A step of lightness on its own has a contrast of about
1.1, so a level never has only its step.

| Level | Light line | Light shadow | Dark line | Dark shadow |
| --- | --- | --- | --- | --- |
| page | none | none | none | none |
| card | none | none | `--border` | none |
| rail | `--level-line`, right side | `--elev-rail` | `--border` | none |
| menu, popover, drawer, toast | `--level-line`, one line | `--elev-drop` | `--border-strong` outside, `--border` inside | `--elev-drop` |
| modal | `--level-line`, one line | `--elev-drop` | none, the deep scrim separates it | `--elev-drop` |

Each level reads its line from one token in both themes: `--card-edge`, `--rail-edge`,
`--float-edge`, `--float-edge-inner` and `--modal-edge`. Re-point the token to change the line
of a level. The modal draws `--modal-edge` as an inset line. On the light page, a card is a
grouping of space, so it draws no line and no shadow; dark keeps the card's line. #850

The ladder, from bottom to top:

| Token | The step | Dark | Light |
| --- | --- | --- | --- |
| `--bg` | the page | `#0e0d14` | `#ffffff` |
| `--surface-2` | non-text sunken marks and tracks | `#161520` | `#e9ecf3` |
| `--surface` | a card | `#211e2d` | `#ffffff` |
| `--bg-elevated` | floating — a menu, a panel, the drawer, a modal, a toast | `#2a2639` | `#ffffff` |
| `--surface-3` | non-text quiet fills | `#2d293c` | `#eef0f5` |

`--ui-document-ground` names the bare backdrop behind a document sheet, and aliases
`--surface-2` in both themes. Use the class `.ui-document-ground` to paint it, so a page reads
its own ground rather than re-declaring the token. #850

**The auth ground sits outside the ladder.** `--ui-auth-ground` is the gradient behind a
sign-in or consent page, and the auth card floats over it. The default split sign-in ground C
measures 1.60:1 to 1.51:1 in light and 1.08:1 to 1.04:1 in dark against the card, below the
3:1 floor, and the owner chose C with those figures.

**Text sits on the page, card or floating panel surface, never on a grey inset.** In both
themes, fields, code blocks, navigation labels and segmented controls use those reading
surfaces. `--surface-2` and `--surface-3` are for non-text fills and tracks. A status chip
is the named exception. It uses a soft fill, and neutral chip tones use
`--chip-neutral-fill`, which stays visible on a card and on a floating panel in both themes.
A code block in the light theme is the other exception: it keeps the quiet `--surface-3`
fill, because a reader never writes in one. Its ink clears 4.5:1 on that fill, with the
lowest value 5.22:1.

**A selected item is the one exception.** Selection is marked by a background highlight. An
enabled chosen segmented pill marks its choice with the strong ink on the surface, `--strong`
with `--surface` text — the neutral form is the default, so a view switch, a filter and a setting
all stay off the page's accent button. Only a product that asks for the accent form takes the
primary button's pair, `--accent-strong` with `--accent-contrast` ink, and a 1px `--accent` edge.
Where the fill is under 3:1 on the track, as
under the default accent in dark, the edge is the mark. A disabled chosen pill and an underline tab
take no edge. A disabled chosen pill keeps `--surface-3` and the disabled
ink.

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

Inside a floating panel, rows keep a reading surface. A hovered row takes its own background fill, distinct from a selected row's fill, and no outline. Fields use the same field tokens as
elsewhere. A chip uses `--chip-neutral-fill` rather than the card surface. The floating panel is
itself lighter than a card in dark, so the card surface is the darker step there.

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
| the page | the card in dark, a quiet fill in light | `--code-bg: var(--code-chip-page)` on `:root` |
| a painted container | the page in dark, a quiet fill in light | `--code-bg: var(--code-chip-surface)` |
| a card on the page | the page in dark, a quiet fill in light | `--code-bg: var(--code-chip-surface)` |
| a table | the card in dark, the page in light | `--table-code-bg`, the pair of `--table-bg` |
| a tinted card or snippet | the card it is a variant of | `--code-bg: var(--surface)` |
| a translucent wash over any of them | the page in dark, the card in light | `--wash-code-bg` |

If you paint your own reading surface, give `--code-bg` the other surface. A table sets
`--table-bg` and `--table-code-bg` together. A wash that takes caller markup sets
`--code-bg: var(--wash-code-bg)`. The chip keeps at least 1.065 against every ground the kit
draws, in both themes.

**A tinted card stays above the page.** `.ui-card--accent` and `.ui-card--live` mix their
colour into `--surface` through `--card-tint`. Dark can spend 9%. Light can spend 5%. On
the light page, where a plain card draws no box, the tint is the one paint the card keeps.

**The ladder is capped by ink.** `--muted` carries state and placeholder information. It
clears AA on every step that the ladder raises. It is re-picked against the top of the
ladder, rather than against the page.

## The focus ring

One indicator: a 2px solid accent band, drawn as a real `outline`, with 1px between it and the
control. There is no halo. The offset is left **unpainted**, so what shows in that 1px is
whatever surface the control is already standing on.

A link that breaks across two lines draws one band per line, because an `outline` follows each
line box it covers. This is the same thing the browser's own outline already did, so a link
gets no new limit by taking the kit's band instead.

A text link, and words that open a hover readout, get a 6px corner and 4px of room at each side
inside the band. Focus moves no word, because the margin gives that room back.

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

**`--ring-scroll` is the indicator a box takes when its own edges are a surface's edges.** It uses
the same 1px gap and 2px band, but draws them inward. A scroll region inside a surface is one such
box. A link filling a table cell is another, and so is a line of text inside a cell that clips.
A navigation rail row takes it too, because the rows stand 2px apart and an outward band covers
the next row. You need both values, or the band appears outside the box.

**Every focusable control the kit ships draws the band**, including a roving row the keyboard
reaches with an arrow key rather than Tab. None falls back to the browser's own outline, which
ignores the accent and is black in both themes. **Every link draws it too,
including one of your own with no class on it.** The ring is claimed for the `a` element, so a
link in running text, a router link and a plain `<a>` used as an action all answer the keyboard
with the band and take nothing to opt into. A component that rings its own anchor — a table
cell's link or the footer's — is the more specific rule and keeps the shape and the
corner it already drew. **A control of your own wears `.ui-focusable`**, the kit's opt-in class,
for a focusable that is neither a link nor a kit control — a `div` or `span` you gave a
`tabindex`.

**A focused control draws the band and nothing beside it.** A boxed text field keeps its 1px border width during visible focus.
The same rule applies to a text area, select and search field. Their border becomes transparent during visible focus.
This applies to every field, including the Dropdown search field. The ring keeps its 2px width and accent ink.
It also keeps a 1px clear gap. Other edges keep their resting ink.
If a hover rule would outrank focus, it stands aside with `:not(:focus-visible)`.
A drop zone still recolours its dashed edge while a file is over it. That edge marks the drop target, not focus.

**An outline means focus; selection is a background highlight.** A selected, current or active
item is marked by its fill, its ink and its weight, never by an edge drawn around it — an edge on
a selected row is the band's own shape one pixel further in. One mark is a deliberate exception
and says so beside its rule: the date picker's current period keeps its accent hairline at rest,
which stands aside while the cell holds focus.

Controls use native `:focus-visible`, including inputs and invalid fields. An invalid field keeps
its error message while its focused border becomes transparent. **Forced colours needs nothing extra**: the band
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

- **One net, over elements rather than classes.** On a touch screen, every `input`, `select`
  and `textarea` is 16px, your own fields too. Both published stylesheets hold the net. Controls
  with nothing to type into keep their size, because they do not zoom. The net uses
  `!important`.
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

**A small field is the full field on a touch screen.** With a mouse, `SearchField size="sm"` is
32px high with `--text-sm`. On a touch screen it is 40px high with 16px text, and its toolbar
and a create row above it stand the same height. So the small size never takes a field under 16px.

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
A back link draws 32 high, and its layer reaches 6 above and 6 below it to make 44.
A drawer title that its ellipsis cuts is a target too. Its layer reaches up and down to make 44.
The title clips its own text, so the layer measures against the readout trigger around it.
A stat band's change with a tooltip has no layer. On a touch phone it is a 44 by 44 target
in the layout, so its figure is taller there.

The whole system applies only below 560px with a coarse pointer, because a coarse pointer has
no hover. `--tap-min` is a token, and you can move it.

**A row that already has the room opens nothing.** The shell's band stays a 52px row, and its
controls reach 44px targets in the room that the band already has.

On a phone, the product topbar uses two rows with a 44px minimum height per row.
Brand, theme and account occupy the first row. The view and version switches occupy the
second row. Both rows use the same 12px side inset, with an 8px gap between rows. The theme switch
and the account end at that inset whatever the version label's width. A band with one row
stays 52px, as on a wide screen.
The theme switch stays 34px square and keeps its 44px target.

Both containers declare `--space-3` of clearance. Half of 12px gives each side 6px,
but the theme switch's layer stops at the 44px floor, 5px from its drawn edge.
The 8px phone gap keeps that layer clear of its neighbour's drawn box. The neighbour
carries no layer of its own there. Above 560px, the topbar keeps its single 52px row
and 14px gaps, and the transparent tap layer does not apply.

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

**A status glyph is circled.** A circled glyph reports a state. A bare glyph names an action.
`Toast` and `Callout` use the circled status glyphs for success, danger and warning:
`circleCheck`, `circleX` and `circleAlert`. Info and neutral callouts use `info`. An explicit
`icon` still wins. A neutral toast still uses `bolt`, because it reports an event without a
verdict.
