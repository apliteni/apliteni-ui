# The Storybook workbench

Storybook is where every component is built, themed, and reviewed. Because the kit is
HTML strings, Storybook (`@storybook/html-vite`) renders **exactly** what ships — a
story is just a factory call whose returned string becomes the canvas.

## Config (`.storybook/`)

- **`main.js`** — `@storybook/html-vite` framework; stories glob
  `../stories/**/*.stories.@(js|mjs)`; `addon-essentials` (trimmed:
  backgrounds/measure/outline/viewport off — the kit's theme decorator owns the canvas)
  plus `addon-a11y`. Autodocs are **off** and telemetry is disabled.
- **`preview.js`** — global parameters, the Theme/Accent toolbar, and the decorator (see
  below).
- **`manager.js` / `manager-head.html`** — brand the Storybook shell itself.

## Theme & accent toolbar

`preview.js` defines two `globalTypes` that appear as toolbar dropdowns:

- **Theme** — `dark` (default) / `light`.
- **Accent** — Nebula (default) / Phoenix / Ocean / Emerald.

A decorator applies them to `<html>` before each render: it calls `applyTheme(theme)`,
sets or clears `data-accent`, paints the canvas with the theme's `--bg` so centered
stories read true, renders the story's HTML string into a wrapper, and calls
`wireTopbar(wrap)` on the next frame so interactive behaviors (theme toggle, menus,
segmented controls, copy buttons) work inside the story.

This means **any** story can be viewed in 2 themes × 4 accents with no per-story code —
the same guarantee the [token system](library.md#tokens--theming) gives production.

## Story organization

Stories live in `stories/`, grouped by `title` into three sections, ordered explicitly
in `preview.js` (`storySort`):

- **Foundations** — Colors, Typography, Spacing & Radius, Elevation, Backgrounds,
  Iconography, Brand, Sub-themes. The token/visual language.
- **Components** — Button, Badge & Status, Card, Segmented Control, Inputs, Switch &
  Checkbox, Table, Callout & Toast, Feedback, Code Snippet, Topbar. One kit factory each.
- **Apps** — Landing Page, Sign In (OAuth2), Consent, Preferences, Access & Agents.
  Full-page compositions that dogfood the components together. Shared page scaffolding
  lives in `stories/apps/_accountShell.js` / `_financeShell.js`; `stories/_gallery.js`
  holds shared specimen helpers.

## Story conventions

A story is a plain object; `render` returns the factory's HTML string (or composes
several):

```js
export default { title: 'Components/Button' };
export const Playground = { render: () => button({ label: 'Save', variant: 'primary' }) };
```

- The **`title`** sets the sidebar path and, with the first export name, the story id
  the [changelog registry](changelog.md#component-chips--storybook-components) deep-links
  to — so renaming a story's `title` or first export changes its URL.
- Don't hand-wire theming or `wireTopbar` in a story — the preview decorator does both.
- Escape user-facing text with the kit's `esc()` where a factory doesn't already.

## Run & build

```bash
npm run storybook          # dev server → http://localhost:6006
npm run build-storybook    # static build → storybook-static/
```

The static build is what the [site](landing-page.md) serves at `/storybook` and what the
changelog registry is validated against (`storybook-static/index.json` is the ground
truth for story ids).
