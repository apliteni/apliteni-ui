# App shell: a rail the reader folds, with the control in its head and the session in a menu

Closes #277 and #286.

## The decision this is built on

Artur reviewed the first version of this pull request on 2026-09-12 and sent it back: *"I don't
like that. Reuse lessly-hub/lessly-ui solution."*

That version had rejected three of the reference's decisions on cost grounds — the fold snapped
instead of animating, the toggle was opt-in, and a folded row named itself to a pointer and not to
the keyboard. All three rejections are reversed here. The reference is `lessly-hub/lessly-ui`
(`AppSidebar`, `RailToggle`, `useSidebar`), read from the checkout on 2026-09-12, and its 4.0.0
changelog entry is the argument the rework follows:

> A closed rail keeps the column it had open and clips it, instead of rebuilding every row narrow —
> so a mark stands on the same column at both widths and nothing shifts while the rail closes.

> `AppSidebar` always draws its collapse toggle, and it draws it at the rail's foot under a rule of
> its own, where the header band above stays the organization's.

One thing is deliberately not taken, and it is the only one: the reference keeps no state at all,
and this kit keeps the reader's fold in a cookie. #277 asks for it and an HTML kit has no host app
to lean on. It is the first row of the *Not taken* table below.

### The sixth round, and the last rejection it reversed

Artur read the reworked pull request on 2026-09-12 and sent back one line: *"make just one icon like
lessly-ui has."* That is the last row of *Not taken* that argued against the reference on cost
grounds, and it is reversed here. The toggle was the kit's `chevronLeft` turned 180° with the words
"Collapse sidebar" beside it; it is now the reference's own control — one mark, no words, standing
in the glyph column — at the rail's foot then, and in its head band since the round below. What that
took is in the *taken* table, and the row it came out of is gone from *Not taken*.

### The seventh round: the toggle to the head, Sign out into a menu

Artur read the pull request again on 2026-09-13 and sent back two arrows over two screenshots:
*"move toggler to the top?"* — from the toggle at the rail's foot up to the brand row — and
*"move Sign out to User menu?"* — from the Sign out row into a menu on the account block. Both are
taken, and both come out of the same reference this rework follows.

**The toggle is in the head band now.** `app-sidebar.tsx`'s band holds the organization's mark and,
folded, that mark alone, standing in `RAIL_COLUMN_BOX` — the glyph column every row is on. The kit's
band now holds the product's mark and the rail's own control, stacked: the toggle stands *under* the
wordmark, not beside it. Beside it is off the glyph column, so the fold would carry the toggle out
over the rail's closing edge and clip away the one control that opens a folded rail. Stacked, both
marks hold their place and the fold takes only the words — measured below, where the toggle's mark
and the reader's avatar each report one distinct centre across all 29 frames of the travel, the same
36.5px the nav's glyphs hold. The rule that used to sit above the toggle at the foot is now under
the band, so the head is one band rather than two compartments eight pixels apart. This is a
departure from the reference, which keeps its toggle at the foot; it is the first row of *Not taken*
below.

**The account block is a menu trigger.** `user-menu.tsx` makes the avatar, name and address a
dropdown trigger over a menu holding a label and the rows that act on the session, Sign out among
them; folded, the trigger is the avatar alone with its name on hover. The kit does the same with its
own `dropdown()` — `portal: true`, because the rail is `position: sticky` with `overflow-y: auto`
and each of those traps a panel on its own, and `direction: 'up'`, because the block is the last
thing in a full-height rail. Sign out left the nav list to get here, which is the point: it ends a
session rather than going anywhere, and it was the one destructive thing standing among the places a
reader can go. On the folded rail the trigger takes the same name chip every folded row takes, with
the reader's two lines in it. With no `signOutHref` there is no menu and the block is the plain
reader block it has always been — a trigger that opens an empty panel is a control that does nothing.

**What the menu turned up.** Building it on the kit's own `dropdown()` rather than on a menu written
for the rail is what found the defect below: the arrows opened the panel and left focus on the
trigger, in every dropdown the kit ships. That is fixed here, in one rule.

### A defect the port found, in the dropdown and not in the rail

`dropdown()`'s panel is `visibility: hidden` with `visibility` on the same transition as the fade.
`visibility` is discrete: going hidden → visible it is still `hidden` in the frame the open class
lands — and a browser will not move focus into a hidden box. So `openDropdown()`'s `items[0].focus()`
did nothing, focus stayed on the trigger, and since every row carries `tabindex="-1"` the next Tab
left the dropdown altogether. **Every menu the kit ships opened to the arrows and let no keyboard
in.** Measured in Chrome: the panel's resolved `visibility` is `hidden` in that frame and `visible`
in the next.

JSDOM focuses inside a hidden box happily, so none of the gates that press the keys could see it;
`dropdown.css` already had the fix written for the search variant alone, for the same reason stated
in the same words — *"a browser will not focus a field in a box that is still `hidden`"*. It is
every panel's now: one `transition-property: opacity, transform` while the panel is open, closing
untouched. `stories/overlay-css.test.js` is where it is gated, because that file exists for exactly
the rules JSDOM cannot check.

### An independent review of this round, and the eight things it found

A read-only review ran against the two commits above and broke rules on disk to prove each finding.
Seven are fixed here and one is documented rather than changed. Three of them were not about the
rail at all — they were about `dropdown()`, which this round is the first to put on a shipped
surface with a **destructive** row in it.

1. **`wireShell()` stopped keeping its own per-document promise.** It is written to be handed a
   foreign root — a frame's document, an open shadow root — and `wireDropdown()` was not: it
   portalled every panel to the *module realm's* `document.body`, queried that document to close
   dropdowns, and registered its click-outside and Escape handlers once, on it. So a shell in a
   frame put its menu on the page holding the frame, styled by whatever sheet that page has, and
   nothing closed it; a shell in a shadow root had its panel lifted into the light DOM, out of reach
   of every style scoped to that root. Fixed in `dropdown.js`: a portalled panel goes to the top of
   the tree its trigger is in, the close handlers are registered once per document that holds a
   dropdown — the shape `wireShell()`'s own `listen()` already had — and `closeAllDropdowns()` walks
   a registry of wired containers instead of `document.querySelectorAll`, which enters no shadow
   root and sees no other document. The two environment gates in `shell-rail.test.js` now draw a
   shell **with an account**, so the menu is a subject in both; before, their fixture had none and
   the new surface reached neither.
2. **An empty ruled band at the top of every phone /account rail.** The band's hairline and padding
   moved from the toggle's row onto the band, and below 720px the toggle is not drawn — so for a
   shell whose word is in the topbar the band was 12px of padding and a rule over nothing. The
   720px block drops a band with no wordmark in it; the reader's fold cannot take the same rule,
   because there the toggle *is* drawn and hiding the band would take away the only way back to an
   open rail. Named beside the touch floors in `shell-states.test.js` and measured both ways.
3. **A closed dropdown panel took clicks for a quarter of a second.** `visibility` is held at
   `visible` for the whole fade out so the rows do not vanish mid-fade — and a drawn box is a box
   that is hit, with no `pointer-events` rule anywhere in `dropdown.css`. A stray click in that
   window activated a row invisibly, and since this round one of those rows is **Sign out**. This
   is the same defect `overlay-css.test.js` already gates for the drawer, the confirm and the
   palette, and the fix is the one those three already ship.
4. **A gate this round added had quietly weakened an older one.** `accessibleName()` fell back to
   an element's text when it carries no `aria-label` — which the account block needs — but read
   text out of a clone, and a clone has no cascade. A fold that took a label out with
   `display: none` still had the words in `textContent`, so the folded-rail naming gate would have
   passed on rows a browser names nothing. It walks the live tree now and skips what is not
   rendered.
5. **The touch floor's measured half had been relaxed.** Extending the exception list from one
   entry to two turned `min-height` must be `0` on the reader's fold into `must be what it is on an
   open rail`, which is blind to a floor written *outside* the media query — that raises both folds
   together. Both halves are asserted now.
6. **Sign out needs JavaScript.** Not changed: see *What a reviewer should push on*.
7. An `overflow: hidden` + `text-overflow: ellipsis` pair in the menu's head with nothing bounding
   it — the inert pair `.ui-app__who`'s own comment warns about. The address wraps instead.
8. A comment claiming the folded trigger is the only place the address appears; the fold is an
   opacity, so it never left the accessibility tree, and `shell-states.test.js` says so. Reworded.

### One decision made after review, by the coordinator, and reversible

An independent review found that rewriting the 720px block took its
`min-height: 44px` out with everything else: a rail row on a phone went from **44px to 31px**. It
still clears WCAG 2.5.8 (24px) and the kit's own floor, so nothing was red — and the two equality
gates, which hold the reader's fold and the 720px fold identical, are exactly why nothing could be:
equality is silent about a value that falls on both sides at once.

The floor is restored **in the 720px block only**. It cannot be shared with the reader's fold: a
rail row is 35.4px open, so a floor that applied on the press would grow every row and step every
glyph below it down the rail — the one thing *the fold travels, and no glyph moves while it does*
promises not to do, and the thing the evidence below shows. So below 720px, where the strip is the
whole of the rail and a finger is the only pointer it has, a row is 44px (WCAG 2.5.5); on a desktop
fold a row keeps its open height and clears the 24px floor a pointer is held to. That is one
deliberate difference between the two copies, named at the declaration and gated in both
directions — the line cannot go missing, and it cannot spread to the reader's fold.

This is a coordinator's call, not Artur's. Reverting it is one line in `layout.css`, one named
exception in `shell-states.test.js` and one gate in `accessibility-floor.test.js`.

**The phone strip is 16px wider than it was, and that is the same rewrite.** At 375 the rail
measures **74px** on this branch against **58px** on `main` — 4% of the viewport. `main` wrote the
narrow rail as a literal `grid-template-columns: 58px 1fr` with the rail's padding cut to 6px at
that width. This branch stops re-laying the rail out at 720px at all: the narrow rail is the
reader's fold, so it takes the same `--ui-rail-w` the press does —
`--ui-nav-strip` + 2 × `--space-4` + the rule, which is 41 + 32 + 1. The 41 is the glyph column, a
17px glyph inside 12px of a row's padding either side; the 32 is the rail's own inset, unchanged
from the open rail, which is what keeps a focus ring out of the rail's clip. Measured in Chrome at
375×760: `74px`, eight rows, every one of them 44px, and the toggle not drawn. Making it 58 again
means either a second narrow layout — the thing the rewrite removed, and what the two equality
gates exist to refuse — or a smaller inset on the fold as well.

## What this is about

On a desktop the shell's rail is always full width. A reader who wants that room for the page
cannot fold it, and the only fold the kit has switches on by itself below 720px.

**What I found.**

- The kit already draws two icon strips: the shell's own 720px fold (`src/styles/layout.css`) and
  `sidebarNav({ collapsed })` (`src/styles/nav.css`). A reader cannot switch either one.
- `sidebarNav({ collapsed })` forced every group shut and hid its list with `display: none` while
  the group's toggle still flipped `hidden`. On the folded rail the current page's own row was
  gone, and the toggle announced a list nobody could open. Fixed here, and photographed below:
  four rows drawn and the current page missing, against six rows with *Pending* carrying its bar.
- The reference does not persist the state at all: *"Pure — no persistence or context; the host app
  owns persistence"* (`lessly-ui/src/hooks/use-sidebar.ts:20-21`). This kit is HTML and CSS with no
  host app, so if the kit does nothing, "persists across navigation" is left to every consumer.
- A folded row already had a name for a screen reader, since `aria-label` is emitted at every
  width. It had nothing for a sighted reader on the keyboard.

**What I did.** `appShell()` draws a toggle in the rail's head band, under the wordmark, by
default. The press folds the rail from 249px to 74px over `--dur-med` by clipping a column that
keeps its open width, so no glyph moves; the words and the counters fade on `--dur-fast` ahead of
the closing edge. A folded row gives its name back beside the glyph on hover **and on keyboard
focus**, in CSS. `wireShell()` wires the toggle and keeps the choice in a cookie a server can read.
The rail's foot is the account block alone, and it is the trigger of a menu holding Sign out.

## The reference, and what this took from it

| From the reference | Here |
|---|---|
| The column stays open-width and is clipped, so every glyph holds its place while the width animates | The same. 249px → 74px on `--dur-med`, labels and counters on `--dur-fast`. Sampled frame by frame below: the top row's glyph centre is 36.5px on all 22 frames of the travel |
| The toggle is always drawn, under a rule of its own | The same, and `collapsible` is now `true` unless a caller passes `false`. Which end of the rail it stands at is the one thing this does not take — see *Not taken* |
| `app-sidebar.tsx`'s head band: the mark, the words beside it, and folded the mark alone, standing in `RAIL_COLUMN_BOX` | The same band, and the rail's own control in it. The toggle stands **under** the wordmark rather than beside it, because beside it is off the glyph column and the fold would clip away the one control that opens a folded rail. One rule under the band, not one between its two marks |
| `user-menu.tsx`: the account block is a dropdown trigger; the menu holds a label naming the reader and the rows that act on the session; folded, the trigger is the avatar alone with its name on hover | The same, built on the kit's own `dropdown()` — `portal: true` for the rail's clip and its stacking context, `direction: 'up'` because the block is the last thing in a full-height rail. Folded, the trigger takes the same name chip every folded row takes, with the reader's two lines in it. Sign out left the nav list to get here |
| The trigger is a button; the menu opens to Enter and the arrows, Escape closes it and returns focus | The same, and it is the kit's one dropdown wiring rather than a second one written for the rail. Building it this way is what found the defect above: every menu in the kit opened to the arrows and let no keyboard in |
| `RailToggle` is one icon and no words: a frame that holds still, a seam that crosses it, and no tooltip of its own — on a folded rail it takes the same name chip every other row takes | The same, and this is Artur's sixth-round call. The mark is drawn by hand in `shell.js` for the reason the reference gives for not taking lucide's: the divide is baked into the same path as the frame, and only a child of its own can travel — `icon()` emits one opaque string with no hook on an inner node. Only the two nodes are hand-written: the `<svg>` around them is taken from `icon()` at call time, so the box, the stroke and the `aria-hidden`/`focusable` pair are the factory's by construction and not by a second copy |
| `RAIL_COLUMN_BOX`: one 40px box on the glyph column, the same at both widths | The kit's own column, `--ui-nav-strip`. The reference's box is 40 because its glyph is 16; the kit's is 41 because a rail row is a 17px glyph inside 12px of padding, and that is the number `nav.css` already derives the closed rail from. One box, written once, so the mark does not step sideways on the press |
| The seam travels on the same clock as the rail, and stops under reduced motion | The same: `--dur-med` and `--ease`, the rail's own travel and not the words' `--dur-fast`, so the mark and the closing edge arrive together. No `!important`, so the kit's net takes it to one frame with everything else |
| The toggle is a `<button>` whose name says what the press will do (*"Expand sidebar"* / *"Collapse sidebar"*), with `aria-expanded` saying what the rail is, and no `aria-controls` | The same: `railToggle()` in `src/components/shell.js` |
| A folded row shows its name beside it on hover **and on keyboard focus** | The same, in CSS. The reference portals a Radix tooltip; this kit has no positioning library, so the chip is the label itself, taken out of flow and anchored to the row |
| A badge fades out with the words, and the count stays in the row's accessible name | The same. `leafName()` spells the count into `aria-label` at every width, so a counter that fades is not a count that is lost |
| A disclosure row keeps working on the folded rail, and the page the reader is on stays reachable | The same, and this is the #277 defect the first version fixed. A group stays open in the fold, its children become rows of the strip, and the indent travels with the width rather than snapping |
| Motion reads tokens and stops under reduced motion | The kit's own scale: `--dur-med` (250ms) for the width where the reference takes 200, `--dur-fast` (150ms) for the words where it takes 100. Both are the kit's published tokens (`docs/specification.md#motion`); the reference's numbers are its own scale, and writing them here would be two literals `stories/motion-tokens.test.js` refuses |
| The rail collapses rather than hiding off-canvas | The same. Below 720px the kit keeps its CSS fold and draws no toggle, because the strip is the only layout there |

**Not taken, and why — the whole list.**

| The reference | Here, and why |
|---|---|
| The toggle lives at the rail's **foot**, under its own rule, because "the header band above stays the organization's" | **In the head band, under the wordmark.** Artur's call on 2026-09-13: the head is where a reader looks for the control that changes the panel they are looking at. The reference's argument does not transfer cleanly — its band is an organization switcher a consumer fills, and the kit's is a product wordmark the shell draws itself, so there is no second owner for the toggle to crowd. Everything the foot's placement bought is kept: the control is still outside the `<nav>`, still on the glyph column at both widths, still the one row whose chip is not scoped to the fold |
| No persistence: the host app owns it | **Persisted by default, in a cookie. The one deliberate difference.** #277 requires it and an HTML kit has no host state to lean on. A cookie and not `localStorage` because a server can read one: `appShell({ collapsed: railCollapsed(request.headers.cookie) })` paints the stored width before any script runs, where `localStorage` paints the rail open and snaps it shut a frame later |
| A Radix tooltip, portalled to `<body>` and positioned by a floating-UI library | **CSS anchor positioning, with a stated fallback.** Where `anchor-name` and `anchor-scope` are supported the chip is pinned to the row and to the rail's edge, and lands within a hundredth of a pixel of the row's centre through a scroll of the rail, a scroll of the page and a resize — the two cases the earlier attempt failed on, measured below. Where they are not, the chip keeps the place its row gave it at the last layout: exact until the rail scrolls, and then as far above its row as the rail has scrolled, measured at 149.99px after a 150px scroll. That is the whole of what anchor positioning buys and nothing else in CSS does — see "The fallback, and why it is the shape it is" |
| Below 768px a separate JS tree renders a drawer | The kit keeps its CSS fold at 720px, and no toggle below it |
| `railTop`, `header`, `logoCollapsed`, `children`-as-function — the band's and the rail's consumer slots | Still out of scope. `appShell()` composes one rail: the head band draws the product's own mark and takes no node from the caller, and the middle is the kit's `sidebarNav()`. The band itself is taken; the slots in it are a second issue |
| `UserMenu` takes its rows from the caller, with icons, hrefs and a `destructive` flag | The menu holds the reader and Sign out. One row, because one is what the shell has to offer: the rail's own navigation is the caller's `nav`, and the /account preset's topbar already carries an account menu. A `menu` option is a small change to `railUser()` if a consumer asks for one |

## The fallback, and why it is the shape it is

The rail is a scroll box: `position: sticky` for the column, `overflow-x: hidden` to clip the fold,
`overflow-y: auto` for a nav taller than the viewport. That is three constraints on one box, and
together they leave exactly one way out for a chip that has to sit beside a row and outside the
rail. I measured each candidate in headless Chrome rather than reasoning about it — "drawn" is
hit-testing at the chip's own centre, which respects an ancestor's clip where a bounding box does
not:

| The chip is… | Drawn beside the row | Stays on its row when the rail scrolls |
|---|---|---|
| `position: absolute` | **no** — clipped, painted nowhere, whatever you make its containing block | yes |
| `position: fixed` | yes | **no** — 59.99px off after a 60px scroll, which is the scroll |
| `position: fixed` + `anchor()` | yes | yes — 0.01px from the row's centre, through both scrolls and a resize |

`absolute` is one row and not two because the choice a reader expects to have is not there: the
rail is `position: sticky`, which makes it the containing block for every absolutely positioned
descendant. Moving the containing block outward does nothing — with `.ui-app` set to
`position: relative` and the row back to `static`, the chip's `offsetParent` is still
`.ui-app__rail`, and the clip still lands on it.

So a box that escapes the clip has left the rail's scroll with it, and a box that has not escaped
it is not drawn at all. The anchored branch is the mechanism and the unanchored one is a graceful
degradation, not a second implementation. Both are gated in
`stories/apps/shell-states.test.js` — the plain rule must place the chip from `--ui-rail-w`, the
anchored rule must pin `top`, `bottom` and `left` to `anchor()`, in both copies of the fold.

## What this does

- **Drawn by default, in the head.** `appShell()` draws the toggle under the wordmark, in a band
  ruled off from the rows below it; `collapsible: false` is the way out, for a page that will never
  call `wireShell()` and would otherwise ship a control that does nothing. `accountShell()` passes
  both options through.
- **The reader's menu.** The account block is a `dropdown()` trigger when the caller passes
  `signOutHref`, and Sign out is a row of that menu rather than the last row of the navigation
  list. `wireShell()` wires it along with the fold and the nav's groups. The trigger is named by the
  two lines inside it rather than by an `aria-label`, so there is no second copy of them to go
  stale, and the initials are `aria-hidden` because they are made of the name beside them.
- **The fold travels.** `.ui-app.is-collapsed` applies the 720px block's rail rules, written a
  second time behind `:where(.ui-app.is-collapsed)`. `:where()` adds no specificity, so each copy
  ranks the same as its twin. A media query cannot share a block with a class, and that is why the
  rules appear twice. Two gates hold the copies together: one compares the blocks rule for rule,
  reading inside `@supports` and refusing a selector written twice; the other compares every
  computed property on every element of the rail, at rest and focused.
- **The strip is not a number somebody liked.** `--ui-nav-strip` is twice a row's own glyph
  centre — its padding plus half a glyph — which is the one width that leaves the glyph standing in
  the middle of the closed rail. `nav.css` is the only place it and `--ui-nav-col` are written, and
  `shell-states.test.js` derives the strip from the rules it is read off rather than repeating it.
- **Who decides the first paint.** `appShell()` reads no state. A boolean `collapsed` is the
  caller's, and nothing overrides it. A shell drawn without one is marked `data-rail="auto"`, and
  `wireShell()` gives it the reader's stored choice.
- **Persistence, by default.** A press writes `apliteni-ui-rail=collapsed|expanded` (a year,
  `path=/`, `SameSite=Lax`). `wireShell(root, { persist: false })` keeps every shell under that
  root out of the cookie and applies no stored choice to them, shells drawn there later included; a
  later call without the option does not undo it. Each press sends a bubbling `ui-rail` event with
  `detail.collapsed`.
- **Identification.** A folded row keeps its `aria-label`, counter and all. On hover or keyboard
  focus the label itself leaves the flow and lands beside the rail as a chip — one string on screen
  and in the accessibility tree, where a `title` was a second copy that showed to a pointer only.
  No attribute is written, so nothing can go stale. Every folded control keeps the kit's focus ring,
  clears the 24px target floor, and stays drawn, so Tab reaches it.
- **Where it is wired.** `wireShell()` listens once per document it is handed, so a frame and an
  open shadow root work. Only a rail's own toggle folds anything. The Storybook preview now calls
  `wireShell()` in place of `wireNav()`, which it calls for you.
- **Reduced motion.** The kit's net takes both durations to 0.01ms, so the fold arrives in one
  frame. Verified in Chrome with the preference emulated: the rail's resolved
  `transition-duration` is `1e-05s` and the width is 74px on the frame after the press.
- **One icon, and no words.** The toggle is a frame and a seam and nothing else, standing in the
  glyph column — `--ui-nav-strip`, which is a row's padding either side of a glyph and the width the
  closed rail is derived from — so it holds that column at both widths while the rail travels past
  it. The seam crosses the frame on the press, on the rail's own `--dur-med`, and its distance is
  the frame's mirror rather than a number: drawn at 9 in an 18-unit frame, it lands at 15. The name
  is still in the markup, because the name IS the chip — the rail hands the toggle the same one
  every other row gets, instead of a tooltip written for this one control. It gets it at **both**
  widths, not on the fold alone: every other row reads its own name on an open rail, and the toggle
  is the one row that is its mark at both, so its chip rule carries no `.is-collapsed` scope. That
  is the reference's own arrangement — `app-sidebar.tsx` wraps `RailToggle` in a tooltip at both
  widths, and only the offset varies with the fold.
- **`sidebarNav({ collapsed })`.** A group is no longer forced shut, its list is no longer hidden
  by CSS, and a row with no glyph gets the fold's dot.
- **The head band, and the foot.** The band holds the product's mark and the toggle, stacked, with
  one rule under the pair. The foot is the account block alone, over the rule that used to fence
  sign out off inside the nav. The avatar is inset by half the difference between the glyph column
  and itself, so it stands on the line every glyph above it stands on, and the block declares the
  height the avatar gives it — a number `accessibility-floor.test.js` can read, held to that
  arithmetic by `shell-states.test.js`.

## Before / After

Same viewport (1280×760), same nav, same data, both themes. Before is `origin/main` at `bb5fd04`
and after is this branch; **both sides are shot by the same rig** — one static server over the
checkout under test, the kit's own factories imported as modules in the page, one Chrome, one
viewport — so only the code differs. The before pair came back byte-for-byte identical to the pair
already committed, which is the cross-check that the rig is the one that made them.

**The rail on a desktop.** Before: no way to fold it, and Sign out as the last row of the
navigation. After: the toggle in the head band under the wordmark, reached by **two** real Tab
presses so the focus ring and the name chip are the browser's own and not a state forced on; the
account block at the foot, over a rule, carrying the chevron that says it opens something. The
chip is 130.1 × 31.4, 8px clear of the rail's edge, and centred on the toggle within eight
thousandths of a pixel.

| | Before | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-before-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-after-expanded-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-before-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-after-expanded-light.png) |

**The reader's menu, opened from the keyboard.** Nine Tab presses reach the account block; one
ArrowDown opens the menu and lands focus on Sign out, which is why the row carries the ring and
the `--pink` ink in the shot. A press on the block would show the same panel and prove less. The
menu's head names the reader, and the row is a `menuitem` with the caller's `signOutHref`.

| dark | light |
|---|---|
| ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-user-menu-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-user-menu-light.png) |

**The fold, frame by frame.** Six frames taken off the compositor with `Page.startScreencast` and
captioned with the time each was painted, so the clock is the browser's and not a screenshot call's
latency. Every glyph holds its column while the words fade and the width travels, the group's
children walk back onto their parent's column, the toggle in the head renames itself on the first
frame — the chip beside it already reads *Expand sidebar* at 0 ms, while the rail is still 249px
wide — and the reading column widens frame by frame.

| dark | light |
|---|---|
| ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-fold-frames-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-fold-frames-light.png) |

**Folded, and a folded row under the keyboard.** Eight real Tab presses reached *Access & agents*;
the chip is its own label, 8px clear of the rail's edge and centred on the row. The head is the
brand mark with the toggle under it, both on the glyph column; the foot is the avatar, on that same
column.

| | Folded | Focused |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-collapsed-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-collapsed-focus-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-collapsed-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-collapsed-focus-light.png) |

**Persists across navigation.** The page is drawn with no `collapsed` at all and loaded with the
cookie already set, which is what a second page load looks like. `wireShell()` applied the stored
choice.

| dark | light |
|---|---|
| ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-persisted-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/rail-persisted-light.png) |

These two files differ from the folded pair above in **0 pixels of 972,800** — two independent
shots, taken on separate loads and compared channel by channel, not one file copied. That is what a
persisted fold looks like — but it means the pictures are not themselves evidence of persistence, and a reviewer
should not read them as such. What is evidence is in *Measured in a browser* below: the cookie read
back off the browser's own jar (`apliteni-ui-rail=collapsed`, `path=/`, `SameSite=Lax`, 365 days),
and a second load drawn with no `collapsed` coming up `class="ui-app is-collapsed"
data-rail="auto"` with the toggle already named *Expand sidebar*. `stories/apps/shell-rail.test.js`
gates all of it.

**`sidebarNav({ collapsed })` with the current page inside a group.** Before: the group is shut,
its list is `display: none`, the current page is gone and four rows are drawn. After: the group is
open over it, six rows are drawn, and *Pending* carries its active bar. Counted in the browser on
what is drawn, not on what is in the DOM — a folded-away row is still a node.

| | Before | After |
|---|---|---|
| dark | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/nav-collapsed-before-dark.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/nav-collapsed-after-dark.png) |
| light | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/nav-collapsed-before-light.png) | ![](https://raw.githubusercontent.com/apliteni/apliteni-ui/e678ac1/docs/evidence/nav-collapsed-after-light.png) |

## Measured in a browser, not asserted

Headless Chrome 152, the kit's own factories and stylesheets, the shell wired by `wireShell()`.
Every figure below was re-measured after the rebase onto `7ffbde4`.

**The travel** — the rail, the top row's glyph centre, a group child's glyph centre, **the toggle's
mark and the reader's avatar**, the label and badge opacities and the reading column's left edge,
sampled on every animation frame from the press and read off at the times below:

```
           railW   topGlyph   subGlyph   foldMark   avatar   label   badge   mainLeft
t=1        249.0       36.5       65.5       36.5     36.5    1.00    1.00      334.5
t=44       240.3       36.5       64.1       36.5     36.5    0.83    0.83      330.1
t=77       200.4       36.5       57.7       36.5     36.5    0.31    0.31      310.2
t=110      141.6       36.5       48.3       36.5     36.5    0.08    0.08      280.8
t=160       95.7       36.5       41.0       36.5     36.5    0.00    0.00      257.8
t=243       74.4       36.5       37.5       36.5     36.5    0.00    0.00      247.2
settled     74.0       36.5       36.5       36.5     36.5    0.00    0.00      247.0
```

29 frames were sampled, and across all of them the top row's glyph, the toggle's mark and the
avatar each report **one** distinct centre: 36.5px, the glyph column. That is the whole of the
claim the head band and the account block have to keep — the two marks that moved in this round
stand exactly where the rows between them stand, and the press moves neither. The child's glyph
walks 29px onto its parent's column rather than jumping there, because the nested list's indent is
on the same clock as the width.

**The chip**, with focus moved by real Tab presses so `:focus-visible` is the browser's own. `dY`
is the chip's centre minus the row's centre; `gap` is the chip's left edge minus the rail's right
edge. The right-hand pair is the same run with the `@supports` block's declarations neutralised,
which is what a browser without `anchor-name` falls back to.

```
                                anchor positioning          the fallback
                                dY      gap   railScroll    dY       gap
first row, at rest              -0.01        8       0      -0.01        8
a row 255px down the rail       -0.01        8       0      -0.01        8
the rail scrolled 150 under it  -0.01        8     150     149.99        8
after a resize to 900           -0.01        8       0      -0.01        8
after the page scrolls 200      -0.01        8       0      -0.01        8
hover, no keyboard              -0.01        8       0      -0.01        8
```

**Every chip the rail draws**, re-measured after the move. `dY` is the chip's centre minus its
control's centre; `gap` is the chip's left edge minus the rail's right edge:

```
                                          chip box       dY     gap   text
open rail,   the toggle               130.08 x 31.39   -0.01    8.00   Collapse sidebar
folded rail, the toggle               122.56 x 31.39   -0.01    8.00   Expand sidebar
folded rail, a nav row                 82.50 x 31.39   -0.01    8.00   Overview
folded rail, the account block        123.02 x 46.50    0.00    8.00   Ada Lovelace / ada@apliteni.com
```

The toggle is the one row that is icon-only on an open rail as well, so its chip rule carries no
`.is-collapsed` scope, and its two boxes differ by the words alone. The account block's chip is the
reader's own two lines — the block *is* the label there — which is why it is 46.5 tall where a row's
is 31.4. Before this round the block was not a control at all and had no chip, no ring and no menu.

**The chip after the rail scrolls under it**, in a 420px viewport so the rail really overflows, with
the `@supports` block's declarations neutralised on the right — which is what a browser without
`anchor-name` is left with:

```
                                        anchored dY   fallback dY
a folded row                                  -0.01         59.99   (the rail scrolled 60px)
the account block                              0.00         58.00   (the rail scrolled 58px)
```

The fallback is exact everywhere the rail has not scrolled, and off by exactly the scroll where it
has — for the new chip exactly as for the old one. That is the one line in this table that anchor
positioning buys, and it is why the `@supports` branch exists.

**The reader's menu, in a real browser.** Nine Tab presses reach the account block. Before the
press the trigger says `aria-expanded="false"` and the panel resolves `visibility: hidden`; one
ArrowDown and the trigger says `true`, the panel resolves `visible` **in that frame**, and focus is
on the row `.ui-dropdown__item.is-danger`, whose label reads *Sign out* and whose ink is
`rgb(233, 124, 165)` — `--pink`, which the row reaches under the keyboard as well as under the
pointer since this round. The panel opens upward, 9px above the trigger and flush with its left
edge — 9 is `--ui-dropdown-gap`, the one number both the sheet's edges and the portal's JS read.
Escape closes it and hands focus back to `.ui-app__user-trigger`.

Without the one-rule fix above, the same run leaves `visibility: hidden` in that frame and focus on
the trigger: the menu opens and the keyboard cannot enter it.

**Reduced motion.** With the preference emulated, `getComputedStyle(rail).transitionDuration` is
`1e-05s` and so is the seam's; the rail measures 249, 74, 74, 74 on the four frames after the press,
so it arrives in one. Without it the travel is the table above.

## The gates this adds, and the mutation that kills each

Each rule was broken on disk against the code as it stands after the rebase, the named gate was run
for real, and the file was restored and its SHA-256 compared with the one taken before the edit. A
mutation whose text did not appear exactly once in the file was refused rather than applied, so
nothing below is a mutation that missed its mechanism.

| Mutation | Gate | Result |
|---|---|---|
| the collapsed dot rule is made to match nothing | `shell-states.test.js` | **1 red** |
| a divergent duplicate is added earlier in the 720px block | `shell-states.test.js` | **2 red** |
| the collapsed rail is given an inset the 720px rail does not have | `shell-states.test.js` | **2 red** |
| a `font-weight` is put on the collapsed rows only | `shell-states.test.js` | **2 red** |
| the chip is placed from a literal instead of the rail's own width | `shell-states.test.js` | **3 red** |
| the chip is positioned `relative`, so the rail clips it | `shell-states.test.js` | **5 red** |
| the anchored chip loses both of its ends | `shell-states.test.js` | **2 red** |
| the 720px fold loses its `@supports` block | `shell-states.test.js` | **2 red** |
| a folded row is allowed to shrink under the 24px floor | `accessibility-floor.test.js` | **2 red** |
| the label stops moving between the two states | `motion-coverage.test.js` | **1 red** |
| a group is forced shut on the folded rail again | `shell.test.js` | **1 red** |
| the count is dropped from the name a folded row answers to | `shell-rail.test.js` | **1 red** |
| the opt-out is checked on the shell alone, not on its root | `shell-rail.test.js` | **2 red** |
| the stored choice is applied to an opted-out shell | `shell-rail.test.js` | **1 red** |
| any `[data-rail-toggle]` on the page folds the nearest shell | `shell-rail.test.js` | **1 red** |
| the cookie loses `path=/` | `shell-rail.test.js` | **3 red** |
| the cookie loses `max-age`, so it dies with the session | `shell-rail.test.js` | **1 red** |
| `wireShell()` reads the page's cookie instead of the document it was handed | `shell-rail.test.js` | **1 red** |
| a missing Cookie header falls back to this document's cookie | `shell-rail.test.js` | **1 red** |
| the caller's boolean is overridden by the cookie | `shell-rail.test.js` | **2 red** |
| `collapsible` falls back to opt-in | `shell.test.js` | **2 red** |

Four gates were added after an independent review, each with the mutation that kills it. The first
three close a hole the review found; the fourth is the floor it found missing.

| Mutation | Gate | Result |
|---|---|---|
| **both `transition: width` lines deleted — the fold snaps** | `shell-states.test.js` | **1 red** (before: 0 red across eight gates, 259 tests) |
| the fold's duration written as the literal `0.25s` | `shell-states.test.js` | **1 red** |
| the nav's travel written `!important`, outranking the reduced-motion net | `shell-states.test.js` | **1 red** |
| `reduced-motion.css`'s clamp stripped of its `!important` | `shell-states.test.js` | **1 red** |
| a folded sub-row made `display: none` | `accessibility-floor.test.js` | **1 red** (before: 0 red — the check could not fail) |
| the phone strip's `min-height` deleted | `accessibility-floor.test.js`, `shell-states.test.js` | **2 red** |
| the phone strip's floor spread to the reader's fold | `shell-states.test.js` | **2 red** |

Two rules are asserted both ways rather than mutated, because the mutation is the assertion's own
negation: a fold writes no `title` and the chip's text is the row's own label
(`shell-rail.test.js`), and `collapsible: false` draws no toggle and folds nothing, checked against
a fake `document` holding the cookie (`shell.test.js`).

The floor gate de-duplicates controls by class, so a folded row, which has the same classes as an
open one, was never measured. Folded-rail controls are now collected separately and every one is
measured.

Four more arrived with Artur's one icon, and they hold the two halves of it: the mark is the state,
and the control is the column. Each rule was broken on disk against the code as it stands, the gate
was run for real, and the file was restored and its SHA-256 compared with the one taken before.

| Mutation | Gate | Result |
|---|---|---|
| **the folded rail stops moving the seam — one mark, drawn twice** | `shell-states.test.js` | **2 red** |
| the seam travels 4 units instead of the frame's own mirror | `shell-states.test.js` | **1 red** |
| the seam loses its transition, so the mark arrives before the edge | `shell-states.test.js` | **1 red** |
| the seam's travel written `!important`, outranking the reduced-motion net | `shell-states.test.js` | **1 red** |
| the seam timed with the literal `0.25s` | `shell-states.test.js` | **1 red** |
| the seam drawn on the frame's centre, so its mirror is no travel at all | `shell-states.test.js` | **1 red** |
| the control given the whole row back, so its mark steps sideways on the press | `shell-states.test.js` | **1 red** |
| the column written as the literal `41px` rather than `--ui-nav-strip` | `shell-states.test.js` | **1 red** |
| **the toggle's chip re-scoped to `.is-collapsed`, so an open rail's is nameless again** | `shell-states.test.js` | **1 red** |

Fourteen more arrived with Artur's seventh round — the toggle in the head, the reader's menu, and
the dropdown defect the menu turned up. Each rule was broken on disk against the code as it stands,
the named gate was run for real, and the file was restored and its SHA-256 compared with the one
taken before. A mutation whose text did not appear exactly once was refused rather than applied;
none was.

| Mutation | Gate | Result |
|---|---|---|
| **the toggle goes back to the rail's foot** | `shell-rail.test.js` | **13 red** |
| **sign out goes back into the nav's footer slot** | `shell.test.js`, `shell-rail.test.js` | **3 red** |
| **an open dropdown panel keeps `visibility` on the clock — the keyboard cannot enter any menu** | `overlay-css.test.js` | **1 red** |
| the menu trigger writes an `aria-label` over the words inside it | `shell-states.test.js` | **1 red** |
| the account block loses the height the mark inside it gives it | `accessibility-floor.test.js`, `shell-states.test.js` | **3 red** |
| the account block's declared height stops matching that mark (38 → 40) | `shell-states.test.js` | **1 red** |
| the phone strip's 44px floor is taken off the account block | `shell-states.test.js` | **1 red** |
| the phone strip's floor spreads to the account block on the reader's fold | `shell-states.test.js` | **2 red** |
| the avatar's inset is written as the 5.5px it comes to | `shell-states.test.js` | **1 red** |
| the account block's chip is dropped from the 720px fold | `shell-states.test.js` | **1 red** |
| the head band's rule moves back between the wordmark and the toggle | `shell-states.test.js` | **1 red** |
| nothing closes the rail — the account block loses its rule | `shell-states.test.js` | **1 red** |
| the destructive menu row is `--pink` under the pointer and not under the keyboard | `shell-states.test.js`, `signal-contrast.test.js` | **4 red** |
| the toggle's mark is dimmed past the 3:1 floor a control answers to | `shell-states.test.js` | **1 red** |

The first two are the round's two asks, and they are what the equality gates could never have
noticed on their own: moving a control from one end of the rail to the other changes no computed
property of anything. What notices is the wiring — `wireShell()` addresses the toggle through the
head band and nowhere else — and the markup gates that say where sign out is.

And eight more for the review fixes above, run the same way:

| Mutation | Gate | Result |
|---|---|---|
| **a portalled panel is lifted onto the page holding the frame** | `shell-rail.test.js` | **2 red** |
| the close handlers go back to one document | `shell-rail.test.js` | **1 red** |
| `closeAllDropdowns()` goes back to querying the page | `shell-rail.test.js` | **2 red** |
| **a closed dropdown panel is hit-testable again** | `overlay-css.test.js` | **1 red** |
| the empty head band is drawn on a phone again | `shell-states.test.js` | **1 red** |
| the phone rule spreads to the reader's fold, taking the toggle with it | `shell-states.test.js` | **2 red** |
| the touch floor is written outside the media query, raising both folds at once | `shell-states.test.js` | **1 red** |
| a folded row's label is `display: none` and its `aria-label` is gone | `accessibility-floor.test.js` | **1 red** |

The last one is the mutation the review used to show the naming gate had gone blind: against the
helper as this round first wrote it, it reported **0 red**.

One mutation is reported as **0 red** and is not a hole: filling the mark
(`fill="none"` → `fill="currentColor"`) changes nothing a reader sees, because
`.ui-nav__ic svg { fill: none }` in `nav.css` decides the paint for every glyph on the rail and
outranks the attribute. Checked in JSDOM rather than assumed — the resolved fill is
`rgba(0, 0, 0, 0)` with the markup filled.

## The review history

Three read-only reviews ran against the first version, each followed by a fix round, and an
independent review of the whole wave (`review-wave-1.md`) broke seven rules on disk and watched the
named gate go red each time. The seventh round added an eighth mechanism — the reader's menu — and
its own fourteen mutations above. What those rounds fixed is still in the code and still gated:

- `persist: false` can no longer be undone by a later default call, it covers shells drawn under
  the root later, and it keeps the stored choice off them.
- Only a rail's own toggle folds anything; a stray `[data-rail-toggle]` in the page body used to
  fold a shell that had no way back.
- The rule-for-rule gate refuses a selector written twice, since a second copy is where a drift
  would hide.
- The cookie's `path=/` assertion is real: the test page lives at `/app/page`.
- A frame reads its own cookie, not the page's.
- The factory read `document.cookie`, so one call drew different markup on a server and in a
  browser. It reads nothing.
- A press in a document with no window (`DOMParser`, `createHTMLDocument`) folded the rail and then
  threw before sending `ui-rail`. It is guarded, and not gated: JSDOM reports a listener's error in
  a window-less document nowhere, so a test for it passes with the guard removed and is worth less
  than the line it would take.

**What the rework reverses.** The second diff review found five critical problems in the *script*
that placed the focus tag — stuck after a click or a tap, stale after a resize, wrong under a
`transform` wrapper, blind inside shadow roots — and the first version's answer was to delete the
tag. This version does it in CSS instead, which has none of those five failure modes: there is no
script, no listener and no measurement, so there is nothing to go stale and nothing a wrapper can
mislead. The two cases that review named, a scrolled rail and a resize, are measured above.

**Declined, with the reason.**

- *An open group and a shut one look the same in the fold.* That was already true at 720px. It is a
  design call about the strip and belongs in its own issue.
- *The dot and the un-indented list exist three times, with `0.62` unnamed.* Naming the
  resting-glyph opacity is a token change beyond this issue.
- *`wireNav()` in frames and shadow roots.* It predates this issue. The docs say what it does.
- *Right-to-left.* The kit records that it is LTR-only (`stories/button-chrome.test.js`).
- *A folded shell also folds a shell nested in its body.* Nobody nests shells, and the 720px fold
  already folds every shell on the page.
- *The menu could carry the account nav as well.* The rail already draws those rows; a menu that
  repeats them is the `#127` drift in miniature. `accountShell()`'s topbar keeps its own account
  menu, which is the surface that answers for the preset.

## Rebased twice, and what each rebase touched

**Onto `7ffbde4`** (#292, #289, #293, #267). One conflict, in `src/styles/icon-size.test.js`: both
sides move `EXPECTED_SUBJECTS`, #267 up by four for the stat band's change arrow and trend slot,
this branch down by two because the folded rail stopped sizing its glyph a second time. Resolved to
**68**, with both justifications kept in the comment above it, as that tripwire asks.

**Onto `bb5fd04`** (#302, #300, #301). One conflict, in `stories/button-chrome.test.js`: #301 moved
the gate's whole reasoning block into `CONTRIBUTING.md`, and this branch had corrected two line
numbers inside it. Resolved to #301's shape, with both corrections applied where the prose now
lives — `.ui-nav__item {` moved down 23 lines in `nav.css` when the fold gave it a `transition`,
and the direction audit's one logical property, `margin-inline: auto`, moved down 91 in
`layout.css`. The second needed a backticked anchor after its citation as well as a line, since
`scripts/code-refs.test.js` refuses a bare path-and-line. `PR.md` conflicted as a whole file, which is what a PR body always does; this
branch's is kept. `EXPECTED_SUBJECTS` did not move again — nothing in this round adds or removes a
rule that sizes a glyph.

**No third rebase.** This round starts on `bb5fd04`, which is still `origin/main`, so nothing was
replayed and nothing conflicted.

Every figure and every mutation in this body was re-run against the tree as it stands, and every
screen of the rail — both ends of it — was re-shot in both themes, off the same rig as the before
pair.

## The version bump this PR does not carry

`src/components/shell.js` and `src/components/nav.js` are inside the published tarball and their
bytes changed, while `package.json` still says `0.31.0`. CI's `Shipped surface vs version` job
compares the tarball against the base and exits non-zero when the surface moves and the version
does not — **so this branch fails that check as it stands, and it is the only red one.** Several
PRs are in flight and this repo has already shipped two bumping to the same version, so the
coordinator sequences the version at merge. The changelog lines are under *Changelog entry* below.

## Proof

- [x] A person meets it in something running: the screens above, in both themes, and the filmstrip.
- [x] The fold animates and no glyph moves while it does. Sampled frame by frame in Chrome, and the
      arithmetic behind the strip is gated rather than written down twice.
- [x] The toggle is drawn by default, in the head band under the wordmark, over a rule of its own.
      Two Tab presses reach it; its mark's centre is the glyph column on every frame of the travel.
- [x] The account block is a menu trigger and sign out is a row of that menu, reachable from the
      trigger by keyboard and gone from the navigation list. Nine Tabs and one ArrowDown, measured
      in Chrome, with the row carrying the ring and the `--pink` ink; Escape hands focus back.
- [x] Every menu the kit ships can be entered from the keyboard. It could not before this branch —
      one rule, and the gate that notices is in the file written for the rules JSDOM cannot check.
- [x] The toggle is one icon and no words, as the reference's is, and the seam moves with the state.
      Photographed in both themes and frame by frame through the travel; the distance is held to the
      mark's own geometry rather than to a number repeated in a test.
- [x] A folded row shows its name on keyboard focus as well as hover, and stays beside the row after
      the rail scrolls and after a resize. Measured in Chrome; the fallback's limit is measured too
      and stated rather than glossed.
- [x] A badge fades out and its count stays in the row's accessible name.
- [x] A disclosure row keeps the current page reachable on the folded rail. Photographed before and
      after, and gated.
- [x] The folded state persists across navigation, and a server can paint it first.
- [x] `prefers-reduced-motion` takes the fold to one frame. Verified in Chrome, and the net is
      gated by `stories/reduced-motion.test.js`.
- [x] `npm run build` and the React tests pass; `npm test` is green but for
      `stories/contrast.test.js`'s wall-clock ceiling on this box, which fails the same way with
      this round reverted. Counts below.
- [ ] Exercised in the finance portal. Not done here: it installs a published version, so this can
      only be proven after a release.

**Counts on this box.** `npm test`: 1459 tests, 1457 pass, 1 fail, 1 skipped. The skip is the
opt-in `CONTRAST_ACCENTS=1` theme × accent matrix, which is behind an environment variable on
`main` too. The failure is `stories/contrast.test.js`'s own wall-clock ceiling: the
walk took **122.0s** against a 120s bar. That is this box, not the diff, and it is measured rather
than assumed — `origin/main` at `bb5fd04`, checked out beside this branch and run through the same
gate on the same machine, takes **128.7s** and fails it harder. `npm run build`: clean. React: 322 tests in 16 files, all
passing. (1437 before the first review fixes, 1441 after them, 1446 at the sixth round; the
thirteen this round adds are the toggle's mark against a control's contrast floor, the avatar's
inset, the account block's declared height, the block's phone floor in both directions, the head
band's and the foot's rules, the empty band a phone drops, the menu's markup, its keyboard path, its
press, the shell that draws neither, the open panel's `visibility`, and the closed panel's clicks.)

## What a reviewer should push on

- **The fallback.** Without anchor positioning a folded row's chip drifts by the rail's scroll
  offset. The table above says why nothing in CSS does better, and the honest alternatives are a
  `title` on every rail row at every width — a native tooltip repeating a label a reader can already
  see, and two names on hover where anchor positioning *is* supported — or a positioning script,
  which is what the last review killed. If you would rather have the `title`, say so and it is four
  lines.
- **`--dur-med` where the reference takes 200ms.** The kit's scale has no 200. Adding one is a
  token change; using 250 keeps the fold on the same clock as every other surface the kit moves.
- **A glyph drawn outside `icons.js`.** The toggle's mark is written in `shell.js`, which makes it
  the one stroked glyph in the kit that the icon set does not hold. The reason is mechanical — a
  seam that travels has to be a child a stylesheet can reach, and `icon()` returns one opaque
  string — but it is still a second place a glyph can live, and the alternative is an `icon()` that
  takes a class for an inner node. Say so and it is a small change to the factory.
- **A 41px box where the reference's is 40.** The kit's rail row is a 17px glyph inside 12px of
  padding, so its glyph column is 41; the reference's is 16 inside 12, so its is 40. Taking the
  reference's number would put the mark a half-pixel off the column every glyph above it stands on,
  which is the one thing the fold's travel promises not to do.
- **A cookie by default, for a year.** shadcn keeps its cookie for 7 days and GitLab for 10 years.
  `localStorage` was rejected because a server cannot read it.
- **No keyboard shortcut.** shadcn uses Cmd/Ctrl+B, GitLab `mod+\`, Atlassian Ctrl+[. All three
  collide with something. One can be added later without changing anything here.
- **`collapsible: false` still exists.** The reference deleted its opt-out in 4.0.0. This kit keeps
  one because nothing works until a consumer calls `wireShell()`, and the README's own example did
  not, until this pull request.
- **The toggle in the head rather than the foot.** This is the one place the rework now departs
  from `lessly-ui`, and it is Artur's call. The reference's argument for the foot — "the header band
  above stays the organization's" — does not transfer: the kit's band is a product wordmark the
  shell draws itself, not a switcher a consumer fills, so there is no second owner to crowd. If the
  argument does transfer after all, moving it back is one expression in `appShell()` and one
  selector in `wireShell()`.
- **Sign out needs JavaScript now.** It was an `<a href>` in the nav list that worked with none; it
  is a row of a menu a `dropdown()` opens. `wireTopbar()` wires dropdowns too, so the published
  `/account` path is covered either way — but a consumer who wires neither loses sign out, where
  before they lost only the fold. The toggle has `collapsible: false` for exactly this case and the
  menu has no equivalent; the answer here is "do not pass `signOutHref` on a page that will never
  call `wireShell()`", stated in the spec and in `docs/library.md`. Say the word and it is a
  `menu: false` beside `collapsible: false`.
- **`signOutHref` with no `account` now draws nothing.** This is the one behaviour change a
  consumer can be surprised by, so it is stated rather than buried: the menu hangs off the block
  that says who is signed in, and with nobody signed in there is no session to end and no block to
  hang it on. Before this round the same call drew a Sign out row in the nav's footer under an empty
  reader block. `accountShell()` is the path most likely to hit it — its `account` defaults to `{}`
  — and on those pages the topbar's own account menu still carries Sign out, so nothing is stranded.
  If a rail should offer Sign out to nobody, say so and it is a fallback row in `railUser()`.
- **A menu with one row in it.** `UserMenu` takes a list; this takes `signOutHref` and builds one
  row from it. Adding a `menu` option to `railUser()` is small, and it is not added here because
  nothing in the kit has a second row to put in it — the rail's navigation is the caller's `nav`,
  and `accountShell()`'s topbar already carries an account menu of its own.
- **Two account menus on the /account preset.** `accountShell()` draws a topbar whose account menu
  already ends in Sign out, and the rail's block now offers one too. That was true before this round
  as well, with the rail's sign-out row instead of a menu; it is a preset question, not this one's.
- **One rule under the head band on a phone.** Below 720px the toggle is not drawn, so the band is
  the wordmark with a hairline under it. That is the reference's arrangement — its divider sits
  under the band at both widths — but it is one more line on the narrowest screen.

## Changelog entry

- `appShell()` draws a toggle in the rail's head band, under the wordmark, that folds the rail to
  the icon strip used below 720px and opens it again. The fold animates: the rail's column keeps
  its open width and the box closes over it, so every glyph holds its place while the width travels
  and the words and counters fade ahead of the closing edge. `collapsible: false` draws no toggle,
  for a page that will never call `wireShell()`.
- A folded row gives its name back beside the glyph on hover and on keyboard focus, drawn in CSS.
  Where the browser has CSS anchor positioning the chip is pinned to the row and follows it through
  a scroll and a resize.
- `wireShell()` wires the toggle and the nav's groups. The reader's choice is kept in the
  `apliteni-ui-rail` cookie and applied to any collapsible shell drawn without `collapsed`. A server
  can pass `railCollapsed(request.headers.cookie)` to paint the right width first.
  `wireShell(root, { persist: false })` keeps every shell under `root` out of the cookie, and each
  press sends a `ui-rail` event.
- The toggle is one icon and no words: a frame that holds still and a seam that crosses it when the
  rail folds, standing in the glyph column so it keeps its place at both widths. On a folded rail it
  takes the same name chip every other row takes, rather than a tooltip of its own.
- `sidebarNav({ collapsed })` no longer forces a group shut or hides its list, so the current page
  stays reachable on the folded rail. A row with no glyph gets a dot.
- The signed-in reader at the rail's foot is the trigger of a menu, and Sign out is a row of it
  rather than the last row of the navigation list. **`signOutHref` without an `account` now draws
  neither**: the menu hangs off the block naming the reader, and there is no session to end without
  one. The menu is the kit's own `dropdown()`, wired by
  `wireShell()`; it is portalled clear of the rail and opens upward. With no `signOutHref` the block
  stays the plain reader block and no menu is drawn.
- A dropdown panel is visible in the frame it opens rather than the next one, so the arrows can put
  focus on a row. Every menu the kit draws was opening to the arrows and leaving focus on the
  trigger, with the next Tab stepping out of the dropdown entirely. A destructive dropdown row now
  turns `--pink` under the keyboard as well as under the pointer.
- New exports: `wireShell`, `railCollapsed`, `RAIL_COOKIE`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01F6sVNZxbvjxdZ6J1NtpH26
