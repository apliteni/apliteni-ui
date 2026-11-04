// The shape of a rule and the gates that walk this page: docs/components.md
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, noop } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { StatBand } from '../../react/src/primitives/StatBand';
import { FilterBar } from '../../react/src/FilterBar';
import { Segmented } from '../../react/src/Segmented';
import { RestingFilters } from '../_table-filters';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { LEDGER, SPEC_CSS } from './_dashboards-and-reports.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { payoutHref } from '../apps/_finance-nav.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { cashflowStats, money, PERIODS as SPANS } from '../apps/_finance-data.js';
import { KpiBand, type KpiFigure } from '../_kpi';

const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same nets: the ledger is the one
// LEDGER export that stories/dashboard-report-refs.test.js holds in step.
const Stage = ({ children }: { children: ReactNode }) => <div className="gd-stage">{children}</div>;
type Tone = 'success' | 'pending' | 'danger';

// Cashflow for the year, from the dashboard's own call, so a specimen cannot drift
// from the showcase it draws. Two figures, because a specimen cell is under 28rem.
const Cashflow = ({ id }: { id: string }) => <KpiBand id={id} format={money} stats={(cashflowStats('1Y', true) as KpiFigure[]).slice(0, 2)
  .map(figure => ({ ...figure, delta: figure.delta && { ...figure.delta, basis: 'vs prior year' } }))} />;

// `fees` swaps Status for the fees, so the report shows how each net is made.
const LedgerTable = ({ fees = false }: { fees?: boolean }) => <table className="ui-table ui-table--dense ui-table--hover">
  <thead><tr><th>Reference</th>{fees && <th className="ui-table__num">Fees (EUR)</th>}<th className="ui-table__num">Net (EUR)</th>{!fees && <th>Status</th>}</tr></thead>
  <tbody>{(LEDGER as string[][]).map(([ref, , fee, net, tone, label]) => <tr key={ref}>
    <td>{ref}</td>{fees && <td className="ui-table__num">{fee}</td>}<td className="ui-table__num ui-table__num--strong">{net}</td>
    {!fees && <td><Badge variant={tone}>{label}</Badge></td>}
  </tr>)}</tbody>
</table>;

// The rows that need a decision, which is all a dashboard carries of a ledger.
// `onward={false}` removes the row links, so the Don't offers no way in. Its filter
// bar sits directly above it, as on the dashboard.
const EXCEPTIONS: [string, string, Tone, string][] = [
  ['PO-1166', '14,496.62', 'danger', 'Failed'],
  ['PO-1164', '14,082.69', 'pending', 'In transit'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched'],
];
const Attention = ({ onward = true }: { onward?: boolean }) => <><RestingFilters search="Search exceptions" placeholder="Reference"
  label="Exception filters" chips={[{ id: 'status', label: 'Status', any: 'Any status', values: ['Failed', 'In transit', 'Unmatched'] }]} />
<Card title="Needs a decision">
  <table className="ui-table ui-table--dense ui-table--hover">
    <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th></tr></thead>
    <tbody>{EXCEPTIONS.map(([ref, net, tone, label]) => <tr key={ref}>
      <td><span className="ui-table__pair">{onward ? <a href={payoutHref(ref)}>{ref}</a> : ref}<Badge variant={tone}>{label}</Badge></span></td>
      <td className="ui-table__num ui-table__num--strong">{net}</td>
    </tr>)}</tbody>
  </table>
</Card></>;
// The whole ledger, under the bar every table has.
const LedgerFilters = () => <RestingFilters search="Search payouts" placeholder="Reference" label="Payout filters"
  chips={[{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid', 'In transit', 'Failed'] }]} />;

// Offered, not applied: the rows below are every payout, so no chip may read as
// a value a reader would then look for in the table.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'In transit', value: 'In transit' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];

// A laptop screen, scaled to a cell: the frame's bottom edge is the fold.
const Screen = ({ children }: { children: ReactNode }) => <div className="gd-screen">
  <Segmented label="Period" options={(SPANS as string[]).map(p => ({ label: p, value: p }))} value="1Y" onChange={noop} />
  {children}
</div>;

const specimens = [
  { id: 'fast-glance',
    do: () => <Screen><Cashflow id="gd-fold-do" /><Attention /></Screen> },
  { id: 'figures-and-exceptions',
    do: () => <Stage><Cashflow id="gd-glance-do" /><Attention /></Stage>,
    dont: () => <Stage><LedgerFilters /><Card title="Payouts"><LedgerTable /><p className="ui-card__sub">{'Fees rose with volume this quarter, and the one\n        unmatched transfer from June is still with the bank.'}</p></Card></Stage> },
  { id: 'link-to-the-report', do: () => <Stage><Attention /></Stage>, dont: () => <Stage><Attention onward={false} /></Stage> },
  { id: 'report-depth',
    do: () => <Stage><LedgerFilters /><Card title="Payouts"><LedgerTable fees /></Card></Stage> },
  // The export is at the far end of the row, where the report puts it: it acts on
  // the ledger, and the filters narrow it. The Don't carries the period in its
  // title, which is what "fixed by whoever built the page" looks like on a screen.
  { id: 'report-offers',
    do: () => <Stage><div className="ui-toolbar ui-toolbar--split">
      <FilterBar filters={FILTERS} label="Payout filters" clearLabel="Clear all" onRemove={noop} onClear={noop} onChange={noop} />
      <Button icon="download" iconOnly>Export rows</Button>
    </div><Card title="Payouts"><LedgerTable /></Card></Stage>,
    dont: () => <Stage><Card title="Payouts, 2026"><LedgerTable /></Card></Stage> },
  // "Download PDF" does not start with "Export", so export-at-the-row-end does not count this row.
  { id: 'export-icon',
    do: () => <Stage><div className="ui-toolbar ui-toolbar--split">
      <FilterBar filters={FILTERS} label="Report filters" clearLabel="Clear all" onRemove={noop} onClear={noop} onChange={noop} />
      <Button icon="download" iconOnly>Download PDF</Button>
    </div></Stage> },
];

const meta: Meta = { title: 'Guidelines/Dashboards and reports', parameters: { layout: 'fullscreen' } };
export default meta;

export const DashboardsAndReports: StoryObj = {
  name: 'Dashboards and reports',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
