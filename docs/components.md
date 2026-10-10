# Components (`@apliteni/apliteni-ui`)

A framework-agnostic **HTML + CSS** design system. It provides design tokens, one stylesheet per
component, and factory functions that return HTML strings.

```js
import { button } from '@apliteni/apliteni-ui';
button({ label: 'Save', variant: 'primary' });
// → '<button type="button" class="ui-btn ui-btn--primary"><span>Save</span></button>'
```

The factories return strings, not components. A server that renders HTML can use the kit without
a rewrite. Storybook renders the same strings for review.

This page describes what ships, what to import, every published name, and what each component
promises. [foundations.md](foundations.md) covers the other half: the tokens and the floors.
The design rules for a screen are in [the guidelines](../guidelines/overview.md). React's notes
are in [react/README.md](../react/README.md).

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

There is no runtime dependency and no build step between the source and the stylesheet you read.
You can ship the package as it is. `…/css` and `…/inline`'s `cssText` contain the same
stylesheets in the same cascade order. If you take individual sheets from `styles`, you must
also take every sheet the component needs. For example, `successPanel()` needs `styles.callout`
and `styles.success`, both after `tokensCss` and `baseCss`.

### The React stylesheet does not re-emit a kit sheet

Import `@apliteni/apliteni-ui/css` first, then import `@apliteni/apliteni-ui/react/css`. You
need both. The React stylesheet contains what React's own components add. It does not contain a
second copy of the kit.

**The kit CSS is a peer, not a dependency of a React component.** If a React module imported a
kit sheet, that sheet would be re-emitted into `react/dist/index.css`. It would then appear after
the kit's own copy in your document. At equal specificity, it would overrule the kit's copy.

Four sheets travel with the React bundle. They do so because changing their order cannot change
what they decide: the reduced-motion net, the 16px field net, the tap-zone sheet, and the hover
readout's sheet. Each is behind a media query or is written so it has no specificity to lose.
They support the consumer who uses `@apliteni/apliteni-ui/react/css` alone.

## Tokens & theming

Everything visual uses a CSS custom property. Two independent attributes on `<html>` control
those properties:

```html
<html data-theme="dark" data-accent="phoenix">
```

- **`data-theme`** = `dark | light` — controls surfaces, text, borders, and the fixed signal colours.
- **`data-accent`** = `phoenix | ocean | emerald` (absent = **Nebula**, the purple default) —
  changes only the accent family, so every accent works in both themes without a component
  change.

Neither attribute controls type. `--font-display` is for headings and brand marks,
`--font-sans` is for everything read, and `--font-mono` is for code. Neither font family ships
with the package. The host page loads both. See [Typefaces](foundations.md#typefaces).

`applyTheme('light')` and `applyAccent('phoenix')` save their values to `localStorage`.
`ACCENTS` lists the names that `applyAccent` accepts. You can also ship `accentPicker()` and
let `wireTopbar()` handle it.

### An absent attribute means dark

`data-theme` and `data-accent` are optional **overrides**. If neither attribute is present, the
kit renders dark Nebula.

```html
<html>                              <!-- dark, Nebula -->
<html data-accent="ocean">          <!-- dark, Ocean -->
<html data-theme="light">           <!-- light, Nebula -->
```

## Component catalog

Each published name appears once, with the section that defines its behaviour. The options show
what a factory accepts. They do not describe what the factory does.

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
| `dropdown({ label, value, variant, items, sections, foot, header, footer, align, direction, portal, scroll, search })` + `wireDropdown(root)` | Popover list, as a listbox or an action menu. `portal: true` is the answer for a dropdown inside the shell's rail. `dropdownMatch(label, query)` and `dropdownFiltering(query)` are its filter, published so a second implementation asks the kit, and `filterPanelFit(dd, floor)` with `DD_MENU_FLOOR` is the same for a filter chip's menu: inside `.ui-filter-bar` an **open** menu takes the kit's 240px floor rather than its trigger's width, and a shut one keeps the trigger's. Both halves ask the kit and write the three `--ui-filter-panel-*` properties the stylesheet reads, measure again whenever the row's width or the chip's place in it changes, and hold the open geometry until the menu's fade has finished. `dropdownViewportFit(panel)` is the third, and answers for a panel outside a filter row: how wide it may be and how far it has to move to stay inside the view it is laid out in. `--ui-dropdown-edge` is the gap it keeps from the view's edge. `dropdownHeightFit(dd, panel)` is the fourth: how tall an **open** panel may be, the room between its trigger and the viewport edge it opens towards. It answers nothing for a closed panel. See [The dropdown panel](#the-dropdown-panel), [A dropdown with a search field](#a-dropdown-with-a-search-field) and [A filter row holds its panels](#a-filter-row-holds-its-panels). |
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

Both `drawer()` and `confirm()` accept `specimen: true`. This draws an example for a
documentation page. It does not add `aria-modal`, wiring or Escape handling.

### Figures and tables

| Name | What it is |
|------|------------|
| `statBand({ stats, variant, basis, basisId, label, id })`, with `STAT_VARIANTS`, `STAT_TONES` | A row of key figures as a `<dl>`. A figure is `{ label, value, caption, delta, trend }`; `basis` is what every change is measured against, and the kit draws no chart. See [Stat bands](#stat-bands). |
| `numericValue({ value, unit, missing })`, `deltaValue({ value, tone, basisId })` | Inline value and inline change. Colour never supplies the sign. |
| `rowIdentity({ symbol, name, logo, href })` + `initRowIdentity(root)` | A company identity cell, with a letter fallback. |
| `formatNumericValue(…)`, `formatDeltaValue(…)` | The same two decisions as plain text, shared with React. |

The table is markup, not a factory. The page adds the scroll region, sticky header and pinned
identity column through classes. See
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

The public JS surface is the set of exports from the package entry. A module that the entry does
not name still ships in the tarball. You still cannot import it, because the package declares no
`./components/*` subpath.

## What each component guarantees

One short paragraph describes each component's promise. This is the promise a consumer would
otherwise need to discover. Each rule's test contains its detail. React's own notes are in
[react/README.md](../react/README.md).

### The page shell

`appShell()` is the kit's one way to compose a page. It draws the chrome, and you decide what
goes inside. It always draws **one `<main>` landmark** and gives every navigation landmark a
unique name. **The page title keeps the same step above your content whether or not you pass a
`sub`.** It does not invent a breadcrumb that you did not pass. It does not render a topbar
unless you pass one. **The rail folds** below 720px through CSS alone and through a `<button>`
that the reader presses. That button writes the `apliteni-ui-rail` cookie, so a server can first
paint the folded width with `railCollapsed()`. A folded row keeps its name and count for keyboard
and pointer users. Every control in it clears the 24px floor and shows the ring. **The current
row is one plate, at either width.** It is a quiet fill behind the row, a measured step off
whatever the rail stands on, and nothing closes it: no accent bar, no hairline and no outline,
because an outline on a rail row means focus alone. A row under the pointer takes a lighter wash
of the same fill, so the row the reader is on stays the louder of the two in both themes. Pass
`signOutHref` and the reader's block becomes a kit `dropdown()`, with signing out as one of its
rows. **The rail holds nothing that has to escape it**. It is sticky and scrolls. A dropdown
mounted inside it therefore passes `portal: true`, and the panel stands one measured step from
the page under every accent. `accountShell()` was retired in 0.81.0. Account and settings belong
in a modal over the product, as [Account and settings](../guidelines/account-and-settings.md)
says.

#### A folded rail takes the pointer only where it draws

A folded rail is one glyph column wide. Every box inside it is laid out in that column. This
includes the sections, lists, rows and the rule that the footer draws above itself. A click beside
the rail therefore lands on the page. A link reached by keyboard draws its full ring instead of
losing both ends to a clip. There is one limit: a folded rail flush with a page's right edge adds
175px to the page's scrollable width.

#### The second layout

`appShell({ layout: 'topbar' })` is the same shell with its three parts in different places.
Every guarantee above still applies. The reader's block leaves the rail's foot and becomes a band
beside the rail. It does not span the top of both. The fold's control takes the reader block's
place. **The band carries a search field and the reader, and nothing else**. It is a `<header>`
outside the navigation landmark. The field is the palette's own trigger, drawn as a field, with
the key cap inside its accessible name. If no palette is named, there is no field. **One band over
a page, never two:** `layout: 'topbar'` and the compatibility `topbar` bag are not composed. An
unknown `layout` or `width` is read as the layout the kit has always drawn. React's own shell is
[React AppShell](#the-rest-of-the-react-surface).

### The back link

`backLink()` is the way to reach the page that contains this one. You place it with
`appShell({ back })`. **It is a link to an address, never a step through the history**. If you
pass nothing or pass a `javascript:` one, it renders nothing. **It names where it goes:** it uses
the destination name written in the sidebar or trail. The arrow has `aria-hidden`, and a long name
clips instead of wrapping. **It takes the trail's place, above the title**. A page has one or the
other. The shell keeps the row you marked `active` lit as `aria-current="true"`. This marks the
current section, not the page. When a page should take one:
[Going back](../guidelines/going-back.md).

### The dropdown panel

`dropdown()` places its panel for you. You do not write a rule to move it. `direction` selects
where it opens: `'down'`, `'up'`, or `'auto'`. `'auto'` flips only when there is not enough room
below and there is more room above. The head and foot extend through the panel's padding to the
edge where they sit. **What goes in them is yours within the panel's role**. A `role="menu"` takes
menuitems. A `role="listbox"` takes options. A control in the foot of either role is refused by
`aria-required-children`. With `search: true`, the panel becomes a `role="dialog"`, where such a
control belongs. **`portal: true` lets the panel leave a trigger's subtree** when an ancestor's
`overflow` or `position: sticky` traps it. It stays opt-in because the panel then lands at the end
of the tree it was moved into. It never crosses a document or shadow-root boundary. **Escape is
scoped and click-outside is not**, and either action returns focus to the trigger. **A panel the
keyboard opens is visible in the frame the key lands**. An open panel has no transition inside it
at all. See
[Reduced motion travels with the stylesheet](foundations.md#reduced-motion-travels-with-the-stylesheet).
Every menu the kit ships follows those last two rules.

**A panel stays inside the view it is laid out in, open and closed.** `align` chooses the edge of
the trigger the panel hangs from. The panel keeps that edge wherever it fits and moves along the
row where it does not, which is the rule `direction: 'auto'` applies on the other axis. A closed
panel is placed by the same rule: it is hidden and still laid out, so it would otherwise widen the
page before anything is clicked. A panel adds nothing to the page's scrollable width at any width.
`--ui-dropdown-edge` is the gap a panel keeps from the edge of the view. Set it to 0 for a panel
flush with the edge, or wider for more room. A view that cannot afford the gap on both sides halves
it.

**A panel has a floor and a ceiling.** The floor is the kit's 240px, which is what makes a list of
rows readable. The ceiling is the view less that gap at each side. The floor wins where the two
disagree, which is a view narrower than 256px. A long unbroken token — a filename, a key, a URL —
breaks in the middle rather than reaching past the bound, so one row cannot make the panel wider
than the screen. The tradeoff is a broken word.

**An open panel never runs past the viewport edge, on the other axis either.** A wired panel is
capped at the room between its trigger and the edge it opens towards, less the gap it keeps from
the trigger and `--ui-dropdown-edge` at the edge, and scrolls inside that cap — the wheel over it
stops there too, rather than carrying on down the page underneath. The cap takes hold when a panel
opens, and also right away for a panel that is already open when the wiring reaches it. That is the
whole of [#489](https://github.com/apliteni/apliteni-ui/issues/489): before it an opened
panel took its content's height unless the consumer reached for the `scroll` modifier, so a
twelve-row menu opened 300px above the bottom of a 390×844 phone ended past the fold and its last
rows could not be reached, and the wheel over it scrolled the page instead. Capped, the same menu
ends inside the viewport and scrolls on its own. Two custom properties decide the height and the
smaller wins:

- `--ui-dropdown-cap` is what the consumer asked for. `scroll: true` is `.is-scroll`, which sets it
  to 300px; `scroll: <n>` writes it inline, as the property and not `max-height`, because an inline
  height would outrank the panel's own `min()` and put it back past the edge.
- `--ui-dropdown-avail` is the measured room. The wiring writes it when a panel opens, or is already
  open when the wiring attaches, and re-writes it on every scroll and resize while the panel stays
  open, from `dropdownAvail()` in `src/logic/dropdown.js` — one calculation, so the vanilla wiring
  and the React `<Dropdown>` cannot disagree about where an open panel ends. `dropdownHeightFit(dd,
  panel)` is that calculation, published so a second implementation can read it instead of measuring
  its own. A closed panel carries no measured room: `--ui-dropdown-avail` stays unwritten, and the
  sheet's fallback, `calc(100dvh - 2 * var(--ui-dropdown-edge))`, is the viewport's height, not the
  trigger-to-edge room this section promises. A closed panel's height is outside this guarantee;
  sizing one is [#501](https://github.com/apliteni/apliteni-ui/issues/501).

A trigger near the edge can leave less room than `--ui-dropdown-min` (120px) wants for a usable
panel. The floor spends the edge inset, down to nothing, to try to reach 120px, but it never spends
room past the edge, because that room does not exist. Where even the whole inset falls short of
120px, the guarantee above does not hold: the panel is left at its content height instead of a
sliver no reader could use, so it may run past the trigger's edge and grow the page, the way an
unmeasured panel does. A search panel is a column, so this cap lands on the rows and not on the
field: `.ui-dropdown__list` shrinks to whatever room the capped panel leaves it.

**A panel keeps its place while the page moves its trigger.** A row that re-lays itself out, an
ancestor scrolling sideways, a longer run of text beside the trigger, and a transition that slides
the trigger are each followed, closed as well as open. A transition is followed to where it stops
and not through the frames on the way, so a page that moves a trigger every frame has to reopen the
panel. A trigger scrolled out of the view keeps its panel at the view's edge rather than carrying it
off the screen.

`dropdownViewportFit(panel)` is published, so a second implementation of this dropdown can use the
kit's numbers instead of measuring its own. It answers nothing for a panel inside a filter bar,
whose row bounds it already — see [A filter row holds its panels](#a-filter-row-holds-its-panels).
What you give up is two promises worth less than the panel: that `align` is obeyed on a screen too
narrow to obey it, and that a panel is as wide as its widest row.

### A menu panel does not cut off its rows' ring

The ring appears outside the border box of the focused element. It has a one-pixel gap and a
two-pixel band. A row that reaches the panel edges draws the ring on the panel border and
outside it. The panel has only two choices: **keep the three pixels inside the panel as padding,
so the ring appears in the padding; or do not clip at the panel edge, so the ring crosses it.**
If the panel does neither, it cuts off the ring and leaves the reader with two accent bars.
`.ui-dropdown__panel` uses the first choice. The account menu uses the second, so its ring
extends two pixels beyond the panel border. This is accepted.

### A filter row holds its panels

**At any viewport a filter bar's panels add nothing to the page's scrollable width, and each
panel opens inside the row that holds it.** A chip's panel is as wide as its trigger. It is
bounded by its containing block. It therefore needs no measuring or JavaScript. Vanilla and
React use the same rule. The rule also breaks a long key or URL in the middle of a token instead
of letting it run beyond the page. The tradeoff is a narrower panel. A list that needs more room
should use a dropdown instead of a filter. The bound does not work with an inline `min-width`.
A chip also cannot become narrower than the selected value's min-content width.

**An open menu is wide enough to read.** A chip's trigger is only as wide as the value it shows.
When open, the menu uses the kit's 240px menu floor instead of the trigger's width. If its row is
narrower, it uses the row's width. When the side where it opens is short, it moves back along the
row. It never leaves the row or makes the page wider. When closed, the menu keeps the trigger's
width. This prevents the page from growing before any script runs. The floor is measured after
the kit's JavaScript runs. It is measured again when the row changes width or the chip moves
along the row. The width remains held until the menu finishes fading out. Nothing is painted
narrower than the row allows. `filterPanelFit(dropdown, floor)` and `DD_MENU_FLOOR` are
published. A second implementation can use the kit's numbers instead of measuring them again.
A dropdown composed against the row, rather than against a chip, owns its width. The row already
bounds it. The kit leaves it unchanged. This dropdown must not read the
`--ui-filter-panel-*` properties.

**The menu marks the value the chip is showing.** The active row receives a soft accent wash and
keeps the kit's 16px check. The wash is a tint. Its contrast is 1.16:1 over the panel in light
mode and 1.20:1 in dark mode. The check identifies the chosen row: its contrast is 6.35:1 over
the wash in light mode and 4.13:1 in dark mode. Hover makes the wash darker instead of adding an
outline: 9% more accent, which reads 1.15:1 off the resting wash in light and 1.14:1 in dark. The
wash remains under focus, which would otherwise paint an opaque fill over it; focus reads by the
band instead. **The arrow keys are not a third state here.** A filter chip's panel carries no
search field, and without one a dropdown marks no active row, so what an arrow key moves in this
bar is real focus: the row keeps its wash and its check and takes the band over them.
`filterChipItems(filter)` chooses the row. It gives the menu the chip's items and marks the
chip's own value. It matches a row by its `value`, or by its `label` when it has no `value`.
Both faces call it. The text printed by the chip and the row marked by the menu therefore use the
same value, and you receive the mark without setting it yourself. A chip with no chosen value,
or with a value that matches no row, marks nothing. A `selected` value you set does not replace a
value that the bar is not applying. The kit never writes to your own array or objects.

**The clear action is offered only when there is something to clear.** `filterBar` and React
`FilterBar` render it after a filter is applied. It uses the kit's bordered skin without its fill.
There is no grey block under the words in any state. A disabled or busy bar keeps the border and
uses the box-less unavailable ink. A consumer reading `[data-filter-clear]` finds nothing when no
filter is set.

**An emptied bar hands the focus on rather than keeping it.** When you clear the last filter or
remove the last chip with the keyboard, the focused control disappears. The bar moves focus to
the control that a reader would reach with the next <kbd>Tab</kbd>. It skips controls the reader
cannot reach. If nothing beside the bar can take focus, the focus stays where it is.
`nextFocusStop(host)` identifies that control. `focusNextStop(host)` moves focus there and returns
the element that received it. A consumer that wants to move focus itself can read the same result.

### A dropdown row is a div, a link or a button

`.ui-dropdown__item` looks the same with all three tags. You decide which tag represents each
row. The kit does not decide for you. The rule removes the browser's button styling and uses
`font: inherit` for the `font` shorthand. This also keeps a portalled panel from taking its
typeface from the place where it was mounted. `dropdown()` emits a `<div>`, or an `<a>` when an
item has `href`. It never emits a `<button>`. A row that must be a real button is
[one you write yourself](#a-dropdown-row-you-write-yourself). **A destructive row stays quiet
and turns `--pink` on the way to being pressed**, in both hover and focus.

### A dropdown with a search field

`search: true` adds a text field above a dropdown's rows. It filters the rows as the reader types.
This is opt-in. A dropdown without it renders as before. **Typing filters, and focus stays in the
field**, which has `role="combobox"` over the list. `aria-activedescendant` names the row that
Enter would pick. The field carries the focus ring. The active row is marked by the hover fill
alone — an edge around a row would be the focus band's own shape. **The match is anywhere in the label**, with case and accents ignored. Rows keep their
original order. Descriptions are not searched, so put the words a reader will type in the label.
**Every open starts from the whole list**, and a query with no matches says so instead of showing
an empty panel. **The panel is a dialog**, because a listbox may own only options. When a dropdown
must have a search field is a rule rather than a recommendation:
[Component choice](../guidelines/component-choice.md).

### The drawer

A drawer is a panel against one edge of the screen. It appears over a scrim. It lets the reader
look at or change one thing without leaving the list that opened it. **It groups by heading, never
by card:** `drawerSection()` puts a heading above a `<dl>` of label and value pairs. A screen reader
then hears each label with its value. The value stays beside its label instead of moving to the far
edge of the panel. Nothing inside a drawer draws a card, a row rule or an `<hr>`. Actions stay
outside the scrolling body. **It moves on open and on close**, and both movements are instant when
reduced motion is enabled. For when a flow should use a drawer or a page:
[Drawer](../guidelines/drawer.md).

### The modal

The React `Modal` limits its height to 96% of the dynamic viewport. Its body scrolls, while its
title, close control and footer stay visible. It is a borderless raised surface. It uses the drop
alone, `--radius-md`, a `--text-base` title and a deep scrim without blur. It names itself with an
`h2`. The HTML entry point ships no general modal. Its separate `confirm()` is unchanged.

### The hover readout

`tooltip()` is the readout that a surface shows while a pointer rests on one of its marks. It is an
overlay. That is the guarantee: **showing, filling or moving a readout never changes the size or
the place of anything else on the page.** There is one element per host. It is placed absolutely
and takes no pointer events. `.ui-tip-host` marks the box it is placed against. The readout flips
or slides only as far as needed to stay inside the viewport and every ancestor whose overflow
clips. **What it says is text**, written with `textContent` and never parsed. Focus on a mark shows
the readout and describes the mark through `aria-describedby`. **Escape dismisses every readout
the kit is showing**. **Under a coarse pointer the tap is the switch**, and the opening tap is
captured. This means a chart that drills down on a bar does not drill down on the tap that asked
what the bar says. No value may be reachable only by hovering. See
[Hover readouts](../guidelines/hover-readouts.md).

### Pagination

The pager renders a page you have already computed. It uses the current page, the page size and,
where you know it, the total. A page counted by a server and a page sliced from an array therefore
produce the same markup. **A result whose size is not known is a supported shape, not a degraded
one:** without a total, the pager offers the step before and the step after. It does not claim a
page count. **A control that would leave the result is disabled and stays where it is**. It is
never removed or replaced with text. **One page of content gets no steps.** **The row range is
announced**, politely and as one whole message. It is the only part of the pager that announces.
**The page size is a scale the kit names**. You choose which sizes a table offers and whether to
remember the reader's choice. **A page turn does not move the ground under the reader:** the
pager keeps its numbers legible, marks itself busy and stops accepting input while the next page
loads.

### Stat bands

`statBand()` renders a row of key figures as a description list. A screen reader can then read each
figure as one statement. **A figure's value is never broken across lines and never truncated;**
the words below it give way instead. A band that is too narrow for its figures folds before normal
wrapping would leave one figure alone on a row. It decides this from **its own width**, not the
window's. In a flex row or an `auto` grid track, you give it one:

| Layout | Four fold two by two at | An odd count stacks at | One column at | Smaller value below |
|---|---|---|---|---|
| Band and tiles | 56rem | 42rem | 28rem | 14rem |
| Open | 66rem | 50rem | 32rem | 15rem |

Below 14rem, band and tile values use the next smaller type rank. Open values step down below 15rem.
Longer values remain the caller's responsibility.

A band can use `basisId` to reference comparison text before the figures. An explicit `basis` takes precedence.
When a period control already states the window, omit a caption that repeats it, including for totals without changes.

**A change shows which way it went with an arrow read off the sign you printed**, and colour follows
your verdict alone. No tone and `neutral` are the same neutral change. **A figure with nothing to
compare draws no row at all:** never `+0%`, and never a sentence saying there is nothing to say.
**A change says what it is measured against, in text a reader can reach**. Put it once for the band
in its caption, or beside the change when one figure is measured against something else. A hover
`title` does not count. **The caption comes before the figures**, as a table's `<caption>` does.
**A figure says at most one thing under its value, and it says it in one row**. A caption earns that
row only by giving a unit, a period or a limit that the figure cannot. **The trend is a slot:** the
kit sizes and colours your `<svg>` and draws no chart. Three layouts ship. `tiles`, the default,
puts each figure on its own card. `band` is one card. `open` draws no surface and sets the value
larger.

### Dense financial tables

The table is markup. A named scroll region contains a native `<table>`, and you apply the
recipes as classes. Zebra adds no grey stripes. Hover marks the row edge without tinting the
data surface. `compact` sets a 33px minimum row, but larger or wrapped content makes the row
taller. **Columns scroll rather than disappear**, while sticky headers and pinned identity cells
keep opaque backgrounds, the shared focus composition, and their full accessible names. **A
pinned column draws its divider only where the region can actually scroll:** at a width where
every column fits, the line divides nothing, so it is not drawn. **The region shows a soft shade
on whichever edge still has columns behind it, and none on an edge that has been reached** —
darker on a light ground, lighter on a dark one. Both are CSS alone, so vanilla and React tables
carry them alike, and neither reaches the focus ring. An engine that cannot report a scroll state
keeps the divider at every width. **A link
inside a cell uses the row's ink, gets an underline on hover, and uses the shared ring on
`:focus-visible`**. The ring surrounds the whole link, including a title-cell link that wraps.
`numericValue` distinguishes missing from zero. `deltaValue` prints your sign and uses your
explicit judgement. **Colour never supplies the sign.**

A cell can group its reference and status with `.ui-table__pair`. They stack when the cell cannot fit them side by side.
A landed row keeps its selection background through keyboard focus, so arrival and focus show together and stay distinguishable.
The caller brings the target row into view and keeps its mark until the next arrival.

**Below the one-column step, a table marked `.ui-table--stack` lays each row out as a block
instead of scrolling.** The identity and short cells appear on the first line. `.ui-table__long`
appears below them. The header row is clipped rather than removed, so a cell still reads with
its column's name. **A clipped header is read but not operated**, so put a sort or filter control
on the row above the table and name the table in `aria-controls`. The markup includes the table
roles at every width because a stylesheet cannot add them. A value whose meaning comes from its
heading must carry that meaning itself. This is a rule in [Dense tables](../guidelines/dense-tables.md).

`FilterBar` is controlled by you. Selections, removal, and clear-all request changes. They never
change the filters you supplied. **A chip shows only the chosen value**, while the field's name
appears only when nothing is chosen. Next to a value, the name reaches the reader through the
trigger's accessible name and a hidden legend.

### The command palette

The kit provides the palette shell, its ranking, and its keyboard. It does not name result kinds.
What a result *is* — an invoice, a campaign, or a domain — comes from your product's vocabulary.
The groups also come from your product. **A row can behave in three ways**, because Enter must
give a different result in each case. A row that goes somewhere has an `href`. A row that runs
something reports a `ui-command` event. A row that destroys something names a confirm and opens
it. **A destructive row with no confirm is rendered disabled instead of running.**

**Results are ranked by how the query matches the item, and you break every tie.** A whole label
beats a prefix. A prefix beats a word start. A word start beats a substring. A keyword beats a
note. Initials come last. Groups use the score of their best row. Equal scores keep the order
you passed. The kit remembers nothing between openings, and **a palette fed by a server does not
rank results at all**: the client keeps the order it was handed, and the ranking above becomes
the server's to apply — with `rankGroups`, the exported function both faces use, rather than a
second one written beside it, so a list drawn on a server and the same list after a keystroke
cannot disagree about what comes first. **The keyboard is these keys and no others.** Cmd or
Ctrl+K opens the palette, the arrows move the active row and wrap at both ends, Enter runs it,
and Escape closes the top overlay. Tab is trapped in the panel. Home and End stay with the text
caret, which is what the ARIA combobox pattern gives them for, and Ctrl+K inside another text
box is left alone, because it is kill-to-end-of-line there — Cmd+K still opens from one.
**Focus opens in the text box and never leaves it while the palette is open**, over an inert page.
**It opens empty**, and **it paints one step above the drawer and one below the confirm**. A
confirm opened by a row appears over both and answers the first Escape.

### Success confirmations

A confirmation has **one title and at most one short line below it**. It has no eyebrow:
`success()`, `<Success>`, and `successPanel()` take a title and one detail line. Nothing adds a
third tier above or between them. They draw the confirmation on a plain elevated card. The card
uses the kit surface and its border, with nothing behind it. There is no backdrop layer and no
`backdrop` option. The mark is one of two, selected with `check`:

| `check` | Mark | Size | Motion |
| --- | --- | --- | --- |
| `line` (default) | Lucide `check`, bare, in the success colour | 56px hero, 72px split, 28px compact, 28px inline panel | strokes itself on over `--dur-slow` |
| `circled` | Lucide `circle-check-big` (the kit's `circleCheck`) | 20px, the kit's label size — every layout, inline panel included | at rest |

`line` uses the size for the layout where it appears. `circled` uses one size everywhere. Both
are unmodified Lucide paths in a 24 box. Neither has a filled disc or a burst ring behind it.
[Iconography](../guidelines/iconography.md) reserves a circled glyph for a state, so `circled`
is the mark that rule requires. `line` is the default because it carries the moment at page
size. An action that is not a kit `Button` — a router link or a plain `<a>` — is ringed already and
needs no class; `.ui-focusable` is for a focusable that is neither a link nor a kit control.

### Pending and denied states

Every screen has two states: it is still fetching, and the reader is not allowed to see it.
**One region has three renders:** `busyRegion()` is a live region that *outlives* what it
reports on. It first renders with a skeleton inside. `setBusy()` then replaces its body and
writes a line into the screen-reader node that the region already contains. A live region whose
text changes is the only thing assistive technology reliably speaks. It reuses the pair
`toast()` and `success()` carry. There is no second mechanism. A skeleton is `aria-hidden`.
**`deniedState()` has no role of its own**, so the region where you place it announces it. It does
not need to announce itself as a whole page. There is **no spinner factory**. At screen scale, a
skeleton shows what shape is coming.

```js
const el = document.querySelector('#report');
el.innerHTML = busyRegion({ label: 'Loading your report…', lines: 4 });
const rows = await fetch(…);
setBusy(el, { busy: false, message: `${rows.length} rows`, body: table(rows) });
```

### Busy button labels

A busy button replaces its visible label with three centred pulsing dots in the variant's full
label ink. The brightest dot clears 3:1 against every variant fill in both themes. Text does not
fade or blink. The retained label and icons keep the button's dimensions stable. Reduced motion
switches directly between the label and static dots. **A wired busy button keeps focus:**
`aria-disabled` communicates the state. Click, Enter and Space activation are blocked. Both faces
announce through a status region outside `aria-busy`. This region stays through completion, so it
can announce both progress and completion. React takes `completionMessage` to word that
completion. Use `completionMessage=""` to say nothing when a form error or another live region
announces the outcome. An explicitly disabled button stays natively disabled. Unwired
`button({ busy: true })` markup keeps native disabled as a safe fallback.

### Extra-small buttons

`button({ size: 'xs' })` and React `<Button size="xs">` draw a 13px glyph at stroke-width 2.8.
They have a minimum 24×24px target. An icon-only xs button is 24×24px. A labelled button grows
to fit its label at `--text-xs`. Other sizes keep their 16px glyph at stroke-width 2.4. Busy
dots fit inside the smaller target. The size does not change the variant's colour or its
interaction states.

### Code highlighting

`hlCode(raw, lang)` returns highlighted HTML. `codeTokens(raw, lang)` returns the same tokens as
data. `hlShell(raw)` is the shell case under the name it has always had. `codeLanguages` lists
the values that `lang` accepts. An unrecognised name is read as shell. One tokenizer serves both
faces, so vanilla HTML and React spans cannot drift apart. The five classes carry different
meanings per language:

| Language | `.k` | `.s` | `.f` | `.u` | `.c` |
| --- | --- | --- | --- | --- | --- |
| `shell` | the command | a quoted string | a flag | a URL | a `#` comment |
| `json` | a property key | a string value | a number, `true`, `false`, `null` | — | — |
| `ts` | a keyword | a string or template | a number or literal | — | a `//` or `/* */` comment |

They colour short snippets, not arbitrary programs. Three of the five miss WCAG AA on the light
card. They are recorded as debt, not presented as compliant: `.f` and `.u` at 3.81:1 and `.s` at
4.45:1. **The copy button is icon-only in both faces**, with `copyLabel` as its accessible name
and `title`. **Confirming a copy does not change the control's size or its name**: the glyph
swaps inside the same box, and the word goes to a hidden live region. Snippet descendants use
the shared ring, except the browser-focusable code region. A `<pre>` sits flush with its card and
has no radius, so **the card paints that ring instead**.

### A toolbar at one column

A toolbar above a list opens with a search box, followed by its filters and then its view switch.
`.ui-toolbar` gives its text field a `6rem` flex basis. The row breaks only when the field would
be squeezed below that size. At `560px`, that basis would become the field's size rather than its
floor. So at that width the field uses `flex-basis: 100%`. It takes the full line, and the rest
of the row wraps below it.

A title without an introduction keeps a 32px gap before the page body.
A control row directly inside the body sits closer to the block it controls.
Use `.ui-toolbar--split` to place the final control at the row's end. On a phone, it starts its own line.

### Segmented strips that outgrow their column

A pill strip lays out its choices in one row while they fit. When they do not fit, the choices
wrap onto further rows. **It never widens past its container:** a twelve-month picker in a phone
column becomes three rows of pills instead of pushing the page sideways. Below 560px, the
standard-size pills reduce their side padding while keeping the same type rank. The underline
appearance wraps too, so no tab is cut off at a phone width. A label that is too long for the
column wraps inside its own tab. Arrow keys, Home and End skip disabled choices.

### The chosen tab in an underline strip

The chosen tab is its own label with 2px of accent under it. It has no plate, hairline or upright
rail. **The accent is spent once.** No tab draws a visible box against the strip's ground. The
pill appearance marks its chosen button with a fill; the underline strip overrides that fill back
to `none`, because the bar under the label is its whole mark. It has no background, border or
inset shadow. Nothing in it reads as a card lying on the page. The
strip also draws no rule under its tabs. A consumer that wants one draws it on the container.

**Every mark that says "chosen" sits inside that tab's own box**, clear of its edges. This lets the
strip wrap. A tab on a further row carries its whole highlight with it and is never read against
the row above or below. Every tab reserves the bar, but only the chosen one draws it. The mark
therefore grows in place when the choice moves. Hover is an ink step from `--text` to
`--strong`, the step every kit tab takes. There is no second mark.

### Escaping and URL slots

Factories return HTML strings. **Text and attribute values are escaped where written:** quotes and
angle brackets in a name, identifier, class modifier or label cannot add an attribute or an
element. Do not escape ordinary text or URL slots before passing them in. **URL slots reject
`javascript:`, `data:` and `vbscript:`**, case-insensitively. This includes leading ASCII
controls and embedded tabs or newlines. Other schemes, relative paths and fragments keep their
original values. A rejected navigation URL renders as `#`. A rejected image source renders as
an empty `src`. `backLink()` renders nothing at all for one.

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

The React wrapper publishes components over the same CSS. Its own notes are in
[react/README.md](../react/README.md). This section explains what React promises beyond the
vanilla sections above.

### React tables

Column labels accept React content, including a kit Tooltip that explains a header.

**A scrollable table reaches its far columns by scrolling, and offers no button for it.** Give it
`stickyHeader` or `pinnedIdentity`. The table then sits in a named scroll region. The region takes
keyboard focus and draws the kit's ring inward. A trackpad, a finger and the arrow keys can then
reach the same columns. `scrollLabel` provides the region's name. It defaults to `Table`, which
only says what the region contains. Pass the table's own subject instead, such as `Invoices`.
Name the gesture only when the columns overflow at every width the surface supports:
`Selectable companies, scroll for more columns`. A name has one state. If it names a gesture, that
gesture must be correct at every supported width.

**Sorting is yours to control or the table's to manage, and one table stays in one of those modes
for as long as it is on the page**. The default is the first sortable column, descending. An absent
sort key and equal values both preserve input order. Ordering returns its own list, so the rows you
supply are never reordered through the result. **Paging is on the same terms:** a controlled table
shows all the rows it was given. Those rows are the page, and you provide the count it reports.
`DataTable` builds its own class list and takes no `className`. It renders its sort control inside
the header cell. A stacked table clips that control.

### React fields

`TextField`, `TextArea`, `SelectField` and `FileField` generate IDs for their controls and
messages. They also name their controls. **An error marks the control invalid and is described
before the hint rather than in its place**. This keeps a hint with consent, safety or legal detail
on screen while the reader decides whether to retry. The error also uses `role="alert"`, so a new
error is announced without moving focus. Required markers are decorative. Native controls carry
`required`. `Field` exposes the frame for a control that you render yourself. Its child function
receives a stable ID, `required`, `aria-invalid` and `aria-describedby`. `FileField` accepts one
file from the picker or by drop. `accept` only filters the system picker, so you validate before
upload.

### React toasts

`Toast` and `useToast()` render the vanilla toast classes in a fixed stack. The newest notice is
at the bottom. The stack is anchored to the bottom-right corner. **The provider publishes how far
the stack reaches up the viewport** as `--rx-toast-stack` on the document root. It is `0px` while
the stack is empty. A fixed page action can use this value to stay clear of any number of notices.
Use **one** provider per document, because that property is a document-root global. Notices without
actions dismiss after five seconds. They pause while hovered or focused. Notices with an action
stay until the reader selects or dismisses it. Ordinary notices are polite. Danger notices are
assertive. Adding a notice does not move focus.

### React search field

`SearchField` is the unlabelled search box that a toolbar opens. It has a decorative leading glyph
and a native `type="search"` control on the shared input class. **`ariaLabel` is required and is
the control's only name**, because no label appears in the row. It declares no CSS of its own. The
toolbar's row rule and the field's focus ring therefore reach it from the kit's stylesheet.
**There is no clear button**, because the browser paints its own near-black button on the light
field and white button on the dark one.

### React date and month picker

`DatePicker` picks one month, a range of months, one date or a range of dates. At its ordinary
width, it uses the dropdown's shell and adds only the grid inside it. The panel is a `dialog`,
because a calendar is a grid and a listbox may own only options. The panel is `inert` while closed.

**The grain and the span are two questions, not one:** `month` and `day` pick a single period.
`range` and `day-range` pick a start and an end in the same two presses. Periods are ISO strings in
the mode's own grain. Every step and comparison uses arithmetic on one integer per period. Nothing
walks a `Date` across a daylight-saving boundary. **A period written in the other grain still
counts**. A month read in day grain is its whole span. A date read in month grain is the month it
falls in. A string that is neither is no bound. Bounds mark a cell `aria-disabled` and refuse the
press, but **the cell stays focusable**, so a reader meets the bound instead of losing it.

**One tab stop in the grid, on the cell the keyboard is on**, and **Home and End go to the ends
of the row without leaving the page**. **Every cell says what it is in its own accessible name.**
**A range spans what lies between its ends — blocked periods included**, because
`{ start, end }` cannot say "all of this but not that". Such a period keeps its place in the value
and loses only the tint. **Blocked beats every other state in the paint, and its label is struck
through.** **Hover is the kit's row hover**, not a tint of the accent. **The current period is a
ring**, a hairline in the accent, and it stands aside while the cell holds focus, so a focused
current period draws one band and not two. **Nothing is drawn under the grid:** no legend and no per-period
swatch. **Below 560px the panel is a sheet, and a sheet is the kit's drawer**, and below the phone
step the gap between weeks opens to reach the 44px tap floor. Its one breakpoint literal is one of
the steps in [Breakpoints](foundations.md#breakpoints).

### React file drop

`FileDrop` is the compact drop: at rest, it shows one row with the button that opens the
system picker. Beside the button, it shows the accepted types and size limit in your words.
The field-sized dashed box remains with `FileField`. **You own the upload:** `FileDrop` sends
a chosen or dropped file through `onFile` and renders the `file` you provide. **A file with no
`status` is uploading**, so the kit never reports success unless you claim it. **A status the
row draws includes a circled mark and a word**, because colour alone does not show status. When
`progress` is provided, the track shows the status instead. `Remove` and `Retry` appear only
when you provide `onRemove` and `onRetry`. **No tier ever takes a second line:** the name
truncates its stem but keeps its extension. The full name is in a `title`. **One layout serves
every width.** **The drop target is painted only while a file is over the region. It covers
that region instead of joining it**, so the row stays in place while the reader aims. Children
render above the row inside the same region. This lets one panel, or a whole page, become the
target. A disabled drop never calls `preventDefault` on `dragover`, so it does not declare
itself as a target the pointer can aim at. When a page uses a row, a region or a dialog, see
[File drop](../guidelines/file-drop.md).

### React Button links and leading artwork

React `Button` accepts `href` and then renders an anchor with the existing button classes.
Without `href`, it renders a native button defaulting to `type="button"`. Refs and native
attributes belong to whichever element it renders. `leading` accepts decorative content before
the label wrapper and takes precedence over `icon`. For an icon-only control, the component
copies string children, then the icon name, into `aria-label` and `title`. **With neither, it
stays nameless instead of receiving an invented name.** `className` merges with the kit's
classes. **The component's state wins over your spread props** — `aria-disabled`, `aria-busy`,
the `data-btn-*` hooks, a link's `role`, and the `href` and `tabIndex` that a disabled or busy
control removes. This prevents a caller from leaving a busy or disabled control looking idle.
**Space is blocked on button roots only**, because it never activates an anchor. A busy link
that swallowed Space would also prevent the reader from scrolling the page.

### The rest of the React surface

- **`Tabs`** unmounts inactive panel content. Arrow keys, Home and End move between tabs and
  activate them.
- **`Confirm`** builds on `Modal` as an `alertdialog`. It focuses the safe action and draws it
  before the committing action. `onConfirm` only reports the press. Saving, errors and closing
  are yours.
- **`Timeline`** renders your events from oldest to newest. **Only the last event's marker is
  filled.** A new ID in a non-empty history plays an entrance. Editing existing IDs does not.
- **`AppShell`** shares the vanilla fold cookie and 720px fold. The longest matching section
  path wins. **Below 560px, a bottom bar replaces the rail:** it shows up to four sections, or
  three sections plus More. **A shell whose list has nowhere to go — one section and no back
  link — draws no rail, no fold control and no bottom bar;** the brand lockup moves to the band
  and the section stays in the command palette. One section under a child page is a destination,
  the page's parent, so that list is drawn and the row takes `aria-current="true"`. It publishes
  `--ui-app-bottom-clearance`, the height of that bar plus the device's safe-area inset. **A phone page whose shell draws no bar
  keeps the ordinary end space the kit gives every phone page:** the reservation disappears
  without taking that space with it. **Page bottom padding, root scroll padding and the toast
  stack all keep that clearance,** so scrolling an action into view never parks it behind the
  bar.
- **`SidebarNav`** accepts flat items or captioned sections, nested groups, counts and
  router-link rendering. **Nesting stops one level deep.** Each row keeps its name and count when
  collapsed.
- **`Checkbox` and `Switch`** render native inputs inside the existing label classes, and **a
  disabled one uses the same paint as every other disabled control in the kit.**
- **`Snippet`** displays `code` as plain text, and **copying always writes the original `code`
  string**, whatever `children` displays.
- **`EmptyState`** uses the vanilla markup and CSS, and **the page supplies its own `h1`.**
- **`ThemeToggle`** cycles through dark, light, auto, then dark. It stores explicit choices
  and follows the OS otherwise. It sets `data-theme-choice` and the resolved `data-theme` on
  `html` and exports `THEME_INIT_SCRIPT` for a head script.
- **`Tooltip`** renders the vanilla host, panel and label classes. Escape keeps focus on the
  trigger.
- **`Pill`** and **`StatusDot`** add no interactive role and create no live region. Visible
  status text belongs beside the dot.
- **`SuccessPanel`** is the inline confirmation. **`SuccessCheck`** is the bare shared mark.
- **Shared logic.** `dropdownMatch`, `dropdownFiltering`, `rankGroups`, `rankCommands`,
  `scoreCommand`, `paletteHotkey`, `segmentedNextIndex`, `PAGE_SIZES`, `DEFAULT_PAGE_SIZE` and
  `calloutIcons` come from the main entry. So do `formatNumericValue` and
  `formatDeltaValue`. They return plain text and classes for React to render and never HTML.

## What the kit does not do

This is stated so nobody has to discover it by trying:

- **No JavaScript framework.** The factories return HTML strings. Anything stateful is yours.
  The React subpath wraps the same CSS rather than providing a second kit.
- **No build step**, whose consequence is
  [breakpoints as literals](foundations.md#breakpoints).
- **No density system.** `.ui-table--dense`, `.ui-table--compact` and `.ui-cmdk--roomy` are the
  only density modifiers, and each is local to its component.
- **No container scale.** There is one `--container`, not a narrow/wide set.
- **No second bar for a control's glyph.** 1.5 CSS px is the line for every stroked mark.
- **No charts.** A stat band's trend is a slot for your `<svg>`.
- **No hand-written markup contract, except a row the kit renders as a control** — a `<div>` with
  a role and a tabindex, or an `<a>`, which you must rewrite as a `<button>` when it needs to
  work from the keyboard. Those class names are a supported surface.
- **No support for a vertical writing mode.**
- **The vanilla factories and initializers are removal-bound.** React components and their shared
  logic, all CSS and tokens, the inline strings, the motion helpers, `esc`, `icon` and its name
  tables, the brand marks and the Markdown guidelines all stay supported.

## Recipes

### A dropdown row you write yourself

`<button class="ui-dropdown__item">` renders the same row that `dropdown()` emits. Write
one when the row must be a native control. The reason is explained in
[A dropdown row is a div, a link or a button](#a-dropdown-row-is-a-div-a-link-or-a-button).

```html
<button type="button" class="ui-dropdown__item" data-dd-item role="menuitem" tabindex="-1">
  <span class="ui-dropdown__main"><span class="ui-dropdown__label">Rename</span></span>
</button>
```

`wireDropdown()` finds rows with `data-dd-item` inside `[data-dropdown-panel]`. It does not
find them by class. These attributes make the row work:

- `data-dd-item` — without it, the row is not in the arrow-key ring or the click handler
- `role="menuitem"` in a `menu` dropdown, `role="option"` in a `select` one
- `tabindex="-1"` — the panel moves focus itself, while a `<button>` is in the tab order by default
- `type="button"` — without it, a row inside a form submits the form
- `aria-disabled="true"` for a disabled row, not the native `disabled` attribute: the item walk
  filters rows using this attribute
- `aria-selected="true|false"` on a `select` row, and keep the `.ui-dropdown__label` span — the
  pick is written to `aria-selected` on the row itself, never on a span inside it, and the row
  also takes `is-selected`, which is what shows its tick. The trigger's `.ui-dropdown__value`
  text is copied from the picked row's `.ui-dropdown__label`
- `data-value="…"` if you read the pick from the element

### Forms

`field()` provides wiring that a control cannot provide for itself. It sets the label's `for=`,
adds an id to the hint or error and points to it with `aria-describedby`, adds `aria-invalid`
to a field with an `error`, and adds the native `required` attribute under the decorative
asterisk. A control outside a `field()` needs its own `ariaLabel`. A placeholder is not a name.
Put a form on a card, not on the page ground. A field is drawn by its edge, but the page ground
is too close to the field's own fill for you to see that edge. See
[Colour and contrast](foundations.md#colour-and-contrast).

### Segmented or tabs?

Ask what is behind the choice. If choosing an option reveals a different block of content, that
content is a panel. Use `tabs()`. It renders the panels and lets a screen reader announce
"tab, 1 of 3" truthfully. If choosing an option only narrows a list, flips a unit or sets a
preference, there is no panel. Use `segmented()`. It says "pressed" instead of "selected".
Both give a keyboard user one Tab stop. Both need a name, so pass `ariaLabel`.

### successPanel or success?

Ask how much of the screen the confirmation owns. After a form has been submitted, or inside a
card on a page where the reader stays, use `successPanel({ title, sub })`. When the confirmation
*is* the screen and the reader needs somewhere to go next, use `success()`. It chooses a layout,
carries follow-up buttons and can run a redirect countdown after you call `wireSuccess()` on the
mounted element. Restyling one does not move the other: `successPanel` is `.ui-success` and
`success` is `.ui-sx`. Both draw `successCheck()`.

---

Install, usage and the publish flow are in the [top-level README](../README.md).
