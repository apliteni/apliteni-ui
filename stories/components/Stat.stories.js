import { statBand, STAT_VARIANTS } from '../../src/components/stat.js';
import { pad } from '../_gallery.js';
import { sparkline } from '../lib/sparkline.js';

// The four figures the finance portal's Company Overview shows, so every
// specimen on this page is the band that was rejected in #267, redrawn.
const SERIES = {
  income: [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640],
  cost: [380, 372, 395, 401, 388, 410, 402, 415, 398, 420, 411, 425],
  net: [32, 83, 35, 97, 132, 95, 158, 133, 192, 190, 176, 215],
  unclassified: [42, 38, 35, 31, 28, 30, 24, 19, 17, 14, 12, 9],
};

// The four figures carry the four verdicts a caller can give, so this page is
// the colour rule as well as the layouts. Income and Cost both rose and are
// coloured oppositely; Unclassified fell and is the other green; Net cashflow
// is income less cost, so the two figures beside it have already given its
// news and it is left undeclared.
const FIGURES = [
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' }, trend: sparkline(SERIES.income, 'Income, last 12 months') },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' }, trend: sparkline(SERIES.cost, 'Cost, last 12 months') },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%' }, trend: sparkline(SERIES.net, 'Net cashflow, last 12 months') },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' }, trend: sparkline(SERIES.unclassified, 'Unclassified, last 12 months') },
];
const BASIS = 'Change against the previous 12 months';

export default {
  title: 'Components/Stat band',
  parameters: { layout: 'fullscreen' },
  render: (a) => pad(statBand({ ...a, stats: FIGURES })),
  argTypes: {
    variant: { control: 'inline-radio', options: STAT_VARIANTS },
    basis: { control: 'text' },
  },
  args: { variant: 'tiles', basis: BASIS },
};

export const Playground = {};

const heading = (title, note) =>
  `<div style="margin:34px 0 12px">
     <div style="font:600 15.5px/1.3 var(--font-sans);color:var(--strong)">${title}</div>
     <div style="font:400 13px/1.5 var(--font-sans);color:var(--text);max-width:70ch">${note}</div>
   </div>`;

// The three layouts side by side, over the same four figures, so a difference
// between two pictures is a difference between two layouts. The order is the
// order they were put in front of Artur in #267; B is the one he chose.
export const Gallery = {
  render: () => pad(
    heading('The colours, before the layouts',
      'Income and Cost both rose, and they are not the same news: the rise in income is green and the '
      + 'rise in cost is red. Unclassified fell, and fewer unclassified rows is good news, so that fall '
      + 'is green too. Net cashflow carries no colour, because nobody declared one. Colour answers '
      + '&ldquo;is this good?&rdquo;, never &ldquo;which way did it go?&rdquo; &mdash; the arrow answers that.')
    + heading('A · Band', 'One card. The figures are divided by space, not by rules.')
    + statBand({ variant: 'band', stats: FIGURES, basis: BASIS, id: 'gallery-band' })
    + heading('B · Tiles — the default', 'One card per figure. Each figure can be read, moved or linked on its own.')
    + statBand({ variant: 'tiles', stats: FIGURES, basis: BASIS, id: 'gallery-tiles' })
    + heading('C · Open', 'No surface. A rule over each figure, and a larger value, because the numbers are the structure.')
    + statBand({ variant: 'open', stats: FIGURES, basis: BASIS, id: 'gallery-open' }),
  ),
};

// What a band has to say when a figure has no earlier value, when its change is
// measured against something the others are not, and when it carries no trend.
export const States = {
  render: () => pad(
    heading('Nothing to compare',
      'A figure with no earlier value shows its value and stops &mdash; never +0%, and never words saying '
      + 'there is nothing to say.')
    + statBand({
      id: 'states-none',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'New entity', value: '€ 12,040', caption: 'since 1 March', delta: { value: null } },
        { label: 'Refunds', value: '€ 0', delta: { value: null } },
      ],
    })
    + heading('Its own comparison', 'One figure measured against a target rather than the previous period says so beside the change.')
    + statBand({
      id: 'states-own',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Margin', value: '36.1%', delta: { value: '−3.9 pts', tone: 'bad', basis: 'against the 40% target' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
      ],
    })
    + heading('Context that is not a change',
      'A caption takes the row a change would have taken, and earns it only by giving a unit, a period or a '
      + 'limit the figure cannot. Gross margin names its own denominator, so it takes none.')
    + statBand({
      id: 'states-caption',
      basis: BASIS,
      stats: [
        { label: 'Gross margin', value: '36.1%', delta: { value: '+1.2 pts', tone: 'good' } },
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Refunds', value: '2.4%', caption: 'of income', delta: { value: '+0.3 pts', tone: 'bad' } },
        { label: 'Unclassified', value: '1.3%', caption: 'of income' },
      ],
    })
    + heading('How long a caption can be',
      'A row holding a change is one line, so a caption that shares it stays short enough to read whole. '
      + 'Wrapping would drop that change below the ones beside it, and clipping would take the words the '
      + 'caption is there for.')
    + statBand({
      id: 'states-caption-length',
      basis: BASIS,
      stats: [
        { label: 'Gross margin', value: '36.1%', delta: { value: '+1.2 pts', tone: 'good' } },
        { label: 'Unclassified', value: '1.3%', caption: 'of income', delta: { value: '−0.4 pts', tone: 'good' } },
        { label: 'Refunds', value: '2.4%', caption: 'of income, net of disputes', delta: { value: '+0.3 pts', tone: 'bad' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
      ],
    })
    + heading('A caption standing alone keeps every word',
      'With no change beside it, a caption has no arrow and no number to hold together, so it takes a second '
      + 'line rather than lose a word. A caption this long belongs only in a row it does not share.')
    + statBand({
      id: 'states-caption-wraps',
      basis: BASIS,
      stats: [
        { label: 'Refunds', value: '2.4%', caption: 'of income for the quarter, excluding disputed chargebacks' },
        { label: 'Unclassified', value: '1.3%', caption: 'of income, excluding disputed chargebacks', delta: { value: null } },
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
      ],
    })
    + heading('Measured against something else',
      'A caption never costs a reader the comparison: a change measured against its own target still says so '
      + 'after the change.')
    + statBand({
      id: 'states-caption-basis',
      stats: [
        { label: 'Refunds', value: '2.4%', caption: 'of income', delta: { value: '+0.3 pts', tone: 'bad', basis: 'against plan' } },
        { label: 'Net margin', value: '8.0%', delta: { value: '−4.0 pts', tone: 'bad', basis: 'against the 12% target' } },
      ],
    })
    + heading('Figures only', 'No change and no trend: a label and a value is a complete band.')
    + statBand({
      id: 'states-bare',
      stats: [
        { label: 'Money in', value: '759,988 €' },
        { label: 'Money out', value: '3,048,559 €' },
        { label: 'Net result', value: '−2,288,571 €' },
      ],
    }),
  ),
};

// The band stacks from the width of its own box. Four figures fold two by two,
// three go straight to one column.
export const Narrow = {
  render: () => pad(
    heading('In a 640px column', 'Four tiles, two rows of two.')
    + `<div style="max-width:640px">${statBand({ stats: FIGURES, basis: BASIS, id: 'narrow-640' })}</div>`
    + heading('In a 360px column', 'One tile per row.')
    + `<div style="max-width:360px">${statBand({ stats: FIGURES, basis: BASIS, id: 'narrow-360' })}</div>`,
  ),
};
