// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';

export const TITLE = 'Layout and density';

export const BLURB = 'The two widths a page has, and where density comes from when the kit has no mode for it.';

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

export const RULES = [
  {
    id: 'container',
    imperative: 'Take a page width from --container. Do not write the number.',
    why: 'The kit said 1180px in three files and the site said 1120px in three more, and neither '
      + 'could see the other — so the site overrode the kit\'s own topbar to disagree with it. '
      + 'A literal is the one width that cannot follow a decision.',
    except: 'src/tokens is where the scale is declared, so it is not scanned.',
    doCaption: 'One token, read by the kit and the site alike.',
    dontCaption: 'Four page-scale numbers, no two files agreeing. Drawn to scale, not to size.',
    doHtml: measureDo,
    dontHtml: measureDont,
    kit: [
      { ref: 'src/styles/base.css:91', pattern: 'max-width: var(--container)' },
      { ref: 'src/styles/topbar.css:17', pattern: 'max-width: var(--container)' },
      { ref: 'src/tokens/tokens.css:49', pattern: '--container: 1120px' },
    ],
  },
  {
    id: 'measure',
    imperative: 'A reading column takes --measure, never --container.',
    why: 'They are different axes, not two opinions about one number: --container is the page '
      + 'gutter to gutter, and --measure is the column inside a track that already has a sidebar '
      + 'beside it. A shell whose main column is --container has no sidebar. Reconciling the two '
      + 'as if they competed is what made nine widths look like one disagreement.',
    kit: [
      { ref: 'src/styles/layout.css:124', pattern: 'var(--ui-app-main, var(--measure))' },
      { ref: 'src/tokens/tokens.css:50', pattern: '--measure: 860px' },
    ],
  },
  {
    id: 'one-source',
    imperative: 'One width, one place. A second copy needs a test to stay true, and the test is the smell.',
    why: 'shell.js carried its own 860px beside layout.css\'s, and a test compared the two strings '
      + 'to keep them honest. That is two sources with a guard, not one source. The shell now '
      + 'writes no width at all when the caller gives none, so the CSS falls through to the token '
      + 'and there is nothing left to hold in step.',
    except: 'A caller may still pass an explicit maxWidth — an override is a decision, not a copy.',
    kit: [
      { ref: 'src/components/shell.js:102', pattern: "s === 'none' || LENGTH.test(s) ? s : ''" },
      { ref: 'stories/apps/shell.test.js:714', pattern: 'the reading column has one source' },
    ],
  },
  {
    id: 'density',
    imperative: 'Set density with the spacing scale. There is no kit-wide density mode.',
    why: 'No compact mode, no comfortable mode, no data-density attribute and no row-height scale '
      + '— and that is the position rather than an omission. The ten-step spacing scale already is '
      + 'the control: a tight row takes --space-2, a roomy one --space-5, and both stay legible as '
      + 'steps of one system. What would earn a mode is a surface needing both densities at once, '
      + 'switched at runtime — a reader\'s preference rather than a designer\'s choice per screen. '
      + 'No such surface exists here, and building the mechanism first means guessing at its values.',
    except: '.ui-table--dense is the one modifier in the kit, and it is component-local on purpose '
      + '— a many-column ledger is the one place where a tighter rhythm is a property of the data, '
      + 'not of the page around it. Its own numbers (14px, 10px, 12px) are literals rather than '
      + 'steps, which is the rule not being met by the one component that has an exception to it.',
    doCaption: 'Every gap and pad a step: --space-3 rows inside a card.',
    dontCaption: '13px, 9px, 14px, 6px, 17px — each row settled on its own, none against the others.',
    doHtml: densityDo,
    dontHtml: densityDont,
    kit: [
      { ref: 'src/tokens/tokens.css:35', pattern: '--space-3: 12px' },
      { ref: 'src/styles/table.css:62', pattern: '.ui-table--dense td' },
    ],
  },
  {
    id: 'below-the-page',
    imperative: 'Below the reading column the kit has no scale yet — say which it is, do not invent a step.',
    why: 'Component widths (400px, 340px, 420px, 620px), prose measures (38ch, 44ch, 52ch, 60ch, '
      + '72ch) and breakpoints (460, 560, 600, 720, 760, 860) are all still literal, and the gate '
      + 'draws its floor at --measure for that reason: below it there is nothing to replace a '
      + 'literal with. Adding a token for one component now would look like a scale and be a '
      + 'sample of one.',
    unmet: {
      issue: 208,
      note: 'The page-scale half landed in #198. Component widths, prose measures and breakpoints '
        + 'are unreconciled, and breakpoints need more than a token — a media query cannot read a '
        + 'custom property, so that one is a build step or a convention.',
    },
    kit: [
      { ref: 'stories/measure-tokens.test.js:104', pattern: 'no literal page-scale width outside src/tokens' },
    ],
  },
];
