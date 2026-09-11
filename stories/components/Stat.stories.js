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

const FIGURES = [
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' }, trend: sparkline(SERIES.income, 'Income, last 12 months') },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' }, trend: sparkline(SERIES.cost, 'Cost, last 12 months') },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: 'good' }, trend: sparkline(SERIES.net, 'Net cashflow, last 12 months') },
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
  args: { variant: 'band', basis: BASIS },
};

export const Playground = {};

const heading = (title, note) =>
  `<div style="margin:34px 0 12px">
     <div style="font:600 15.5px/1.3 var(--font-sans);color:var(--strong)">${title}</div>
     <div style="font:400 13px/1.5 var(--font-sans);color:var(--muted);max-width:70ch">${note}</div>
   </div>`;

// The three layouts side by side, over the same four figures, so a difference
// between two pictures is a difference between two layouts.
export const Gallery = {
  render: () => pad(
    heading('A · Band', 'One card. The figures are divided by space, not by rules, and the comparison is said once under them.')
    + statBand({ variant: 'band', stats: FIGURES, basis: BASIS, id: 'gallery-band' })
    + heading('B · Tiles', 'One card per figure. Each figure can be read, moved or linked on its own.')
    + statBand({ variant: 'tiles', stats: FIGURES, basis: BASIS, id: 'gallery-tiles' })
    + heading('C · Open', 'No surface. A rule over each figure, and a larger value, because the numbers are the structure.')
    + statBand({ variant: 'open', stats: FIGURES, basis: BASIS, id: 'gallery-open' }),
  ),
};

// What a band has to say when a figure has no earlier value, when its change is
// measured against something the others are not, and when it carries no trend.
export const States = {
  render: () => pad(
    heading('No earlier figure', 'A change against nothing is not +0% — the band says there is nothing to compare.')
    + statBand({
      id: 'states-none',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' } },
        { label: 'New entity', value: '€ 12,040', delta: { value: null, none: 'No earlier figure' } },
        { label: 'Refunds', value: '€ 0', delta: { value: '0.0%' } },
      ],
    })
    + heading('Its own comparison', 'One figure measured against a target rather than the previous period says so beside the change.')
    + statBand({
      id: 'states-own',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' } },
        { label: 'Margin', value: '36.1%', delta: { value: '−3.9 pts', tone: 'bad', basis: 'against the 40% target' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
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
    heading('In a 640px column', 'Four figures, two rows of two.')
    + `<div style="max-width:640px">${statBand({ stats: FIGURES, basis: BASIS, id: 'narrow-640' })}</div>`
    + heading('In a 360px column', 'One figure per row.')
    + `<div style="max-width:360px">${statBand({ stats: FIGURES, basis: BASIS, id: 'narrow-360' })}</div>`,
  ),
};
