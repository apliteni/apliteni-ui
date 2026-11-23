import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Chart, type ChartLookSeries, type ChartPeriod, type ChartSeries } from './Chart';
import type { ChartSlice } from './chart-looks';
import { Card } from './primitives/Card';
import { StatBand } from './primitives/StatBand';
import { SearchField } from './SearchField';

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
  ? { label, estimated: 'incomplete' }
  : { label }));

/* Two hues for the two measured series, and a third for the one derived from
   them. Income and spend are the same money read two ways, so they read apart
   by hue and by which side of zero they stand on. Good and
   bad would have said which of the two is the better news, which no month
   decides.
   Round 27 of #543 picked these two hues; the drawing around them was redrawn
   against eight references on round 37, and the hues were kept. #740 made them
   the chart's own fixed steps, so they no longer follow the product accent, and
   gave accent-soft a hue of its own. */
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
    <Card title="Income and spend">
      <Chart title="Income and spend by month, last 12 months, with net"
        periods={periods} series={series} format={eur} formatAxis={eurAxis} />
    </Card>
  ),
};

/** The same card after Table in the Chart and Table switch at the end of its
 *  title row (#736). The table takes the plot's place, and the switch keeps its own. */
export const AsTable: StoryObj = {
  ...Months,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Table' }));
    await expect(canvas.getByRole('table', { name: 'Income and spend by month, last 12 months, with net' })).toBeVisible();
  },
};

/** The final spark sits in a scroll frame. Its readout stays above the mark and
 * over the frame, so the table cannot cut it. */
export const SparkInScrollingTable: StoryObj = {
  render: () => {
    const [query, setQuery] = useState('');
    const accounts = Array.from({ length: 20 }, (_, i) => i + 1).filter((i) => `Account ${i}`.toLowerCase().includes(query.toLowerCase()));
    return <Card>
      <div className="ui-filter-bar"><SearchField ariaLabel="Filter accounts" value={query} onChange={(event) => setQuery(event.currentTarget.value)} /></div>
      <div className="ui-table-scroll" role="region" aria-label="Cash trends">
      <table className="ui-table ui-table--hover">
        <thead><tr><th scope="col">Account</th><th scope="col">Cash trend</th></tr></thead>
        <tbody>
          {accounts.map((i) => (
            <tr key={i}>
              <th scope="row">Account {i}</th>
              <td><Chart variant="spark" title={`Account ${i} cash trend`} periods={periods.slice(0, 2)}
                series={[{ id: 'cash', name: 'Cash', values: INCOME.slice(0, 2), shape: 'line' }]} format={eur} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole('region', { name: 'Cash trends' });
    region.scrollTop = region.scrollHeight;
    const chart = canvas.getByRole('img', { name: /Account 20 cash trend/ });
    await userEvent.hover(chart.querySelector('.ui-chart__hit')!);
    await expect(canvas.getByRole('tooltip')).toBeVisible();
  },
};

/** The same months with no unfinished period, so no readout names a state.
 *  The story's id is kept from the round that named it after the fade it no
 *  longer draws. */
export const Solid: StoryObj = {
  render: () => (
    <Card title="Income and spend">
      <Chart title="Income and spend by closed month, with net"
        periods={closed}
        series={series.map((s) => ({ ...s, values: s.values.slice(0, 11) }))}
        format={eur} formatAxis={eurAxis} />
    </Card>
  ),
};

/* A year and two years of made-up revenue and cash for the forecast stories
   (#841): the last month to close is October, November is still running, and
   the months after it are projected. */
const YEAR_AHEAD = ['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026',
  'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027'];
const notFinal = (label: string, i: number, count: number): ChartPeriod => ({
  label,
  compare: false,
  ...(i === count - 4 ? { estimated: 'incomplete' as const }
    : i > count - 4 ? { estimated: 'projected' as const } : {}),
});
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TWO_YEARS = Array.from({ length: 24 }, (_, i) => `${MONTH_NAMES[(i + 2) % 12]} ${2025 + Math.floor((i + 2) / 12)}`);
const CASH_IN = [31200, 33850, 30410, 35120, 36240, 29980, 37310, 38860, 40120, 43570, 36640, 35290,
  41830, 44910, 43060, 47720, 45530, 40370, 49640, 52190, 31400, 54500, 56000, 51500];

/** Look A, with a value on each bar and no comparison in the readout (#841).
 *  One solid line stands before November, the running month, and "Not final"
 *  stands over it and the three projected months. Every bar stays solid in the
 *  series tone; the readout and the table say "Incomplete" or "Projected". */
export const Forecast: StoryObj = {
  render: () => (
    <Card title="Revenue">
      <Chart title="Revenue by month, with three projected months"
        periods={YEAR_AHEAD.map((label, i) => notFinal(label, i, YEAR_AHEAD.length))}
        series={[{ id: 'revenue', name: 'Revenue', tone: 'accent',
          values: [44120, 47310, 45240, 50390, 48070, 42650, 52280, 55010, 39180, 57500, 59600, 54000] }]}
        format={eur} formatAxis={eurAxis} values />
    </Card>
  ),
};

/** Twenty-four months in a plot 154px wide (#841). Every bar is drawn and
 *  nothing scrolls. A value prints where it fits at the 12px text size, so here
 *  none does, and every other label steps back from November. */
export const TwentyFourMonths: StoryObj = {
  render: () => (
    // The card's padding and the value axis take 86px, so the plot is 154px.
    <div style={{ width: 240 }}>
      <Card title="Cash in">
        <Chart title="Cash in by month, two years, with three projected months" height={154}
          periods={TWO_YEARS.map((label, i) => notFinal(label, i, TWO_YEARS.length))}
          series={[{ id: 'in', name: 'Cash in', tone: 'good', values: CASH_IN }]}
          format={eur} formatAxis={eurAxis} values />
      </Card>
    </div>
  ),
};

/** The same two measures standing side by side on the zero line instead of
 *  mirrored across it, which is the shape the references draw. #491 asks for
 *  the mirror, so the mirror is what Months draws; this is the alternative,
 *  rendered from the same component and the same numbers. */
export const SideBySide: StoryObj = {
  render: () => (
    <Card title="Income and spend">
      <Chart title="Income and spend by month, last 12 months, with net"
        periods={periods} format={eur} formatAxis={eurAxis}
        series={[
          { id: 'income', name: 'Income', values: INCOME, shape: 'bars', tone: 'accent' },
          { id: 'spend', name: 'Spend', values: SPEND, shape: 'bars', tone: 'accent-soft' },
          { id: 'net', name: 'Net', values: NET, shape: 'line', tone: 'info' },
        ]} />
    </Card>
  ),
};

/** Every tone the chart offers, one series each, in the order ChartTone lists
 *  them. Each bar fades from a tint at its base on zero to the full tone at its
 *  data end, and a bar under zero fades the other way. Seven tones need a key,
 *  so this story asks for the legend, and its keys stay solid in the full tone.
 *  Made-up seat changes for a made-up company. */
export const Palette: StoryObj = {
  render: () => (
    <Card title="Seats gained and lost">
      <Chart title="Seats gained and lost by plan, each quarter of 2025"
        periods={['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'].map((label) => ({ label }))}
        format={(n) => `${n < 0 ? '−' : '+'}${Math.abs(n)}`}
        series={([
          ['starter', 'Starter', 'accent', [42, 38, 51, 47]],
          ['team', 'Team', 'accent-soft', [31, 36, 29, 40]],
          ['business', 'Business', 'good', [24, 27, 33, 30]],
          ['legacy', 'Legacy', 'bad', [-18, -22, -15, -26]],
          ['trial', 'Trial', 'warn', [16, -9, 21, 12]],
          ['partner', 'Partner', 'info', [11, 14, -6, 18]],
          ['education', 'Education', 'neutral', [8, 10, 9, -4]],
        ] as const).map(([id, name, tone, values]) => ({ id, name, tone, values, shape: 'bars' }))}
        legend />
    </Card>
  ),
};

/** A rise, a fall and a total read apart by tone, so the bridge asks for the legend. */
export const Bridge: StoryObj = {
  render: () => (
    <Card title="Cash">
      <Chart variant="bridge" title="Cash from opening to closing, third quarter"
        format={eur} formatAxis={eurAxis} legend
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

/* The narrow-card fixtures from #863: a four-step bridge and a six-bar months
   chart, each with a 20-character full name per bar and a distinct short name
   under it, so every bar keeps its label at a phone width. A short name wraps
   at a word break where it does not fit its column. All names and figures are
   fabricated. */
const NARROW_REGIONS: ChartPeriod[] = [
  { label: 'North region revenue', short: 'N rev', compare: false },
  { label: 'South region revenue', short: 'S rev', compare: false },
  { label: 'North region refunds', short: 'N ref', compare: false },
  { label: 'South region refunds', short: 'S ref', compare: false },
  { label: 'North region balance', short: 'N bal', compare: false },
  { label: 'South region balance', short: 'S bal', compare: false },
];
const NARROW_NET = [48200, 39100, -6400, -7100, 41800, 32000];

export const ShortNames: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 'var(--panel-sm)' }}><div className="ui-card-stack">
      <Card title="Cash">
        <Chart variant="bridge" title="Cash from opening to closing, narrow card"
          format={eur} formatAxis={eurAxis} legend
          steps={[
            { label: 'Opening cash balance', short: 'Open', value: 120000 },
            { label: 'Customer cash inflow', short: 'In', value: 42600 },
            { label: 'Supplier cash spends', short: 'Out', value: -21600 },
            { label: 'Closing cash balance', short: 'Close', kind: 'total' },
          ]} />
      </Card>
      <Card title="Net by region">
        <Chart title="Net by region, narrow card"
          periods={NARROW_REGIONS} format={eur} formatAxis={eurAxis}
          series={[{ id: 'net', name: 'Net', values: NARROW_NET, tone: 'info' }]} />
      </Card>
    </div></div>
  ),
};

/** The phone width the acceptance names. The plot takes the card's width, so
 *  every month is drawn and nothing scrolls; the labels step where they do not fit. */
export const Narrow: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 'var(--panel-sm)' }}>
      <Card title="Income and spend">
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
 *  against: once, outside every figure, pointed at by both changes. The band
 *  takes the look stories' card width: on the centred canvas it had no width to
 *  size its tiles from, and a phone's sparklines ran past the edge. */
export const Sparkline: StoryObj = {
  render: () => (
    <div style={{ width: 'min(var(--panel-lg), calc(100vw - 2rem))' }}>
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
    </div>
  ),
};

/* The looks draw a closed year, as the #742 pictures do: November has ended. */
const year: ChartPeriod[] = MONTHS.map((label) => ({ label }));
const YEAR_INCOME = [...INCOME.slice(0, 11), 50120];
const YEAR_SPEND = [...SPEND.slice(0, 11), 34880];

/* Spend split four ways, for the line, area, stacked and donut looks. Office is
   what the other three leave, so the four add up to YEAR_SPEND in every month. */
const PAYROLL = [17200, 17200, 17600, 17600, 18100, 18100, 18400, 18400, 18400, 18900, 18900, 19400];
const HOSTING = [5420, 5560, 5710, 5830, 6020, 6110, 6240, 6380, 6450, 6610, 6720, 6880];
const MARKETING = [4890, 5190, 5370, 4980, 5420, 4920, 5640, 5980, 5310, 5770, 5810, 5900];
const OFFICE = YEAR_SPEND.map((value, i) => value - PAYROLL[i] - HOSTING[i] - MARKETING[i]);
const costs: ChartLookSeries[] = [
  { id: 'payroll', name: 'Payroll', values: PAYROLL, tone: 'accent' },
  { id: 'hosting', name: 'Hosting', values: HOSTING, tone: 'accent-soft' },
  { id: 'marketing', name: 'Marketing', values: MARKETING, tone: 'info' },
  { id: 'office', name: 'Office', values: OFFICE, tone: 'warn' },
];
/** October, the last closed month, as one whole. */
const october: ChartSlice[] = costs.map(({ id, name, tone, values }) => ({ id, name, tone, value: values[10] }));

/* The two measured series as plain lines, and their sum as one flat area. */
const flows: ChartLookSeries[] = [
  { id: 'income', name: 'Income', values: YEAR_INCOME, tone: 'accent' },
  { id: 'spend', name: 'Spend', values: YEAR_SPEND, tone: 'accent-soft' },
];
const spend: ChartLookSeries[] = [{ id: 'spend', name: 'Spend', values: YEAR_SPEND, tone: 'accent' }];

/* Income split three ways, for the curves look. Licences are what the other two
   leave, so the three add up to YEAR_INCOME. Services is lumpy and crosses
   Subscriptions, which is the shape a reader compares. */
const SUBSCRIPTIONS = [14200, 14650, 15100, 15480, 15920, 16310, 16840, 17220, 17650, 18110, 18540, 19020];
const SERVICES = [16800, 18900, 15200, 17400, 13900, 16200, 18700, 14300, 17100, 15600, 19200, 16900];
const LICENCES = YEAR_INCOME.map((value, i) => value - SUBSCRIPTIONS[i] - SERVICES[i]);
const channels: ChartLookSeries[] = [
  { id: 'subscriptions', name: 'Subscriptions', values: SUBSCRIPTIONS, tone: 'accent' },
  { id: 'services', name: 'Services', values: SERVICES, tone: 'accent-soft' },
  { id: 'licences', name: 'Licences', values: LICENCES, tone: 'info' },
];

/* Each look sits in one card width, so the looks compare side by side. The
   centred canvas has no width to take a percentage of, so a phone clamps to the
   viewport less the canvas's 1rem on each side. */
const lookCard = (title: string, chart: ReactNode) => (
  <div style={{ width: 'min(var(--panel-lg), calc(100vw - 2rem))' }}>
    <Card title={title}>{chart}</Card>
  </div>
);

export const LineThin: StoryObj = {
  render: () => lookCard('Income and spend', <Chart variant="line" look="thin" legend
    title="Income and spend by month, last 12 months" periods={year} series={flows}
    format={eur} formatAxis={eurAxis} />),
};
export const LinePoints: StoryObj = {
  render: () => lookCard('Income and spend', <Chart variant="line" look="points" legend
    title="Income and spend by month, last 12 months" periods={year} series={flows}
    format={eur} formatAxis={eurAxis} />),
};
export const LineLabels: StoryObj = {
  render: () => lookCard('Income and spend', <Chart variant="line" look="labels"
    title="Income and spend by month, last 12 months" periods={year} series={flows}
    format={eur} formatAxis={eurAxis} />),
};

export const AreaFlat: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="area" look="flat"
    title="Spend by month, last 12 months" periods={year} series={spend}
    format={eur} formatAxis={eurAxis} />),
};
export const AreaCurves: StoryObj = {
  render: () => lookCard('Income by channel', <Chart variant="area" look="curves" legend
    title="Income by channel and month, last 12 months" periods={year} series={channels}
    format={eur} formatAxis={eurAxis} />),
};
export const AreaStacked: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="area" look="stacked"
    title="Spend by category and month, last 12 months" periods={year} series={costs}
    format={eur} formatAxis={eurAxis} />),
};
export const AreaShare: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="area" look="share"
    title="Share of spend by category and month, last 12 months" periods={year} series={costs}
    format={eur} formatAxis={eurAxis} />),
};

export const StackedColumns: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="stacked" look="columns"
    title="Spend by category and month, last 12 months" periods={year} series={costs}
    format={eur} formatAxis={eurAxis} />),
};
export const StackedShare: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="stacked" look="share"
    title="Share of spend by category and month, last 12 months" periods={year} series={costs}
    format={eur} formatAxis={eurAxis} />),
};
export const StackedRows: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="stacked" look="rows"
    title="Spend by category and month, last 12 months" periods={year} series={costs}
    format={eur} formatAxis={eurAxis} />),
};

export const DonutThin: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="donut" look="thin"
    title="Spend by category, October 2025" slices={october} totalLabel="Total spend" format={eur} />),
};
export const DonutTable: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="donut" look="table"
    title="Spend by category, October 2025" slices={october} format={eur} />),
};
export const DonutLabels: StoryObj = {
  render: () => lookCard('Spend by category', <Chart variant="donut" look="labels"
    title="Spend by category, October 2025" slices={october} format={eur} />),
};
