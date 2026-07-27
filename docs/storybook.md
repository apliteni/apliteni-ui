# The Storybook workbench

Storybook is where components are built, themed, and reviewed. Because the kit is HTML
strings, `@storybook/html-vite` renders exactly what ships — a story is a factory call
whose returned string becomes the canvas.

## Config (`.storybook/`)

- **`main.js`** — `html-vite` framework; stories glob `../stories/**/*.stories.@(js|mjs)`;
  `addon-essentials` (trimmed — the theme decorator owns the canvas) + `addon-a11y`.
  Autodocs off, telemetry off.
- **`preview.js`** — the Theme/Accent toolbar and the decorator (below).
- **`manager.js` / `manager-head.html`** — brand the Storybook shell.

## Theme & accent

`preview.js` adds two toolbar dropdowns — **Theme** (`dark`/`light`) and **Accent**
(Nebula/Phoenix/Ocean/Emerald). A decorator applies them to `<html>`, paints the canvas
with the theme `--bg`, renders the story's string, and calls `wireTopbar()` so
interactive behaviors work. So any story is viewable in 2 themes × 4 accents with no
per-story code.

## Stories (`stories/`)

Grouped by `title` into three sections, ordered in `preview.js` (`storySort`):

- **Foundations** — Colors, Typography, Spacing & Radius, Elevation, Backgrounds,
  Iconography, Brand, Sub-themes.
- **Components** — one kit factory each (Button, Card, Table, Topbar, …).
- **Apps** — full-page compositions that dogfood the components (Landing, Sign In,
  Consent, Preferences, Access & Agents). Shared scaffolding in `stories/apps/_*.js`.

A story is a plain object whose `render` returns the factory's HTML string:

```js
export default { title: 'Components/Button' };
export const Playground = { render: () => button({ label: 'Save', variant: 'primary' }) };
```

The `title` + first export name set the story id the [changelog](changelog.md) deep-links
to — renaming either changes its URL. Don't hand-wire theming or `wireTopbar`; the
decorator does both.

## Run & build

```bash
npm run storybook          # dev → http://localhost:6006
npm run build-storybook    # static → storybook-static/  (what the site serves at /storybook)
```

`storybook-static/index.json` is the ground truth for story ids.
