# The library (`@apliteni/apliteni-ui`)

A framework-agnostic **HTML + CSS** design system: design tokens, one stylesheet per
component, and factory functions that return HTML strings.

```js
import { button } from '@apliteni/apliteni-ui';
button({ label: 'Save', variant: 'primary' });
// → '<button type="button" class="ui-btn ui-btn--primary"><span>Save</span></button>'
```

**Why strings, not components:** the strategy portal (`viz/`) server-renders HTML from
`.mjs` modules, not a framework. The kit ships the same shape, so the portal adopts it
with no rewrite, and Storybook (`@storybook/html-vite`) renders the exact string that
ships — workbench and production never diverge.

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
| `@apliteni/apliteni-ui` | The factories (`button`, `card`, `topbar`, …). |
| `…/css` | The whole stylesheet, for bundler/browser builds. |
| `…/inline` | CSS as **strings**, for server-render inlining (`tokensCss`, `topbarCss`, `cssText`, …). |
| `…/tokens`, `…/accents` | Just the tokens / accent sub-themes. |

`…/css` and `…/inline`'s `cssText` carry the same stylesheets in the same cascade order.
Not the same bytes: `index.css` is a list of `@import`s for a bundler to resolve, `cssText`
is those files already concatenated. `inline.js` reads the package's own `.css` files, but
that alone never stopped the two lists from diverging — `empty.css` reached `index.css` and
not `inline.js`, and shipped unstyled to every consumer of `kit.css`. What holds them
together now is `scripts/stylesheet-manifest.test.js`, which fails when either entry point
names a stylesheet the other one does not.

## Tokens & theming

Everything visual is a CSS custom property, driven by two orthogonal attributes on
`<html>`:

```html
<html data-theme="dark" data-accent="phoenix">
```

- **`data-theme`** = `dark | light` — surfaces, text, borders, and fixed signal colors
  (green = live, amber = warn, pink = danger).
- **`data-accent`** = `phoenix | ocean | emerald` (absent = **Nebula**, purple default)
  — re-points only the accent family. Because it touches nothing else, every accent
  works in both themes with no component change.

Runtime helpers (re-exported from the root): `applyTheme('light')` and
`applyAccent('phoenix')` both persist to `localStorage`, and `ACCENTS` is the list of
names `applyAccent` takes. Or ship `accentPicker()` and let `wireTopbar()` handle it.

## Component catalog

Every factory returns an HTML string, and the `wire*` / `init*` functions beside them bind
the behaviour markup alone cannot carry. Text args are escaped via `esc()`; args
documented as “markup” (e.g. a card `title` carrying a badge) are inserted verbatim.

| Factory | Notes |
|---------|-------|
| `button({ label, variant, size, icon, iconRight, block, disabled, busy, href, iconOnly })` | `<button>`, or `<a>` with `href`. `busy` disables + shows the loader. |
| `badge(label, variant)` · `pill(label, variant)` · `statusDot(live)` | Status chips + live dot. |
| `card({ title, sub, body, variant, pad, icon })` | Surface container; `title`/`sub` are trusted markup. |
| `segmented({ options, active, size, block, name, ariaLabel })` | Pill switch. A toolbar of toggle buttons; wired by `wireTopbar()`. |
| `tabs({ items, active, name, ariaLabel })` + `initTabs(root)` | Tablist + panels, one panel per item. |
| `accentPicker({ active, options })` | Accent swatches; wired by `wireTopbar()`. |
| `field` · `input` · `textarea` · `select` · `checkbox` · `switchToggle` | Form controls. |
| `dropdown({ label, value, variant, items, sections, header, footer, align, scroll })` + `wireDropdown(root)` | Popover list. `variant: 'select'` renders a listbox and shows the value in the trigger; `'menu'` renders an action list. |
| `nav({ variant })` → `sidebarNav` · `navTabs` · `breadcrumbs`, + `wireNav(root)` | Wayfinding. The umbrella dispatches on `variant`; each shape is also exported on its own. `wireNav` only drives the sidebar's collapsible groups. |
| `drawer({ side, size, title, body, footer, open, specimen, dismissible })` + `wireDrawer(root)` | Overlay panel anchored to a screen edge, over a scrim. `openDrawer(el, returnFocusTo)` / `closeDrawer(el)` drive one directly. `open` renders it open and `wireDrawer` adopts it, page inert and all; `specimen` renders a picture of one for a documentation page — no `aria-modal`, no wiring, no Escape. |
| `confirm({ title, body, confirmLabel, cancelLabel, variant, open, specimen, id })` + `wireConfirm(root)` | Modal question over a scrim, for the destructive action a page has to stop for. `openConfirm(el, returnFocusTo)` / `closeConfirm(el)` drive one directly. `open` renders it open and `wireConfirm` adopts it, page inert and all; `specimen` renders a picture of one for a documentation page — no `aria-modal`, no wiring, no Escape. |
| `callout` · `toast` · `successPanel` | Inline feedback, inside the page the user is already on. |
| `pushToast(container, opts)` · `dismissToast(el)` + `wireToastStack(container)` | The runtime toast stack: push one onto a container, dismiss it, or let the stack expire its own. |
| `success({ layout, backdrop, eyebrow, title, body, actions, confetti, countdown })` + `wireSuccess(root)` | Page-sized confirmation; `successCheck()` is its self-drawing check on its own. See [successPanel or success?](#successpanel-or-success) below. |
| `emptyState({ art, icon, title, sub, actions })` | Placeholder for an empty list, table or page. `art` is an `illo()` name or raw `<svg>`. |
| `busyRegion({ label, readyLabel, busy, body, lines })` + `setBusy(root, { busy, message, body })` | The screen's pending state, and the only thing in the kit that announces one. Render the region once with a skeleton inside; `setBusy()` swaps its body and rewrites the sr-only line it already holds — that is the announcement, because a `role="status"` inserted together with its text is silent on several screen readers. It is the same polite region `toast()` and `success()` carry, not a second mechanism. |
| `skeleton({ lines, width, height, radius })` · `skeletonTable({ rows, cols, head })` | Placeholder shapes, `aria-hidden` throughout — a shimmer is a picture of content, not content. `lines` takes a count or an array of widths. The shimmer is `.m-skeleton` from the motion library, so reduced motion is already handled. |
| `deniedState({ title, sub, need, actions, icon })` | The 403. Same layout language as `emptyState()`, because to a reader they are the same event; the lock says which one. `need` names the missing scope verbatim — a reader who can name what they lack can ask for it. It carries no live region of its own: put it inside a `busyRegion()` and the region announces it. |
| `snippet({ label, code, reveal, copy })` | Code block + copy button; `hlShell(raw)` highlights shell. |
| `topbar(...)` + `wireTopbar(root)` | Product topbar; `wireTopbar` binds theme toggle, menus, segmented, copy. |
| `themeToggle(theme)` · `accountMenu({ name, email, active, nav, initials })` · `versionSwitcher(versions, activeIdx)` · `deckTextSwitch(active)` | The topbar's parts, usable outside it. `themeIcon(t)` / `themeName(t)` label a toggle you build yourself. `accountMenu` writes every field of its own straight into markup, so escape on the way in — and if you do, pass `initials` as well, because a mark derived from an escaped name is not the reader's. |
| `footer({ variant, brand, tagline, columns, social, legal, legalLinks, switcher })` | Site/app footer. `full` is the multi-column marketing one, `slim` a single legal row, `app` the compact in-product one. |
| `appShell({ word, brandHref, nav, active, navLabel, crumbs, title, sub, body, account, signOutHref, topbar, maxWidth })` | The kit's one page shell, and the one to call for new work: a full-height rail built from `sidebarNav()`, beside exactly one `<main>`. `title`, `sub` and `body` are trusted markup, which is what lets a title carry a badge, so run your own text through `esc()` on the way in. `crumbs` is the caller's — pass `[{ label, href? }]` and the shell renders `breadcrumbs()`, escaping each `label`; pass nothing, or anything that is not a list, and there is no trail. `topbar` is off unless you hand it an options object, and turning it on drops the rail's brand head so the product word is said once — pass it text, not markup: its `word` and its `account`'s name, address and menu entries are escaped on the way to `topbar()`, which interpolates all of them raw. `versions` is the exception and stays the caller's own markup. `account` is the reader, never a placeholder: hand over only an address and only an address is drawn, hand over nobody and nobody is named. `signOutHref` adds the rail's sign-out row. Below 720px the rail folds to icons rather than disappearing. |
| `accountShell({ word, account, active, cap, crumb, title, sub, body, nav, versions, showSwitch, signOutHref })` | **The compatibility preset for existing `/account` pages — not for new work; call `appShell()`.** It is `appShell()` with the topbar switched on, `ACCOUNT_NAV` as the nav it falls back to, and `#logout` as the sign-out. `title`, `sub` and `body` are its parent's trusted-markup slots, unchanged. `nav` takes the old `[id, icon, label, href?, target?]` tuples as well as `sidebarNav()` item objects. `cap` and `crumb` are text, and become the breadcrumb trail the shell used to write for itself. |
| `.ui-toolbar` (class, no factory) | A row of controls above a list — a field, a filter, a button. Give the row the class and it lays them out; a text field in it shares the line and takes the slack, and the row wraps only when the field would be squeezed too narrow to read. Written for the shell's reading column, where a plain flex row either overflowed a phone or gave the field the whole line on a desktop. |
| `feedbackWidget()` + `wireFeedback(...)` | Inline “select a passage → give feedback” widget. `nearestSection(node, root)` resolves which section a selection landed in. |
| `icon(name, cls)` · `iconNames` · `iconCategories` · `illo(name)` · `illoNames` | Line icons and illustrations, as `<svg>` strings. `sun` and `moon` are exported as bare markup as well — `themeIcon()` picks between them. |
| `iconOnlyAllowed` · `iconMeanings` | The two icon rulings, as data. `iconOnlyAllowed` is the closed list of actions a control may go wordless for; `iconMeanings` says what a glyph means when a component picks it for the reader — circled is a state, bare is an action. Both are gated: see Guidelines / Iconography. |
| `esc(s)` | HTML-escape a text value. Every factory already applies it to its own text args; you need it for markup you assemble yourself. |

The public JS surface is whatever `src/index.js` re-exports — add a factory there to
publish it. A module the entry never names still ships in the tarball and still cannot be
imported, because the package declares no `./components/*` subpath. Both halves of that
are held by `scripts/entry-reachability.test.js`, which fails when a component module is
unreachable from the entry, and fails again when a name the entry publishes is missing
from the catalog above.

Beyond the factories, the entry re-exports the theming helpers described above, the brand
mark (`seedling`, `prism`, `brand`) and the motion helpers in `src/motion.js`
(`prefersReducedMotion`, `staggerDelay`, `initReveal`, `replay`).

### Segmented or tabs?

Ask what is behind the choice. If picking an option reveals a different block of content,
that content is a panel and you want `tabs()` — it renders the panels, ties each one to its
tab, and a screen reader announces "tab, 1 of 3" truthfully. If picking an option only
narrows a list, flips a unit or sets a preference, there is no panel and you want
`segmented()` — a toolbar of toggle buttons that says "pressed", not "selected".

Both give a keyboard user one Tab stop and move with ArrowLeft / ArrowRight and Home / End.
Both need a name: pass `ariaLabel`. `segmented()`'s `name` is an identifier for `data-seg`,
not prose, and it is never announced.

### successPanel or success?

Ask how much of the screen the confirmation owns. If it sits under a form that just
submitted, or inside a card on a page the user is staying on, you want
`successPanel({ title, sub })` — a check, a title and one line of sub, with nothing to
configure. If the confirmation *is* the screen, and the user needs somewhere to go next,
you want `success({ layout, backdrop, actions, … })`, which picks a layout and a backdrop,
carries follow-up buttons, and can run an auto-redirect countdown once you call
`wireSuccess()` on the mounted element.

Restyling one never moves the other, because they share no CSS: `successPanel` is
`.ui-success` in `styles/callout.css`, `success` is `.ui-sx` in `styles/success.css`.

### Forms

`field({ label, hint, error, control, required })` owns the wiring a control cannot do for
itself:

- the label gets a `for=` pointing at the control (an id is generated if the control has none)
- the hint or the error gets an id, and the control gets `aria-describedby` pointing at it,
  so the reason a value was rejected is read out with the field rather than sitting beside it
- a field with an `error` is marked `aria-invalid="true"`
- a `required` field carries the native `required` attribute; the asterisk in the label is
  `aria-hidden` decoration on top of that, never the only signal

A control outside a `field()` needs its own `ariaLabel` — a placeholder is not a name.

Install, usage, and the publish flow live in the [top-level README](../README.md).
`publishConfig` targets the **public npm registry** (`access: public`).
