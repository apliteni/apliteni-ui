import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('text-length.md', new URL('../../guidelines/text-length.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

export const RULES = content.rules;

// The page head the introduction rule is about: the drawer title's rank, so no
// specimen outranks the rule headings. The other pictures are kit parts placed.
export const SPEC_CSS = `
  <style>
    .gt-acts { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .gt-stack { display: flex; flex-direction: column; gap: var(--space-4); }
    .gt-head { display: flex; flex-direction: column; gap: var(--space-2); }
    .gt-title { margin: 0; color: var(--strong); font-family: var(--font-sans);
      font-size: calc(var(--text-base) + 0.5px); font-weight: var(--weight-semibold); }
    .gt-text { margin: 0; color: var(--text); font-size: var(--text-sm); max-width: var(--prose-dense); }
    .gc-except { box-shadow: none; padding-left: 0; }
  </style>`;
