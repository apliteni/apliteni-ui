import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('three-column-page.md', new URL('../../guidelines/three-column-page.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

/* The layout pictures are drawn to scale: the three columns as blocks, 1 to 2 to 4 for
   the page, or three equal columns for the don't. The separators are the divider's line,
   and a selected item takes the page's selected paint. The phone picture holds the real
   links and list. */
export const SPEC_CSS = `<style>
  /* The columns stand on the page ground, as on the page, so the selected plates keep their contrast. */
  .tc-lay { display: flex; height: 168px; background: var(--bg); border-radius: var(--radius-sm); box-shadow: inset 0 0 0 1px var(--border); overflow: hidden; }
  .tc-lay__col { display: flex; flex-direction: column; gap: 1px; min-width: 0; padding: var(--space-3); }
  /* A phone cell: a narrower inset keeps a name whole in column 2. */
  .tc-lay { container-type: inline-size; }
  @container (max-width: 400px) { .tc-lay__col { padding-inline: var(--space-2); } }
  .tc-lay__col + .tc-lay__col { border-inline-start: 1px solid var(--border); }
  .tc-lay--split > .tc-lay__col--parents { flex: 1; }
  .tc-lay--split > .tc-lay__col--children { flex: 2; }
  .tc-lay--split > .tc-lay__col--child { flex: 4; }
  .tc-lay--equal > .tc-lay__col { flex: 1; }
  .tc-lay--phone { max-width: 180px; }
  .tc-lay__cap { margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--strong); }
  .tc-lay__row { display: flex; align-items: center; gap: 5px; margin-inline: -6px; padding: 3px 6px; border-radius: var(--radius-sm); }
  /* The selected paint as the page draws it: the list's grey selected row. A selected row
     is a taller plate with strong ink, so it reads at a glance. */
  .tc-lay__row--on { padding-block: 7px; background: var(--nav-active-fill); }
  .tc-lay__row--on .tc-lay__ln { background: var(--strong); }
  .tc-lay__ln { flex: 1; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--muted) 55%, transparent); }
  .tc-lay__col--child .tc-lay__ln { height: 6px; }
  .tc-area { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
  .tc-title, .tc-head { color: var(--strong); font-weight: var(--weight-semibold); }
  .tc-head { font-size: var(--text-lg); }
  .tc-phone { display: flex; flex-direction: column; gap: var(--space-4); max-width: 390px; }
  .tc-links { display: flex; gap: var(--space-2); margin-inline-start: calc(-1 * var(--space-3)); }
  .tc-links > .ui-nav__item { width: auto; }
</style>`;
