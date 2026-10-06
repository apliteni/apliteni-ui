import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Chart, type ChartPeriod, type ChartSeries } from './Chart';
import { Card } from './primitives/Card';
import { StatBand } from './primitives/StatBand';

const meta: Meta<typeof Chart> = { title: 'React/Chart', component: Chart, id: 'react-chart' };
export default meta;

/* Twelve months of made-up money for a made-up company. November is still
   running, which is the unfinished period every story here carries. */
const MONTHS = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025',
  'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
const INCOME = [38240, 40110, 39420, 42810, 41030, 44620, 46210, 45140, 47930, 46820, 49300, 31870];
const SPEND = [29870, 30410, 31220, 30980, 32140, 31760, 32900, 33410, 32780, 33950, 34120, 22640];
const NET = INCOME.map((value, i) => value - SPEND[i]);

const periods: ChartPeriod[] = MONTHS.map((label, i) => (i === MONTHS.length - 1
  ? { label, estimated: true, note: 'November is still running' }
  : { label }));

/* One hue at two weights for the two measured series, and the second hue for the
   one derived from them. Income and spend are the same money read two ways, so
   they read apart by weight and by which side of zero they stand on. Good and
   bad would have said which of the two is the better news, which no month
   decides.
   Round 27 of #543 picked these two hues; the drawing around them was redrawn
   against eight references on round 37, and the hues were kept. */
const series: ChartSeries[] = [
  { id: 'income', name: 'Income', values: INCOME, shape: 'bars', tone: 'accent' },
  { id: 'spend', name: 'Spend', values: SPEND, shape: 'bars-below', tone: 'accent-soft' },
  { id: 'net', name: 'Net', values: NET, shape: 'line', tone: 'info' },
];

/** The eleven months that have closed, for the stories that leave November out. */
const closed: ChartPeriod[] = MONTHS.slice(0, 11).map((label) => ({ label }));

const eur = (value: number) => `${value < 0 ? '−' : ''}€${Math.abs(value).toLocaleString('en-US')}`;
const eurAxis = (value: number) => (value === 0 ? '€0'
  : `${value < 0 ? '−' : ''}€${Math.round(Math.abs(value) / 1000)}k`);

export const Months: StoryObj = {
  render: () => (
    <Card title="Income and spend" sub="Last 12 months">
      <Chart title="Income and spend by month, last 12 months, with net"
        periods={periods} series={series} format={eur} formatAxis={eurAxis} />
    </Card>
  ),
};

/** The same months with no unfinished period: every column solid, so the hollow
 *  one beside them in every other story reads as the exception it is. The story's
 *  id is kept from the round that named it after the fade it no longer draws. */
export const Solid: StoryObj = {
  render: () => (
    <Card title="Income and spend" sub="Closed months only">
      <Chart title="Income and spend by closed month, with net"
        periods={closed}
        series={series.map((s) => ({ ...s, values: s.values.slice(0, 11) }))}
        format={eur} formatAxis={eurAxis} />
    </Card>
  ),
};

export const Bridge: StoryObj = {
  render: () => (
    <Card title="Cash, third quarter" sub="Opening to closing">
      <Chart variant="bridge" title="Cash from opening to closing, third quarter"
        format={eur} formatAxis={eurAxis}
        steps={[
          { label: 'Opening', short: 'Opening', value: 120000 },
          { label: 'Subscriptions', short: 'Subs', value: 42600 },
          { label: 'Services', value: 11400 },
          { label: 'Refunds', value: -6800 },
          { label: 'Payroll', value: -58200 },
          { label: 'Hosting', value: -9100, estimated: true, note: 'September is not invoiced yet' },
          { label: 'Closing', short: 'Closing', kind: 'total' },
        ]} />
    </Card>
  ),
};

/** The phone width the acceptance names. The axis stays put, the plot scrolls,
 *  and the side that still hides months is faded. */
export const Narrow: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 'var(--panel-sm)' }}>
      <Card title="Income and spend" sub="Last 12 months">
        <Chart title="Income and spend by month, last 12 months, with net"
          periods={periods} series={series} format={eur} formatAxis={eurAxis} />
      </Card>
    </div>
  ),
};

/** The picked month is drawn — a band behind its column and its label at weight
 *  — and said, through the chart's own live region. A line under the card
 *  repeating it told a reader nothing the chart had not already told them. */
export const Selectable: StoryObj = {
  render: function SelectableStory() {
    const [month, setMonth] = useState<number | null>(null);
    return (
      <Card title="Income and spend" sub="Pick a month to drill into">
        <Chart title="Income and spend by month, last 12 months, with net"
          periods={periods} series={series} format={eur} formatAxis={eurAxis}
          selectable selected={month} onSelect={setMonth} />
      </Card>
    );
  },
};

/** One series at text size beside the figure it belongs to, with no axis — the
 *  shape the stat band's `trend` slot was left open for. The band is not wrapped
 *  in a card: its tiles are cards already (guidelines/the-page.md, stacking).
 *  `basis` is where guidelines/stat-bands.md puts what a change is measured
 *  against: once, outside every figure, pointed at by both changes. */
export const Sparkline: StoryObj = {
  render: () => (
    <StatBand label="Revenue" basis="Change on September" stats={[{
      label: 'Income', value: eur(INCOME[10]),
      delta: { value: '+5.3%', tone: 'good' },
      trend: <Chart variant="spark" title="Income, last 11 closed months"
        periods={closed}
        series={[{ id: 'income', name: 'Income', values: INCOME.slice(0, 11), shape: 'line', tone: 'accent' }]}
        format={eur} />,
    }, {
      label: 'Spend', value: eur(SPEND[10]),
      delta: { value: '+0.5%', tone: 'bad' },
      trend: <Chart variant="spark" title="Spend, last 11 closed months"
        periods={closed}
        series={[{ id: 'spend', name: 'Spend', values: SPEND.slice(0, 11), shape: 'line', tone: 'accent-soft' }]}
        format={eur} />,
    }]} />
  ),
};
