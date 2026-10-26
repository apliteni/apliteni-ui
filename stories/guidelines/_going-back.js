import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('going-back.md', new URL('../../guidelines/going-back.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The specimens are the top of a page — the link, and the title under it — so
// the stage draws a title in the page's own face at a size that fits the
// panel. A <p>, not an <h1>: one guideline page must not carry a dozen h1s.
export const SPEC_CSS = `
  <style>
    .gb-head { display: flex; flex-direction: column; gap: var(--space-3); }
    .gb-head > .ui-btn { align-self: flex-start; }
    .gb-title { margin: 0; font: 700 21px/1.15 var(--font-display); letter-spacing: var(--tracking-tight);
      color: var(--strong); }
    .gb-titlerow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
    .gb-page { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-5); align-items: start; }
  </style>`;
