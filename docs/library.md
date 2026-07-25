# The library (`@apliteni/apliteni-ui`)

The kit is a framework-agnostic **HTML + CSS** design system: design tokens, one
stylesheet per component, and a set of tiny factory functions that return HTML strings.
No React, no build-time component compiler — a product imports the CSS once and calls
functions that produce markup.

## Why HTML strings, not components

The strategy portal (`apliteni/strategy`, `viz/`) server-renders HTML from `.mjs`
modules rather than a component framework. The kit ships the **same shape** so the
portal can adopt it with zero rewrite and no framework drift. A factory like `button()`
returns exactly the string that ships, and Storybook (`@storybook/html-vite`) renders
that same string — so the workbench and production never diverge.

```js
import { button } from '@apliteni/apliteni-ui';
button({ label: 'Save', variant: 'primary' });
// → '<button type="button" class="ui-btn ui-btn--primary"><span>Save</span></button>'
```

## Source layout (`src/`)

```
src/
  tokens/tokens.css      Colors, type scale, spacing, radius, elevation, motion — dark + light.
  tokens/accents.css     Accent sub-themes (data-accent) for both themes.
  styles/*.css           One stylesheet per component: base, button, card, badge, segmented,
                         input, table, callout, code, topbar, layout, feedback.
  index.css              Bundler entry — @import of tokens then every component, in cascade order.
  inline.js              The same CSS as JS strings, for server-render consumers.
  assets/icons.js        The line-icon set: icon(name) → inline <svg> string.
  assets/brand.js        The brand mark (prism / wordmark) factories.
  components/            The HTML-string factories (see “Component catalog” below).
  index.js               Public JS entry — re-exports every factory.
```

### Package entry points (`package.json` `exports`)

| Import | Resolves to | Use |
|--------|-------------|-----|
| `@apliteni/apliteni-ui` | `src/index.js` | The factories (`button`, `card`, `topbar`, …). |
| `@apliteni/apliteni-ui/css` | `src/index.css` | The whole stylesheet, for bundler/browser builds. |
| `@apliteni/apliteni-ui/inline` | `src/inline.js` | CSS as **strings**, for server-render inlining. |
| `@apliteni/apliteni-ui/tokens` | `src/tokens/tokens.css` | Just the tokens. |
| `@apliteni/apliteni-ui/accents` | `src/tokens/accents.css` | Just the accent sub-themes. |

Two ways to load the CSS:

- **Bundler / browser** — `import '@apliteni/apliteni-ui/css'` once at the app root.
  (The kit needs the Poppins font; load it however the app loads fonts.)
- **Server-render (inlined)** — `import { tokensCss, topbarCss, cssText } from
  '@apliteni/apliteni-ui/inline'` and drop the strings into the `<style>` you serve.
  `inline.js` reads the package's own `.css` files with `readFileSync`, so `cssText` is
  byte-identical to what `/css` bundles, assembled in the same cascade order.

## Tokens & theming

Everything visual is a CSS custom property. There are **two orthogonal axes**, both set
as attributes on `<html>`:

```html
<html data-theme="dark" data-accent="phoenix">
```

- **Theme** — `data-theme="dark|light"`. Owns surfaces, text, borders, and the fixed
  signal colors (green = live, amber = warn, pink = danger). Defined in `tokens.css`.
- **Accent** — `data-accent="phoenix|ocean|emerald"` (absent = Nebula, the purple
  default). Re-points **only** the accent family (`--accent`, `--purple*`,
  `--glow-purple`, `--ring`, `--grad-*`) in `accents.css`. Because an accent touches
  only the accent family, **every accent works in both themes** and every component
  follows with no component-level change.

Shipped accents: **Nebula** (purple, default), **Phoenix** (ember), **Ocean** (azure),
**Emerald** (jade).

Runtime helpers (from `topbar.js`, re-exported at the root):

```js
applyTheme('light');       // sets data-theme + persists to localStorage
applyAccent('phoenix');    // sets data-accent + persists to localStorage
```

Or ship the `accentPicker()` component and let `wireTopbar()` handle the clicks.

## Component catalog

All factories return HTML strings and live in `src/components/`. Text arguments are
escaped via `esc()`; arguments documented as “markup” (e.g. a card `title` that may
carry a badge) are trusted and inserted verbatim.

**Content & layout — `components/index.js`**

| Factory | Notes |
|---------|-------|
| `button({ label, variant, size, icon, iconRight, block, disabled, busy, href, iconOnly })` | `<button>` or, with `href`, `<a>`. `busy` disables + shows the bars loader. |
| `badge(label, variant)` / `pill(label, variant)` / `statusDot(live)` | Status chips and the live dot. |
| `card({ title, sub, body, variant, pad, icon })` | Surface container. `title`/`sub` are trusted markup. |
| `segmented({ options, active, size, block, name })` | Tablist-role segmented control. |
| `accentPicker({ active, options })` | Accent swatches; wired by `wireTopbar()`. |
| `field({ label, hint, error, control })` | Form-field wrapper (label + control + hint/error). |
| `input(...)` / `textarea(...)` / `checkbox(...)` / `switchToggle(...)` | Form controls. |
| `callout({ variant, icon, body })` / `toast({ variant, title, body, icon })` / `successPanel({ title, sub })` | Inline feedback. |
| `snippet({ label, code, reveal, copy })` | Code block with a copy button. `hlShell(raw)` adds shell highlighting. |

**Chrome & shells**

| Factory (file) | Notes |
|----------------|-------|
| `topbar({ word, account, … })`, `wireTopbar(root)` (`topbar.js`) | The product topbar; `wireTopbar` binds the theme toggle, menus, segmented controls, copy buttons. |
| `accountShell({ word, account, active, title, sub, body, nav })` (`shell.js`) | The whole `/account` layout (topbar + sticky sidebar + body) as one factory, so every product renders the same shell. |
| `feedbackWidget()`, `wireFeedback(...)` (`feedback.js`) | The inline “select a passage → give feedback” widget. |

**Assets**

- `icon(name)` (`assets/icons.js`) — inline `<svg>` string for a line icon.
- brand-mark factories (`assets/brand.js`) — the prism / wordmark.

The public JS surface is whatever `src/index.js` re-exports; add a new factory there to
publish it.

## Consuming it (summary)

Install and basic usage live in the top-level [README](../README.md#use-it). The short
version:

```js
import '@apliteni/apliteni-ui/css';
import { accountShell, card, switchToggle, wireTopbar } from '@apliteni/apliteni-ui';

el.innerHTML = accountShell({
  word: 'Strategy',
  account: { name, email },
  active: 'prefs',
  title: 'Preferences',
  body: card({ title: 'Appearance', body: switchToggle({ label: 'Reduce motion' }) }),
});
wireTopbar(el);
```

## Publishing

`package.json` `publishConfig` targets the **public npm registry** with `access:
public`. Version + release drive the publish (see the top-level
[README](../README.md#publish-github-packages) for the `npm version` → `gh release` flow
and the `.github/workflows/release.yml` workflow). Bumping the version is also what the
[changelog](changelog.md) and the site footer read.
