import { useRef, useState } from 'react';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { Button } from '../primitives/Button';
import { SearchField } from '../SearchField';
import { Segmented } from '../Segmented';
import { Icon } from '../primitives/Icon';
import { ThreeColumnPage, type ThreeColumnDepth } from '../ThreeColumnPage';
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

/** The check to work on at a stage, or the final step's id. */
export const workingCheck = (stage: MonthCloseStage) => CHECKS[STAGES.indexOf(stage)]?.id ?? 'final';

export function MonthCloseChecks({ stage, onStage, month = 'October', open, onOpenChange }: {
  stage: MonthCloseStage; onStage: (stage: MonthCloseStage) => void; month?: string; open?: string; onOpenChange?: (id: string) => void }) {
  const next = () => onStage(STAGES[Math.min(STAGES.indexOf(stage) + 1, STAGES.length - 1)]);
  return <Wizard label="Month checks" steps={monthChecks(stage, next)} open={open} onOpenChange={onOpenChange} final={{
    label: 'Finish', action: 'Close month', onAction: next, done: stage === 'closed',
    reason: 'Complete all four checks to close this month.',
    content: stage === 'closed' ? <p role="status">{month} is closed.</p> : stage === 'ready' ? <p>Closing locks this month.</p> : undefined,
  }} />;
}

export function MonthClose({ stage: start = 'sources', depth: startDepth = 2 }: { stage?: MonthCloseStage; depth?: ThreeColumnDepth }) {
  // How far down the chain the reader is: a month opens its checks, and a check opens its rows.
  const [depth, setDepth] = useState(startDepth);
  const [month, setMonth] = useState('October');
  // Each month has its own checks: October starts at the given stage, and the others at the first check.
  const [stages, setStages] = useState<Record<string, MonthCloseStage>>({ October: start });
  const stage = stages[month] ?? 'sources';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  // The work area shows the open step, which the reader can open without completing a check.
  const [step, setStep] = useState(() => workingCheck(start));
  const searchField = useRef<HTMLInputElement>(null);
  const clear = () => { setSearch(''); setFilter('all'); searchField.current?.focus(); };
  // A completed check opens the next one in the same render, so the work heading never lags.
  const advance = (next: MonthCloseStage) => { setStages({ ...stages, [month]: next }); setStep(workingCheck(next)); };
  // A new month replaces the checks and the rows: the wizard opens on its first check, with no filter.
  // The checks remount for each month, so the wizard does not move to the month's working check.
  const chooseMonth = (name: string) => { setMonth(name); setStep(CHECKS[0].id); setSearch(''); setFilter('all'); setDepth(2); };
  const fixed = STAGES.indexOf(stage) >= STAGES.indexOf('rates');
  const short = month.slice(0, 3);
  const rows = ROWS.map(row => fixed && !row.doc ? { ...row, doc: 'INV-106', status: 'Ready' as const } : row)
    .filter(row => (filter === 'all' || row.status === filter) && `${row.name} ${row.doc}`.toLowerCase().includes(search.toLowerCase()));
  const open = CHECKS.find(check => check.id === step)?.label ?? 'Reviewed rows';
  return <AppShell word="Ledger" width="full" title="Reconciliation" pathname="/close"
    sections={[{ href: '/close', label: 'Month close', icon: 'calendar' }, { href: '/documents', label: 'Documents', icon: 'doc' },
      { href: '/reports', label: 'Reports', icon: 'chart' }, { href: '/settings', label: 'Settings', icon: 'gear' }]}
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    <ThreeColumnPage depth={depth} onDepthChange={setDepth}
      depthHref={to => ['#/close', to > 1 ? `/${month}` : '', to > 2 ? `/${step}` : ''].join('')} columns={[
      { title: 'Months', children: <nav className="ui-nav ui-columns__list" aria-label="Months"><ul className="ui-nav__list">
        {MONTHS.map(name => <li key={name}><button type="button" aria-pressed={name === month}
          className={`ui-nav__item${name === month ? ' is-active' : ''}`} onClick={() => chooseMonth(name)}>
          <span className="ui-nav__label">{name}</span>
          <span className="ui-nav__ic ui-columns__into"><Icon name="chevronRight" /></span></button></li>)}
      </ul></nav> },
      // A check that the reader opens opens its rows. The wizard's own moves after an action do not.
      { title: 'Month checks', children: <div className="ui-columns__list"
        onClick={event => (event.target as Element).closest('.ui-wizard__step') && setDepth(3)}>
        <MonthCloseChecks key={month} stage={stage} onStage={advance} month={month} open={step} onOpenChange={setStep} /></div> },
      { title: open, children: <div className="ui-columns__body">
        <div className="ui-toolbar">
          <SearchField ref={searchField} ariaLabel="Search rows" size="sm" value={search} onChange={event => setSearch(event.target.value)} />
          <Segmented label="Document" size="sm" value={filter} onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'Ready', label: 'Ready' }, { value: 'Missing', label: 'Missing' }]} />
        </div>
        {/* The document stands under the payee, and the payee's name wraps first, so the amount
            stays in view in a narrow column. */}
        {rows.length ? <DataTable<Row> selectable={false} density="compact" stickyHeader pager={false}
          scrollLabel="Rows" caption={`Rows for ${month}`} rows={rows} columns={[
            { key: 'name', label: 'Payee', render: row => <><span className="ui-identity__name">{row.name}</span>{' '}
              <span className="ui-table__sub">{row.doc || 'Missing document'}</span></> },
            { key: 'day', label: 'Date', render: row => `${row.day} ${short}` },
            { key: 'amount', label: <>Amount<span className="ui-value__unit">€</span></>, num: true },
          ]} /> : <EmptyState variant="no-matches" level={3} icon="" title="No rows match the search."
            sub="Clear the filters to see all rows." actions={<Button onClick={clear}>Clear filters</Button>} />}
      </div> },
    ]} />
  </AppShell>;
}
