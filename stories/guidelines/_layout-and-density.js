import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('layout-and-density.md', new URL('../../guidelines/layout-and-density.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';





// The specimens here are rows in a card, because density is a rhythm and a
// rhythm needs more than one row to be visible. `.gl-rows` is the do — every
// gap and pad a step of the spacing scale. `.gl-rows--hand` is the don't, and
// what is wrong with it is the numbers: 13, 9, 14, 6 and 17px, picked one at a
// time until each row looked right on its own. Nothing here is broken markup,
// and both halves clear axe and contrast.gate — the fault is rhythm, which is
// exactly what a picture can carry and a sentence cannot.
export const SPEC_CSS = `
  <style>
    .gl-rows { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-row { display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-4); padding: var(--space-3) 0; }
    .gl-row + .gl-row { border-top: 1px solid var(--border); }
    .gl-row__k { color: var(--dim); font-size: var(--text-sm); }
    .gl-row__v { color: var(--strong); font-size: var(--text-sm); font-weight: var(--weight-medium);
      font-variant-numeric: tabular-nums; }

    .gl-rows--hand { gap: 13px; }
    .gl-rows--hand .gl-row { padding: 9px 0; gap: 17px; }
    .gl-rows--hand .gl-row:nth-child(2) { padding: 14px 0; }
    .gl-rows--hand .gl-row:nth-child(3) { padding: 6px 0; }
    .gl-rows--hand .gl-row__k { font-size: 12.5px; }
    .gl-rows--hand .gl-row__v { font-size: 13.5px; }

    /* The width specimens. A page width cannot be photographed at life size in
       a 420px cell, so these are drawn to scale instead — the ratio is true,
       the pixels are not, and the caption says so. */
    .gl-scale { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-bar { display: flex; align-items: center; gap: var(--space-3); }
    .gl-bar__fill { height: 22px; border-radius: var(--radius-xs); flex: none;
      background: var(--surface-3); box-shadow: inset 0 0 0 1px var(--border); }
    .gl-bar__fill--tok { background: var(--glow-purple); box-shadow: inset 0 0 0 1px var(--accent); }
    .gl-bar__t { font: 500 11px/1 var(--font-mono); color: var(--muted); white-space: nowrap; }
  </style>`;

const ROWS = [
  ['Requests', '1,284,902'],
  ['Unique visitors', '96,417'],
  ['Conversion', '3.42%'],
  ['Revenue', '$18,204.60'],
];

const rows = (mod = '') => `<div class="gl-rows ${mod}">${ROWS.map(
  ([k, v]) => `<div class="gl-row"><span class="gl-row__k">${k}</span>`
    + `<span class="gl-row__v">${v}</span></div>`,
).join('')}</div>`;

const stage = (html) => `<div class="gl-stage">${html}</div>`;

export const densityDo = () => stage(card({ title: 'Last 7 days', body: rows() }));
export const densityDont = () => stage(card({ title: 'Last 7 days', body: rows('gl-rows--hand') }));

// Drawn to scale against the same reference so the two bars are comparable:
// --container is the full cell, --measure is 860/1120 of it.
const bar = (label, pct, tok) =>
  `<div class="gl-bar"><span class="gl-bar__fill${tok ? ' gl-bar__fill--tok' : ''}" `
  + `style="width: ${pct}%"></span><span class="gl-bar__t">${label}</span></div>`;

export const measureDo = () => stage(
  `<div class="gl-scale">
     ${bar('--container', 100, true)}
     ${bar('--measure', 76.8, true)}
   </div>`,
);
export const measureDont = () => stage(
  `<div class="gl-scale">
     ${bar('1180px', 100, false)}
     ${bar('1120px', 94.9, false)}
     ${bar('1080px', 91.5, false)}
     ${bar('860px', 72.9, false)}
   </div>`,
);

export const RULES = withSpecimens(content.rules, [
{ id: 'container', doHtml: measureDo, dontHtml: measureDont, kit: [
      { ref: 'src/styles/base.css:114', pattern: 'max-width: var(--container)' },
      { ref: 'src/styles/topbar.css:17', pattern: 'max-width: var(--container)' },
      { ref: 'src/tokens/tokens.css:42', pattern: '--container: 1120px' },
    ] },
{ id: 'measure', kit: [
      { ref: 'src/styles/layout.css:298', pattern: 'var(--ui-app-main, var(--measure))' },
      { ref: 'src/tokens/tokens.css:43', pattern: '--measure: 860px' },
    ] },
{ id: 'one-source', kit: [
      { ref: 'src/components/shell.js:111', pattern: "s === 'none' || LENGTH.test(s) ? s : ''" },
      { ref: 'stories/apps/shell.test.js:919', pattern: 'the reading column has one source' },
    ] },
{ id: 'density', doHtml: densityDo, dontHtml: densityDont, kit: [
      { ref: 'src/tokens/tokens.css:29', pattern: '--space-3: 12px' },
      { ref: 'src/styles/table.css:58', pattern: 'padding: var(--space-2) var(--space-3)' },
      { ref: 'stories/table-rhythm.test.js:85', pattern: 'writes no row rhythm as a literal' },
    ] },
{ id: 'below-the-page', kit: [
      { ref: 'stories/measure-tokens.test.js:147', pattern: 'no literal box width outside src/tokens' },
      { ref: 'stories/measure-tokens.test.js:166', pattern: 'no literal prose measure outside src/tokens' },
    ] },
{ id: 'breakpoints', kit: [
      { ref: 'src/styles/layout.css:433', pattern: '@media (max-width: 720px)' },
      { ref: 'stories/breakpoints.test.js:117', pattern: 'every breakpoint is one of the documented steps' },
      { ref: 'stories/breakpoints.test.js:139', pattern: 'every documented step is a step something queries' },
    ] }
]);
