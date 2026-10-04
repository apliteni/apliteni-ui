# @apliteni/apliteni-ui

[![npm](https://img.shields.io/npm/v/@apliteni/apliteni-ui?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@apliteni/apliteni-ui)
[![license: MIT](https://img.shields.io/npm/l/@apliteni/apliteni-ui?color=3b9dff)](./LICENSE)
[![live: ui.apli.tech](https://img.shields.io/badge/live-ui.apli.tech-9b5dff)](https://ui.apli.tech)

The Apliteni design system and UI kit provides shared design tokens, components, themes and
UI rules for the strategy deck, the text portal, `/account` and future product surfaces.

One package carries two layers. **HTML + CSS** includes token CSS, component CSS and
HTML-string factories. Use this layer for server-rendered pages that do not use a component
framework. **React components** support surfaces with client-side state, such as tables,
filters, forms and modals. Both layers use the same `.ui-*` classes and tokens, so a page
can use both. Choose React when the surface needs state.

Every component is in Storybook at **[ui.apli.tech](https://ui.apli.tech)**.

## Install

The package is published on the public npm registry. You do not need scope configuration or
an npm token:

```bash
npm install @apliteni/apliteni-ui react react-dom
```

Install React and React DOM yourself, using version 18 or newer. The kit does not declare
either package as a regular or peer dependency. npm therefore does not install them or warn
when they are missing. If they are missing, importing `@apliteni/apliteni-ui/react` fails
at build time or runtime with a module-not-found error. A plain HTML consumer installs only
the kit and is unaffected because React is not added to its dependency tree.

The React components are a subpath of this package, not a separate package. You get one
install, one version and one version pin.

| Import | What it is |
| --- | --- |
| `@apliteni/apliteni-ui/css` | Tokens and every component stylesheet. Import once at the app root. |
| `@apliteni/apliteni-ui` | The HTML-string factories: `button()`, `card()`, `topbar()`, `accountShell()` and the rest. |
| `@apliteni/apliteni-ui/react` | The React components, TypeScript types included. |
| `@apliteni/apliteni-ui/react/css` | Their shell styles. |
| `@apliteni/apliteni-ui/inline` | The same CSS as strings, for a server that inlines it. |
| `@apliteni/apliteni-ui/guidelines/*` | The UI rules as Markdown. |

## Use it

```js
import '@apliteni/apliteni-ui/css';
import { topbar, card, button, wireTopbar } from '@apliteni/apliteni-ui';

el.innerHTML = topbar({ word: 'Strategy', account: { name, email } })
             + card({ title: 'Appearance', body: button({ label: 'Save', variant: 'primary' }) });
wireTopbar(document);   // theme toggle, menus, segmented controls, copy buttons
```

```tsx
import '@apliteni/apliteni-ui/css';
import '@apliteni/apliteni-ui/react/css';
import { DataTable, Modal } from '@apliteni/apliteni-ui/react';
```

The `accountShell()` factory provides the complete `/account` layout: the topbar, sticky
sidebar and page body, so no product rebuilds it. The
[component catalog](docs/library.md#component-catalog) lists this factory and every other one.

### Fonts

The kit defines two font families but does not bundle them, so the host page must load them.
Poppins is `--font-display`, used for headings, brand marks and large readouts. IBM Plex Sans
is `--font-sans`, used for tables, fields, paragraphs, chat and most application text. Both
families support weights 300–700.

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap">
```

If a family does not load, the browser uses its system fallback stack. The kit does not
display a message about this fallback.

## Theme and accent

Set the theme on `<html>` with `data-theme="dark|light"`. You can set an accent separately
with `data-accent`:

```html
<html data-theme="dark" data-accent="phoenix">
```

An accent changes only the accent family: `--accent`, `--purple*`, `--glow-purple`, `--ring`
and `--grad-*`. Surfaces, text and signal colours remain unchanged. Green remains the live
colour and pink remains the danger colour. As a result, every accent works in both themes
without requiring component changes. The shipped accents are **Nebula** (purple and the
default), **Phoenix** (ember), **Ocean** (azure) and **Emerald** (jade).

Both attributes override the defaults. If neither is present, the kit uses dark Nebula. If
only `data-accent` is present, the kit uses that accent with the dark theme. An absent
`data-theme` does *not* mean “follow the system”: the kit has no `prefers-color-scheme`
rule. If the host wants to follow the operating system preference, its JavaScript must
choose the theme and add the attribute. See
[an absent attribute means dark](docs/library.md#an-absent-attribute-means-dark).

You can change the settings at runtime with `applyTheme('light')` and
`applyAccent('phoenix')`. These functions save the choices to `localStorage`. You can also
use `accentPicker()`, which `wireTopbar()` connects.

## The rules

The **Guidelines** explain what a page may contain, which component to choose, which states
it must support, and how to handle colour and wording. Both kit layers follow these rules.
The guidelines ship as Markdown in the package and are also available as a Storybook
section.

- [guidelines/overview.md](guidelines/overview.md) — the index, and the rules the kit has yet to meet.
- [guidelines/the-page.md](guidelines/the-page.md) — read this one before designing a screen.
- [Guidelines in Storybook](https://ui.apli.tech/storybook/?path=/story/guidelines-overview--overview) — the same pages with live specimens.

## Documentation

| Page | What it answers |
| --- | --- |
| [specification.md](docs/specification.md) | What the kit guarantees and what it refuses to do. A gate on `npm test` holds every statement. |
| [library.md](docs/library.md) | Architecture, the `src/` layout, tokens and theming, the component catalog. |
| [react/README.md](react/README.md) | The React components, their props, and the Storybook on port 6007. |
| [storybook.md](docs/storybook.md) | The workbench: config, theming toolbar, story conventions. |
| [landing-page.md](docs/landing-page.md) | ui.apli.tech: the chrome, the static build, the hosting. |
| [changelog.md](docs/changelog.md) | The changelog's data model and its Storybook deeplinks. |

## Contribute

Use Node 20 or newer. Install [jq](https://jqlang.github.io/jq/), then run:

```bash
npm ci
npm run storybook              # the kit; add -w react for the React workspace
npm test && npm test -w react && npm run build-storybook && node site/build.mjs
```

Run the final command before opening a PR. The two suites have budgets of BUDGET_KIT and
BUDGET_REACT on an idle 8-core Linux host, and each run ends with its ten slowest tests
and files. See [AGENTS.md](AGENTS.md) for the per-test budgets.

Add a general, composable kit component only when all three conditions are true: the issue
names at least two products that use it or have requested it; existing components cannot
provide it without copying markup or logic; and it contains no domain-specific data or
rules. If any condition is missing, compose the UI from existing components and add a
Storybook showcase. Preserve the vanilla kit's existing look.

To add a component, put its token-based CSS in `src/styles/`. Include that CSS in
`src/index.css` and in both the `styles` map and `cssText` in `src/inline.js`. Put the HTML
factory in `src/components/` and export it from `src/index.js`. Add a playground and state
examples in `stories/components/`. Put React components in `react/src/`; each one needs a
test and a story that use the shared classes and tokens. The
[guidelines](guidelines/overview.md) define the design rules.

Open an issue, create a branch from `main`, and link the issue in your PR. If you change a
published file, including this README, bump the version in `package.json` and
`package-lock.json`, and add an entry to `site/changelog.mjs`. Merging that version bump
starts the release workflow. Do not push a tag or publish manually.
[AGENTS.md](AGENTS.md) describes the review, data-handling and release checks.

## License

[MIT](./LICENSE) © Apliteni, for the **code**. The Apliteni name, logos and brand marks
are trademarks and are **not** covered by the MIT license — see
[TRADEMARK.md](./TRADEMARK.md).
