// The finance dashboard showcase in React, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FinanceShell } from './_finance-shell';
import { Segmented } from '../../react/src/Segmented';
import { StatBand } from '../../react/src/primitives/StatBand';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story module
import { cashflowStats, PERIODS, periodBasis } from './_finance-data.js';
// @ts-expect-error -- plain JS story module
import { payoutHref } from './_finance-nav.js';

const meta: Meta = { title: 'Showcases/Finance dashboard', id: 'apps-finance-dashboard', parameters: { layout: 'fullscreen' } };
export default meta;

const PERIOD_BASIS = 'fd-period-basis';
type Figure = { label: string; value: string; delta?: { value: string; tone?: 'good' | 'bad' }; trend?: string };

// Which row, what is wrong with it, how much, and only then when it arrives: the
// order of the decision, not of the ledger. The status rides in the reference's
// cell, because a third column did not fit at 320. why: guidelines/dashboards-and-reports.md, #505
const EXCEPTIONS: [string, string, 'danger' | 'pending', string, string][] = [
  ['PO-1166', '14,496.62', 'danger', 'Failed', '2025-08-05'],
  ['PO-1164', '14,082.69', 'pending', 'In transit', '2026-02-20'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched', '2025-07-15'],
];

const Dashboard = () => {
  const [period, setPeriod] = useState('1Y');
  return <FinanceShell active="dashboard" title="Dashboard">
    <div className="ui-toolbar">
      <Segmented label="Period" options={(PERIODS as string[]).map(p => ({ label: p, value: p }))} value={period} onChange={setPeriod} />
      <p className="ui-sr" id={PERIOD_BASIS} data-period-basis="">{periodBasis(period)}</p>
    </div>
    <StatBand id="fd-cashflow" basisId={PERIOD_BASIS} stats={(cashflowStats(period, true) as Figure[])
      .map(figure => ({ ...figure, trend: figure.trend && <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: figure.trend }} /> }))} />
    {/* Each reference opens its payout row in the report. */}
    <Card title="Needs a decision">
      <table className="ui-table ui-table--dense ui-table--hover">
        <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th><th>Arrival</th></tr></thead>
        <tbody>{EXCEPTIONS.map(([ref, net, tone, label, arrival]) => <tr key={ref}>
          <td><span className="ui-table__pair"><a href={payoutHref(ref)}>{ref}</a><Badge variant={tone}>{label}</Badge></span></td>
          <td className="ui-table__num ui-table__num--strong">{net}</td>
          <td>{arrival}</td>
        </tr>)}</tbody>
      </table>
    </Card>
  </FinanceShell>;
};

export const Default: StoryObj = { render: () => <Dashboard /> };
