import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('hover-readouts.md', new URL('../../guidelines/hover-readouts.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';
import { tooltip } from '../../src/components/tooltip.js';
import { CHART_CSS, EXPENSES, REVENUE, bars, eur, pointOf, sparkline } from '../_chart.js';





// Every readout below is rendered open, at the anchor the wiring would have
// measured, so the gates can read it. The charts are fixed-size for the same
// reason: a readout placed in pixels has to sit on a chart drawn in pixels. The
// hosts carry no [data-tip-host], so the preview's wiring leaves the pictures be.
export const SPEC_CSS = `${CHART_CSS}
  <style>
    .gh-stack { display: flex; flex-direction: column; gap: var(--space-4); }
    .gh-figure { margin: var(--space-2) 0 var(--space-4); font: var(--weight-semibold) var(--text-xl)/1.2 var(--font-display);
      color: var(--strong); font-variant-numeric: tabular-nums; }
    /* The don't's readout is a line of ordinary card text, styled as the one it
       replaces would be — what is wrong with it is where it is. */
    .gh-inline { margin: var(--space-2) 0 0; font-size: var(--text-sm); color: var(--muted);
      font-variant-numeric: tabular-nums; }
    .gh-room { padding-top: var(--space-16); }
    .gh-room--tall { padding-top: calc(var(--space-16) * 2); }
    /* A region that hides its overflow, the way a scrolling table or a clipped
       card body does, with less room above the tallest bar than a readout needs. */
    .gh-clip { overflow: hidden; border-radius: var(--radius-sm);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-8) var(--space-3) 0; }
  </style>`;

const HOT = 10;
const host = (inner) => `<div class="ui-tip-host" style="width: max-content">${inner}</div>`;

// The KPI card from the finance portal's overview, and the card under it — the
// one that moves when a readout is written into the first.
const kpiCard = (chart) => card({
  title: 'Revenue',
  sub: 'Last 12 months',
  body: `<p class="gh-figure">${eur(REVENUE[REVENUE.length - 1])}</p>${chart}`,
});
const nextCard = () => card({
  title: 'Expenses',
  sub: 'Last 12 months',
  body: `<p class="gh-figure">${eur(EXPENSES[EXPENSES.length - 1])}</p>`,
});

const overlayDo = () => {
  const s = sparkline({ hot: HOT });
  const p = s.at(HOT);
  return `<div class="gh-stack">${kpiCard(host(
    s.svg + tooltip({ ...pointOf(REVENUE, HOT), open: true, x: p.x, y: p.top }),
  ))}${nextCard()}</div>`;
};

const overlayDont = () => {
  const { label, value, detail } = pointOf(REVENUE, HOT);
  return `<div class="gh-stack">${kpiCard(
    `${sparkline({ hot: HOT }).svg}<p class="gh-inline">${label}: ${value}, ${detail}</p>`,
  )}${nextCard()}</div>`;
};

const barsOpen = (placement, { values = REVENUE, text = pointOf(REVENUE, HOT), room = 'gh-room' } = {}) => {
  const b = bars({ values, hot: HOT });
  const p = b.at(HOT);
  return `<div class="${room}">${host(b.svg + tooltip({
    ...text, open: true, placement, x: p.x, y: placement === 'bottom' ? p.bottom : p.top,
  }))}</div>`;
};

const clipped = (placement) => {
  const b = bars({ hot: HOT });
  const p = b.at(HOT);
  return `<div class="gh-clip">${host(b.svg + tooltip({
    ...pointOf(REVENUE, HOT), open: true, placement, x: p.x, y: p.top,
  }))}</div>`;
};

export const RULES = withSpecimens(content.rules, [
{ id: 'overlay', doHtml: overlayDo, dontHtml: overlayDont, kit: [
      { ref: 'src/styles/tooltip.css:18', pattern: 'position: absolute;' },
      { ref: 'src/styles/tooltip.css:58', pattern: '.ui-tip.is-open { opacity: 1; visibility: visible; }' },
    ] },
{ id: 'above-the-mark', doHtml: () => clipped('bottom'), dontHtml: () => clipped('top'), kit: [
      { ref: 'src/components/tooltip.js:112', pattern: 'const flip = prefersBelow' },
      { ref: 'src/components/tooltip.js:118', pattern: 'const left = Math.max(clip.left' },
    ] },
{ id: 'contents', doHtml: () => barsOpen('top', { room: 'gh-room gh-room--tall' }), dontHtml: () => barsOpen('top', {
      room: 'gh-room gh-room--tall',
      text: {
        label: 'Revenue, all entities, EUR, including pending settlements, October 2025',
        value: '€49,300',
        detail: '+5.3% on September and +12.1% on October 2024, with 3 invoices pending. '
          + 'Click the bar to open the transactions.',
      },
    }), kit: [{ ref: 'src/components/tooltip.js:132', pattern: 'el.textContent = t;' }] },
{ id: 'on-touch', kit: [
      { ref: 'src/components/tooltip.js:216', pattern: 'function touching(doc, e)' },
      { ref: 'src/components/tooltip.js:333', pattern: "host.addEventListener('click'" },
    ] },
{ id: 'not-only-hover', kit: [{ ref: 'src/components/tooltip.js:316', pattern: "host.addEventListener('focusin'" }] }
]);
