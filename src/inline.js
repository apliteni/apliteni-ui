// Inline CSS for server-render consumers (e.g. the strategy portal, which
// inlines stylesheets into the HTML it serves rather than linking them).
//
// Node reads the package's own .css files and returns them as strings. Import
// only what a page needs:
//
//   import { tokensCss, topbarCss, cssText } from '@apliteni/apliteni-ui/inline'
//
// Browser/bundler builds should import the .css directly ('@apliteni/apliteni-ui/css').
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`./${rel}`, import.meta.url), 'utf8');

// Tokens = brand primitives (synced from design-system) + base scale +
// dark/light + accent sub-themes. The single source for every `:root{ --… }`
// definition. brand.generated.css goes first so the cascade is right.
export const tokensCss =
  read('tokens/brand.generated.css') + '\n' +
  read('tokens/tokens.css') + '\n' +
  read('tokens/accents.css');

// Base reset, ambient glow, focus ring, default icon sizing.
export const baseCss = read('styles/base.css');

// Canonical topbar (same class names the portal already uses).
export const topbarCss = read('styles/topbar.css');

// Individual component stylesheets, addressable by name.
export const styles = {
  base: baseCss,
  motion: read('styles/motion.css'),
  button: read('styles/button.css'),
  card: read('styles/card.css'),
  badge: read('styles/badge.css'),
  segmented: read('styles/segmented.css'),
  tabs: read('styles/tabs.css'),
  input: read('styles/input.css'),
  dropdown: read('styles/dropdown.css'),
  nav: read('styles/nav.css'),
  drawer: read('styles/drawer.css'),
  table: read('styles/table.css'),
  callout: read('styles/callout.css'),
  code: read('styles/code.css'),
  topbar: topbarCss,
  footer: read('styles/footer.css'),
  layout: read('styles/layout.css'),
  feedback: read('styles/feedback.css'),
  success: read('styles/success.css'),
};

// Everything, in the same order as index.css. `tokensCss` first so cascade is right.
export const cssText = [
  tokensCss,
  styles.base,
  styles.motion,
  styles.button,
  styles.card,
  styles.badge,
  styles.segmented,
  styles.tabs,
  styles.input,
  styles.dropdown,
  styles.nav,
  styles.drawer,
  styles.table,
  styles.callout,
  styles.code,
  styles.topbar,
  styles.footer,
  styles.layout,
  styles.feedback,
  styles.success,
].join('\n');
