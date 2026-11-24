import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('three-column-page.md', new URL('../../guidelines/three-column-page.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

/* The pictures set their own columns: the flow half's list and steps at one third and
   two thirds, beside a wider work half, or three equal columns for the don't. The two
   separators are the divider's line. */
export const SPEC_CSS = `<style>
  .tc-page { display: grid; gap: var(--space-4); align-items: start; font-size: var(--text-sm); }
  .tc-page--split { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 4fr); }
  .tc-page--equal { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tc-page > .tc-area + .tc-area { padding-inline-start: var(--space-4); border-inline-start: 1px solid var(--border); align-self: stretch; }
  .tc-area { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
  .tc-title, .tc-head { color: var(--strong); font-weight: var(--weight-semibold); }
  .tc-head { font-size: var(--text-lg); }
  .tc-phone, .tc-phone-frame { max-width: 390px; }
  .tc-phone { display: flex; flex-direction: column; gap: var(--space-4); }
  .tc-links { display: flex; gap: var(--space-2); margin-inline-start: calc(-1 * var(--space-3)); }
  .tc-links > .ui-nav__item { width: auto; }
  .tc-frame { position: relative; min-height: 460px; overflow: hidden; }
  .tc-frame .ui-drawer { position: absolute; }
</style>`;
