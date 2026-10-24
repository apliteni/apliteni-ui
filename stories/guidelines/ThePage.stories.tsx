// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { LIMITS, SPEC_CSS } from './_the-page.js';

const content = await loadGuideline('the-page.md', new URL('../../guidelines/the-page.md', import.meta.url));

const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;

// The outline, written out: the heading ranks as labels.
const Out = ({ rank, text, bad = false }: { rank: number; text: string; bad?: boolean }) =>
  <div className={`tp-out__row tp-out__row--${rank}${bad ? ' tp-out__row--bad' : ''}`}>
    <span className="ui-badge tp-out__rank">{`h${rank}`}</span><span>{text}</span>
  </div>;

// The one primary action.
const Agents = ({ all = false }: { all?: boolean }) => <Stage>
  <Card title="Your agents" sub="Three connected, one revoked."><div className="tp-acts">
    <Button variant="primary" icon="key">Create token</Button>
    <Button variant={all ? 'primary' : 'secondary'}>Import agents</Button>
    <Button variant={all ? 'primary' : 'ghost'}>Export</Button>
  </div></Card>
</Stage>;

// How much may stack: one block per card, both columns at one scale.
const Stack = ({ n, over = false }: { n: number; over?: boolean }) => <Stage>
  <div className={`tp-stack${over ? ' tp-stack--over' : ''}`}>{Array.from({ length: n }, (_, i) => <div key={i} className="tp-card" />)}</div>
</Stage>;

// One density per page.
const MiniTable = ({ dense }: { dense: boolean }) => <table className={`ui-table ui-table--zebra${dense ? ' ui-table--dense' : ''}`}>
  <thead><tr><th>ID</th><th>Arrival</th><th className="ui-table__num">Net</th><th>Status</th></tr></thead>
  <tbody><tr><td>1162</td><td>2026-06-30</td><td className="ui-table__num">14,942.27</td><td><Badge variant="success">Paid</Badge></td></tr></tbody>
</table>;
const Densities = ({ second }: { second: boolean }) => <Stage><div className="tp-rows">
  <Card title="Payouts"><MiniTable dense /></Card>
  <Card title="Invoices"><MiniTable dense={second} /></Card>
</div></Stage>;

// Which column the page takes, drawn to scale.
const Frame = ({ centered, over }: { centered: boolean; over: boolean }) => <Stage><div className="tp-lay">
  <div className="tp-lay__rail" />
  <div className="tp-lay__well">
    <div className="tp-lay__bar" />
    <div className={`tp-lay__col${centered ? ' tp-lay__col--centered' : ''} tp-lay__col--clip`}>
      {Array.from({ length: 7 }, (_, i) => <div key={i} className={`tp-lay__ln${over ? ' tp-lay__ln--over' : ''}`} />)}
    </div>
  </div>
</div></Stage>;

// The rules a designer decides, in the order a page is read. Which line of the kit
// holds each of them is the RULE_TO_CODE table in stories/guidelines/the-page.test.js.
const specimens = [
  { id: 'layout' },
  { id: 'width', do: () => <Frame centered={false} over={false} />, dont: () => <Frame centered over /> },
  { id: 'head' },
  { id: 'one-h1' },
  { id: 'outline',
    do: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={2} text="Last 7 days" />
      <Out rank={2} text="Payouts" /><Out rank={3} text="Failed this week" /></div></Stage>,
    dont: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={1} text="Last 7 days" bad />
      <Out rank={3} text="Payouts" bad /><Out rank={4} text="Failed this week" bad /></div></Stage> },
  { id: 'one-primary', do: () => <Agents />, dont: () => <Agents all /> },
  { id: 'stacking', do: () => <Stack n={LIMITS.cards} />, dont: () => <Stack n={12} over /> },
  { id: 'at-rest' },
  { id: 'density', do: () => <Densities second />, dont: () => <Densities second={false} /> },
  { id: 'lede' },
];

const meta: Meta = { title: 'Guidelines/The page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThePage: StoryObj = {
  name: 'The page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
