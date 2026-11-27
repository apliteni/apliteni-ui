// A list of money movements under its own figures: a band of three amounts, then the
// table's search and filter, then the table. On a phone the band keeps one row, and the
// controls sit one group gap under it. why: docs/components.md#stat-bands, #865
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { DataTable, sortTableRows, type Column, type TableSort } from '../../react/src/DataTable';
import { FilterBar } from '../../react/src/FilterBar';
import { SearchField } from '../../react/src/SearchField';
import { StatBand } from '../../react/src/primitives/StatBand';

const meta: Meta = { title: 'Showcases/Transactions', id: 'apps-transactions', parameters: { layout: 'fullscreen' } };
export default meta;

const NAV: DemoNavItem[] = [
  { id: 'overview', icon: 'grid', label: 'Overview' },
  { id: 'transactions', icon: 'table', label: 'Transactions' },
  { id: 'accounts', icon: 'wallet', label: 'Accounts' },
  { id: 'reports', icon: 'chart', label: 'Reports' },
];

// The figures are the year's totals and the rows are the latest twelve, so the rows do
// not add up to the figures. Net is income less spend.
const FIGURES = [
  { label: 'Income', value: '€2,315,750' },
  { label: 'Spend', value: '€1,031,250' },
  { label: 'Net', value: '€1,284,500' },
];

type Row = { name: string; date: string; description: string; account: string; amount: number };
const ROWS: Row[] = ([
  ['2026-11-26', 'Invoice 1084', 'Operating', 184_500],
  ['2026-11-25', 'Office rent', 'Operating', -4_200],
  ['2026-11-24', 'Invoice 1083', 'Operating', 128_400],
  ['2026-11-23', 'Cloud hosting', 'Card', -1_850],
  ['2026-11-22', 'Invoice 1082', 'Operating', 96_350],
  ['2026-11-21', 'Software licences', 'Card', -640],
  ['2026-11-20', 'Invoice 1081', 'Operating', 78_500],
  ['2026-11-19', 'Equipment', 'Card', -3_200],
  ['2026-11-18', 'Invoice 1080', 'Operating', 54_200],
  ['2026-11-17', 'Travel', 'Card', -1_240],
  ['2026-11-16', 'Invoice 1079', 'Operating', 42_600],
  ['2026-11-15', 'Insurance', 'Operating', -2_800],
] as const).map(([date, description, account, amount]) => ({ name: `${date} ${description}`, date, description, account, amount }));

// The date sorts as written, and reads as a day, a month and a year. The amount sorts as a
// number, and reads with its sign and two decimals.
const money = (n: number) => `${n < 0 ? '−' : '+'}€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const COLUMNS: Column<Row>[] = [
  { key: 'date', label: 'Date', sortable: true, render: row => day(row.date) },
  { key: 'description', label: 'Description', sortable: true, cell: 'title' },
  { key: 'account', label: 'Account', sortable: true },
  { key: 'amount', label: 'Amount', num: true, sortable: true, render: row => money(row.amount) },
];
const ACCOUNTS = [{ label: 'Operating', value: 'Operating' }, { label: 'Card', value: 'Card' }];

const Transactions = () => {
  const [query, setQuery] = useState('');
  const [account, setAccount] = useState('');
  const [sort, setSort] = useState<TableSort<Row>>({ key: 'date', dir: -1 });
  const term = query.trim().toLowerCase();
  const rows = sortTableRows(ROWS.filter(row => (!account || row.account === account)
    && row.description.toLowerCase().includes(term)), sort);
  return <DemoShell nav={NAV} active="transactions" word="Finance" title="Transactions" width="wide">
    <StatBand variant="band" label="Annual cash flow" stats={FIGURES} />
    <div className="ui-toolbar">
      <SearchField size="sm" ariaLabel="Search" placeholder="Description" value={query} onChange={e => setQuery(e.currentTarget.value)} />
      <div><FilterBar label="Filters" filters={[{ id: 'account', label: 'Account', value: account, items: ACCOUNTS }]}
        onChange={(_, value) => setAccount(value ?? '')} onRemove={() => setAccount('')} onClear={() => setAccount('')} /></div>
    </div>
    <DataTable caption="Recent transactions" scrollLabel="Transactions" columns={COLUMNS} rows={rows} selectable={false} pager={false}
      pinnedIdentity="description" stickyHeader sort={sort} onSortChange={setSort} empty="No transactions match" />
  </DemoShell>;
};

export const Default: StoryObj = { render: () => <Transactions /> };
