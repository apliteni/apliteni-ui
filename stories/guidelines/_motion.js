import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule: AGENTS.md#the-guidelines-collection
//
// Each pair is a row of still frames of the kit's own drawer or table row, the values a
// motion is written with, or the plotted kit curves. No picture on this page moves.

export const RULES = content.rules;

// The frames are kit stages with the kit's drawer. The easing plots and their small
// frames paint their own lines, as a guideline specimen may.
export const SPEC_CSS = `
  <style>
    .gm-film { display: flex; flex-direction: column; gap: var(--space-2); }
    .gm-film > p + .gl-stage { margin-bottom: var(--space-2); }
    .gm-frame { position: relative; height: 296px; overflow: hidden; padding: var(--space-4); }
    .gm-frame .ui-drawer { position: absolute; }
    .gm-frame .ui-drawer__panel { width: 70%; }
    /* Half of --dur-med: --ease has covered 78% of the travel, so 22% of the
       panel's 70% is still past the edge, and the scrim is at 78% of its fade. */
    .gm-frame--half .ui-drawer__panel { right: -15.4%; }
    .gm-frame--half .ui-drawer.is-open .ui-drawer__scrim { opacity: 0.78; }

    /* A curve is drawn as its plot: time runs right, progress runs up. Under the
       plots, a small drawer over a page at four times, its offset at that curve. */
    .gm-curves { display: flex; flex-direction: column; gap: var(--space-4); }
    .gm-plots, .gm-strip { display: grid; grid-template-columns: repeat(var(--gm-cols), minmax(0, 1fr));
      gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
    .gm-plots { --gm-cols: 3; }
    .gm-strip { --gm-cols: 4; }
    .gm-plot, .gm-shot { display: flex; flex-direction: column; gap: var(--space-2); }
    .gm-plot__box { position: relative; border-radius: var(--radius-sm);
      background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
    .gm-plot svg { display: block; width: 100%; height: auto; aspect-ratio: 1; }
    .gm-plot path { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; }
    .gm-plot__axis--x { position: absolute; bottom: var(--space-1); right: var(--space-2); }
    .gm-plot__name { font-family: var(--font-mono); }
    .gm-plot, .gm-time { font-size: var(--text-xs); color: var(--text); font-variant-numeric: tabular-nums; }
    .gm-mini { position: relative; height: 112px; overflow: hidden; border-radius: var(--radius-sm);
      background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
    /* 6px and 10px: a page line's gap and inset, drawn at the frame's small scale. */
    .gm-mini__page, .gm-mini__panel { display: flex; flex-direction: column; gap: 6px; padding: 10px; }
    .gm-ln { height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--muted) 55%, transparent); }
    .gm-ln:nth-child(odd) { width: 70%; }
    .gm-mini__scrim { position: absolute; inset: 0; opacity: var(--gm-shade, 0); background: var(--scrim); }
    .gm-mini__panel { position: absolute; inset-block: 0; right: 0; width: 62%;
      background: var(--bg-elevated); box-shadow: inset 1px 0 0 var(--border);
      transform: translateX(var(--gm-at, 100%)); }
    .gm-mini__title { height: 6px; width: 60%; border-radius: 2px; background: var(--text); }

    /* A row's hover fill part of the way in: the kit's row hover over the table's ground. */
    .gm-hover > td { background: color-mix(in srgb, var(--surface-3) calc(var(--gm-fill, 0) * 100%), var(--table-bg)); }
  </style>`;
