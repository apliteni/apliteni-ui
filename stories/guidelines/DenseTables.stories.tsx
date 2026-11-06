// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
import { RestingFilters } from '../_table-filters';
import { DataTable } from '../../react/src/DataTable';
import { Badge } from '../../react/src/primitives/Badge';
import { SkeletonTable } from '../../react/src/Loading';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_dense-tables.js';

const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));

const PAYOUTS = [['1162', '1,240.00'], ['1161', '860.00'], ['1160', '2,100.00']];

// One table, twice: the pair is the width and nothing else. Dense, because the base
// recipe leaves its last header flush with the table edge while its values keep a
// right inset. Short references keep the two halves far apart at phone width.
const Payouts = ({ stretch = false }: { stretch?: boolean }) =>
  <div className={`gdt-stage ui-card ui-card--pad-sm${stretch ? '' : ' ui-card--fit'}`}>
    <table className={`ui-table ui-table--dense ui-table--hover${stretch ? ' gdt-stretch' : ''}`} aria-label="Payouts">
      <thead><tr><th>Reference</th><th className="ui-table__num">Amount<span className="ui-value__unit">EUR</span></th></tr></thead>
      <tbody>{PAYOUTS.map(([reference, amount]) =>
        <tr key={reference}><td>{reference}</td><td className="ui-table__num">{amount}</td></tr>)}</tbody>
    </table>
  </div>;

// The first page of a long result: the pager's count says the table holds far more
// rows than the three it shows. Pagination: "Use the server count". The status
// column is the one the bar's chip filters, and it gives the pager room for one row.
const PAYOUT_COLUMNS = [
  { key: 'name' as const, label: 'Reference' },
  { key: 'status' as const, label: 'Status', render: (row: { status: string }) => <Badge variant="success">{row.status}</Badge> },
  { key: 'amount' as const, label: <>Amount<span className="ui-value__unit">EUR</span></>, num: true },
];
const LongPayouts = ({ pagerLabel }: { pagerLabel: string }) =>
  <div className="gdt-stage ui-card ui-card--pad-sm ui-card--fit">
    <DataTable columns={PAYOUT_COLUMNS} rows={PAYOUTS.map(([name, amount]) => ({ name, status: 'Paid', amount }))}
      dense selectable={false} scrollLabel="Payouts" pagerLabel={pagerLabel}
      page={1} pageSize={PAYOUTS.length} total={1162} onPageChange={() => {}} />
  </div>;

// The same card, with and without the row that narrows it. Every other specimen
// keeps the row, because a long table has one.
const STATUS = [{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid'] }];
const Filtered = ({ bar = true, stretch = false, long }: { bar?: boolean; stretch?: boolean; long?: string }) => <Framed bar={bar}>
  {long ? <LongPayouts pagerLabel={long} /> : <Payouts stretch={stretch} />}
</Framed>;
const Framed = ({ bar = true, note, children }: { bar?: boolean; note?: string; children: ReactNode }) => <div className="gdt-stage gdt-filtered">
  {bar && <RestingFilters search="Search payouts" placeholder="Reference" label="Payout filters" chips={STATUS} />}
  {children}
  {note && <div className="gl-cursor">{note}</div>}
</div>;

const Card = ({ className = '', children }: { className?: string; children: ReactNode }) =>
  <div className={`gdt-stage ui-card ui-card--pad-sm ui-card--fit ${className}`}>{children}</div>;

// A row held in its hover fill, and the grey stripe the kit no longer draws.
const PAYEES = [['1162', 'Northwind Studio', '1,240.00'], ['1161', 'Bluebell Supply', '860.00'],
  ['1160', 'Harbor and Pine', '2,100.00'], ['1159', 'Ridge Ceramics', '415.00']];
const Surface = ({ zebra = false }: { zebra?: boolean }) => <Card className={zebra ? 'gdt-zebra' : 'gdt-held'}>
  <table className="ui-table ui-table--dense ui-table--hover" aria-label="Payouts">
    <thead><tr><th>Reference</th><th>Payee</th><th className="ui-table__num">Amount<span className="ui-value__unit">EUR</span></th></tr></thead>
    <tbody>{PAYEES.map(([reference, payee, amount]) =>
      <tr key={reference} className={!zebra && reference === '1161' ? 'gdt-hovering' : undefined}>
        <td>{reference}</td><td>{payee}</td><td className="ui-table__num">{amount}</td></tr>)}</tbody>
  </table>
</Card>;

// The same rows at the small text rank, and shrunk one rank below it.
const Density = ({ shrunk = false }: { shrunk?: boolean }) => <Card className={shrunk ? 'gdt-shrunk' : ''}>
  <table className="ui-table ui-table--compact ui-table--hover" aria-label="Payouts">
    <thead><tr><th>Reference</th><th>Payee</th><th className="ui-table__num">Amount<span className="ui-value__unit">EUR</span></th></tr></thead>
    <tbody>{PAYEES.map(([reference, payee, amount]) =>
      <tr key={reference}><td>{reference}</td><td>{payee}</td><td className="ui-table__num">{amount}</td></tr>)}</tbody>
  </table>
</Card>;

// The kit's own sort, on numbers and on the formatted strings: the strings sort by
// their first character, so 860.00 leads 12,100.00.
type Amount = { name: string; payee: string; amount: number; text: string };
const AMOUNTS: Amount[] = [['1162', 'Northwind Studio', 1240], ['1161', 'Bluebell Supply', 860],
  ['1160', 'Harbor and Pine', 12100], ['1159', 'Ridge Ceramics', 2100]].map(([name, payee, amount]) =>
  ({ name: String(name), payee: String(payee), amount: Number(amount), text: Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 }) }));
const Numbers = ({ strings = false }: { strings?: boolean }) => <Card>
  <DataTable<Amount> dense pager={false} caption="Payouts" rows={AMOUNTS} columns={[
    { key: 'name', label: 'Reference' }, { key: 'payee', label: 'Payee' },
    strings
      ? { key: 'text', label: 'Amount (EUR)', sortable: true }
      : { key: 'amount', label: <>Amount<span className="ui-value__unit">EUR</span></>, num: true, sortable: true, render: (row) => row.text },
  ]} />
</Card>;

// A signed change against a named month, and a missing one said in words.
const CHANGES = [['Northwind Studio', '1,240.00', '+12.4%', 'success'], ['Bluebell Supply', '860.00', '−3.1%', 'danger'],
  ['Harbor and Pine', '2,100.00', '', '']];
const Delta = ({ bare = false }: { bare?: boolean }) => <Card>
  <table className="ui-table ui-table--dense ui-table--hover" aria-label="Payouts">
    <thead><tr><th>Payee</th><th className="ui-table__num">Amount<span className="ui-value__unit">EUR</span></th>
      <th className="ui-table__num">{bare ? 'Change' : 'Change against May'}</th></tr></thead>
    <tbody>{CHANGES.map(([payee, amount, change, tone]) =>
      <tr key={payee}><td>{payee}</td><td className="ui-table__num">{amount}</td><td className="ui-table__num">
        {change
          ? <span className={`ui-delta ui-delta--${tone}`}>{bare ? change.slice(1) : change}</span>
          : bare ? <span className="ui-delta">0.0%</span> : 'No May payout'}
      </td></tr>)}</tbody>
  </table>
</Card>;

// Units in body ink with the words written out, and units faded with one left to guess.
const HOLDS = [['1162', '1,240.00', '3'], ['1161', '860.00', '5'], ['1160', '2,100.00', '2']];
const Units = ({ muted = false }: { muted?: boolean }) => <Card className={muted ? 'gdt-muted' : ''}>
  <table className="ui-table ui-table--dense ui-table--hover" aria-label="Payouts">
    <thead><tr><th>Reference</th>
      <th className="ui-table__num">Amount{!muted && <span className="ui-value__unit">EUR</span>}</th>
      <th className="ui-table__num">Hold{!muted && <span className="ui-value__unit">business days</span>}</th></tr></thead>
    <tbody>{HOLDS.map(([reference, amount, hold]) =>
      <tr key={reference}><td>{reference}</td>
        <td className="ui-table__num">{amount}{muted && <span className="ui-value__unit">EUR</span>}</td>
        <td className="ui-table__num">{hold}{muted && <span className="ui-value__unit">BD</span>}</td></tr>)}</tbody>
  </table>
</Card>;

// Twelve months: the frame scrolls to its end with the payee pinned, or eight months go
// with nothing to say so.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
type Year = { name: string } & Record<string, string>;
const YEAR: Year[] = [['Northwind Studio', 11], ['Bluebell Supply', 7], ['Harbor and Pine', 19]].map(([name, seed]) =>
  ({ name: String(name), ...Object.fromEntries(MONTHS.map((month, i) => [month, `${(Number(seed) * 97 + i * 131) % 2400 + 300}.00`])) }));
const toEnd = (frame: HTMLDivElement | null) => {
  const scroll = frame?.querySelector<HTMLElement>('.ui-table-scroll');
  if (scroll) scroll.scrollLeft = scroll.scrollWidth;
};
const Overflow = ({ dropped = false }: { dropped?: boolean }) => <div className="gdt-stage ui-card ui-card--pad-sm" ref={dropped ? undefined : toEnd}>
  <DataTable<Year> dense pager={false} caption="Payouts by month" rows={YEAR}
    stickyHeader={!dropped} pinnedIdentity={!dropped} scrollLabel={dropped ? undefined : 'Payouts by month'} columns={[
      { key: 'name', label: 'Payee' },
      ...(dropped ? ['Jan', 'Feb', 'Dec'] : MONTHS).map((month) => ({ key: month, label: month, num: true })),
    ]} />
</div>;

// A sentence with its link inside, and a badge laid along the line.
type Payee = { name: string; amount: string; terms: string };
const TERMS: Payee[] = [{ name: 'Northwind Studio', amount: '1,240.00', terms: 'Monthly' },
  { name: 'Bluebell Supply', amount: '860.00', terms: 'Weekly' }];
const SubLines = ({ boxed = false }: { boxed?: boolean }) => <Card>
  <DataTable<Payee> dense pager={false} pinnedIdentity scrollLabel="Payees" caption="Payees" rows={TERMS} columns={[
    { key: 'name', label: 'Payee', render: (row) => <>{row.name}{boxed
      ? <span className="ui-table__sub ui-toolbar"><span className="ui-badge ui-badge--neutral">{row.terms}</span><a href="#terms">Terms</a></span>
      : <span className="ui-table__sub">Paid {row.terms.toLowerCase()} under the <a href="#terms">payout terms</a>.</span>}</> },
    { key: 'amount', label: <>Amount<span className="ui-value__unit">EUR</span></>, num: true },
  ]} />
</Card>;

// The rows stay while the next page of results loads, or a skeleton takes their place.
type Row = { name: string; payee: string; amount: string };
const ROWS: Row[] = PAYEES.slice(0, 3).map(([name, payee, amount]) => ({ name, payee, amount }));
const States = ({ blank = false }: { blank?: boolean }) => <Card>
  {blank
    ? <SkeletonTable rows={3} cols={3} />
    : <DataTable<Row> dense loading pager={false} caption="Payouts" rows={ROWS} columns={[
      { key: 'name', label: 'Reference' }, { key: 'payee', label: 'Payee' },
      { key: 'amount', label: <>Amount<span className="ui-value__unit">EUR</span></>, num: true },
    ]} />}
</Card>;

const specimens = [
  { id: 'surface', do: () => <Framed note="Pointer resting on 1161"><Surface /></Framed>, dont: () => <Framed><Surface zebra /></Framed> },
  { id: 'density', do: () => <Framed><Density /></Framed>, dont: () => <Framed><Density shrunk /></Framed> },
  { id: 'numbers', do: () => <Framed note="Sorted by amount, largest first"><Numbers /></Framed>,
    dont: () => <Framed note="Sorted by amount, largest first"><Numbers strings /></Framed> },
  { id: 'delta', do: () => <Framed><Delta /></Framed>, dont: () => <Framed><Delta bare /></Framed> },
  { id: 'units', do: () => <Framed><Units /></Framed>, dont: () => <Framed><Units muted /></Framed> },
  { id: 'content-width', do: () => <Filtered />, dont: () => <Filtered stretch /> },
  { id: 'overflow', do: () => <Framed note="Scrolled to December, payee pinned"><Overflow /></Framed>,
    dont: () => <Framed note="March to November left out"><Overflow dropped /></Framed> },
  { id: 'pinned-identity-sub-lines', do: () => <Framed><SubLines /></Framed>, dont: () => <Framed><SubLines boxed /></Framed> },
  { id: 'states', do: () => <Framed note="Rows kept, table marked busy"><States /></Framed>,
    dont: () => <Framed note="Refreshing the same results"><States blank /></Framed> },
  { id: 'filter-bar', do: () => <Filtered long="Filtered payout pages" />,
    dont: () => <Filtered bar={false} long="Unfiltered payout pages" /> },
];

const meta: Meta = { title: 'Guidelines/Dense tables', parameters: { layout: 'fullscreen' } };
export default meta;

export const DenseTables: StoryObj = {
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
