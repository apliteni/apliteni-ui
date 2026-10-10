import type { Meta, StoryObj } from '@storybook/react';
import { StatBand, type StatBandProps } from './primitives/StatBand';

const meta: Meta = { title: 'React/Stat band' };
export default meta;

const STATS: StatBandProps['stats'] = [
  { label: 'Income', value: <a href="#income">€ 6,459,401</a>, delta: { value: '+47.1%', tone: 'good' } },
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

// A caption earns the row a change would have taken only by giving a unit, a
// period or a limit the figure cannot: a rate could be of income or of orders.
// Gross margin names its own denominator, so it takes none.
export const Caption: StoryObj = {
  render: () => (
    <StatBand
      basis={BASIS}
      stats={[
        { label: 'Gross margin', value: '36.1%', delta: { value: '+1.2 pts', tone: 'good' } },
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Refunds', value: '2.4%', caption: 'of income', delta: { value: '+0.3 pts', tone: 'bad' } },
        { label: 'Unclassified', value: '1.3%', caption: 'of income' },
      ]}
    />
  ),
};

// The row is one line, so words past the figure's width are clipped there. A
// caption is kept short enough to read; a change's own comparison can outrun a
// narrow tile, so it carries a `tooltip` the kit Tooltip opens on hover, on
// keyboard focus and on touch.
export const CaptionLength: StoryObj = {
  render: () => (
    <StatBand
      basis={BASIS}
      stats={[
        { label: 'Gross margin', value: '36.1%', delta: { value: '+1.2 pts', tone: 'good' } },
        { label: 'Refunds', value: '2.4%', caption: 'of income, net of disputes', delta: { value: '+0.3 pts', tone: 'bad' } },
        {
          label: 'Unclassified',
          value: '1.3%',
          caption: 'of income',
          delta: { value: '−0.7 pts', tone: 'good', basis: 'against the 2% target', tooltip: '−0.7 points against the 2% target' },
        },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
      ]}
    />
  ),
};

// A figure with nothing to compare shows its value and stops: Artur marked the
// row that said "No earlier figure" with "Noise?" on 2026-10-02, and beside
// figures that do carry a change that sentence earns no room. Why there is
// nothing to compare is the caller's to say, in a caption, or to leave unsaid.
export const NothingToCompare: StoryObj = {
  render: () => (
    <StatBand
      basis={BASIS}
      stats={[
        STATS[1],
        { label: 'New entity', value: '€ 12,040', caption: 'since 1 March', delta: { value: null } },
        { label: 'Refunds', value: '€ 0', delta: { value: null } },
      ]}
    />
  ),
};
