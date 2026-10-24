// The stock screener showcase in React, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useState, type MouseEvent } from 'react';
import { DemoShell } from './_demo-shell';
import { FilterBar, type Filter } from '../../react/src/FilterBar';
import { Segmented } from '../../react/src/Segmented';
import { DeltaValue, NumericValue, RowIdentity } from '../../react/src/TableValues';
import { Button } from '../../react/src/primitives/Button';
import { Sheet } from '../_guideline';

const meta: Meta = { title: 'Showcases/Stock screener', id: 'apps-stock-screener', parameters: { layout: 'fullscreen' } };
export default meta;

const names = ['Aster Systems', 'Birch Semiconductor', 'Cobalt Energy', 'Dovetail Health', 'Elm Networks', 'Fable Robotics', 'Grove Financial', 'Harbor Software', 'Iris Materials', 'Juniper Devices', 'Kestrel Logistics', 'Linden Foods', 'Morrow Industries', 'Northstar Analytics', 'Opal Telecom', 'Pine Mobility', 'Quartz Medical', 'Reed Computing', 'Solstice Power', 'Tern Aerospace', 'Umber Retail', 'Vale Instruments', 'Willow Biotech', 'Xenon Storage', 'Yarrow Payments', 'Zephyr Motors', 'Alder Water', 'Bracken Research', 'Cedar Infrastructure Group', 'Drift Media'];
// One name is just longer than the phone cap on purpose: the column's own ellipsis is
// what #500 is about. Just longer, because at 1280 the longest name sets the column. #513
const sectors = ['Technology', 'Energy', 'Health care', 'Financials', 'Industrials'];
const ratings = ['Buy', 'Hold', 'Sell'];
type Company = { name: string; symbol: string; price: number; cap: number; sector: string; rating: string; i: number };
const rows: Company[] = names.map((name, i) => ({ name, symbol: name.slice(0, 4).toUpperCase(), price: 340 - i * 8.37, cap: 980 - i * 27.31, sector: sectors[i % sectors.length], rating: ratings[i % ratings.length], i }));
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}%`;
const Change = ({ n }: { n: number }) => <DeltaValue value={signed(n)} tone={n > 0 ? 'success' : n < 0 ? 'danger' : 'neutral'} basisId="screener-basis" />;

// The two conditions this screener filters on. A chip carries one in force; the rest
// are what the way to add a filter offers, a section each. Each id is the column it
// reads. why: docs/components.md#a-filter-row-holds-its-panels
const FILTERS = [
  { id: 'sector', label: 'Sector', items: [...sectors, 'Utilities'].map(label => ({ label, value: label })) },
  { id: 'rating', label: 'Rating', items: ratings.map(label => ({ label, value: label })) },
];
const views = ['Overview', 'Performance', 'Valuation'];
const headers = ['Company', 'Price', 'Change %', 'Volume', 'Rel. volume', 'Market cap', 'P/E', 'EPS', 'EPS growth', 'Div. yield', 'Revenue', 'Rev. growth', 'Beta', 'Sector', 'Rating'];
const css = `<style>
.screener { min-width:0; }
/* Placement only: every control that filters is inside the bar. why: docs/components.md#a-filter-row-holds-its-panels */
.screener__filters { margin-bottom:var(--space-2); }
.screener .ui-table-scroll { --ui-table-height:75vh; margin-top:var(--space-3); }
.screener .ui-table { min-width:110rem; }
.screener .ui-identity__name { white-space:nowrap; }
.screener__sort { background:none; border:0; color:inherit; font:inherit; padding:var(--space-1); border-radius:var(--radius-xs); cursor:pointer; }
.screener__sort:focus-visible { outline:var(--ring); outline-offset:var(--ring-offset); }
.screener__foot { font-size:var(--text-sm); margin-top:var(--space-3); }
</style>`;

const cellsOf = ({ name, symbol, price, cap, sector, rating, i }: Company) => [
  <RowIdentity name={name} symbol={symbol} href="#company-detail" />, <NumericValue value={price.toFixed(2)} unit="USD" />,
  <Change n={i === 8 ? 0 : ((i * 17) % 63 - 28) / 10} />, <NumericValue value={(95 - i * 2.71).toFixed(2)} unit="M" />, (0.6 + i * .07).toFixed(2),
  <NumericValue value={cap.toFixed(2)} unit="B USD" />, <NumericValue value={i === 5 ? null : (18 + i * 1.2).toFixed(2)} />,
  <NumericValue value={(11 - i * .23).toFixed(2)} unit="USD" />, <Change n={22 - i * 1.7} />, `${(i * .13).toFixed(2)}%`,
  <NumericValue value={(72 - i * 1.9).toFixed(2)} unit="B USD" />, <Change n={17 - i * .8} />, (0.7 + i * .03).toFixed(2), sector, rating,
];
const orderOf = (view: string) => view === 'Performance' ? [0, 2, 8, 11, 1, 3, 4, 5, 6, 7, 9, 10, 12, 13, 14]
  : view === 'Valuation' ? [0, 5, 6, 7, 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14] : headers.map((_, i) => i);
const cls = (j: number, td = false) => j === 0 ? `ui-table__identity${td ? ' ui-table__linked' : ''}` : j < 13 ? 'ui-table__num' : undefined;

const Table = ({ data, density, view = 'Overview', sort = 'desc', empty = 'No companies match these filters.', onSort }: {
  data: Company[]; density: string; view?: string; sort?: 'desc' | 'asc'; empty?: string; onSort?: () => void;
}) => {
  const order = orderOf(view);
  return <table className={`ui-table ui-table--${density} ui-table--sticky ui-table--pinned ui-table--hover`}>
    <caption className="ui-filter-bar__legend">{`Fictional stock screener, ${view}, values in USD`}</caption>
    <thead><tr>{order.map(i => <th key={i} scope="col" className={cls(i)} aria-sort={i === 5 ? (sort === 'desc' ? 'descending' : 'ascending') : undefined}>
      {i === 5 ? <button type="button" className="screener__sort" onClick={onSort}>{`Market cap ${sort === 'desc' ? '↓' : '↑'}`}</button> : headers[i]}</th>)}</tr></thead>
    <tbody>{data.length ? data.map(row => { const cells = cellsOf(row); return <tr key={row.name}>{order.map(j => <td key={j} className={cls(j, true)}>{cells[j]}</td>)}</tr>; })
      : <tr><td colSpan={15}>{empty}</td></tr>}</tbody>
  </table>;
};

type State = 'ready' | 'refreshing' | 'loading' | 'empty' | 'error';
// The views are their own strip in their own style, and the row holds everything that
// filters. why: guidelines/component-choice.md
const Screen = ({ density = 'compact', applied = false, state = 'ready', limit = 30, live = false }: {
  density?: string; applied?: boolean; state?: State; limit?: number; live?: boolean;
}) => {
  const [active, setActive] = useState<Filter[]>(applied ? [{ ...FILTERS[0], value: 'Technology' }] : []);
  const [view, setView] = useState('Overview');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [detail, setDetail] = useState('Company links are demonstration links; no live prices or company detail service is connected.');
  const [phase, setPhase] = useState<State>(state);
  const filtered = rows.filter(r => active.every(f => r[f.id as 'sector' | 'rating'] === f.value));
  const data = live ? filtered.toSorted((a, b) => sort === 'desc' ? b.cap - a.cap : a.cap - b.cap)
    : applied ? filtered.slice(0, limit) : phase === 'ready' ? rows.slice(0, limit) : rows.slice(0, 1);
  const shown = phase === 'empty' || phase === 'loading' ? [] : data;
  const busy = phase === 'refreshing' || phase === 'loading';
  const open = (event: MouseEvent) => {
    const identity = (event.target as Element).closest('.ui-identity');
    if (!identity) return;
    event.preventDefault();
    setDetail(`${identity.querySelector('.ui-identity__name')!.textContent}. Fictional company; no live prices are connected.`);
    (event.currentTarget.ownerDocument.getElementById('company-detail') as HTMLElement | null)?.focus();
  };
  return <DemoShell word="Finance" layout="rail" width="wide" defaultCollapsed title="Stock screener"
    lede="Fictional demonstration data. Changes versus previous close." nav={[{ id: 'screener', icon: 'chart', label: 'Stock screener' }]} active="screener">
    <Sheet css={css} />
    <span hidden id="screener-basis">Fictional demonstration data. Changes versus previous close.</span>
    <section className="screener" onClick={open}>
      <div className="screener__filters">
        <FilterBar filters={active} busy={phase === 'refreshing'} add={FILTERS}
          onAdd={(id, value) => setActive(on => [...on, { ...FILTERS.find(f => f.id === id)!, value }])}
          onChange={(id, value) => setActive(on => on.map(f => f.id === id ? { ...f, value } : f))}
          onRemove={id => setActive(on => on.filter(f => f.id !== id))} onClear={() => setActive([])} />
      </div>
      <Segmented options={views.map(v => ({ label: v, value: v }))} value={view} onChange={setView} appearance="underline" label="Dataset view" />
      <div className="ui-table-scroll" role="region" aria-label="Stock screener, scroll for more columns and rows" tabIndex={0} aria-busy={busy || undefined}>
        <Table data={shown} density={density} view={view} sort={sort} onSort={live ? () => setSort(s => s === 'desc' ? 'asc' : 'desc') : undefined}
          empty={live ? undefined : phase === 'loading' ? 'Loading companies…' : 'No companies available.'} />
      </div>
      {phase === 'error' ? <p role="alert">Could not refresh prices. Existing rows are still shown. <Button size="sm" onClick={() => setPhase('ready')}>Retry refresh</Button></p>
        : phase === 'loading' ? <p role="status">Loading companies…</p> : phase === 'refreshing' ? <p role="status">Refreshing prices…</p> : null}
      <p className="screener__foot">{`${shown.length} fictional companies. USD = US dollars; M = million; B = billion.`}</p>
      <p className="screener__foot" id="company-detail" tabIndex={-1} aria-live="polite">{detail}</p>
    </section>
  </DemoShell>;
};

export const Screener: StoryObj = { render: () => <Screen live /> };
export const Dense: StoryObj = { render: () => <Screen density="dense" limit={3} /> };
export const AppliedFilters: StoryObj = { render: () => <Screen applied limit={1} /> };
export const Refreshing: StoryObj = { render: () => <Screen state="refreshing" /> };
export const Loading: StoryObj = { render: () => <Screen state="loading" /> };
export const Empty: StoryObj = { render: () => <Screen state="empty" /> };
export const RefreshError: StoryObj = { render: () => <Screen state="error" /> };
