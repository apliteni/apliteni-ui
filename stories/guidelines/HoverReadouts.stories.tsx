// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { FrameStrip, GuidelinePage, OpenReadout } from '../_guideline';
import { Card } from '../../react/src/primitives/Card';
import { Chart, type ChartPeriod } from '../../react/src/Chart';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_hover-readouts.js';

const content = await loadGuideline('hover-readouts.md', new URL('../../guidelines/hover-readouts.md', import.meta.url));

// Twelve months of made-up revenue for a made-up company.
const MONTHS = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025',
  'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
const REVENUE = [38240, 40110, 39420, 42810, 41030, 44620, 46210, 45140, 47930, 46820, 49300, 48210];
const EXPENSES = [29870, 30410, 31220, 30980, 32140, 31760, 32900, 33410, 32780, 33950, 34120, 31870];
const eur = (n: number) => `${n < 0 ? '−' : ''}€${Math.abs(n).toLocaleString('en-US')}`;
const PERIODS: ChartPeriod[] = MONTHS.map(label => ({ label }));
const SERIES = [{ id: 'revenue', name: 'Revenue', values: REVENUE }];

// Every readout below is the Chart's own, opened on October, the tallest bar but
// one. The page moves no readout: the Chart places each one itself.
const HOT = 'revenue-10';
const Months = ({ periods = PERIODS, name = 'Revenue', height }: { periods?: ChartPeriod[]; name?: string; height?: number }) =>
  <Chart title="Revenue by month, last 12 months" periods={periods} series={[{ ...SERIES[0], name }]} format={eur}
    height={height} table={false} />;
const Spark = () => <Chart variant="spark" title="Revenue, last 12 months" periods={PERIODS} series={SERIES} format={eur} />;

// The KPI card from the finance portal's overview, and the card under it: the
// one that moves when a readout is written into the first.
const Kpis = ({ chart }: { chart: ReactNode }) => <div className="gh-stack">
  <Card title="Revenue"><p className="gh-figure">{eur(REVENUE[REVENUE.length - 1])}</p>{chart}</Card>
  <Card title="Expenses"><p className="gh-figure">{eur(EXPENSES[EXPENSES.length - 1])}</p></Card>
</div>;

// The Don't asks for more than one comparison and for an action, in a name and a
// note the Chart prints whole.
const CROWDED = PERIODS.map((period, i) => i === 10 ? { ...period, estimated: true,
  note: '+5.3% on Sep, +12.1% on Oct 2024, 3 invoices pending. Click to open.' } : period);

// A year of made-up daily revenue: 365 points, none of them reachable but by pointing.
const DAILY = Array.from({ length: 365 }, (_, d) => Math.round(1300 + 220 * Math.sin(d / 9) + d * 1.5));
const DAYS: ChartPeriod[] = DAILY.map((_, d) => ({ label: `Day ${d + 1}` }));

// A tap opens the readout: two frames, a tap on May and then on August.
const Tapped = ({ mark }: { mark?: string }) => {
  const chart = <Months height={120} />;
  return mark ? <OpenReadout mark={mark}>{chart}</OpenReadout> : chart;
};

const specimens = [
  { id: 'overlay',
    do: () => <Kpis chart={<OpenReadout mark={HOT}><Spark /></OpenReadout>} />,
    dont: () => <Kpis chart={<><Spark /><p className="gh-inline">{`Oct 2025: ${eur(REVENUE[10])}, +5.3% on Sep`}</p></>} /> },
  // A region that hides its overflow, with less room above the tallest bar than a readout needs.
  { id: 'above-the-mark',
    do: () => <div className="gh-clip"><OpenReadout mark={HOT}><Months /></OpenReadout></div>,
    dont: () => <div className="gh-clip"><OpenReadout mark={HOT} above><Months /></OpenReadout></div> },
  { id: 'contents',
    do: () => <OpenReadout mark={HOT}><Months /></OpenReadout>,
    dont: () => <OpenReadout mark={HOT}><Months name="Revenue, all entities, EUR, with pending settlements" periods={CROWDED} /></OpenReadout> },
  { id: 'on-touch',
    do: () => <FrameStrip frames={[{ step: 'Tap a bar', picture: <Tapped mark="revenue-4" /> },
      { step: 'Tap another bar', picture: <Tapped mark="revenue-7" /> }]} />,
    dont: () => <FrameStrip frames={[{ step: 'Tap a bar', picture: <Tapped /> }]} /> },
  // The ring is on the chart, not on a bar: the Chart is one tab stop, and its
  // table switch sits in the card's title row.
  { id: 'not-only-hover',
    do: () => <Card title="Revenue"><p className="gh-figure">{eur(REVENUE[REVENUE.length - 1])}</p>
      <div className="gl-focus"><OpenReadout mark={HOT}>
        <Chart title="Revenue by month, last 12 months" periods={PERIODS} series={SERIES} format={eur} />
      </OpenReadout></div></Card>,
    dont: () => <Card title="Revenue">
      <Chart variant="spark" title="Revenue by day, last 365 days" periods={DAYS} series={[{ ...SERIES[0], values: DAILY }]} format={eur} />
    </Card> },
];

const meta: Meta = { title: 'Guidelines/Hover readouts', parameters: { layout: 'fullscreen' } };
export default meta;

export const HoverReadouts: StoryObj = {
  name: 'Hover readouts',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
