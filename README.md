# @apliteni/apliteni-ui

[![npm](https://img.shields.io/npm/v/@apliteni/apliteni-ui?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@apliteni/apliteni-ui)
[![license: MIT](https://img.shields.io/npm/l/@apliteni/apliteni-ui?color=3b9dff)](./LICENSE)
[![live: ui.apli.tech](https://img.shields.io/badge/live-ui.apli.tech-9b5dff)](https://ui.apli.tech)

The Apliteni design system and UI kit supplies shared UI for the strategy deck,
the text portal, `/account`, the operating model, and future product surfaces.

It provides framework-agnostic **HTML + CSS** and **React components** for stateful
surfaces, with shared tokens, dark and light themes, and **accent sub-themes**.
Review components in **Storybook** at **ui.apli.tech**.

- **Live site + Storybook** → [ui.apli.tech](https://ui.apli.tech)
- **Package** → [`@apliteni/apliteni-ui`](https://www.npmjs.com/package/@apliteni/apliteni-ui) (public npm)
- **React components** → `@apliteni/apliteni-ui/react` — a subpath of the same package, source in [`react/`](./react)

## HTML + CSS *and* React

The strategy portal (`apliteni/strategy`, `viz/`) server-renders HTML strings from
`.mjs` modules without a component framework. The kit supplies token CSS, component
CSS, and HTML-string factories that the portal can import without a rewrite.
Storybook (`@storybook/html-vite`) renders those same strings.

React components handle client state in dashboards, tables, filters, and forms.
They use the vanilla kit's `.ui-*` classes and tokens.

**Which one:** does the surface hold meaningful client state? No → the HTML-string
factories below. Yes → the [React components](#react-components-stateful-surfaces).

Either layer follows the same UI rules — what one page may hold, which component to reach
for, the states it owes, how colour and wording work. They live in the **Guidelines** section
of Storybook, which opens on
[links to every guideline page](https://ui.apli.tech/storybook/?path=/story/guidelines-overview--overview).
The same guidance ships as plain Markdown in
`node_modules/@apliteni/apliteni-ui/guidelines/`. Start with
[guidelines/overview.md](guidelines/overview.md); Storybook reads these documents too.

[The page](https://ui.apli.tech/storybook/?path=/story/guidelines-the-page--the-page) is the one
to read before you design a screen: the limits one page keeps, whatever it is about.

## Install

Published on the **public npm registry** — no scope config, no token:

```bash
npm install @apliteni/apliteni-ui
```

## Use it

```js
import '@apliteni/apliteni-ui/css';           // once, at app root (load the two fonts too — see below)
import { button, card, topbar, wireTopbar } from '@apliteni/apliteni-ui';

el.innerHTML = topbar({ word: 'Strategy', account: { name, email } })
             + card({ title: 'Appearance', body: button({ label: 'Save', variant: 'primary' }) });
wireTopbar(document);                          // theme toggle, menus, segmented, copy buttons
```

### The two fonts

The kit names two families and bundles neither, so the host page loads them. Poppins is
`--font-display` — headings, brand marks, large readouts. IBM Plex Sans is `--font-sans` —
tables, fields, paragraphs, chat, which is most of an application. Weights 300-700 in both:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap">
```

If either font is missing, that role falls back to its system stack, and nothing says so.
For the old single-family appearance, set both roles to the same family in your stylesheet,
after the kit's:

```css
:root { --font-sans: var(--font-display); }
```

### Reuse the account page

The whole `/account` layout (topbar + sticky sidebar + page body) ships as one
factory, so every product renders the same account shell instead of re-building it:

```js
import { accountShell, card, switchToggle, wireTopbar, wireShell } from '@apliteni/apliteni-ui';

el.innerHTML = accountShell({
  word: 'Strategy',                              // the product word in the topbar
  account: { name, email },                      // signed-in user (drives the avatar menu)
  active: 'prefs',                               // which sidebar item is current
  title: 'Preferences',
  sub: 'How the portal looks and speaks to you.',
  body: card({ title: 'Appearance', body: switchToggle({ label: 'Reduce motion' }) }),
});
wireTopbar(el);                                  // menus, theme toggle, segmented controls
wireShell(el);                                   // the toggle that folds the rail, the reader's menu, the nav's groups

// Custom sidebar nav? pass `nav: [['prefs','gear','Preferences'], ['billing','wallet','Billing']]`
// A page that will never call wireShell()? pass `collapsible: false` and no toggle is drawn
```

Server-rendered apps that inline CSS (like the strategy portal) import the stylesheet
as **strings** instead:

```js
import { tokensCss, topbarCss, cssText } from '@apliteni/apliteni-ui/inline';
// …inline tokensCss + topbarCss into the <style> you serve.
```

`cssText` includes every sheet. When selecting individual sheets from `styles`,
`successPanel()` needs both `styles.callout` (panel layout) and `styles.success`
(shared glowing check and reduced-motion styles), after `tokensCss` and `baseCss`.

## React components (stateful surfaces)

`DataTable`, `Pagination`, `Modal`, `Button`, `Badge`, `Card` and `Icon` — same `.ui-*` classes,
same tokens, TypeScript types included. They ship as a **subpath of this package**,
not as a package of their own: one install, one version, one pin.

Install `react` and `react-dom`, version 18 or newer, yourself. The kit declares
neither a regular nor a peer dependency on React, so npm neither installs it nor
warns when it is missing:

```bash
npm install @apliteni/apliteni-ui react react-dom
```

Without them, importing `@apliteni/apliteni-ui/react` fails at build or runtime with
a module-not-found error for `react`. Plain HTML consumers can install the kit alone;
the other entry points are unaffected and do not bring React into the dependency tree.

```tsx
import '@apliteni/apliteni-ui/css';        // kit tokens + .ui-* classes
import '@apliteni/apliteni-ui/react/css';  // React components' shell styles (modal, sort control)
import { DataTable, Modal } from '@apliteni/apliteni-ui/react';
```

The source lives in [`react/`](./react) — a private workspace with its own build
(tsup) and Storybook on port 6007. When 6007 is taken Storybook moves to the next
free port, so the root Storybook does not trust the number: it probes the range
6007 can drift into and composes the first port that proves it is this workspace's
Storybook. A stranger on the port is never composed — the "React components"
section is absent instead, and the terminal says why. Details in
[`react/README.md`](./react/README.md).

### Updating a busy button

Keep the factory-created element in place to animate its label:

```js
import { button, setButtonBusy } from '@apliteni/apliteni-ui';
host.innerHTML = button({ label: 'Save changes', variant: 'primary' });
const control = host.querySelector('button');
setButtonBusy(control, { busy: true });
// When the request completes:
setButtonBusy(control, { busy: false });
```

The helper keeps focus on the button, uses `aria-disabled` and blocks clicks,
Enter and Space while busy. Its sibling polite live region announces progress and completion.
Explicit `disabled: true` stays natively disabled. Static `button({ busy: true })`
markup uses native disabled until the helper wires it; call `setButtonBusy` to
switch to the focus-preserving behavior. React `<Button busy={saving}>Save changes</Button>` uses the same treatment.
The action label slides down, three dots take its place, and the label returns from below
when complete. Its hidden label preserves the width and accessible name. React retains
the last ready children while busy; changed children appear on completion. Reduced
motion switches immediately to static dots.
See Storybook's **Button / Busy Transition** for the live vanilla example.

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

Focus uses a surface-coloured gap, a solid band and a decorative glow. Tune
`--ring-width`, `--ring-color`, `--ring-gap-width` and `--ring-gap` at the root;
`--ring` remains the composed shadow. Kit surfaces recompose it to match their
background, so an ancestor's custom `--ring` must also be applied on those surfaces.
The page shell inherits root overrides; it does not introduce another composition.
See [the focus-ring contract](docs/specification.md#the-focus-ring).

Both attributes are overrides, not requirements: with neither present the kit paints dark
Nebula, and `data-accent` alone paints that accent on the dark theme. An absent `data-theme`
is *not* "follow the system" — the kit ships no `prefers-color-scheme` rule, so a host that
wants the OS preference resolves it in JS and stamps the attribute. See
[`docs/library.md`](./docs/library.md#an-absent-attribute-means-dark).

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
stories/                 # Storybook: Foundations, Components, Showcases
site/                    # ui.apli.tech landing page (static site build)
react/                   # React components — private workspace, built to react/dist/
  dist/                  #   tsup output; shipped as …/react and …/react/css
```

## Contribute

Use Node 20 or newer. Install [jq](https://jqlang.github.io/jq/), then run `npm ci` at
the repository root. Start Storybook with `npm run storybook`. For React, use `npm run
storybook -w react`. Before opening a PR, run `npm test`, `npm test -w react`, `npm run
build-storybook`, and `node site/build.mjs`.

Add only general, composable components that are reused across products. Before
adding a component, identify where it will be used across products, check whether
existing components can create it through composition, and check whether it
requires domain-specific data or rules. If composition is enough or the UI is
domain-specific, build it from existing components and show it as a Storybook
showcase instead. Keep the vanilla kit’s existing look.

To add a component, put its token-based CSS in `src/styles/`. Include it in
`src/index.css` and in both the `styles` map and `cssText` in `src/inline.js`. Add the
HTML factory under `src/components/`, export it from `src/index.js`, and add a
playground and state examples under `stories/components/`. Put React components in
`react/src/`, with a test and story that use the shared classes and tokens. Read the
[guidelines](guidelines/overview.md) for the design rules.

Open an issue, branch from `main`, and link the issue in your PR. Changes to published
files, including this README, require a version bump in `package.json` and
`package-lock.json`, plus an entry in `site/changelog.mjs`. Merging the bump starts the
release workflow. Do not push a tag or publish by hand.

[Agent rules](AGENTS.md) cover review, data handling, and release checks.

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
