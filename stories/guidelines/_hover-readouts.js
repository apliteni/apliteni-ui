// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { card } from '../../src/components/index.js';
import { tooltip } from '../../src/components/tooltip.js';
import { CHART_CSS, EXPENSES, REVENUE, bars, eur, pointOf, sparkline } from '../_chart.js';

export const TITLE = 'Hover readouts';

export const BLURB = 'Where a value shown on hover goes, what it says, what a tap does instead, and why it never moves the page.';

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

export const RULES = [
  {
    id: 'overlay',
    imperative: 'Show a hover value over the page, never in it.',
    doHtml: overlayDo,
    dontHtml: overlayDont,
    doCaption: 'The readout floats above the point it describes. The card is the height it was '
      + 'before the pointer arrived, and so is everything under it.',
    dontCaption: 'The same value written into the card as a line of its own. The card grows by that '
      + 'line the moment the pointer lands, the card under it drops, and the next point the reader '
      + 'aims at has moved.',
    why: 'A readout lives for as long as a pointer rests on a mark, which can be a fraction of a '
      + 'second, and a page that changes shape at pointer speed cannot be read. The finance portal '
      + 'shows both on one screen: its bar chart overlays its readout and nothing moves, while each '
      + 'KPI sparkline inserts one and pushes the whole page down. The value belongs in the readout, '
      + 'beside its mark — not in a row under the chart, and not in the card\'s headline figure, '
      + 'which says what the card is about and should not change under a passing pointer. This '
      + 'holds for every surface whose value is read by pointing at it: charts, sparklines, '
      + 'heatmaps, a truncated cell.',
    kit: [
      { ref: 'src/styles/tooltip.css:18', pattern: 'position: absolute;' },
      { ref: 'src/styles/tooltip.css:58', pattern: '.ui-tip.is-open { opacity: 1; visibility: visible; }' },
    ],
  },
  {
    id: 'above-the-mark',
    imperative: 'Open the readout above the mark, and below it only where above is clipped.',
    doHtml: () => clipped('bottom'),
    dontHtml: () => clipped('top'),
    doCaption: 'The tallest bar sits near the top of a region that hides its overflow, with less room '
      + 'above it than the readout needs. The readout opens below the bar\'s top edge instead, whole.',
    dontCaption: 'The same readout held above regardless. The region\'s edge takes the month and the '
      + 'value and leaves the comparison, the one line that means nothing on its own.',
    why: 'Above is the default because a pointer comes at a mark from underneath, so a readout '
      + 'above the mark covers neither the mark nor the pointer. Placing it is the kit\'s job rather '
      + 'than the page\'s: the wiring measures the viewport and every ancestor that clips, flips only '
      + 'when the preferred side is too tight and the other is roomier, and slides the readout along '
      + 'the mark\'s edge rather than off the screen.',
    kit: [
      { ref: 'src/components/tooltip.js:112', pattern: 'const flip = prefersBelow' },
      { ref: 'src/components/tooltip.js:118', pattern: 'const left = Math.max(clip.left' },
    ],
  },
  {
    id: 'contents',
    imperative: 'Name the point, give its value, and stop at one comparison.',
    doHtml: () => barsOpen('top', { room: 'gh-room gh-room--tall' }),
    dontHtml: () => barsOpen('top', {
      room: 'gh-room gh-room--tall',
      text: {
        label: 'Revenue, all entities, EUR, including pending settlements, October 2025',
        value: '€49,300',
        detail: '+5.3% on September and +12.1% on October 2024, with 3 invoices pending. '
          + 'Click the bar to open the transactions.',
      },
    }),
    doCaption: 'Which point, its value, one comparison: three short lines, read in the time a pointer '
      + 'rests on a bar.',
    dontCaption: 'Everything the page knows about the point. It wraps, it covers the bars beside it, '
      + 'and it asks for a click on something that disappears when the pointer moves toward it.',
    why: 'A readout takes no pointer and goes when the pointer leaves its mark, so nothing in it can '
      + 'be pressed; a control the reader needs belongs on the page. Format the value the way the '
      + 'page formats it elsewhere — the same currency, the same precision — so the readout and the '
      + 'figure beside the chart never disagree.',
    kit: [{ ref: 'src/components/tooltip.js:132', pattern: 'el.textContent = t;' }],
  },
  {
    id: 'on-touch',
    imperative: 'On a touch screen, open the readout with a tap and close it with the next one.',
    why: 'A finger rests nowhere. It arrives already pressing and it is gone the moment it lifts, so '
      + 'a readout that waits for hover flashes under the tap and is never read. The tap is the '
      + 'switch instead: one tap on a mark opens its readout, a tap on another mark moves it there, '
      + 'and a tap on the same mark — or anywhere else on the page — closes it. The tap that opens '
      + 'the readout is spent opening it and does not reach the mark\'s own click, so a chart that '
      + 'drills down on a bar does not drill down on the tap that was asking what the bar says; the '
      + 'tap that closes the readout does, which puts the drill-down one tap further away and is the '
      + 'one thing a reader has to learn. The kit decides which pointer is in play rather than which '
      + 'device it is on, so a laptop with a touch screen hovers under its mouse and taps under a '
      + 'finger, and a key hands the readout back to focus.',
    kit: [
      { ref: 'src/components/tooltip.js:200', pattern: 'function touching(doc, e)' },
      { ref: 'src/components/tooltip.js:290', pattern: "host.addEventListener('click'" },
    ],
  },
  {
    id: 'not-only-hover',
    imperative: 'Never make hover the only way to a value.',
    why: 'A pointer is one of three ways to reach a chart, and the only one a readout is built '
      + 'around. The kit\'s wiring opens the readout on focus and on a tap as well, and lets Escape '
      + 'dismiss it, but it adds no tab stop — a year of daily points would be 365 of them. So the '
      + 'figure a card leads with, and a table or a labelled summary of the series, carry what '
      + 'matters without pointing at anything. Whether a chart\'s marks should take focus at all is '
      + 'the question still open on #282.',
    kit: [{ ref: 'src/components/tooltip.js:277', pattern: "host.addEventListener('focusin'" }],
  },
];
