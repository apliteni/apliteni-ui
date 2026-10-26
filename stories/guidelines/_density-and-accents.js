import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('density-and-accents.md', new URL('../../guidelines/density-and-accents.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;

export const SPEC_CSS = `<style>
  .gda-stage { min-width: 0; padding: var(--space-4); background: var(--bg); border-radius: var(--radius-lg); }
  .gda-stage > * + * { margin-top: var(--space-4); }
  .gda-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }
  .gda-table { overflow-x: auto; }
  .gda-band { max-width: 28rem; }
  .gda-forced { overflow-x: auto; }
  .gda-forced .ui-stats__list { flex-wrap: nowrap; }
  .gda-forced .ui-stats__list > .ui-stat { flex-basis: 0; }
  .gda-coloured .ui-drawer__row dt, .gda-coloured .ui-drawer__row dd { color: var(--accent); }
  /* Two panes in one order, so the only thing that moves between Do and Don't is which
     pane is given the width, the weight and the accent. The tracks are 2:1 rather than
     the screen's 485:420, because a specimen at half a page has to exaggerate a ratio to
     show it. Stretched, so neither card out-masses the other by accident. minmax(0, …)
     because two cards on their min-content floors ignore the ratio and push the grid
     past its own box. */
  .gda-panes { display: grid; align-items: stretch; gap: var(--space-4); }
  .gda-panes--saved-wide { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .gda-panes--source-wide { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); }
  /* Below 560 a half-page cell is about 280px, where a 2:1 split leaves the narrow card
     too thin to hold a word. The pair stacks instead and the emphasised pane goes first,
     so the lever the reader can still see is position — the same trade the showcase makes
     below 860. why: guidelines/layout-and-density.md#use-the-three-breakpoints */
  @media (max-width: 560px) {
    .gda-panes { grid-template-columns: minmax(0, 1fr); }
    .gda-panes--source-wide > :first-child { order: 2; }
  }
  /* Stacked label-over-value rows rather than a two-column list: at a third of a
     half-page column a label beside its value has nowhere to wrap, and the kit's rows
     break inside words to fit. */
  .gda-panes .ui-card { display: flex; flex-direction: column; }
  .gda-pane__label { margin: 0; overflow-wrap: normal; }
  .gda-pane__value { margin: 0 0 var(--space-2); overflow-wrap: normal; }
  .gda-pane__value--strong { font-weight: var(--weight-medium); }
  .gda-pane__line { margin: 0 0 var(--space-2); overflow-wrap: normal; }
  /* The accent as ink on the pane's own name. Not a border: a line strong enough to read
     as the signal is an outlined box, and not a ground either, because a pane like this
     one holds a table and a table stays on the reading surface. */
  .gda-pane--accent .ui-card__title { color: var(--accent); }
  .gda-page .gc-except { box-shadow: none; padding-left: 0; }
</style>`;
