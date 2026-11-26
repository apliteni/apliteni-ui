import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('task-list.md', new URL('../../guidelines/task-list.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The kit's board region scrolls sideways inside its stage. The don't wraps the same columns into rows.
// The head stands its title and toolbar in a stage of its own, as the page shell does.
export const SPEC_CSS = `
  <style>
    .gl-board__track { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(var(--panel-sm), 1fr); gap: var(--space-6); }
    .gl-board--wrapped .gl-board__track { grid-auto-flow: row; grid-template-columns: minmax(0, 1fr); }
    .gl-board__head { display: flex; align-items: baseline; justify-content: space-between; }
    .gl-board__stack { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-head { display: flex; flex-direction: column; gap: var(--space-2); }
    .gl-head__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
    .gl-head__row h3 { margin: 0; }
  </style>`;
