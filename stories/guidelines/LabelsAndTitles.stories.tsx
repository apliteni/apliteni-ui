// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, noop } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';
import { FilterBar } from '../../react/src/FilterBar';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('labels-and-titles.md', new URL('../../guidelines/labels-and-titles.md', import.meta.url));

const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;

const Figure = ({ label, value, children }: { label: string; value: string; children: ReactNode }) => <div>
  <div className="ui-eyebrow">{label}</div>
  <div style={{ font: '600 var(--text-xl)/1.2 var(--font-display)', color: 'var(--strong)', margin: 'var(--space-1) 0 var(--space-2)' }}>{value}</div>
  {children}
</div>;
const Band = ({ a, b }: { a: [string, string]; b: [string, string] }) => <Stage>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
    <Figure label={a[0]} value="€4.81M"><Badge variant="success">{a[1]}</Badge></Figure>
    <Figure label={b[0]} value="14"><Badge variant="danger">{b[1]}</Badge></Figure>
  </div>
</Stage>;

// The chips are the frame: a reader looking at the row knows what the button clears.
const ClearRow = ({ clearLabel }: { clearLabel: string }) => <Stage>
  <FilterBar clearLabel={clearLabel} onRemove={noop} onClear={noop} onChange={noop} filters={[
    { id: 'period', label: 'Period', value: 'This quarter', items: [{ label: 'This quarter', value: 'This quarter' }] },
    { id: 'status', label: 'Status', value: 'Paid', items: [{ label: 'Paid', value: 'Paid' }] }]} />
</Stage>;

// Inside the shell's main column, so the h1 takes the page title's rank.
const Page = ({ children }: { children: ReactNode }) => <Stage>
  <div className="ui-app__main" style={{ padding: 0, ['--ui-app-main' as string]: '100%' }}><h1>Overview</h1>{children}</div>
</Stage>;

const specimens = [
  { id: 'text-ink' },
  { id: 'text-ink-exceptions' },
  { id: 'sentence-case',
    do: () => <Band a={['Income', '+12% on last year']} b={['Invoices waiting', '3 overdue']} />,
    dont: () => <Band a={['INCOME', '+12% ON LAST YEAR']} b={['INVOICES WAITING', '3 OVERDUE']} /> },
  { id: 'no-repeated-noun', do: () => <ClearRow clearLabel="Clear all" />, dont: () => <ClearRow clearLabel="Clear all filters" /> },
  { id: 'title-rank',
    do: () => <Page><Card title="Monthly cashflow" sub="Income and expenses by month." /></Page>,
    dont: () => <Page><div className="ui-card"><h1>Monthly cashflow</h1>
      <div className="ui-card__sub">Income and expenses by month.</div></div></Page> },
  { id: 'title-is-heading' },
  { id: 'eyebrow-names-the-kind',
    do: () => <Stage><div className="ui-card"><div className="ui-eyebrow">Last 30 days</div>
      <h2 className="ui-card__title">Top contractors</h2><div className="ui-card__sub">Paid out, by counterparty.</div></div></Stage>,
    dont: () => <Stage><div className="ui-card"><div className="ui-eyebrow">Top contractors</div>
      <div className="ui-card__sub">Paid out, by counterparty.</div></div></Stage> },
];

const meta: Meta = { title: 'Guidelines/Labels and titles', parameters: { layout: 'fullscreen' } };
export default meta;

export const LabelsAndTitles: StoryObj = {
  name: 'Labels and titles',
  render: () => <GuidelinePage content={content} specimens={specimens} />,
};
