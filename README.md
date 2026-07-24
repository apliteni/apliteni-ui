# @apliteni/apliteni-ui

The Apliteni design system & UI kit — one source of UI for every product surface
(the strategy deck, the text portal, `/account`, the operating model, and whatever
ships next).

Framework-agnostic **HTML + CSS**, driven entirely by design tokens, themeable dark
and light with **accent sub-themes**. Showcased and reviewed in **Storybook**, and
published on **ui.apli.tech**.

- 🎨 **Live site + Storybook** → [ui.apli.tech](https://ui.apli.tech)
- 📦 **Package** → [`@apliteni/apliteni-ui`](https://www.npmjs.com/package/@apliteni/apliteni-ui) (public npm)

## Why HTML + CSS (not React)

The strategy portal (`apliteni/strategy`, `viz/`) server-renders HTML strings
(`.mjs` modules), not a component framework. So the kit ships the same shape: token
CSS + component CSS + tiny HTML-string factories. That makes it a *true* single source
of truth — the portal imports it with no rewrite and no framework drift. Storybook
(`@storybook/html-vite`) renders exactly what ships.

## Install

Published on the **public npm registry** — no scope config, no token:

```bash
npm install @apliteni/apliteni-ui
```

## Use it

```js
import '@apliteni/apliteni-ui/css';           // once, at app root (needs the Poppins font)
import { button, card, topbar, wireTopbar } from '@apliteni/apliteni-ui';

el.innerHTML = topbar({ word: 'Strategy', account: { name, email } })
             + card({ title: 'Appearance', body: button({ label: 'Save', variant: 'primary' }) });
wireTopbar(document);                          // theme toggle, menus, segmented, copy buttons
```

### Reuse the account page

The whole `/account` layout (topbar + sticky sidebar + page body) ships as one
factory, so every product renders the same account shell instead of re-building it:

```js
import { accountShell, card, switchToggle, wireTopbar } from '@apliteni/apliteni-ui';

el.innerHTML = accountShell({
  word: 'Strategy',                              // the product word in the topbar
  account: { name, email },                      // signed-in user (drives the avatar menu)
  active: 'prefs',                               // which sidebar item is current
  title: 'Preferences',
  sub: 'How the portal looks and speaks to you.',
  body: card({ title: 'Appearance', body: switchToggle({ label: 'Reduce motion' }) }),
});
wireTopbar(el);                                  // menus, theme toggle, segmented controls

// Custom sidebar nav? pass `nav: [['prefs','gear','Preferences'], ['billing','wallet','Billing']]`
```

Server-rendered apps that inline CSS (like the strategy portal) import the stylesheet
as **strings** instead:

```js
import { tokensCss, topbarCss, cssText } from '@apliteni/apliteni-ui/inline';
// …inline tokensCss + topbarCss into the <style> you serve.
```

## Theming

Theme is a `data-theme="dark|light"` attribute on `<html>`; accent is an orthogonal
`data-accent` on top:

```html
<html data-theme="dark" data-accent="phoenix">
```

Each accent re-points only the accent family (`--accent`, `--purple*`, `--glow-purple`,
`--ring`, `--grad-*`). Surfaces, text and signal colours (green = live, pink = danger)
stay put — so **every accent works in both themes** and every component follows with no
component-level change.

Shipped accents: **Nebula** (purple, default), **Phoenix** (ember), **Ocean** (azure),
**Emerald** (jade). Runtime helpers: `applyTheme('light')` / `applyAccent('phoenix')`
(both persist to `localStorage`); or the `accentPicker()` component wired by `wireTopbar()`.

## Layout

```
src/
  tokens/tokens.css      # colours, type, spacing, radius, elevation, motion — dark + light
  tokens/accents.css     # accent sub-themes (data-accent) for both themes
  styles/*.css           # one file per component (button, card, badge, segmented, input,
                         #   table, callout, code, topbar, layout)
  index.css              # bundler entry — import '@apliteni/apliteni-ui/css'
  inline.js              # CSS as strings for server-render consumers (…/inline)
  assets/                # brand mark (seedling) + line-icon set
  components/            # HTML-string factories: button(), card(), badge(), topbar()…
stories/                 # Storybook: Foundations, Components, Apps
site/                    # ui.apli.tech landing page + static server
```

## Develop

```bash
npm install
npm run storybook          # http://localhost:6006
npm run build-storybook    # -> storybook-static/
node site/build.mjs        # -> site/public/ (landing + kit.css)
```

## Publish (public npm)

Versioned publish runs from CI on a GitHub Release (needs the `NPM_TOKEN` secret):

```bash
npm version patch          # or minor / major — bumps package.json + tags
git push --follow-tags
gh release create v$(node -p "require('./package.json').version") --generate-notes
```

The **Release** workflow (`.github/workflows/release.yml`) then publishes with the
built-in `GITHUB_TOKEN` (`packages: write`). No manual `npm publish` needed.

## Deploy (ui.apli.tech)

`Dockerfile` builds the landing page + Storybook and serves both (`/` and `/storybook`)
via a zero-dependency static server. Deployed on **Lessly** as its own product, on
`linux/amd64` (arm64 images fail there). Rebuild + redeploy:

```bash
docker buildx build --platform linux/amd64 -t <registry>/ui-apli-tech:latest --push .
```

## Adopting into the strategy portal

The topbar CSS keeps the **same class names** the portal already uses (`.topbar`,
`.brand`, `.dtsw`, `.toggle`, `.acct`, `.amenu`), and the token names match `viz/`
verbatim — so migration is subtractive: swap the inlined token/topbar CSS for the
package's `tokensCss` / `topbarCss` and delete the duplication. The deck (`index.html`)
stays self-contained for the claude.ai Artifact CSP, baking tokens in via its build step.

## License

[MIT](./LICENSE) © Apliteni.
