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

`…/css` is byte-identical to `…/inline`'s `cssText` — `inline.js` reads the package's
own `.css` files, so the two never drift.

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
`applyAccent('phoenix')` both persist to `localStorage`; or ship `accentPicker()` and
let `wireTopbar()` handle it.

## Component catalog

All factories return HTML strings and live in `src/components/`. Text args are escaped
via `esc()`; args documented as “markup” (e.g. a card `title` carrying a badge) are
inserted verbatim.

| Factory | Notes |
|---------|-------|
| `button({ label, variant, size, icon, iconRight, block, disabled, busy, href, iconOnly })` | `<button>`, or `<a>` with `href`. `busy` disables + shows the loader. |
| `badge(label, variant)` · `pill(label, variant)` · `statusDot(live)` | Status chips + live dot. |
| `card({ title, sub, body, variant, pad, icon })` | Surface container; `title`/`sub` are trusted markup. |
| `segmented({ options, active, size, block, name, ariaLabel })` | Pill switch. A toolbar of toggle buttons; wired by `wireTopbar()`. |
| `tabs({ items, active, name, ariaLabel })` + `initTabs(root)` | Tablist + panels, one panel per item. |
| `accentPicker({ active, options })` | Accent swatches; wired by `wireTopbar()`. |
| `field` · `input` · `textarea` · `checkbox` · `switchToggle` | Form controls. |
| `callout` · `toast` · `successPanel` | Inline feedback. |
| `snippet({ label, code, reveal, copy })` | Code block + copy button; `hlShell(raw)` highlights shell. |
| `topbar(...)` + `wireTopbar(root)` | Product topbar; `wireTopbar` binds theme toggle, menus, segmented, copy. |
| `accountShell({ word, account, active, title, sub, body, nav })` | The whole `/account` layout as one factory. |
| `feedbackWidget()` + `wireFeedback(...)` | Inline “select a passage → give feedback” widget. |

The public JS surface is whatever `src/index.js` re-exports — add a factory there to
publish it.

### Segmented or tabs?

Ask what is behind the choice. If picking an option reveals a different block of content,
that content is a panel and you want `tabs()` — it renders the panels, ties each one to its
tab, and a screen reader announces "tab, 1 of 3" truthfully. If picking an option only
narrows a list, flips a unit or sets a preference, there is no panel and you want
`segmented()` — a toolbar of toggle buttons that says "pressed", not "selected".

Both give a keyboard user one Tab stop and move with ArrowLeft / ArrowRight and Home / End.
Both need a name: pass `ariaLabel`. `segmented()`'s `name` is an identifier for `data-seg`,
not prose, and it is never announced.

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
