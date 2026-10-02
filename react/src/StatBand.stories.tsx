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

// A share of a larger figure takes the row a change would have taken, so a band
// where only some figures carry one still keeps its changes on one line.
export const Caption: StoryObj = {
  render: () => (
    <StatBand
      basis={BASIS}
      stats={[
        { label: 'Gross margin', value: '36.1%', caption: 'of income' },
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Operating margin', value: '12.4%', caption: 'of income', delta: { value: '+1.2 pts', tone: 'good' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
      ]}
    />
  ),
};

// The row is one line: a caption past the figure's width is clipped, and a change
// measured against its own target still says so after the change. Where a tile is
// too narrow to show that comparison whole, the change carries it in a `tooltip`,
// which the kit Tooltip opens on hover, on keyboard focus and on touch — so the
// words a sighted reader cannot finish reading are a press away rather than gone.
export const CaptionLength: StoryObj = {
  render: () => (
    <StatBand
      basis={BASIS}
      stats={[
        { label: 'Gross margin', value: '36.1%', caption: 'of income', delta: { value: '+1.2 pts', tone: 'good' } },
        { label: 'Net margin', value: '8.0%', caption: 'March revenue in EUR, excluding refunds', delta: { value: '+0.4 pts', tone: 'good' } },
        {
          label: 'Operating margin',
          value: '12.4%',
          caption: 'of income',
          delta: { value: '+1.2 pts', tone: 'good', basis: 'against the 40% target', tooltip: '+1.2 points against the 40% target' },
        },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
      ]}
    />
  ),
};

// A figure with nothing to compare shows its value and stops, keeping only the
// caption the caller gave it. Saying "no earlier figure" in words beside figures
// that do carry a change is noise — Artur, 2026-10-02.
export const NothingToCompare: StoryObj = {
  render: () => (
    <StatBand
      basis={BASIS}
      stats={[
        STATS[1],
        { label: 'New entity', value: '€ 12,040', delta: { value: null } },
        { label: 'Refunds', value: '€ 0', caption: 'of income', delta: { value: null } },
      ]}
    />
  ),
};
