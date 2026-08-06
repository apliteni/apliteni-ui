# @apliteni/apliteni-ui

[![npm](https://img.shields.io/npm/v/@apliteni/apliteni-ui?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@apliteni/apliteni-ui)
[![license: MIT](https://img.shields.io/npm/l/@apliteni/apliteni-ui?color=3b9dff)](./LICENSE)
[![live: ui.apli.tech](https://img.shields.io/badge/live-ui.apli.tech-9b5dff)](https://ui.apli.tech)

The Apliteni design system & UI kit — one source of UI for every product surface
(the strategy deck, the text portal, `/account`, the operating model, and whatever
ships next).

Two layers over one set of design tokens: framework-agnostic **HTML + CSS**, and
**React components** for stateful surfaces. Themeable dark and light with **accent
sub-themes**. Showcased and reviewed in **Storybook**, and published on **ui.apli.tech**.

- 🎨 **Live site + Storybook** → [ui.apli.tech](https://ui.apli.tech)
- 📦 **Package** → [`@apliteni/apliteni-ui`](https://www.npmjs.com/package/@apliteni/apliteni-ui) (public npm)
- ⚛️ **React components** → `@apliteni/apliteni-ui/react` — a subpath of the same package, source in [`react/`](./react)

## HTML + CSS *and* React

The core is HTML + CSS because the strategy portal (`apliteni/strategy`, `viz/`)
server-renders HTML strings (`.mjs` modules), not a component framework. So the kit
ships the same shape: token CSS + component CSS + tiny HTML-string factories. That
makes it a *true* single source of truth — the portal imports it with no rewrite and
no framework drift. Storybook (`@storybook/html-vite`) renders exactly what ships.

React sits on top for surfaces that hold real client state — dashboards, tables,
filters, forms. Those components render the same `.ui-*` classes and the same tokens
as the vanilla kit, so the two layers can't drift.

**Which one:** does the surface hold meaningful client state? No → the HTML-string
factories below. Yes → the [React components](#react-components-stateful-surfaces).

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

## React components (stateful surfaces)

`DataTable`, `Modal`, `Button`, `Badge`, `Card` and `Icon` — same `.ui-*` classes,
same tokens, TypeScript types included. They ship as a **subpath of this package**,
not as a package of their own: one install, one version, one pin.

```tsx
import '@apliteni/apliteni-ui/css';        // kit tokens + .ui-* classes
import '@apliteni/apliteni-ui/react/css';  // React components' shell styles (modal, pager)
import { DataTable, Modal } from '@apliteni/apliteni-ui/react';
```

`react` and `react-dom` are **optional** peer dependencies (18+): the subpath needs
them, the rest of the kit doesn't, so a plain HTML consumer never gets React pulled
into its tree. The source lives in [`react/`](./react) — a private workspace with its
own build (tsup) and Storybook on port 6007. Details in
[`react/README.md`](./react/README.md).

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
site/                    # ui.apli.tech landing page (static site build)
react/                   # React components — private workspace, built to react/dist/
  dist/                  #   tsup output; shipped as …/react and …/react/css
```

## Develop

```bash
npm install
npm run storybook          # http://localhost:6006
npm run build-storybook    # -> storybook-static/
node site/build.mjs        # -> site/public/ (landing + kit.css + /storybook)
```

The React components build and test through the workspace (`npm install` at the repo
root covers them — there is no second install):

```bash
npm run storybook -w react   # http://localhost:6007
npm test -w react            # vitest
npm run build                # tsup -> react/dist/ (also runs on prepack)
```

## Publish (public npm)

Versioned publish runs from CI on a GitHub Release:

```bash
npm version patch          # or minor / major — bumps package.json + tags
git push --follow-tags
gh release create v$(node -p "require('./package.json').version") --generate-notes
```

The **Release** workflow (`.github/workflows/release.yml`) then publishes to the public
npm registry over npm Trusted Publishing (OIDC) — there is no long-lived token. No
manual `npm publish` needed. It runs in two jobs: `build` installs and runs `npm pack`,
whose `prepack` rebuilds `react/dist` from the tagged commit, and `publish` — the only
job that can mint an OIDC credential — just publishes that tarball, so no dependency
or build script ever runs beside the credential. The packaging guard
(`scripts/packaging.test.js`) fails CI if the React subpath isn't in the tarball, and
the release itself re-checks the tarball before publishing it.

## Deploy (ui.apli.tech)

The site is **100% static** (landing + hosted Storybook) — no container, no registry.
It's served by **Lessly static hosting**, built straight from this repo. The `site`
service builds from `main` with:

```
npm ci && npm run build-storybook && node site/build.mjs
```

and serves `site/public/`, which includes the landing page, `/changelog`, `kit.css`,
and the Storybook folded in at `/storybook`. Push to `main` and redeploy the `site`
service to roll it out.

To reproduce the exact static bundle locally:

```bash
npm ci && npm run build-storybook && node site/build.mjs
# -> site/public/   (landing + /changelog + /storybook + kit.css)
```

## Adopting into the strategy portal

The topbar CSS keeps the **same class names** the portal already uses (`.topbar`,
`.brand`, `.dtsw`, `.toggle`, `.acct`, `.amenu`), and the token names match `viz/`
verbatim — so migration is subtractive: swap the inlined token/topbar CSS for the
package's `tokensCss` / `topbarCss` and delete the duplication. The deck (`index.html`)
stays self-contained for the claude.ai Artifact CSP, baking tokens in via its build step.

## License

[MIT](./LICENSE) © Apliteni — for the **code**. The Apliteni name, logos, and brand
marks are trademarks and are **not** covered by the MIT license; see [TRADEMARK.md](./TRADEMARK.md).
