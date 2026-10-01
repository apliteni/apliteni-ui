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

const series: ChartSeries[] = [
  { id: 'income', name: 'Income', values: INCOME, shape: 'bars', tone: 'good', fade: true },
  { id: 'spend', name: 'Spend', values: SPEND, shape: 'bars-below', tone: 'bad', fade: true },
  { id: 'net', name: 'Net', values: NET, shape: 'line' },
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

/** The same twelve months with no fade and no unfinished period: solid bars, so
 *  the hatch beside them in every other story reads as the exception. */
export const Solid: StoryObj = {
  render: () => (
    <Card title="Income and spend" sub="Closed months only">
      <Chart title="Income and spend by closed month, with net"
        periods={closed}
        series={series.map((s) => ({ ...s, values: s.values.slice(0, 11), fade: false }))}
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

export const Selectable: StoryObj = {
  render: function SelectableStory() {
    const [month, setMonth] = useState<number | null>(null);
    return (
      <Card title="Income and spend" sub="Pick a month to drill into">
        <Chart title="Income and spend by month, last 12 months, with net"
          periods={periods} series={series} format={eur} formatAxis={eurAxis}
          selectable selected={month} onSelect={setMonth} />
        <p>{month === null ? 'No month picked yet.' : `Picked ${periods[month].label}.`}</p>
      </Card>
    );
  },
};

/** One series at text size beside the figure it belongs to, with no axis — the
 *  shape the stat band's `trend` slot was left open for. The band is not wrapped
 *  in a card: its tiles are cards already (guidelines/the-page.md, stacking). */
export const Sparkline: StoryObj = {
  render: () => (
    <StatBand label="Revenue" basis="Compared with September, the last closed month" stats={[{
      label: 'Income', value: eur(INCOME[10]),
      delta: { value: '+5.3%', tone: 'good' },
      trend: <Chart variant="spark" title="Income, last 11 closed months"
        periods={closed} series={[{ id: 'income', name: 'Income', values: INCOME.slice(0, 11), shape: 'line' }]}
        format={eur} />,
    }, {
      label: 'Spend', value: eur(SPEND[10]),
      delta: { value: '+0.5%', tone: 'bad' },
      trend: <Chart variant="spark" title="Spend, last 11 closed months"
        periods={closed} series={[{ id: 'spend', name: 'Spend', values: SPEND.slice(0, 11), shape: 'line' }]}
        format={eur} />,
    }]} />
  ),
};
