// Every label and title the kit sets, on one board. The guideline these obey:
// docs/foundations.md#labels-and-titles
import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { Pill } from '../../react/src/primitives/Pill';
import { Snippet } from '../../react/src/Snippet';
import { SidebarNav } from '../../react/src/SidebarNav';
import { Dropdown } from '../../react/src/Dropdown';
import { Footer } from '../../react/src/Footer';
import { VersionSwitcher } from '../../react/src/TopBar';
import { useTableFilters } from '../_table-filters';

const meta: Meta = { title: 'Foundations/Labels and titles', parameters: { layout: 'fullscreen' } };
export default meta;

const Caption = ({ children }: { children: string }) =>
  <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted)', margin: '0 0 10px' }}>{children}</p>;

const Cell = ({ text, style, children }: { text: string; style?: CSSProperties; children: ReactNode }) =>
  <div style={{ minWidth: 0, ...style }}><Caption>{text}</Caption>{children}</div>;

const Kpi = ({ label, value, chip }: { label: string; value: string; chip: ReactNode }) => <div>
  <div className="ui-eyebrow">{label}</div>
  <div style={{ font: '600 var(--text-xl)/1.2 var(--font-display)', color: 'var(--strong)', margin: '6px 0 8px' }}>{value}</div>
  {chip}
</div>;

type Month = { month: string; income: string; expenses: string; status: string; tone: string };
const MONTHS: Month[] = [
  { month: 'August 2026', income: '€412,300', expenses: '€338,120', status: 'Reconciled', tone: 'success' },
  { month: 'July 2026', income: '€398,040', expenses: '€351,900', status: 'Pending', tone: 'pending' },
  { month: 'June 2026', income: '€377,610', expenses: '€362,450', status: 'Overdue', tone: 'danger' },
];
const Ledger = ({ rows }: { rows: Month[] }) => <table className="ui-table">
  <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Status</th></tr></thead>
  <tbody>
    {rows.map((row) => <tr key={row.month}><td className="ui-table__title">{row.month}</td><td>{row.income}</td><td>{row.expenses}</td><td><Badge variant={row.tone}>{row.status}</Badge></td></tr>)}
    {!rows.length && <tr><td colSpan={4}>No months match</td></tr>}
  </tbody>
</table>;

// The shape of the portal page #268 and #269 were reported from: a page title,
// the window it covers, a band of labelled figures and a titled card.
export const InAPage: StoryObj = {
  render: function Render() {
    // Every table has its filter bar directly above it. why: guidelines/dense-tables.md
    const { bar, shown } = useTableFilters(MONTHS, {
      search: 'Search months', placeholder: 'Month', label: 'Cashflow filters', text: (row) => row.month,
      facets: [{ id: 'status', label: 'Status', any: 'Any status', of: (row) => row.status }],
    });
    return <div className="ui-app__main" style={{ ['--ui-app-main' as string]: '1040px' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      <h1>Overview</h1>
      <div className="ui-eyebrow">12 months to 31 Aug 2026</div>
    </div>
    <div className="ui-app__body">
      <div className="ui-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'var(--space-6)' }}>
          <Kpi label="Income" value="€4.81M" chip={<Badge variant="success">+12% on last year</Badge>} />
          <Kpi label="Expenses" value="€3.95M" chip={<Badge variant="neutral">+4% on last year</Badge>} />
          <Kpi label="Net" value="€862K" chip={<Badge variant="success">+41% on last year</Badge>} />
          <Kpi label="Invoices waiting" value="14" chip={<Badge variant="danger">3 overdue</Badge>} />
        </div>
      </div>
      <Card>{bar}</Card>
      <Card title="Monthly cashflow" sub="Income and expenses by month, all entities."><Ledger rows={shown} /></Card>
    </div>
  </div>;
  },
};

export const EveryLabel: StoryObj = {
  render: () => <div style={{ padding: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'var(--space-8) var(--space-6)', maxWidth: 1120 }}>
    <Cell text="A label above a card title"><div className="ui-card"><div className="ui-eyebrow">Last 30 days</div>
      <h2 className="ui-card__title">Top contractors</h2><div className="ui-card__sub">Paid out, by counterparty.</div></div></Cell>
    <Cell text="Status badges and pills"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Badge variant="live">Live</Badge><Badge variant="soon">Soon</Badge><Badge variant="success">Paid</Badge><Badge variant="pending">Pending</Badge>
      <Badge variant="danger">Failed</Badge><Badge variant="archive">Archived</Badge><Pill variant="live">Connected</Pill><Pill>Two agents</Pill></div></Cell>
    <Cell text="Navigation section captions"><SidebarNav active="ov" aria-label="Board navigation" sections={[
      { label: 'Company', items: [{ id: 'ov', icon: 'layers', label: 'Overview', href: '#' }, { id: 'tx', icon: 'compass', label: 'Transactions', href: '#' }] },
      { label: 'My space', items: [{ id: 'me', icon: 'user', label: 'My invoices', href: '#' }, { id: 'st', icon: 'gear', label: 'Settings', href: '#' }] },
    ]} /></Cell>
    <Cell text="Menu group captions and row badges" style={{ minHeight: 280 }}><Dropdown open label="version:" value="phoenix.2026.002" ariaLabel="Version" sections={[
      { label: 'Current', items: [{ label: 'phoenix.2026.002', description: 'Product units, animated deck', badge: 'Live', selected: true }] },
      { label: 'Earlier', items: [{ label: 'phoenix.2026.001', description: 'Phoenix, 2026-05-17', badge: 'Archive' }] },
    ]} /></Cell>
    <Cell text="Version badges" style={{ minHeight: 220 }}><div className="topbar" style={{ position: 'static', background: 'none' }}>
      <VersionSwitcher defaultOpen value="phoenix.2026.002" versions={[
        { value: 'phoenix.2026.002', label: 'phoenix.2026.002', badge: 'live' },
        { value: 'phoenix.2026.001', label: 'phoenix.2026.001', badge: 'archive' },
      ]} />
    </div></Cell>
    <Cell text="A code sample’s label"><Snippet label="Shell" code="npm install @apliteni/apliteni-ui" /></Cell>
    <Cell text="Footer column titles" style={{ gridColumn: '1/-1' }}><Footer variant="full" columns={[
      { title: 'Product', links: [{ label: 'Deck' }, { label: 'Text' }] },
      { title: 'Company', links: [{ label: 'About' }, { label: 'Careers' }] },
    ]} /></Cell>
  </div>,
};
