import type { Meta, StoryObj } from '@storybook/react';
import { StatBand, type StatBandProps } from './primitives/StatBand';

const meta: Meta = { title: 'React/Stat band' };
export default meta;

const STATS: StatBandProps['stats'] = [
  { label: 'Income', value: <a className="ui-focusable" href="#income">€ 6,459,401</a>, delta: { value: '+47.1%', tone: 'good' } },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%' } },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
];
const BASIS = 'Change against the previous 12 months';

// A figure's value can be a link to its drill-down, which the HTML factory cannot take.
// Tiles is the default, so it is the story that names no variant.
export const Tiles: StoryObj = { render: () => <StatBand stats={STATS} basis={BASIS} /> };
export const Band: StoryObj = { render: () => <StatBand stats={STATS} basis={BASIS} variant="band" /> };
export const Open: StoryObj = { render: () => <StatBand stats={STATS} basis={BASIS} variant="open" /> };

// A share of a larger figure: neither a change nor a trend, so it takes neither
// slot. The third figure carries both a caption and a change.
export const Caption: StoryObj = {
  render: () => (
    <StatBand
      stats={[
        { label: 'Gross margin', value: '36.1%', caption: 'of income' },
        { label: 'Cost of sales', value: '€ 4,127,880', caption: '63.9% of income' },
        { label: 'Operating margin', value: '12.4%', caption: 'of income', delta: { value: '+1.2 pts', tone: 'good', basis: 'against last year' } },
      ]}
    />
  ),
};

export const NoEarlierFigure: StoryObj = {
  render: () => (
    <StatBand basis={BASIS} stats={[STATS[1], { label: 'New entity', value: '€ 12,040', delta: { value: null } }]} />
  ),
};
