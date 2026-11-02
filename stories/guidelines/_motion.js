import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const RULES = content.rules;

// A still page cannot move, so a motion is drawn as its frames: a drawer over a page,
// drawn to scale, at the time under each frame. A frame's offset is the kit's curve at
// that time: halfway through, --ease has moved the panel and the scrim 78% of the way.
export const SPEC_CSS = `
  <style>
    .gm-stack { display: flex; flex-direction: column; gap: var(--space-4); }
    .gm-strip { display: grid; grid-template-columns: repeat(var(--gm-frames, 3), minmax(0, 1fr));
      gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
    .gm-shot { display: flex; flex-direction: column; gap: var(--space-2); }
    .gm-frame { position: relative; height: 112px; overflow: hidden; border-radius: var(--radius-sm);
      background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
    .gm-page { display: flex; flex-direction: column; gap: 6px; padding: 10px; }
    .gm-ln { height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--muted) 55%, transparent); }
    .gm-ln:nth-child(odd) { width: 70%; }
    .gm-scrim { position: absolute; inset: 0; opacity: var(--gm-shade, 0);
      background: var(--drawer-scrim); }
    .gm-panel { position: absolute; inset-block: 0; right: 0; width: 62%; padding: 10px;
      display: flex; flex-direction: column; gap: 6px;
      background: var(--bg-elevated); box-shadow: inset 1px 0 0 var(--border);
      transform: translateX(var(--gm-at, 100%)); }
    .gm-panel__title { height: 6px; width: 60%; border-radius: 2px; background: var(--text); }
    .gm-time { font-size: var(--text-xs); color: var(--text); font-variant-numeric: tabular-nums; }

    /* The durations, one row each: the motion, its token and its time. */
    .gm-dur { display: grid; grid-template-columns: minmax(0, 1fr) auto auto;
      column-gap: var(--space-4); row-gap: var(--space-2); align-items: baseline;
      font-size: var(--text-sm); color: var(--text); }
    .gm-dur code { font-family: var(--font-mono); font-size: var(--text-xs); }
    .gm-dur__ms { text-align: right; font-variant-numeric: tabular-nums; }
  </style>`;
