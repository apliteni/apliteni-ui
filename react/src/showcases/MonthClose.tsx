import { useState } from 'react';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { Button } from '../primitives/Button';
import { SearchField } from '../SearchField';
import { Segmented } from '../Segmented';
import { ThreeColumnPage, type ThreeColumnView } from '../ThreeColumnPage';
import { Wizard, type WizardStep, type WizardStepState } from '../Wizard';

/* A month close, with fabricated rows: the months, the month's ordered checks, and the
   rows of the open check. Each check's action moves the close one step on. */
export type MonthCloseStage = 'sources' | 'rows' | 'blocked' | 'rates' | 'ready' | 'closed';
const STAGES: MonthCloseStage[] = ['sources', 'rows', 'blocked', 'rates', 'ready', 'closed'];

const CHECKS = [
  { id: 'sources', label: 'Sources', text: 'Bank and card statements are ready.', action: 'Check' },
  { id: 'rows', label: 'Unclassified rows', text: 'Assign these rows to an expense category.', action: 'Classify' },
  { id: 'documents', label: 'Documents', text: 'The receipt from Cedar Tools is missing.', action: 'Add' },
  { id: 'rates', label: 'Exchange rates', text: 'Review the exchange rates for these rows.', action: 'Verify' },
];
const MONTHS = ['October', 'September', 'August', 'July', 'June', 'May'];
type Row = { day: string; name: string; doc: string; amount: string; status: 'Ready' | 'Missing' };
const ROWS: Row[] = [
  ['03', 'Aster Paper', 'INV-104', '184.20'], ['04', 'Birch Studio', 'INV-105', '620.00'], ['05', 'Cedar Tools', '', '92.50'],
  ['07', 'Dune Print', 'INV-107', '245.00'], ['09', 'Elm Office', 'INV-108', '780.00'], ['10', 'Fern Books', 'INV-109', '68.40'],
  ['12', 'Grove Supply', 'INV-110', '312.80'], ['14', 'Harbor Works', 'INV-111', '450.00'], ['17', 'Iris Software', 'INV-112', '49.00'],
  ['20', 'Juniper Lab', 'INV-113', '136.25'], ['23', 'Kite Travel', 'INV-114', '278.60'], ['28', 'Linden Space', 'INV-115', '920.00'],
].map(([day, payee, doc, amount]) => ({ day, name: payee, doc, amount, status: doc ? 'Ready' : 'Missing' }));

/** The checks at a stage: the ones before it are done, and it is current or blocked. */
export function monthChecks(stage: MonthCloseStage, onAct: () => void): WizardStep[] {
  const at = STAGES.indexOf(stage);
  return CHECKS.map((check, index) => {
    const state: WizardStepState = index < at ? 'done' : index > at ? 'todo' : stage === 'blocked' ? 'blocked' : 'current';
    return { id: check.id, label: check.label, state, content: state === 'done' ? undefined
      : state === 'todo' ? <p>Finish the earlier checks first.</p>
      : <><p>{check.text}</p><Button variant="primary" onClick={onAct}>{check.action}</Button></> };
  });
}

export function MonthCloseChecks({ stage, onStage, month = 'October' }: { stage: MonthCloseStage; onStage: (stage: MonthCloseStage) => void; month?: string }) {
  const next = () => onStage(STAGES[Math.min(STAGES.indexOf(stage) + 1, STAGES.length - 1)]);
  return <Wizard label="Month checks" steps={monthChecks(stage, next)} final={{
    label: 'Finish', action: 'Close month', onAction: next, done: stage === 'closed',
    reason: 'Complete all four checks to close this month.',
    content: stage === 'closed' ? <p role="status">{month} is closed.</p> : stage === 'ready' ? <p>Closing locks this month.</p> : undefined,
  }} />;
}

export function MonthClose({ stage: start = 'sources', view: startView = 'steps' }: { stage?: MonthCloseStage; view?: ThreeColumnView }) {
  const [stage, setStage] = useState(start);
  const [view, setView] = useState(startView);
  const [month, setMonth] = useState('October');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const fixed = STAGES.indexOf(stage) >= STAGES.indexOf('rates');
  const short = month.slice(0, 3);
  const rows = ROWS.map(row => fixed && !row.doc ? { ...row, doc: 'INV-106', status: 'Ready' as const } : row)
    .filter(row => (filter === 'all' || row.status === filter) && `${row.name} ${row.doc}`.toLowerCase().includes(search.toLowerCase()));
  const open = CHECKS[STAGES.indexOf(stage)]?.label ?? 'Reviewed rows';
  return <AppShell word="Ledger" width="full" title="Reconciliation" pathname="/close"
    sections={[{ href: '/close', label: 'Month close', icon: 'calendar' }, { href: '/documents', label: 'Documents', icon: 'doc' },
      { href: '/reports', label: 'Reports', icon: 'chart' }, { href: '/settings', label: 'Settings', icon: 'gear' }]}
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    <ThreeColumnPage view={view} onViewChange={setView}
      nav={{ title: '2026', link: 'Months', children: <div className="ui-nav"><ul className="ui-nav__list">
        {MONTHS.map(name => <li key={name}><button type="button" aria-pressed={name === month}
          className={`ui-nav__item${name === month ? ' is-active' : ''}`} onClick={() => setMonth(name)}>{name}</button></li>)}
      </ul></div> }}
      steps={{ title: 'Month checks', link: 'Checks', children: <MonthCloseChecks stage={stage} onStage={setStage} month={month} /> }}
      work={{ title: open, link: 'Rows', children: <>
        <div className="ui-toolbar">
          <SearchField ariaLabel="Search rows" size="sm" value={search} onChange={event => setSearch(event.target.value)} />
          <Segmented label="Document" size="sm" value={filter} onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'Ready', label: 'Ready' }, { value: 'Missing', label: 'Missing' }]} />
        </div>
        <DataTable<Row> selectable={false} density="compact" stickyHeader pager={false} scrollLabel="Rows" caption={`Rows for ${month}`}
          empty="No matching rows." rows={rows} columns={[
            { key: 'day', label: 'Date', render: row => `${row.day} ${short}` },
            { key: 'name', label: 'Payee', cell: 'title' },
            { key: 'doc', label: 'Document', render: row => row.doc || 'Missing' },
            { key: 'amount', label: 'Amount', num: true, render: row => `€${row.amount}` },
          ]} />
      </> }} />
  </AppShell>;
}
