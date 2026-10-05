# The library (`@apliteni/apliteni-ui`)

A framework-agnostic **HTML + CSS** design system: design tokens, one stylesheet per
component, and factory functions that return HTML strings.

```js
import { button } from '@apliteni/apliteni-ui';
button({ label: 'Save', variant: 'primary' });
// → '<button type="button" class="ui-btn ui-btn--primary"><span>Save</span></button>'
```

Strings rather than components, so a server that renders HTML can adopt the kit without a
rewrite; Storybook renders the same strings for review.

This page is what ships, what to import, what every published name is, and what each component
promises you. [foundations.md](foundations.md) is the other half — the tokens and the floors.
The design rules for a screen are in [the guidelines](../guidelines/overview.md); React's own
notes are in [react/README.md](../react/README.md).

## Entry points

| Import | Use |
|--------|-----|
| `@apliteni/apliteni-ui` | The factories (`button`, `card`, `topbar`, …), with TypeScript declarations. |
| `…/css` | The whole stylesheet, for bundler/browser builds. |
| `…/inline` | CSS as **strings**, for server-render inlining (`tokensCss`, `topbarCss`, `cssText`, …). |
| `…/tokens`, `…/accents` | Just the tokens / accent sub-themes. |
| `…/react`, `…/react/css` | The React wrapper over the same CSS, and its own stylesheet. |
| `…/motion` | The motion helpers. |
| `…/guidelines/*` | The guideline pages, as Markdown. |

There is no runtime dependency and no build step between the source and the stylesheet you read,
so you may ship it as it stands. `…/css` and `…/inline`'s `cssText` carry the same stylesheets in
the same cascade order. Taking individual sheets out of `styles` instead means taking every sheet
a component needs: `successPanel()` needs `styles.callout` and `styles.success`, both after
`tokensCss` and `baseCss`.

### The React stylesheet does not re-emit a kit sheet

Import `@apliteni/apliteni-ui/css` and then `@apliteni/apliteni-ui/react/css` — both, and in
that order. The React stylesheet carries what React's own components add, not a second copy of
the kit.

**The kit CSS is a peer, not a dependency of a React component.** A kit sheet a React module
imported would be re-emitted into `react/dist/index.css`, landing *after* the kit's own copy in
your document, where at equal specificity it would overrule it.

Four sheets do travel with the React bundle, and only because order cannot change what they
decide: the reduced-motion net, the 16px field net, the tap-zone sheet and the hover readout's
sheet. Each is behind a media query or written so it has no specificity to lose, and they are
there for the consumer who takes `@apliteni/apliteni-ui/react/css` alone.

## Tokens & theming

Everything visual is a CSS custom property, driven by two orthogonal attributes on `<html>`:

```html
<html data-theme="dark" data-accent="phoenix">
```

- **`data-theme`** = `dark | light` — surfaces, text, borders, and the fixed signal colours.
- **`data-accent`** = `phoenix | ocean | emerald` (absent = **Nebula**, the purple default) —
  re-points only the accent family, so every accent works in both themes with no component
  change.

Type is the one axis neither attribute touches: `--font-display` for headings and brand marks,
`--font-sans` for everything read, `--font-mono` for code. Neither family ships with the
package — the host page loads both. See [Typefaces](foundations.md#typefaces).

`applyTheme('light')` and `applyAccent('phoenix')` persist to `localStorage`; `ACCENTS` is the
list of names `applyAccent` takes. Or ship `accentPicker()` and let `wireTopbar()` handle it.

### An absent attribute means dark

`data-theme` and `data-accent` are optional **overrides**. With neither attribute, the kit
renders dark Nebula.

```html
<html>                              <!-- dark, Nebula -->
<html data-accent="ocean">          <!-- dark, Ocean -->
<html data-theme="light">           <!-- light, Nebula -->
```

## Component catalog

One row per published name, with the section that settles its behaviour. Options are listed to
say what a factory takes, not what it does.

### Content and status

| Name | What it is |
|------|------------|
| `button({ label, variant, size, icon, iconRight, block, disabled, busy, href, iconOnly })` | `<button>`, or `<a>` with `href`. See [Extra-small buttons](#extra-small-buttons). |
| `setButtonBusy(element, { busy })` | Flips a mounted button to its busy state and back. See [Busy button labels](#busy-button-labels). |
| `badge(label, variant)`, `pill(label, variant)`, `statusDot(live)` | Status chip, rounded chip, live dot. |
| `card({ title, sub, body, variant, pad, icon, level })` | Surface container. `title` and `sub` are trusted markup; keep the title to inline content. |
| `callout`, `toast`, `successPanel` | Inline feedback inside the page the reader is on; `calloutIcons` is the default glyph per tone. |
| `pushToast(container, opts)`, `dismissToast(el)`, `wireToastStack(container)` | The runtime toast stack. |
| `success({ layout, check, level, title, body, actions, confetti, countdown })` + `wireSuccess(root)` | Page-sized confirmation; `successCheck()` is its mark alone. See [Success confirmations](#success-confirmations) and [successPanel or success?](#successpanel-or-success). |
| `emptyState({ art, icon, title, sub, actions })` | Placeholder for an empty list, table or page; `art` is an `illo()` name or raw SVG. |
| `deniedState({ title, sub, need, actions, icon })` | The 403, in the same layout language. See [Pending and denied states](#pending-and-denied-states). |
| `busyRegion({ label, readyLabel, busy, body, lines })` + `setBusy(root, …)` | The screen's pending state, and the only thing in the kit that announces one. |
| `skeleton({ lines, width, height, radius })`, `skeletonTable({ rows, cols, head })` | Placeholder shapes, `aria-hidden` throughout. |
| `snippet({ label, code, reveal, copy, copyLabel })` | Code block with an icon-only copy button. `hlCode(raw, lang)`, `hlShell(raw)` and `codeTokens(raw, lang)` highlight what `codeLanguages` lists. See [Code highlighting](#code-highlighting). |
| `icon(name, cls)`, `illo(name)`, with `iconNames`, `iconCategories`, `illoNames` | Line icons and illustrations as SVG strings; `sun` and `moon` are exported bare too. |
| `iconOnlyAllowed`, `iconOnlyNames`, `iconMeanings` | The icon rulings as data. `iconOnlyNames` gives each wordless glyph the words its button’s name may open with, so `copy` cannot be borrowed for Duplicate. See [Icons and glyphs](foundations.md#icons-and-glyphs). |
| `seedling`, `prism`, `brand` | The brand mark. |

### Controls and input

| Name | What it is |
|------|------------|
| `field({ label, hint, error, control, required })` | The label, hint, error and ARIA wiring a control cannot do itself. See [Forms](#forms). |
| `input`, `textarea`, `select`, `checkbox`, `switchToggle` | The controls `field` wraps; each also renders on its own. |
| `segmented({ options, active, size, block, name, ariaLabel })` + `segmentedNextIndex(key, index, length)`, `initSegmented(root)` | Toolbar of toggle buttons. See [Segmented or tabs?](#segmented-or-tabs) and [Segmented strips that outgrow their column](#segmented-strips-that-outgrow-their-column). |
| `tabs({ items, active, name, ariaLabel })` + `initTabs(root)` | Tablist and its panels, one per item. |
| `dropdown({ label, value, variant, items, sections, foot, header, footer, align, direction, portal, scroll, search })` + `wireDropdown(root)` | Popover list, as a listbox or an action menu. `portal: true` is the answer for a dropdown inside the shell's rail. `dropdownMatch(label, query)` and `dropdownFiltering(query)` are its filter, published so a second implementation asks the kit, and `filterPanelFit(dd, floor)` with `DD_MENU_FLOOR` is the same for a filter chip's menu: inside `.ui-filter-bar` an **open** menu takes the kit's 240px floor rather than its trigger's width, and a shut one keeps the trigger's. Both halves ask the kit and write the three `--ui-filter-panel-*` properties the stylesheet reads, measure again whenever the row's width or the chip's place in it changes, and hold the open geometry until the menu's fade has finished. See [The dropdown panel](#the-dropdown-panel), [A dropdown with a search field](#a-dropdown-with-a-search-field) and [A filter row holds its panels](#a-filter-row-holds-its-panels). |
| `filterBar(options)` + `initFilterBar(host, options)`, with `filterChipText`, `filterChipName`, `filterChipUnset`, `filterChipItems`, `nextFocusStop`, `focusNextStop` | The controlled filter row above a table. The consumer owns the filters and calls `update()`. `filterChipItems(filter)` marks the chip's own value in the items it hands its menu, so the line the chip prints and the row the menu marks cannot disagree; a chip that is unset, or whose value is in no row, marks nothing, and a `selected` the consumer set does not stand in for it. `nextFocusStop(host)` names the control a reader's next <kbd>Tab</kbd> would reach, which is where an emptied bar sends the focus; `focusNextStop(host)` puts it there, skipping anything the reader cannot reach, and answers with the element it ended on. See [A filter row holds its panels](#a-filter-row-holds-its-panels). |
| `pagination({ page, pageSize, total, hasMore, pageSizes, variant, label, loading, href, id })` + `wirePagination(root, …)`, `setPagerStatus(root, text)`, `PAGE_SIZES`, `DEFAULT_PAGE_SIZE` | The strip under a table or list; it renders a page the caller already computed. See [Pagination](#pagination). |
| `commandPalette({ groups, items, label, placeholder, query, empty, density, hint, rank, hotkey, open, specimen, id })` + `wireCommandPalette`, `openCommandPalette`, `closeCommandPalette`, `commandPaletteList`, `setPaletteResults`, `rankCommands`, `rankGroups`, `scoreCommand`, `SCORE`, `paletteHotkey()` | The ⌘K overlay and the ranking behind it; `SCORE` is the ladder itself, for a server that sorts the same way. See [The command palette](#the-command-palette). |
| `feedbackWidget()` + `wireFeedback(…)`, `nearestSection(node, root)` | Select a passage, give feedback. |

### Overlays

| Name | What it is |
|------|------------|
| `drawer({ side, size, title, body, footer, open, specimen, dismissible })` + `wireDrawer`, `openDrawer`, `closeDrawer`, and `drawerSection({ title, rows, body })` for one group of its body | Panel against a screen edge, over a scrim. See [The drawer](#the-drawer). |
| `confirm({ title, body, confirmLabel, cancelLabel, variant, open, specimen, id })` + `wireConfirm`, `openConfirm`, `closeConfirm` | Modal question over a scrim, for a destructive action the page has to stop for. |
| `tooltip({ label, value, detail, placement, open, x, y, id })` + `wireTooltip`, `showTooltip`, `hideTooltip` | The readout over a chart mark, on hover or tap. See [The hover readout](#the-hover-readout). |

Both `drawer()` and `confirm()` take `specimen: true`, which draws a picture of one for a
documentation page: no `aria-modal`, no wiring, no Escape.

### Figures and tables

| Name | What it is |
|------|------------|
| `statBand({ stats, variant, basis, label, id })`, with `STAT_VARIANTS`, `STAT_TONES` | A row of key figures as a `<dl>`. A figure is `{ label, value, caption, delta, trend }`; `basis` is what every change is measured against, and the kit draws no chart. See [Stat bands](#stat-bands). |
| `numericValue({ value, unit, missing })`, `deltaValue({ value, tone, basisId })` | Inline value and inline change. Colour never supplies the sign. |
| `rowIdentity({ symbol, name, logo, href })` + `initRowIdentity(root)` | A company identity cell, with a letter fallback. |
| `formatNumericValue(…)`, `formatDeltaValue(…)` | The same two decisions as plain text, shared with React. |

The table itself is markup, not a factory: the scroll region, the sticky header and the pinned
identity column are classes a page applies. See
[Dense financial tables](#dense-financial-tables).

### Page furniture

| Name | What it is |
|------|------------|
| `appShell({ word, brandHref, nav, active, navLabel, crumbs, back, title, sub, body, account, signOutHref, layout, width, search, topbar, maxWidth, collapsible, collapsed })` | The kit's one page shell, and the one to call for new work. See [The page shell](#the-page-shell) and [The second layout](#the-second-layout). |
| `wireShell(root, { persist })` + `railCollapsed(cookieHeader?)`, `RAIL_COOKIE` | Wires the rail's fold, the reader's menu and the nav's groups; the cookie lets a server paint the right width first. |
| `nav({ variant })`, dispatching to `sidebarNav`, `navTabs` or `breadcrumbs`, + `wireNav(root)` | Wayfinding. Each shape is also exported on its own. |
| `backLink({ href, label })` | The way up to the page this one sits under — an `<a href>`, never a history step. See [The back link](#the-back-link). |
| `topbar(…)` + `wireTopbar(root)` | The product topbar. `themeToggle(theme)`, `accountMenu({ name, email, active, nav, initials })`, `versionSwitcher(versions, activeIdx)` and `deckTextSwitch(active)` are its parts, usable alone; `themeIcon(t)` and `themeName(t)` label your own toggle. |
| `accentPicker({ active, options })`, with `ACCENTS` and `accentSwatchStyle(accent)` | The accent swatches, wired by `wireTopbar()`. `ACCENTS` is the list the kit ships; `accentSwatchStyle(accent)` is the one custom property a swatch button carries, `--swatch`, the gradient its circle wears. Both pickers read them, so a page building its own strip paints the same thing — and the kit's stylesheet draws the selected swatch's tick, so the strip needs no selection paint of its own. An accent with no paints gets `--swatch: transparent`, an empty circle you can still press. |
| `ACCOUNT_NAV` | The account navigation the kit ships, as `sidebarNav()` items; the account menu falls back to it and your own entries replace it. |
| `footer({ variant, brand, tagline, columns, social, legal, legalLinks, switcher })` | Site or app footer: `full`, `slim` or `app`. |
| `.ui-toolbar` (class, no factory) | A row of controls above a list. See [A toolbar at one column](#a-toolbar-at-one-column). |

### Motion and escaping

| Name | What it is |
|------|------------|
| `prefersReducedMotion()`, `staggerDelay`, `initReveal`, `replay`, `playEntrance`, `transitionMs(el)`, `ENTRANCE_FALLBACK_MS` | The motion helpers. `transitionMs(el)` answers how long the stylesheet says an element's transition lasts, so a caller sizing a backstop timer for a fade reads the sheet rather than copying a duration token; a missing or non-element argument answers `0`, which fires at once rather than never. See [Motion](foundations.md#motion). |
| `esc(s)` | HTML-escape a text value. Every factory already applies it to its own text arguments; you need it for markup you assemble yourself. |

The public JS surface is whatever the package entry re-exports. A module the entry never names
still ships in the tarball and still cannot be imported, because the package declares no
`./components/*` subpath.

## What each component guarantees

One short paragraph per component: the promise a consumer would otherwise have to discover. The
detail behind each rule lives with the test that holds it, and React's own notes are in
[react/README.md](../react/README.md).

### The page shell

`appShell()` is the kit's one answer for composing a page: it draws the chrome, and what goes
inside is yours. It always draws **one `<main>` landmark** and names every navigation landmark
uniquely, invents no breadcrumb you did not pass, and renders no topbar unless you pass one.
**The rail folds** below 720px by CSS alone and by a `<button>` the reader presses, which writes
the `apliteni-ui-rail` cookie so a server can paint the folded width first with
`railCollapsed()`; a folded row keeps its name and count for the keyboard as well as the pointer,
and every control in it clears the 24px floor and wears the ring. Pass `signOutHref` and the
reader's block becomes a kit `dropdown()` with signing out as a row of it. **The rail holds
nothing that has to escape it** — it is sticky and scrolls — so a dropdown mounted inside it
passes `portal: true`, and it stands one measured step off the page under every accent.
`accountShell()` was retired in 0.81.0: account and settings belong in a modal over the product,
as [Account and settings](../guidelines/account-and-settings.md) says.

#### The second layout

`appShell({ layout: 'topbar' })` is the same shell with three parts in different places, and
every guarantee above holds in it. The reader's block leaves the rail's foot for a band beside
the rail — not across the top of both — and the fold's control takes its place. **The band
carries a search field and the reader, and nothing else**, as a `<header>` outside the
navigation landmark, and that field is the palette's own trigger drawn as a field, with the key
cap inside its accessible name; no palette named, no field. **One band over a page, never two:**
`layout: 'topbar'` and the compatibility `topbar` bag are not composed, and a `layout` or `width`
the kit does not know is read as the layout it has always drawn. React's own shell is
[React AppShell](#the-rest-of-the-react-surface).

### The back link

`backLink()` is the way up to the page this one sits under, placed by `appShell({ back })`.
**It is a link to an address, never a step through the history** — given none, or a `javascript:`
one, it renders nothing. **It names where it goes:** the destination as the sidebar or trail
spells it, with the arrow `aria-hidden`, and a long name clips rather than wrapping. **It takes
the trail's place, above the title** — a page has one or the other — and the shell keeps the row
you marked `active` lit as `aria-current="true"`, the current section rather than the page. When a
page should take one: [Going back](../guidelines/going-back.md).

### The dropdown panel

`dropdown()` places its panel; you never write a rule to move it. `direction` picks where it
opens — `'down'`, `'up'`, or `'auto'`, which flips only when there is not room below and there is
more room above. The head and foot bleed back through the panel's padding to the edge they sit
on, and **what goes in them is yours within the panel's role**: a `role="menu"` takes menuitems
and a `role="listbox"` takes options, so a control in either one's foot is refused by
`aria-required-children`, while `search: true` makes the panel a `role="dialog"` where one is at
home. **`portal: true` lets the panel leave a trigger's subtree** when an ancestor's `overflow`
or `position: sticky` traps it; it stays opt-in, because the panel then lands at the end of the
tree it was moved into, and it never crosses a document or shadow-root boundary. **Escape is
scoped and click-outside is not**, and either way focus returns to the trigger. **A panel the
keyboard opens is visible in the frame the key lands**, and an open panel carries no transition
inside it at all — see
[Reduced motion travels with the stylesheet](foundations.md#reduced-motion-travels-with-the-stylesheet).
Every menu the kit ships owes those last two rules.

### A menu panel does not cut off its rows' ring

The ring is drawn outside the border box of whatever has focus: one pixel of gap and two of band.
A row that fills its panel edge to edge draws that ring on the panel's own border and past it, so
a menu panel has one of two ways out and there are only two: **keep the three pixels inside the
panel as padding, so the ring lands in the padding; or clip nothing at the panel's edge, so the
ring crosses it.** A panel that does neither cuts the ring away and leaves the reader two accent
bars. `.ui-dropdown__panel` takes the first; the account menu takes the second, so its ring
stands two pixels outside the panel's border — accepted.

### A filter row holds its panels

**At any viewport a filter bar's panels add nothing to the page's scrollable width, and each
panel opens inside the row that holds it.** A chip's panel is as wide as its trigger, bounded
against its own containing block, so it needs no measuring and no JavaScript, and vanilla and
React get it from the same rule; the same rule breaks a long key or URL mid-token rather than
letting it run off the page. What you give up is panel width, so a list that needs room is a
dropdown rather than a filter. The bound does not survive an inline `min-width`, and a chip
cannot shrink below its selected value's min-content width.

**The clear action is offered only when there is something to clear.** `filterBar` and React
`FilterBar` render it once a filter is applied, in the kit's bordered skin without its fill: no
grey block under the words in any state, and a disabled or busy bar keeps the edge and takes the
box-less unavailable ink. A consumer reading `[data-filter-clear]` finds nothing while no filter
is set.

**An emptied bar hands the focus on rather than keeping it.** Clear the last filter, or remove the
last chip, from the keyboard and the control that had the focus is gone, so the bar moves the
focus to the control a reader's next <kbd>Tab</kbd> would reach, skipping anything they cannot
reach and leaving the focus where it is if nothing beside the bar can take it. `nextFocusStop(host)`
names that control and `focusNextStop(host)` places the focus there, answering with the element it
ended on, so a consumer that wants to place it itself reads the same answer.

### A dropdown row is a div, a link or a button

`.ui-dropdown__item` renders identically under all three tags, and which one a row is written as
is your decision rather than the kit's: the rule cancels the chrome a browser paints on a button
and answers the `font` shorthand with `font: inherit`, which is also what keeps a portalled panel
from taking its typeface from wherever it was mounted. `dropdown()` emits a `<div>`, or an `<a>`
for an item with `href`, and never a `<button>` — so a row that has to be a real button is
[one you write yourself](#a-dropdown-row-you-write-yourself). **A destructive row rests quiet and
turns `--pink` on the way to being pressed**, in both hover and focus.

### A dropdown with a search field

`search: true` puts a text field above a dropdown's rows and filters them as the reader types; it
is opt-in, and a dropdown without it renders what it always did. **Typing filters, and focus stays
in the field**, a `role="combobox"` over the list that names the row Enter would pick with
`aria-activedescendant`: the field carries the ring and the active row takes the hover fill and an
accent bar. **The match is anywhere in the label**, ignoring case and accents, with rows in their
original order — descriptions are not searched, so put the words a reader will type in the label.
**Every open starts from the whole list**, and a query matching nothing says so rather than
showing a blank panel. **The panel is a dialog**, because a listbox may own only options. When a
dropdown must have a search field is a rule rather than a recommendation:
[Component choice](../guidelines/component-choice.md).

### The drawer

A drawer is a panel against one edge of the screen, over a scrim, for looking at or changing one
thing without leaving the list it was opened from. **It groups by heading, never by card:**
`drawerSection()` puts a heading over a `<dl>` of label and value pairs, so a screen reader hears
each label with its value, and the value sits beside its label rather than at the far edge of the
panel. Nothing inside a drawer draws a card, a row rule or an `<hr>`, and actions stay outside
the scrolling body. **It moves on open and on close**, and under reduced motion both are instant.
When a flow wants a drawer and when it wants a page: [Drawer](../guidelines/drawer.md).

### The modal

The React `Modal` caps its height at 96% of the dynamic viewport, and its body scrolls while its
title, close control and footer stay visible. It is a borderless raised surface — the drop alone,
`--radius-md`, a `--text-base` title and a deep scrim without blur — and it names itself with an
`h2`. The HTML entry point ships no general modal; its separate `confirm()` is unchanged.

### The hover readout

`tooltip()` is the readout a surface shows while a pointer rests on one of its marks. It is an
overlay, and that is the guarantee: **showing, filling or moving a readout never changes the size
or the place of anything else on the page.** It is one element per host, placed absolutely and
taking no pointer events — `.ui-tip-host` marks the box it is placed against — and it flips or
slides only as far as it must to stay inside the viewport and every ancestor whose overflow
clips. **What it says is text**, written with `textContent` and never parsed. Focus on a mark
shows it and describes the mark through `aria-describedby`; **Escape dismisses every readout the
kit is showing**; and **under a coarse pointer the tap is the switch**, with the opening tap
captured, so a chart that drills down on a bar does not drill down on the tap that asked what the
bar says. No value may be reachable only by hovering — see
[Hover readouts](../guidelines/hover-readouts.md).

### Pagination

The pager renders a page you have already computed, from the current page, the page size and —
where you know it — the total, so a page a server counted and a page sliced out of an array
produce the same markup. **A result whose size is not known is a supported shape, not a degraded
one:** given no total it offers the step before and the step after and claims no page count. **A
control that would leave the result is disabled and stays where it is**, never removed and never
swapped for text, and **one page of content gets no steps**. **The row range is announced**,
politely and as a whole, and it is the only part of the pager that announces. **The page size is
a scale the kit names**; which sizes a table offers, and remembering the reader's choice, are
yours. **A page turn does not move the ground under the reader:** the pager keeps its numbers
legible, marks itself busy and stops taking input while the next page loads.

### Stat bands

`statBand()` renders a row of key figures as a description list, so a screen reader reads each
figure as one statement. **A figure's value is never broken across lines and never truncated;**
the words under it give way instead, and a band too narrow for its figures folds before plain
wrapping would leave one figure alone on a row. It decides that from **its own width**, not the
window's, so in a flex row or an `auto` grid track you give it one:

| Layout | Four fold two by two at | An odd count stacks at | One column at |
|---|---|---|---|
| Band and tiles | 56rem | 42rem | 28rem |
| Open | 66rem | 50rem | 32rem |

**A change shows which way it went with an arrow read off the sign you printed**, and colour
follows your verdict alone — no tone and `neutral` are the same neutral change. **A figure with
nothing to compare draws no row at all:** never `+0%`, and never a sentence saying there is
nothing to say. **A change says what it is measured against, in text a reader can reach** — once
for the band in its caption, or beside the change when one figure is measured against something
else; a hover `title` does not count. **The caption comes before the figures**, the way a table's
`<caption>` does. **A figure says at most one thing under its value, and it says it in one row**,
so a caption earns that row only by giving a unit, a period or a limit the figure cannot. **The
trend is a slot:** the kit sizes and colours your `<svg>` and draws no chart. Three layouts ship
— `tiles`, the default, puts each figure on its own card, `band` is one card, and `open` draws no
surface and sets the value larger.

### Dense financial tables

The table itself is markup: a named scroll region holds a native `<table>`, and the recipes are
classes you apply. Zebra paints no grey stripes and hover marks the row edge without tinting the
data surface; `compact` uses a 33px minimum row, and larger or wrapped content grows it.
**Columns scroll rather than disappear**, with sticky headers and pinned identity cells keeping
opaque backgrounds, the shared focus composition and their full accessible names. **A link inside
a cell takes the row's ink, underlines on hover, and wears the shared ring on `:focus-visible`** —
one ring around the whole link, including a title-cell link long enough to wrap. `numericValue`
distinguishes missing from zero, `deltaValue` prints your sign and takes your explicit judgement,
and **colour never supplies the sign**.

**Below the one-column step a table marked `.ui-table--stack` lays each row out as a block instead
of scrolling:** the identity and short cells on the first line, `.ui-table__long` under them, and
the header row clipped rather than removed, so a cell still reads with its column's name. **A
clipped header is read and not operated**, so a sort or filter control belongs on the row above
the table and names it in `aria-controls`; the table roles are written in the markup at every
width, because a stylesheet cannot write one. A value whose meaning came from its heading then has
to carry it — a rule in [Dense tables](../guidelines/dense-tables.md).

`FilterBar` is controlled by you: selections, removal and clear-all request changes and never
mutate the filters you supplied. **A chip shows the chosen value alone**, and the field's name
only while nothing is chosen; beside a value the name reaches a reader through the trigger's
accessible name and a hidden legend.

### The command palette

The kit ships the palette's shell, its ranking and its keyboard, and names no result kinds: what
a result *is* — an invoice, a campaign, a domain — is your product's vocabulary, and so are the
groups. **Three ways a row can behave**, because each answers Enter differently: a row that goes
somewhere carries an `href`, a row that runs something reports a `ui-command` event, and a row
that destroys something names a confirm and opens it. **A destructive row that names no confirm
is rendered disabled rather than run.**

**Results are ranked on how the query meets the item, and you break every tie:** a whole label
beats a prefix, a prefix a word start, a word start a substring, a keyword a note, and initials
come last, with groups ordered by their best row and equal scores keeping the order you passed.
The kit remembers nothing between openings, and **a palette a server feeds does not rank at all**
— it renders what it is handed, in order, applying the same exported function. **The keyboard is
six keys and no more**, Tab not among them, and **focus opens in the text box and never leaves it
while the palette is up**, over an inert page. **It opens empty**, and **it paints one step above
the drawer and one below the confirm**, so a confirm a row opens goes over both and answers the
first Escape.

### Success confirmations

A confirmation carries **one title and at most one short line under it**. There is no eyebrow:
`success()`, `<Success>` and `successPanel()` take a title and a single line of detail, and
nothing stacks a third tier above or between them. They draw it on a plain elevated card — the
kit surface, its border, and nothing behind it: no backdrop layer and no `backdrop` option. The
mark is one of two, chosen with `check`:

| `check` | Mark | Size | Motion |
| --- | --- | --- | --- |
| `line` (default) | Lucide `check`, bare, in the success colour | 56px hero, 72px split, 28px compact, 28px inline panel | strokes itself on over `--dur-slow` |
| `circled` | Lucide `circle-check-big` (the kit's `circleCheck`) | 20px, the kit's label size — every layout, inline panel included | at rest |

`line` is sized by the layout it lands in; `circled` is one size everywhere. Both are unmodified
Lucide paths in a 24 box, and neither has a filled disc or a burst ring behind it.
[Iconography](../guidelines/iconography.md) reserves a circled glyph for a state, so `circled` is
the mark that rule asks for; `line` is the default because it carries the moment at page size. An
action that is not a kit `Button` takes `.ui-focusable`.

### Pending and denied states

Two states every screen has: it is still fetching, and the reader is not allowed to see this.
**One region, three renders:** `busyRegion()` is a live region that *outlives* what it reports
on, rendering once with a skeleton inside, and `setBusy()` swaps its body and writes a line into
the screen-reader node it already contains — a live region whose text changes is the only thing
assistive tech reliably speaks. It reuses the pair `toast()` and `success()` carry, and there is
no second mechanism. A skeleton is `aria-hidden`. **`deniedState()` carries no role of its own**,
so it is announced by the region it is dropped into and needs no announcement as a whole page.
There is **no spinner factory**: at screen scale a skeleton says what shape is coming.

```js
const el = document.querySelector('#report');
el.innerHTML = busyRegion({ label: 'Loading your report…', lines: 4 });
const rows = await fetch(…);
setBusy(el, { busy: false, message: `${rows.length} rows`, body: table(rows) });
```

### Busy button labels

A busy button replaces its visible label with three centred pulsing dots in the variant's full
label ink, and the brightest dot clears 3:1 against every variant fill in both themes. Text does
not fade or blink, the retained label and icons keep the button's dimensions stable, and reduced
motion switches straight between label and static dots. **A wired busy button keeps focus:**
`aria-disabled` communicates the state while click, Enter and Space activation are blocked, and
both faces announce through a status region outside `aria-busy`, which persists through completion
so progress and completion can both be announced. React takes `completionMessage` to word that
completion, or `completionMessage=""` to say nothing when a form error or another live region
announces the outcome. An explicitly disabled button stays natively disabled, and unwired
`button({ busy: true })` markup keeps native disabled as a safe fallback.

### Extra-small buttons

`button({ size: 'xs' })` and React `<Button size="xs">` draw a 13px glyph at stroke-width 2.8,
with a minimum 24×24px target: an icon-only xs button is 24×24px, and a labelled one grows to fit
its label at `--text-xs`. Other sizes keep their 16px glyph at stroke-width 2.4, and busy dots fit
inside the smaller target. The size changes neither the variant's colour nor its interaction
states.

### Code highlighting

`hlCode(raw, lang)` returns highlighted HTML and `codeTokens(raw, lang)` the same tokens as data;
`hlShell(raw)` is the shell case under the name it has always had. `codeLanguages` lists what
`lang` accepts, and an unrecognised name is read as shell. One tokenizer serves both faces, so
vanilla HTML and React spans cannot drift apart. The five classes carry different meanings per
language:

| Language | `.k` | `.s` | `.f` | `.u` | `.c` |
| --- | --- | --- | --- | --- | --- |
| `shell` | the command | a quoted string | a flag | a URL | a `#` comment |
| `json` | a property key | a string value | a number, `true`, `false`, `null` | — | — |
| `ts` | a keyword | a string or template | a number or literal | — | a `//` or `/* */` comment |

They colour short snippets, not arbitrary programs. Three of the five miss WCAG AA on the light
card and are carried as recorded debt rather than a claim of compliance: `.f` and `.u` at 3.81:1
and `.s` at 4.45:1. **The copy button is icon-only in both faces**, with `copyLabel` as its
accessible name and `title`, and **confirming a copy does not change the control's size or its
name**: the glyph swaps inside the same box and the word goes to a hidden live region. Snippet
descendants wear the shared ring, except the browser-focusable code region — a `<pre>` sits flush
with its card and has no radius, so **the card paints that ring instead**.

### A toolbar at one column

A toolbar above a list opens with a search box, then its filters, then its view switch.
`.ui-toolbar` gives its text field a `6rem` flex basis, so the row breaks only once the field
would be squeezed under it. At `560px` that basis would become the field's size rather than its
floor, so there the field takes `flex-basis: 100%`: it has the line and the rest of the row wraps
under it.

### Segmented strips that outgrow their column

A pill strip lays its choices out in one row while they fit and wraps onto further rows when they
do not. **It never widens past its container:** a twelve-month picker in a phone column becomes
three rows of pills rather than a track that pushes the page sideways, and below 560px the
standard-size pills tighten their side padding at an unchanged type rank. The underline appearance
wraps too, so no tab is cut off at a phone width, and a label too long for the column wraps inside
its own tab. Arrow keys, Home and End skip disabled choices.

### The chosen tab in an underline strip

The chosen tab is its own label and 2px of accent under it: no plate, no hairline and no upright
rail. **The accent is spent once.** No tab draws a box a reader can see against the strip's ground
— no background, no border, no inset shadow — so nothing in it reads as a card lying on the page,
and the strip draws no rule under its tabs. A consumer that wants one draws it on the container.

**Every mark that says "chosen" sits inside that tab's own box**, clear of its edges, which is
what lets the strip wrap: a tab on a further row carries its whole highlight with it and is never
read against the row above or below. Every tab reserves the bar and only the chosen one draws it,
so the mark grows in place when the choice moves. Hover is an ink step from `--text` to
`--strong`, the step every kit tab takes, and no second mark.

### Escaping and URL slots

Factories return HTML strings. **Text and attribute values are escaped where written:** quotes
and angle brackets in a name, identifier, class modifier or label cannot add an attribute or an
element, so do not escape ordinary text or URL slots before passing them in. **URL slots reject
`javascript:`, `data:` and `vbscript:`**, case-insensitively, including leading ASCII controls and
embedded tabs or newlines; other schemes, relative paths and fragments keep their original values.
A rejected navigation URL renders as `#` and a rejected image source as an empty `src`, and
`backLink()` renders nothing at all for one.

**Slots documented as trusted HTML are not sanitized**, and their author owns the markup and any
URLs inside it. They are a card's `title`, `sub` and `body`; a callout's `body` and `actions`; a
drawer's `body` and `footer` and a drawer section's `body` and row `value.html`; a dropdown's
`triggerContent`, `header`, `footer` and `foot`; a nav or footer `footer` and `switcher`; a tab
item's `label` and `panel`; an empty state's SVG `art` and `actions`; a field's `control`; a
checkbox `label`; a snippet's code; a stat's `trend`; a brand `word`; a version switcher's label,
meta and custom badge; and `appShell()`'s `title`, `sub` and `body` plus the nested topbar slots.
A nested option inherits the contract of the factory it invokes.

The vanilla factories are **removal-bound** — see
[What the kit does not do](#what-the-kit-does-not-do).

## React components

The React wrapper publishes components over the same CSS, and its own notes are in
[react/README.md](../react/README.md). What follows is what React promises beyond the vanilla
sections above.

### React tables

Column labels accept React content, including a kit Tooltip for a header explanation. A scrollable
`DataTable` shows Previous columns and More columns controls when its columns overflow, disabling
each at its edge. **Sorting is yours to control or the table's to manage, and one table stays in
one of those modes for as long as it is on the page**; the default is the first sortable column,
descending. An absent sort key and equal values both preserve input order, and ordering hands back
a list of its own, so the rows you supply are never reordered through the result. **Paging is on
the same terms:** a controlled table shows all the rows it was given — they *are* the page — and
the count it reports is yours. `DataTable` builds its own class list, takes no `className`, and
renders its sort control inside the header cell, which a stacked table clips.

### React fields

`TextField`, `TextArea`, `SelectField` and `FileField` generate their control and message IDs and
name their controls. **An error marks the control invalid and is described before the hint rather
than in its place**, so a hint carrying a consent, safety or legal detail stays on screen while
the reader decides whether to retry; it also uses `role="alert"`, so a new error is announced
without moving focus. Required markers are decorative — native controls carry `required`. `Field`
exposes the frame for a control you render yourself, handing its child function a stable ID,
`required`, `aria-invalid` and `aria-describedby`. `FileField` accepts one file by picker or drop;
`accept` only filters the system picker, so you validate before upload.

### React toasts

`Toast` and `useToast()` render the vanilla toast classes in a fixed stack, newest at the bottom,
anchored to the bottom-right corner. **The provider publishes how far the stack reaches up the
viewport** as `--rx-toast-stack` on the document root — `0px` while empty — so a fixed page action
can sit clear of any number of notices; use **one** provider per document, because that property
is a document-root global. Notices without actions dismiss after five seconds, pausing while
hovered or focused; notices with an action stay until it is selected or dismissed. Ordinary
notices are polite, danger notices assertive, and adding one does not move focus.

### React search field

`SearchField` is the unlabelled search box a toolbar opens with: a decorative leading glyph and a
native `type="search"` control on the shared input class. **`ariaLabel` is required and is the
control's only name**, because nothing in the row shows one. It declares no CSS of its own, so the
toolbar's row rule and the field's focus ring reach it from the kit's stylesheet. **There is no
clear button**, because the browser paints its own near-black on the light field and white on the
dark one.

### React date and month picker

`DatePicker` picks one month, a range of months, one date, or a range of dates. At its ordinary
width it wears the dropdown's shell and adds only the grid inside it; the panel is a `dialog`,
because a calendar is a grid and a listbox may own only options, and it is `inert` while closed.

**The grain and the span are two questions, not one:** `month` and `day` pick a single period,
`range` and `day-range` a start and an end in the same two presses. Periods are ISO strings in the
mode's own grain, and every step and comparison is arithmetic on one integer per period, so
nothing walks a `Date` across a daylight-saving boundary. **A period written in the other grain
still counts** — a month read in day grain is its whole span, a date read in month grain is the
month it falls in, and a string that is neither is no bound. Bounds mark a cell `aria-disabled`
and refuse the press, but **the cell stays focusable**, so a reader meets the bound rather than
losing it.

**One tab stop in the grid, on the cell the keyboard is on**, and **Home and End go to the ends
of the row without leaving the page**. **Every cell says what it is in its own accessible name.**
**A range spans what lies between its ends — blocked periods included**, because
`{ start, end }` cannot say "all of this but not that"; such a period keeps its place in the value
and loses only the tint. **Blocked beats every other state in the paint, and its label is struck
through.** **Hover is the kit's row hover**, not a tint of the accent, and **the current period is
a ring**, a hairline in the accent. **Nothing is drawn under the grid:** no legend, no per-period
swatch. **Below 560px the panel is a sheet, and a sheet is the kit's drawer**, and below the phone
step the gap between weeks opens to reach the 44px tap floor. Its one breakpoint literal is one of
the steps in [Breakpoints](foundations.md#breakpoints).

### React file drop

`FileDrop` is the compact drop: at rest, one row holding the button that opens the system picker
and, beside it, the accepted types and the size limit in your words. The field-sized dashed box
stays with `FileField`. **You own the upload:** `FileDrop` reports a chosen or dropped file
through `onFile` and renders the `file` it is given, and **a file with no `status` is uploading**,
so the kit never reports a success you have not claimed. **A status the row draws carries a
circled mark and a word**, because colour alone is not a status; where `progress` is given the
track is the status instead. `Remove` and `Retry` appear only when `onRemove` and `onRetry` are
supplied. **No tier ever takes a second line:** the name truncates its stem while keeping its
extension, with the full name in a `title`, and **one layout serves every width**. **The drop
target is painted only while a file is over the region, and it covers that region rather than
joining it**, so the row keeps its place while the reader aims; children render above the row
inside the same region, which is how one panel — or a whole page — becomes the target. A disabled
drop never calls `preventDefault` on `dragover`, so it does not declare itself a target the
pointer can aim at. When a page uses a row, a region or a dialog is in
[File drop](../guidelines/file-drop.md).

### React Button links and leading artwork

React `Button` accepts `href` to render an anchor using the existing button classes; without
`href` it renders a native button defaulting to `type="button"`, and refs and native attributes
belong to whichever element that is. `leading` accepts decorative content before the label
wrapper, taking precedence over `icon`. An icon-only control mirrors string children, then the
icon name, into `aria-label` and `title`, and **with neither it stays nameless rather than
carrying an invented one.** `className` merges with the kit's classes, and **the component's state
wins over your spread props** — `aria-disabled`, `aria-busy`, the `data-btn-*` hooks, a link's
`role`, and the `href` and `tabIndex` a disabled or busy control drops — so no caller can leave a
busy or disabled control reading as idle. **Space is blocked on button roots only**, because it
never activates an anchor and a busy link swallowing it would cost the reader the page scroll.

### The rest of the React surface

- **`Tabs`** unmounts inactive panel content, and moves and activates with the arrow keys, Home
  and End.
- **`Confirm`** builds on `Modal` as an `alertdialog`, puts focus on the safe action and draws it
  before the committing one. `onConfirm` only reports the press — saving, errors and closing are
  yours.
- **`Timeline`** renders your events oldest first, and **only the last event's marker is filled**.
  A new ID in a non-empty history plays an entrance; editing existing ones does not.
- **`AppShell`** shares the vanilla fold cookie and 720px fold, and the longest matching section
  path wins. **Below 560px a bottom bar replaces the rail:** up to four sections, or three plus
  More.
- **`SidebarNav`** accepts flat items or captioned sections, nested groups, counts and router-link
  rendering. **Nesting stops one level deep**, and each row keeps its name and count when
  collapsed.
- **`Checkbox` and `Switch`** render native inputs inside the existing label classes, and **a
  disabled one takes the same paint as every other disabled control in the kit.**
- **`Snippet`** displays `code` as plain text, and **copying always writes the original `code`
  string** whatever `children` display.
- **`EmptyState`** uses the vanilla markup and CSS, and **the page supplies its own `h1`.**
- **`ThemeToggle`** cycles dark, light, auto, then dark, storing explicit choices and following
  the OS otherwise. It sets `data-theme-choice` and the resolved `data-theme` on `html` and
  exports `THEME_INIT_SCRIPT` for a head script.
- **`Tooltip`** renders the vanilla host, panel and label classes, and Escape keeps focus on the
  trigger.
- **`Pill`** and **`StatusDot`** add no interactive role and create no live region; visible status
  text belongs beside the dot.
- **`SuccessPanel`** is the inline confirmation and **`SuccessCheck`** the bare shared mark.
- **Shared logic.** `dropdownMatch`, `dropdownFiltering`, `rankGroups`, `rankCommands`,
  `scoreCommand`, `paletteHotkey`, `segmentedNextIndex`, `PAGE_SIZES`, `DEFAULT_PAGE_SIZE` and
  `calloutIcons` come from the main entry, as do `formatNumericValue` and `formatDeltaValue`,
  which return plain text and classes for React to render and never HTML.

## What the kit does not do

Stated so nobody has to discover it by trying:

- **No JavaScript framework.** The factories return HTML strings; anything stateful is yours, and
  the React subpath is a wrapper over the same CSS rather than a second kit.
- **No build step**, whose consequence is
  [breakpoints as literals](foundations.md#breakpoints).
- **No density system.** `.ui-table--dense`, `.ui-table--compact` and `.ui-cmdk--roomy` are the
  only density modifiers, and all are component-local.
- **No container scale.** There is one `--container`, not a narrow/wide set.
- **No second bar for a control's glyph.** 1.5 CSS px is the line for every stroked mark.
- **No charts.** A stat band's trend is a slot for your `<svg>`.
- **No hand-written markup contract, except a row the kit renders as a control** — a `<div>` with
  a role and a tabindex, or an `<a>`, which is yours to rewrite as a `<button>` when it must be
  operable from the keyboard, so those class names are a supported surface.
- **No support for a vertical writing mode.**
- **The vanilla factories and initializers are removal-bound.** React components and their shared
  logic, all CSS and tokens, the inline strings, the motion helpers, `esc`, `icon` and its name
  tables, the brand marks and the Markdown guidelines all stay supported.

## Recipes

### A dropdown row you write yourself

`<button class="ui-dropdown__item">` renders as the row `dropdown()` emits. Write one when the row
has to be a native control; the reasoning is in
[A dropdown row is a div, a link or a button](#a-dropdown-row-is-a-div-a-link-or-a-button).

```html
<button type="button" class="ui-dropdown__item" data-dd-item role="menuitem" tabindex="-1">
  <span class="ui-dropdown__main"><span class="ui-dropdown__label">Rename</span></span>
</button>
```

`wireDropdown()` finds rows by `data-dd-item` inside `[data-dropdown-panel]` and never by class,
so the attributes are what make the row work:

- `data-dd-item` — without it the row is in neither the arrow-key ring nor the click handler
- `role="menuitem"` in a `menu` dropdown, `role="option"` in a `select` one
- `tabindex="-1"` — the panel moves focus itself, and a `<button>` is in the tab order by default
- `type="button"` — a row inside a form otherwise submits it
- `aria-disabled="true"` for a disabled row, not the native `disabled` attribute: that is what the
  item walk filters on
- `aria-selected="true|false"` on a `select` row, and keep the `.ui-dropdown__label` span — the
  pick is written into the first and the trigger's value is copied out of the second
- `data-value="…"` if you read the pick back off the element

### Forms

`field()` owns the wiring a control cannot do for itself: the label's `for=`, an id on the hint or
error with `aria-describedby` pointing at it, `aria-invalid` on a field with an `error`, and the
native `required` attribute under the decorative asterisk. A control outside a `field()` needs its
own `ariaLabel` — a placeholder is not a name. Put a form on a card, not on the page ground: a
field is drawn by its edge, and the page ground is too close to the field's own fill for that edge
to be seen. See [Colour and contrast](foundations.md#colour-and-contrast).

### Segmented or tabs?

Ask what is behind the choice. If picking an option reveals a different block of content, that
content is a panel and you want `tabs()`, which renders the panels and lets a screen reader
announce "tab, 1 of 3" truthfully. If picking an option only narrows a list, flips a unit or sets
a preference, there is no panel and you want `segmented()`, which says "pressed" rather than
"selected". Both give a keyboard user one Tab stop, and both need a name: pass `ariaLabel`.

### successPanel or success?

Ask how much of the screen the confirmation owns. Under a form that just submitted, or inside a
card on a page the reader is staying on, you want `successPanel({ title, sub })`. When the
confirmation *is* the screen and the reader needs somewhere to go next, you want `success()`,
which picks a layout, carries follow-up buttons and can run a redirect countdown once
`wireSuccess()` is called on the mounted element. Restyling one never moves the other:
`successPanel` is `.ui-success` and `success` is `.ui-sx`, and both draw `successCheck()`.

---

Install, usage and the publish flow are in the [top-level README](../README.md).
