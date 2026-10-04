import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('button-labels.md', new URL('../../guidelines/button-labels.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button } from '../../src/components/index.js';

export const SPEC_CSS = `
  <style>
    .gl-stage--row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  </style>`;

const row = (...html) => `<div class="gl-stage gl-stage--row">${html.join('')}</div>`;

// Every do half is declared before the first don't half, and that order is load
// bearing: the closed-list gate stops reviewing call sites for a stretch after a
// `Dont` export, because a don't half draws the violation on purpose. A do half
// written below one is excused along with it and goes unreviewed — which is how
// the wordless overflow menu below passed while naming a glyph off the list.
//
// Ordinary secondary buttons throughout, so no half is also a specimen of a
// variant or a contrast fault.
export const wordsDo = () => row(
  button({ label: 'Export' }),
  button({ label: 'Duplicate' }),
  button({ label: 'Delete' }),
);

export const verbDo = () => row(
  button({ label: 'Export CSV', icon: 'download' }),
  button({ label: 'Delete', icon: 'trash' }),
);

// The funnel is the question #565 came from, so it is drawn on both halves: with
// its word here, and wordless beside a cog that gave its own up.
export const wordlessDo = () => row(
  button({ label: 'Filter', icon: 'filter' }),
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true }),
);

export const wordsDont = () => row(
  button({ label: 'Export', icon: 'download', iconOnly: true }),
  button({ label: 'Duplicate', icon: 'copy', iconOnly: true }),
  button({ label: 'Delete', icon: 'trash', iconOnly: true }),
);

export const verbDont = () => row(
  button({ label: 'Export CSV', icon: 'table' }),
  button({ label: 'Delete' }),
);

export const wordlessDont = () => row(
  button({ label: 'Filter', icon: 'filter', iconOnly: true }),
  button({ label: 'Settings', icon: 'gear', iconOnly: true }),
);

export const RULES = withSpecimens(content.rules, [
{ id: 'words-first', doHtml: wordsDo, dontHtml: wordsDont },
{ id: 'glyph-repeats-the-verb', doHtml: verbDo, dontHtml: verbDont },
{ id: 'wordless-earns-it', doHtml: wordlessDo, dontHtml: wordlessDont }
]);
