import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('iconography.md', new URL('../../guidelines/iconography.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, toast } from '../../src/components/index.js';
import { icon, iconOnlyAllowed, iconMeanings } from '../../src/assets/icons.js';





export const SPEC_CSS = `
  <style>
    .gl-stage--row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    /* The meaning pairs read as a table, so they get one. */
    .gl-mean { border-collapse: collapse; font-size: var(--text-sm); }
    .gl-mean td { padding: var(--space-2) var(--space-3); vertical-align: middle; }
    .gl-mean td:first-child { line-height: 0; }
    .gl-mean code { font-family: var(--font-mono); font-size: .9em; }
    .gl-mean .gl-mean__what { color: var(--muted); }
  </style>`;

const row = (...html) => `<div class="gl-stage gl-stage--row">${html.join('')}</div>`;

// The do/don't pair for the closed list. Both halves are ordinary secondary
// buttons, so neither half is also a specimen of a contrast fault.
export const listDo = () => row(
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true, variant: 'secondary' }),
  button({ label: 'Settings', icon: 'gear', variant: 'secondary' }),
);
export const listDont = () => row(
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true, variant: 'secondary' }),
  button({ label: 'Settings', icon: 'gear', iconOnly: true, variant: 'secondary' }),
);

// The meaning pair. The don't is the danger toast as it shipped before #199:
// the same bare `x` as both the status and the close.
export const meaningDo = () => `<div class="gl-stage">${toast({
  variant: 'danger', title: 'Upload failed', body: 'The file exceeded 25 MB.',
})}</div>`;
export const meaningDont = () => `<div class="gl-stage">${toast({
  variant: 'danger', icon: 'x', title: 'Upload failed', body: 'The file exceeded 25 MB.',
})}</div>`;

const meaningTable = () => `
  <table class="gl-mean"><tbody>${Object.entries(iconMeanings).map(([glyph, means]) => `
    <tr><td>${icon(glyph)}</td><td><code>${glyph}</code></td><td class="gl-mean__what">${means}</td></tr>`).join('')}
  </tbody></table>`;

export const meaningsAll = () => `<div class="gl-stage">${meaningTable()}</div>`;

export const RULES = withSpecimens(content.rules, [
{ id: 'icon-only', doHtml: listDo, dontHtml: listDont, kit: [
      { ref: 'src/assets/icons.js:153', pattern: 'export const iconOnlyAllowed' },
      { ref: 'stories/guidelines/iconography.test.js:95', pattern: 'every icon-only control is one the closed list allows' },
      { ref: 'src/components/index.js:39', pattern: 'const named = iconOnly' },
    ] },
{ id: 'meaning', doHtml: meaningDo, dontHtml: meaningDont, kit: [
      { ref: 'src/assets/icons.js:174', pattern: 'export const iconMeanings' },
      { ref: 'src/components/index.js:232', pattern: 'const TOAST_ICON = {' },
    ] },
{ id: 'one-group', kit: [
      { ref: 'src/assets/icons.test.js:39', pattern: "test('no glyph is declared in more than one group'" },
      { ref: 'src/assets/icons.test.js:55', pattern: "test('the groups declare exactly as many glyphs as the kit ships'" },
    ] },
{ id: 'provenance', kit: [
      { ref: 'src/assets/icons.js:137', pattern: 'stroke-width="1.7"' },
      { ref: 'src/assets/icons.test.js:67', pattern: "test('the emitter ships the numbers its header argues for'" },
    ] },
{ id: 'stroke-earns-the-bar', kit: [
      { ref: 'src/styles/callout.css:16', pattern: 'stroke-width: 2.1;' },
      { ref: 'stories/signal-contrast.test.js:607', pattern: 'const barFor = (px) =>' },
    ] }
]);
