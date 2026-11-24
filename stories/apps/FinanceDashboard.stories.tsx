// The dashboard showcase in React, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FinanceShell } from './_finance-shell';
import { Segmented } from '../../react/src/Segmented';
import { StatBand } from '../../react/src/primitives/StatBand';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { Chart } from '../../react/src/Chart';
import { useTableFilters } from '../_table-filters';
// @ts-expect-error -- plain JS story module
import { cashflowStats, PERIODS, periodBasis } from './_finance-data.js';
// @ts-expect-error -- plain JS story module
import { salesHref } from './_finance-nav.js';

const meta: Meta = { title: 'Showcases/Dashboard', id: 'apps-finance-dashboard', parameters: { layout: 'fullscreen' } };
export default meta;

const PERIOD_BASIS = 'fd-period-basis';
type Figure = { label: string; value: string; delta?: { value: string; tone?: 'good' | 'bad' }; trend?: string };

// Which row, what is wrong with it, how much, and only then when it arrives: the
// order of the decision, not of the ledger. The status rides in the reference's
// cell, because a third column did not fit at 320. why: guidelines/dashboards-and-reports.md, #505
const EXCEPTIONS: [string, string, 'danger' | 'pending', string, string][] = [
  ['SAL-1046', '14,496.62', 'danger', 'Failed', '2025-08-05'],
  ['SAL-1044', '14,082.69', 'pending', 'Pending', '2026-02-20'],
  ['SAL-1039', '2,180.00', 'danger', 'Refunded', '2025-07-15'],
];

// Fabricated spend split four ways over 12 months. The chart stays on those
// months; the period control changes the figures above it, not the chart.
// why: #850 round 42, the owner's approved option A
const CATEGORY_MONTHS = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025',
  'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
const CATEGORY_PERIODS = CATEGORY_MONTHS.map((label) => ({ label }));
const CATEGORY_PAYROLL = [17200, 17200, 17600, 17600, 18100, 18100, 18400, 18400, 18400, 18900, 18900, 19400];
const CATEGORY_HOSTING = [5420, 5560, 5710, 5830, 6020, 6110, 6240, 6380, 6450, 6610, 6720, 6880];
const CATEGORY_MARKETING = [4890, 5190, 5370, 4980, 5420, 4920, 5640, 5980, 5310, 5770, 5810, 5900];
const CATEGORY_OFFICE = CATEGORY_PAYROLL.map((_, i) => 34880 - CATEGORY_PAYROLL[i] - CATEGORY_HOSTING[i] - CATEGORY_MARKETING[i]);
const categoryEur = (value: number) => `€${value.toLocaleString('en-US')}`;
const categoryEurAxis = (value: number) => (value === 0 ? '€0' : `€${Math.round(value / 1000)}k`);
const CATEGORIES = [
  { id: 'payroll', name: 'Payroll', values: CATEGORY_PAYROLL, tone: 'accent' as const },
  { id: 'hosting', name: 'Hosting', values: CATEGORY_HOSTING, tone: 'accent-soft' as const },
  { id: 'marketing', name: 'Marketing', values: CATEGORY_MARKETING, tone: 'info' as const },
  { id: 'office', name: 'Office', values: CATEGORY_OFFICE, tone: 'warn' as const },
];

const Dashboard = () => {
  const [period, setPeriod] = useState('1Y');
  const { bar, shown } = useTableFilters(EXCEPTIONS, {
    search: 'Search exceptions', placeholder: 'Reference', label: 'Exception filters', text: ([ref]) => ref, width: '22ch', size: 'sm',
    facets: [{ id: 'status', label: 'Status', any: 'Any status', of: ([, , , label]) => label }],
  });
  return <FinanceShell active="dashboard" title="Dashboard">
    <div className="ui-toolbar">
      <Segmented label="Period" options={(PERIODS as string[]).map(p => ({ label: p, value: p }))} value={period} onChange={setPeriod} />
      <p className="ui-sr" id={PERIOD_BASIS} data-period-basis="">{periodBasis(period)}</p>
    </div>
    <StatBand id="fd-cashflow" variant="open" basisId={PERIOD_BASIS} stats={(cashflowStats(period, true) as Figure[])
      .map(figure => ({ ...figure, trend: figure.trend && <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: figure.trend }} /> }))} />
    <Card title="Spend by category">
      <Chart variant="stacked" look="columns" legend title="Spend by category and month, last 12 months"
        periods={CATEGORY_PERIODS} series={CATEGORIES} format={categoryEur} formatAxis={categoryEurAxis} />
    </Card>
    {/* The filter bar groups with its table, so it sits inside the card: one small
        step above the table it filters. The heading is sr-only, because the page
        title already says what the card is, and the sr-only title keeps the table's
        accessible name. The card itself keeps the section step below the figures.
        why: guidelines/dense-tables.md, guidelines/dashboards-and-reports.md */}
    <Card title={<span className="ui-sr">Needs a decision</span>}>
      {bar}
      <table className="ui-table ui-table--dense ui-table--hover">
        <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th><th>Date</th></tr></thead>
        <tbody>{shown.map(([ref, net, tone, label, date]) => <tr key={ref}>
          <td><span className="ui-table__pair"><a href={salesHref(ref)}>{ref}</a><Badge variant={tone}>{label}</Badge></span></td>
          <td className="ui-table__num ui-table__num--strong">{net}</td>
          <td>{date}</td>
        </tr>)}
        {!shown.length && <tr><td colSpan={3}>No exceptions match</td></tr>}</tbody>
      </table>
    </Card>
  </FinanceShell>;
};

export const Default: StoryObj = { render: () => <Dashboard /> };
