# The library (`@apliteni/apliteni-ui`)

A framework-agnostic **HTML + CSS** design system: design tokens, one stylesheet per
component, and factory functions that return HTML strings.

```js
import { button } from '@apliteni/apliteni-ui';
button({ label: 'Save', variant: 'primary' });
// → '<button type="button" class="ui-btn ui-btn--primary"><span>Save</span></button>'
```

Strings rather than components, because the strategy portal server-renders HTML from
`.mjs` modules and could adopt the kit without a rewrite. Storybook renders the same
strings for review.

This page is the map: what ships, what to import, and what every published name is.
What each component guarantees is in [the specification](specification.md); what the
rules are is in [the guidelines collection](guidelines.md); React is in
[react/README.md](../react/README.md).

## Source layout (`src/`)

```
tokens/tokens.css    Colors, type, spacing, radius, elevation, motion — dark + light.
tokens/accents.css   Accent sub-themes (data-accent), both themes.
styles/*.css         One stylesheet per component.
index.css            Bundler entry — tokens then every component, in cascade order.
inline.js            The same CSS as JS strings, for server-render consumers.
assets/              icon(name) → <svg>; the brand mark.
components/          The factories (see the catalog below).
index.js             Public JS entry — re-exports every factory.
```

### Entry points (`package.json` `exports`)

| Import | Use |
|--------|-----|
| `@apliteni/apliteni-ui` | The factories (`button`, `card`, `topbar`, …), with TypeScript declarations. |
| `…/css` | The whole stylesheet, for bundler/browser builds. |
| `…/inline` | CSS as **strings**, for server-render inlining (`tokensCss`, `topbarCss`, `cssText`, …). |
| `…/tokens`, `…/accents` | Just the tokens / accent sub-themes. |

`…/css` and `…/inline`'s `cssText` carry the same stylesheets in the same cascade order —
not the same bytes, since one is a list of `@import`s and the other is those files
concatenated. `scripts/stylesheet-manifest.test.js` fails when either names a stylesheet
the other does not.

Picking individual sheets out of `styles` rather than taking `cssText` whole: `successPanel()`
needs both `styles.callout`, which lays the panel out, and `styles.success`, which holds the
glowing check and its reduced-motion rules. Put them after `tokensCss` and `baseCss`.

## Tokens & theming

Everything visual is a CSS custom property, driven by two orthogonal attributes on
`<html>`:

```html
<html data-theme="dark" data-accent="phoenix">
```

- **`data-theme`** = `dark | light` — surfaces, text, borders, and the fixed signal
  colours.
- **`data-accent`** = `phoenix | ocean | emerald` (absent = **Nebula**, the purple
  default) — re-points only the accent family, so every accent works in both themes with
  no component change.

Type is the one axis neither attribute touches: `--font-display` for headings and brand
marks, `--font-sans` for everything read, `--font-mono` for code. Neither family ships
with the package — the host page loads both. See
[Typefaces](specification.md#typefaces).

`applyTheme('light')` and `applyAccent('phoenix')` persist to `localStorage`; `ACCENTS`
is the list of names `applyAccent` takes. Or ship `accentPicker()` and let
`wireTopbar()` handle it.

### An absent attribute means dark

`data-theme` and `data-accent` are optional **overrides**. With neither attribute, the
kit renders dark Nebula.

```html
<html>                              <!-- dark, Nebula -->
<html data-accent="ocean">          <!-- dark, Ocean -->
<html data-theme="light">           <!-- light, Nebula -->
```

## Component catalog

One row per published name, with the page that settles its behaviour. Options are listed
to say what a factory takes, not what it does.

### Content and status

| Name | What it is |
|------|------------|
| `button({ label, variant, size, icon, iconRight, block, disabled, busy, href, iconOnly })` | `<button>`, or `<a>` with `href`. |
| `setButtonBusy(element, { busy })` | Flips a mounted button to its busy state and back. See [Busy button labels](specification.md#busy-button-labels). |
| `badge(label, variant)`, `pill(label, variant)`, `statusDot(live)` | Status chip, rounded chip, live dot. |
| `card({ title, sub, body, variant, pad, icon, level })` | Surface container. `title` and `sub` are trusted markup; keep the title to inline content. |
| `callout`, `toast`, `successPanel` | Inline feedback, inside the page the reader is on. `calloutIcons` is the default glyph per tone. |
| `pushToast(container, opts)`, `dismissToast(el)`, `wireToastStack(container)` | The runtime toast stack. |
| `success({ layout, check, level, title, body, actions, confetti, countdown })` + `wireSuccess(root)` | Page-sized confirmation; `successCheck()` is its check mark alone. See [Success confirmations](specification.md#success-confirmations) and [successPanel or success?](#successpanel-or-success). |
| `emptyState({ art, icon, title, sub, actions })` | Placeholder for an empty list, table or page; `art` is an `illo()` name or raw SVG. |
| `deniedState({ title, sub, need, actions, icon })` | The 403, in the same layout language. See [Pending and denied states](specification.md#pending-and-denied-states). |
| `busyRegion({ label, readyLabel, busy, body, lines })` + `setBusy(root, …)` | The screen's pending state, and the only thing in the kit that announces one. |
| `skeleton({ lines, width, height, radius })`, `skeletonTable({ rows, cols, head })` | Placeholder shapes, `aria-hidden` throughout. |
| `snippet({ label, code, reveal, copy, copyLabel })` | Code block with an icon-only copy button. `hlCode(raw, lang)`, `hlShell(raw)` and `codeTokens(raw, lang)` highlight the languages `codeLanguages` lists. See [Code highlighting](specification.md#code-highlighting). |
| `icon(name, cls)`, `illo(name)`, with `iconNames`, `iconCategories`, `illoNames` | Line icons and illustrations as SVG strings; `sun` and `moon` are also exported bare. |
| `iconOnlyAllowed`, `iconMeanings` | The two icon rulings as data. See [Icons and glyphs](specification.md#icons-and-glyphs). |
| `seedling`, `prism`, `brand` | The brand mark. |

### Controls and input

| Name | What it is |
|------|------------|
| `field({ label, hint, error, control, required })` | The label, hint, error and ARIA wiring a control cannot do for itself. See [Forms](#forms). |
| `input`, `textarea`, `select`, `checkbox`, `switchToggle` | The controls `field` wraps; each also renders on its own. |
| `segmented({ options, active, size, block, name, ariaLabel })` + `segmentedNextIndex(key, index, length)`, `initSegmented(root)` | Toolbar of toggle buttons. See [Segmented or tabs?](#segmented-or-tabs). |
| `tabs({ items, active, name, ariaLabel })` + `initTabs(root)` | Tablist and its panels, one per item. |
| `dropdown({ label, value, variant, items, sections, foot, header, footer, align, direction, portal, scroll, search })` + `wireDropdown(root)` | Popover list, as a listbox or an action menu. `portal: true` is the answer for a dropdown inside the shell's rail. `dropdownMatch(label, query)` and `dropdownFiltering(query)` are its filter, published so a second implementation asks the kit. See [The dropdown panel](specification.md#the-dropdown-panel) and [A dropdown with a search field](specification.md#a-dropdown-with-a-search-field). |
| `filterBar(options)` + `initFilterBar(host, options)`, with `filterChipText`, `filterChipName`, `filterChipUnset` | The controlled filter row above a table. The consumer owns the filters and calls `update()`. See [A filter row holds its panels](specification.md#a-filter-row-holds-its-panels). |
| `pagination({ page, pageSize, total, hasMore, pageSizes, variant, label, loading, href, id })` + `wirePagination(root, …)`, `setPagerStatus(root, text)`, `PAGE_SIZES`, `DEFAULT_PAGE_SIZE` | The strip under a table or list; it renders a page the caller already computed. See [Pagination](specification.md#pagination). |
| `commandPalette({ groups, items, label, placeholder, query, empty, density, hint, rank, hotkey, open, specimen, id })` + `wireCommandPalette`, `openCommandPalette`, `closeCommandPalette`, `commandPaletteList`, `setPaletteResults`, `rankCommands`, `rankGroups`, `scoreCommand`, `SCORE`, `paletteHotkey()` | The ⌘K overlay and the ranking behind it; `SCORE` is the ladder itself, for a server that sorts the same way. See [The command palette](specification.md#the-command-palette). |
| `feedbackWidget()` + `wireFeedback(…)`, `nearestSection(node, root)` | Select a passage, give feedback. |

### Overlays

| Name | What it is |
|------|------------|
| `drawer({ side, size, title, body, footer, open, specimen, dismissible })` + `wireDrawer`, `openDrawer`, `closeDrawer`, and `drawerSection({ title, rows, body })` for one group of its body | Panel anchored to a screen edge, over a scrim. See [The drawer](specification.md#the-drawer). |
| `confirm({ title, body, confirmLabel, cancelLabel, variant, open, specimen, id })` + `wireConfirm`, `openConfirm`, `closeConfirm` | Modal question over a scrim, for a destructive action the page has to stop for. |
| `tooltip({ label, value, detail, placement, open, x, y, id })` + `wireTooltip`, `showTooltip`, `hideTooltip` | The readout over a chart mark, opened by hover or by tap. See [The hover readout](specification.md#the-hover-readout). |

Both `drawer()` and `confirm()` take `specimen: true`, which draws a picture of one for a
documentation page: no `aria-modal`, no wiring, no Escape.

### Figures and tables

| Name | What it is |
|------|------------|
| `statBand({ stats, variant, basis, label, id })`, with `STAT_VARIANTS`, `STAT_TONES` | A row of key figures as a `<dl>`. Each figure is `{ label, value, caption, delta, trend }`, where `caption` is context that is not a change. `basis` is what every change is measured against; the kit draws no chart. See [Stat bands](specification.md#stat-bands). |
| `numericValue({ value, unit, missing })`, `deltaValue({ value, tone, basisId })` | Inline value and inline change. Colour never supplies the sign. |
| `rowIdentity({ symbol, name, logo, href })` + `initRowIdentity(root)` | A company identity cell; failed images reveal the letter fallback. |
| `formatNumericValue(…)`, `formatDeltaValue(…)` | The same two decisions as plain text, shared with React. |

The table itself is markup, not a factory: the scroll region, the sticky header and the
pinned identity column are classes a page applies. See
[Dense financial tables](specification.md#dense-financial-tables).

### Page furniture

| Name | What it is |
|------|------------|
| `appShell({ word, brandHref, nav, active, navLabel, crumbs, back, title, sub, body, account, signOutHref, layout, width, search, topbar, maxWidth, collapsible, collapsed })` | The kit's one page shell, and the one to call for new work. See [The page shell](specification.md#the-page-shell) and [The second layout](specification.md#the-second-layout). |
| `wireShell(root, { persist })` + `railCollapsed(cookieHeader?)`, `RAIL_COOKIE` | Wires the rail's fold, the reader's menu and the nav's groups; a server paints the right width first from the cookie. |
| `nav({ variant })`, dispatching to `sidebarNav`, `navTabs` or `breadcrumbs`, + `wireNav(root)` | Wayfinding. Each shape is also exported on its own. |
| `backLink({ href, label })` | The way up from a page to the page it sits under — an `<a href>`, never a step through history. See [The back link](specification.md#the-back-link). |
| `topbar(…)` + `wireTopbar(root)` | The product topbar. `themeToggle(theme)`, `accountMenu({ name, email, active, nav, initials })`, `versionSwitcher(versions, activeIdx)` and `deckTextSwitch(active)` are its parts, usable alone; `themeIcon(t)` and `themeName(t)` label a toggle you build yourself. |
| `accentPicker({ active, options })`, with `ACCENTS` and `accentSwatchStyle(accent)` | The accent swatches, wired by `wireTopbar()`. `ACCENTS` is the list the kit ships; `accentSwatchStyle(accent)` is the one custom property a swatch button carries, `--swatch`, the gradient its circle wears. Both pickers read them, so a page building its own strip paints the same thing — and the kit's stylesheet draws the selected swatch's tick, so the strip needs no selection paint of its own. An accent with no paints gets `--swatch: transparent`, an empty circle you can still press. |
| `ACCOUNT_NAV` | The account navigation the kit ships, as `sidebarNav()` items. It is what the account menu falls back to; a caller's own entries replace it. |
| `footer({ variant, brand, tagline, columns, social, legal, legalLinks, switcher })` | Site or app footer: `full`, `slim` or `app`. |
| `.ui-toolbar` (class, no factory) | A row of controls above a list. See [A toolbar at one column](specification.md#a-toolbar-at-one-column). |

### Motion and escaping

| Name | What it is |
|------|------------|
| `prefersReducedMotion()`, `staggerDelay`, `initReveal`, `replay`, `playEntrance`, `ENTRANCE_FALLBACK_MS` | The motion helpers. See [Motion](specification.md#motion). |
| `esc(s)` | HTML-escape a text value. Every factory already applies it to its own text arguments; you need it for markup you assemble yourself. |

The public JS surface is whatever `src/index.js` re-exports — add a factory there to
publish it. A module the entry never names still ships in the tarball and still cannot be
imported, because the package declares no `./components/*` subpath.
`scripts/entry-reachability.test.js` holds both halves, and fails again when a published
name is missing from the catalog above.

## Recipes

### A dropdown row you write yourself

`<button class="ui-dropdown__item">` renders as the row `dropdown()` emits — the class
cancels the chrome a browser paints on a button. Write one when the row has to be a
native control; the reasoning is in
[A dropdown row is a div, a link or a button](specification.md#a-dropdown-row-is-a-div-a-link-or-a-button).

```html
<button type="button" class="ui-dropdown__item" data-dd-item role="menuitem" tabindex="-1">
  <span class="ui-dropdown__main"><span class="ui-dropdown__label">Rename</span></span>
</button>
```

`wireDropdown()` finds rows by `data-dd-item` inside `[data-dropdown-panel]` and never by
class, so the attributes are what make the row work:

- `data-dd-item` — without it the row is in neither the arrow-key ring nor the panel's
  click handler
- `role="menuitem"` in a `menu` dropdown, `role="option"` in a `select` one
- `tabindex="-1"` — the panel moves focus itself, and a `<button>` is in the tab order by
  default
- `type="button"` — a row inside a form otherwise submits it
- `aria-disabled="true"` for a disabled row, not the native `disabled` attribute: that is
  what the item walk filters on
- `aria-selected="true|false"` on a `select` row, and keep the `.ui-dropdown__label` span
  — the pick is written into the first and the trigger's value is copied out of the second
- `data-value="…"` if you read the pick back off the element

### Forms

`field()` owns the wiring a control cannot do for itself: the label's `for=`, an id on
the hint or error with `aria-describedby` pointing at it, `aria-invalid` on a field with
an `error`, and the native `required` attribute under the decorative asterisk. A control
outside a `field()` needs its own `ariaLabel` — a placeholder is not a name.

### Segmented or tabs?

Ask what is behind the choice. If picking an option reveals a different block of content,
that content is a panel and you want `tabs()`, which renders the panels and lets a screen
reader announce "tab, 1 of 3" truthfully. If picking an option only narrows a list, flips
a unit or sets a preference, there is no panel and you want `segmented()`, which says
"pressed" rather than "selected".

Both give a keyboard user one Tab stop and move with the arrow keys, Home and End. Both
need a name: pass `ariaLabel`. `segmented()`'s `name` seeds `data-seg` and is never
announced.

### successPanel or success?

Ask how much of the screen the confirmation owns. Under a form that just submitted, or
inside a card on a page the reader is staying on, you want `successPanel({ title, sub })`.
When the confirmation *is* the screen and the reader needs somewhere to go next, you want
`success()`, which picks a layout, carries follow-up buttons and can run a redirect
countdown once `wireSuccess()` is called on the mounted element.

Restyling one never moves the other: `successPanel` is `.ui-success` in
`styles/callout.css`, `success` is `.ui-sx` in `styles/success.css`. The check mark is the
exception — both draw `successCheck()`.

---

Install, usage and the publish flow are in the [top-level README](../README.md).
`publishConfig` targets the public npm registry.
