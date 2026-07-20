# Contributing to @apliteni/apliteni-ui

The kit is **framework-agnostic HTML + CSS**: design tokens, one CSS file per
component, and tiny factory functions. Storybook is the workbench. No build step —
what you write is what ships.

## Setup

```bash
NODE_AUTH_TOKEN=$(gh auth token) npm install
npm run storybook        # http://localhost:6006
```

## Golden rules

1. **Tokens, never literals.** Components reference semantic tokens
   (`var(--accent)`, `var(--surface)`, `var(--space-4)`) — never raw hex or px
   colours. If you need a value that doesn't exist, add a token first.
2. **Signal colours are constant.** `--green` = live, `--pink` = danger. They do
   **not** move with the accent. Only the accent family does.
3. **Every state.** A component isn't done until hover, focus-visible, disabled,
   busy, empty, error and success are all designed and in a story.
4. **Both themes, all accents.** Check dark and light, and at least Nebula +
   Phoenix, before opening a PR. Use the toolbar toggles.
5. **No visual slop.** Run the AI-slop detector on any new example page.

## Add a component

1. `src/styles/<name>.css` — token-driven, `.ui-<name>` class namespace.
2. `@import` it in `src/index.css`, and add it to `src/inline.js` (`styles` map +
   `cssText`) so server-render consumers get it.
3. A factory in `src/components/index.js` returning an HTML string.
4. `stories/components/<Name>.stories.js` — a Playground + a states gallery.

## Add an accent sub-theme

Append a pair of blocks to `src/tokens/accents.css`:

```css
:root[data-theme="dark"][data-accent="<name>"]  { /* --accent, --purple*, --glow-purple, --ring, --grad-* */ }
:root[data-theme="light"][data-accent="<name>"] { /* light variant */ }
```

Add it to the toolbar (`.storybook/preview.js` globalTypes.accent), the
`accentPicker()` swatches, and the `Sub-themes` story maps. Verify contrast of the
primary button (`--accent` bg × `--accent-contrast` text) in both themes.

## Release

```bash
npm version patch|minor|major     # bumps package.json + tags
git push --follow-tags
gh release create v$(node -p "require('./package.json').version") --generate-notes
```

CI publishes to GitHub Packages on the Release. The `ui.apli.tech` site rebuilds
from the repo (landing + Storybook) — see the README for the image build/deploy.
