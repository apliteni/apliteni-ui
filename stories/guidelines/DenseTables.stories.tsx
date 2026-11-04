// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, PhoneFrame } from '../_guideline';
import { DeltaValue } from '../../react/src/TableValues';
import { EmptyState } from '../../react/src/EmptyState';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { RestingFilters } from '../_table-filters';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_dense-tables.js';

const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));

const PAYOUTS = [['1162', 'Paid', '1,240.00'], ['1161', 'Paid', '860.00'], ['1160', 'Pending', '2,100.00']];

// One table, twice: the pair is the width and nothing else. Dense, because the base
// recipe leaves its last header flush with the table edge while its values keep a
// right inset. The Status column is the one the bar's chip filters.
const Payouts = ({ stretch = false }: { stretch?: boolean }) =>
  <div className={`gdt-stage ui-card ui-card--pad-sm${stretch ? '' : ' ui-card--fit'}`}>
    <table className={`ui-table ui-table--dense ui-table--hover${stretch ? ' gdt-stretch' : ''}`} aria-label="Payouts">
      <thead><tr><th>Reference</th><th>Status</th><th className="ui-table__num">Amount<span className="ui-value__unit">EUR</span></th></tr></thead>
      <tbody>{PAYOUTS.map(([reference, status, amount]) =>
        <tr key={reference}><td>{reference}</td><td>{status}</td><td className="ui-table__num">{amount}</td></tr>)}</tbody>
    </table>
  </div>;

// The card with the row that narrows it. The bar and the table are one unit of one
// width, as on a product page.
const STATUS = [{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid'] }];
const Filtered = ({ stretch = false }: { stretch?: boolean }) => <div className={`gdt-stage gdt-filtered${stretch ? '' : ' gdt-unit'}`}>
  <RestingFilters search="Search payouts" placeholder="Reference" label="Payout filters" chips={STATUS} />
  <Payouts stretch={stretch} />
</div>;

// One ledger for the pictures below, so a pair differs only in what its rule is about.
type Payout = { ref: string; payee: string; amount: string; fee: string; change: string | null; tone: 'success' | 'danger' | 'neutral'; on: string; account: string };
const LEDGER: Payout[] = [
  { ref: '1162', payee: 'Northwind Ltd', amount: '1,240.00', fee: '25', change: '+12.4%', tone: 'success', on: '3 Apr', account: '4417' },
  { ref: '1161', payee: 'Blue Fern Studio', amount: '860.00', fee: '30', change: '−3.1%', tone: 'danger', on: '2 Apr', account: '2093' },
  { ref: '1160', payee: 'Harbour Cafe', amount: '12,100.00', fee: '25', change: null, tone: 'neutral', on: '2 Apr', account: '7781' },
  { ref: '1159', payee: 'Oak Lane Books', amount: '415.50', fee: '40', change: '+0.8%', tone: 'success', on: '1 Apr', account: '3350' },
];
const EUR = <span className="ui-value__unit">EUR</span>;
const BP = <span className="ui-value__unit">bp</span>;

const Card = ({ fit = true, className = '', children }: { fit?: boolean; className?: string; children: ReactNode }) =>
  <div className={['gdt-stage ui-card ui-card--pad-sm', fit && 'ui-card--fit', className].filter(Boolean).join(' ')}>{children}</div>;

// Payee and amount, the two columns every rule below needs.
const Ledger = ({ className = 'ui-table--dense ui-table--hover', hovered, rows = 3, busy }: { className?: string; hovered?: string; rows?: number; busy?: boolean }) =>
  <table className={`ui-table ${className}`} aria-label="Payouts" aria-busy={busy}>
    <thead><tr><th>Payee</th><th className="ui-table__num">Amount{EUR}</th></tr></thead>
    <tbody>{LEDGER.slice(0, rows).map(row =>
      <tr key={row.ref} className={row.ref === hovered ? 'gdt-hovered' : undefined}>
        <td>{row.payee}</td><td className="ui-table__num">{row.amount}</td>
      </tr>)}</tbody>
  </table>;

const Numbers = ({ className = '' }: { className?: string }) => <Card>
  <table className={`ui-table ui-table--dense ui-table--hover ${className}`} aria-label="Payouts">
    <thead><tr><th>Payee</th><th className="ui-table__num">Amount{EUR}</th><th className="ui-table__num">Fee{BP}</th></tr></thead>
    <tbody>{LEDGER.map(row => <tr key={row.ref}>
      <td>{row.payee}</td><td className="ui-table__num">{row.amount}</td><td className="ui-table__num">{row.fee}</td>
    </tr>)}</tbody>
  </table>
</Card>;

const Delta = ({ named = true }: { named?: boolean }) => <Card>
  <table className="ui-table ui-table--dense ui-table--hover" aria-label="Payouts">
    <thead><tr><th>Payee</th><th className="ui-table__num">{named ? 'Change from March' : 'Change'}</th></tr></thead>
    <tbody>{LEDGER.map(row => <tr key={row.ref}>
      <td>{row.payee}</td>
      <td className="ui-table__num">{named
        ? <DeltaValue value={row.change} tone={row.tone} />
        : <span className={`ui-delta${row.change ? ` ui-delta--${row.tone}` : ''}`}>{row.change?.replace(/^[+−]/, '') ?? '0%'}</span>}</td>
    </tr>)}</tbody>
  </table>
</Card>;

const Units = () => <Card>
  <table className="ui-table ui-table--dense ui-table--hover" aria-label="Payouts">
    <thead><tr><th>Payee</th><th className="ui-table__num">Amount{EUR}</th><th className="ui-table__num">Fee{BP}</th></tr></thead>
    <tbody>{LEDGER.slice(0, 3).map(row => <tr key={row.ref}>
      <td>{row.payee}</td><td className="ui-table__num">{row.amount}</td><td className="ui-table__num">{row.fee}</td>
    </tr>)}</tbody>
  </table>
  <p className="gdt-note">A basis point (bp) is one hundredth of a percent.</p>
</Card>;

// Every column the ledger has, which is more than the card has room for.
const Wide = ({ squeezed = false }: { squeezed?: boolean }) => {
  const table = <table className={squeezed ? 'ui-table ui-table--compact ui-table--hover gdt-squeezed' : 'ui-table ui-table--compact ui-table--hover ui-table--sticky ui-table--pinned'} aria-label="Payouts">
    <thead><tr>
      <th className={squeezed ? undefined : 'ui-table__identity'}>Payee</th><th>Reference</th><th className="ui-table__num">Amount{EUR}</th>
      <th className="ui-table__num">Fee{BP}</th><th>Date</th><th>Account</th>
    </tr></thead>
    <tbody>{LEDGER.map(row => <tr key={row.ref}>
      <td className={squeezed ? undefined : 'ui-table__identity'}>{row.payee}</td><td>{row.ref}</td><td className="ui-table__num">{row.amount}</td>
      <td className="ui-table__num">{row.fee}</td><td>{row.on}</td><td>{row.account}</td>
    </tr>)}</tbody>
  </table>;
  return <Card fit={false}>{squeezed ? table
    : <div className="ui-table-scroll" role="region" aria-label="Payouts, scroll for more columns" tabIndex={0}>{table}</div>}</Card>;
};

// The pinned name and its sub-line: on a phone, which cuts it, and on a wide screen, which does not.
const Identity = () =>
  <div className="ui-table-scroll" role="region" aria-label="Payouts, scroll for more columns" tabIndex={0}>
    <table className="ui-table ui-table--compact ui-table--hover ui-table--pinned" aria-label="Payouts">
      <thead><tr><th className="ui-table__identity">Payee</th><th className="ui-table__num">Amount{EUR}</th></tr></thead>
      <tbody>{LEDGER.slice(0, 2).map(row => <tr key={row.ref}>
        <td className="ui-table__identity">
          <div>{row.payee}</div>
          <div>Paid to account {row.account} on {row.on}</div>
        </td>
        <td className="ui-table__num">{row.amount}</td>
      </tr>)}</tbody>
    </table>
  </div>;
const Widths = () => <div className="gdt-widths">
  <PhoneFrame width={240} label="Payouts on a phone, sub-line as text"><Identity /></PhoneFrame>
  <Card fit={false}><Identity /></Card>
</div>;

// A refresh keeps the rows it has. The don't drops them for a blank state, which
// tells the reader there are no payouts while the next page is still on its way.
const States = ({ kept = true }: { kept?: boolean }) => <Card>
  <div className="ui-card__head">
    <h3 className="ui-card__title">Payouts</h3>
    <div className="ui-card__tools"><Button size="sm" busy completionMessage="">Refresh</Button></div>
  </div>
  {kept ? <Ledger rows={3} busy /> : <EmptyState title="No payouts" sub="Payouts will appear here when they are paid." icon="table" />}
</Card>;

const specimens = [
  { id: 'surface', do: () => <Card><Ledger /></Card>, dont: () => <Card className="gdt-grey"><Ledger className="ui-table--dense ui-table--zebra" hovered="1161" /></Card> },
  { id: 'density', do: () => <Card><Ledger className="ui-table--compact ui-table--hover" rows={4} /></Card>, dont: () => <Card><Ledger className="ui-table--compact ui-table--hover gdt-shrunk" rows={4} /></Card> },
  { id: 'numbers', do: () => <Numbers />, dont: () => <Numbers className="gdt-left" /> },
  { id: 'delta', do: () => <Delta />, dont: () => <Delta named={false} /> },
  { id: 'units', do: () => <Units /> },
  { id: 'content-width', do: () => <Filtered />, dont: () => <Filtered stretch /> },
  { id: 'overflow', do: () => <Wide />, dont: () => <Wide squeezed /> },
  { id: 'pinned-identity-sub-lines', do: () => <Widths /> },
  { id: 'states', do: () => <States />, dont: () => <States kept={false} /> },
  { id: 'filter-bar', do: () => <Filtered /> },
];

const meta: Meta = { title: 'Guidelines/Dense tables', parameters: { layout: 'fullscreen' } };
export default meta;

export const DenseTables: StoryObj = {
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
