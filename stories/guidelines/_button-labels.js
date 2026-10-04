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

// Every do half is declared before the first don't half: the closed-list gate
// stops reviewing call sites for a stretch after a `Dont` export, so a do half
// written below one would go unreviewed.
//
// No destructive action here. A Delete drawn as an ordinary secondary teaches
// the accent hover that guidelines/destructive-actions.md forbids, and this page
// is about words, not colour.
export const wordsDo = () => row(
  button({ label: 'Export' }),
  button({ label: 'Rename' }),
  button({ label: 'Share' }),
);

export const verbDo = () => row(
  button({ label: 'Export CSV', icon: 'download' }),
  button({ label: 'Duplicate', icon: 'copy' }),
);

// The funnel is the question #565 came from, so it is drawn on both halves: with
// its word here, and wordless beside a cog that gave its own up.
export const wordlessDo = () => row(
  button({ label: 'Filter', icon: 'filter' }),
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true }),
);

export const wordsDont = () => row(
  button({ label: 'Export', icon: 'download', iconOnly: true }),
  button({ label: 'Rename', icon: 'edit', iconOnly: true }),
  button({ label: 'Share', icon: 'share', iconOnly: true }),
);

export const verbDont = () => row(
  button({ label: 'Export CSV', icon: 'table' }),
  button({ label: 'Duplicate' }),
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
