// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, noop } from '../_guideline';
import { Card } from '../../react/src/primitives/Card';
import { FilterBar } from '../../react/src/FilterBar';
import { Segmented } from '../../react/src/Segmented';
import { SearchField } from '../../react/src/SearchField';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_spacing.js';

const content = await loadGuideline('spacing.md', new URL('../../guidelines/spacing.md', import.meta.url));

const FILTERS = [
  { id: 'status', label: 'Status', value: 'Open', items: [{ label: 'Open', value: 'Open' }, { label: 'Paid', value: 'Paid' }] },
  { id: 'customer', label: 'Customer', value: 'Aster Systems', items: [{ label: 'Aster Systems', value: 'Aster Systems' }] },
  { id: 'currency', label: 'Currency', value: 'EUR', items: [{ label: 'EUR', value: 'EUR' }] },
];
const Chips = ({ n = 2 }: { n?: number }) => <FilterBar filters={FILTERS.slice(0, n)} onRemove={noop} onClear={noop} onChange={noop} />;
const Strip = () => <Segmented options={['All', 'Open', 'Paid'].map(label => ({ label, value: label }))} value="Open"
  onChange={noop} appearance="underline" label="Invoice view" />;
const Table = () => <div className="ui-table-scroll" role="region" aria-label="Invoices" tabIndex={0}>
  <table className="ui-table ui-table--compact">
    <thead><tr><th scope="col">Invoice</th><th scope="col">Due</th><th scope="col" className="ui-table__num">Amount EUR</th></tr></thead>
    <tbody>{[['INV-1042', '3 Nov', '4,180.00'], ['INV-1039', '28 Oct', '960.50']].map(([a, b, c]) =>
      <tr key={a}><td>{a}</td><td>{b}</td><td className="ui-table__num">{c}</td></tr>)}</tbody>
  </table>
</div>;
// Every table has a search field in the row above it.
const Search = () => <SearchField ariaLabel="Search invoices" placeholder="Invoice" />;
const Row = ({ n = 1 }: { n?: number }) => <div className="gl-sp__row"><Strip /><Search /><Chips n={n} /></div>;
const Reminders = () => <Card title="Reminders"><p>A reminder goes out 3 days before an invoice falls due.</p></Card>;
const LateFees = () => <div className="gl-sp__next"><Card title="Late fees"><p>A late fee of 2% applies after 14 days.</p></Card></div>;
const Stage = ({ mod = '', children }: { mod?: string; children: ReactNode }) =>
  <div className="gl-stage"><div className={`gl-sp ${mod}`}>{children}</div></div>;

// Layout glue only: each specimen places kit parts at the gap its rule names.
const specimens = [
  { id: 'two-gaps', do: () => <Stage><Row /><Table /><div className="gl-sp__next"><Reminders /></div></Stage>,
    dont: () => <Stage mod="gl-sp--third"><Row /><Table /><div className="gl-sp__next"><Reminders /></div><LateFees /></Stage> },
  { id: 'two-gaps-phone', do: () => <Stage mod="gl-sp--phone"><Search /><Chips n={3} /><Table /></Stage>,
    dont: () => <Stage mod="gl-sp--phone gl-sp--phone-dont"><Search /><Chips n={3} /><Table /></Stage> },
  { id: 'title', do: () => <Stage><Reminders /><LateFees /></Stage>,
    dont: () => <Stage><Reminders /><div className="gl-sp__next"><h3>Late fees</h3></div>
      <div className="gl-sp__next"><Card><p>A late fee of 2% applies after 14 days.</p></Card></div></Stage> },
  { id: 'text-edge', do: () => <Stage><h3>Invoices</h3><Row /><Table /></Stage>,
    dont: () => <Stage><h3>Invoices</h3><div className="gl-sp__indent"><Row /><Table /></div></Stage> },
];

const meta: Meta = { title: 'Guidelines/Spacing', parameters: { layout: 'fullscreen' } };
export default meta;

export const Spacing: StoryObj = {
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
