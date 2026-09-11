import type { Meta, StoryObj } from '@storybook/react';
import { StatBand, type StatBandProps } from './primitives/StatBand';

const meta: Meta = { title: 'React/Stat band' };
export default meta;

const STATS: StatBandProps['stats'] = [
  { label: 'Income', value: <a href="#income">€ 6,459,401</a>, delta: { value: '+47.1%' } },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: 'good' } },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
];
const BASIS = 'Change against the previous 12 months';

// A figure's value can be a link to its drill-down, which the HTML factory cannot take.
export const Band: StoryObj = { render: () => <StatBand stats={STATS} basis={BASIS} /> };
export const Tiles: StoryObj = { render: () => <StatBand stats={STATS} basis={BASIS} variant="tiles" /> };
export const Open: StoryObj = { render: () => <StatBand stats={STATS} basis={BASIS} variant="open" /> };
export const NoEarlierFigure: StoryObj = {
  render: () => (
    <StatBand basis={BASIS} stats={[STATS[1], { label: 'New entity', value: '€ 12,040', delta: { value: null } }]} />
  ),
};
