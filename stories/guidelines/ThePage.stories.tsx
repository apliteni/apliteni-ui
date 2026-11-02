// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { BackLink } from '../../react/src/BackLink';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { RestingFilters } from '../_table-filters';
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

// One density per page. Each table keeps its filter bar directly above it.
const STATUS = [{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid'] }];
const MiniTable = ({ dense }: { dense: boolean }) => <table className={`ui-table ui-table--zebra${dense ? ' ui-table--dense' : ''}`}>
  <thead><tr><th>ID</th><th className="ui-table__num">Net</th><th>Status</th></tr></thead>
  <tbody><tr><td>1162</td><td className="ui-table__num">14,942.27</td><td><Badge variant="success">Paid</Badge></td></tr></tbody>
</table>;
const Densities = ({ second }: { second: boolean }) => <Stage><div className="tp-rows">
  <RestingFilters search="Search payouts" placeholder="ID" label="Payout filters" chips={STATUS} />
  <Card title="Payouts"><MiniTable dense /></Card>
  <RestingFilters search="Search invoices" placeholder="ID" label="Invoice filters" chips={STATUS} />
  <Card title="Invoices"><MiniTable dense={second} /></Card>
</div></Stage>;

// Which column the page takes, drawn to scale. The column holds a real table in the kit's
// scroll box, so a column too narrow for it cuts the last column and scrolls sideways.
const PAYOUTS = [['1162', '4,942.27'], ['1163', '8,310.00']];
const Frame = ({ centered }: { centered: boolean }) => <Stage><div className="tp-lay">
  <div className="tp-lay__rail" />
  <div className="tp-lay__well">
    <div className="tp-lay__bar" />
    <div className={`tp-lay__col${centered ? ' tp-lay__col--centered' : ''}`}>
      <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Payouts">
        <table className="ui-table ui-table--zebra ui-table--dense">
          <thead><tr><th>ID</th><th>Status</th><th className="ui-table__num">Net</th></tr></thead>
          <tbody>{PAYOUTS.map(([id, net]) => <tr key={id}><td>{id}</td>
            <td><Badge variant="success">Paid</Badge></td><td className="ui-table__num">{net}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>
</div></Stage>;

// One shell on two pages: the don't moves search and the reader's menu on the second.
const Shell = ({ name, moved = false }: { name: string; moved?: boolean }) => <div className="tp-shell">
  <div className="tp-lay" aria-hidden="true">
    <div className="tp-lay__rail" />
    <div className="tp-lay__well">
      <div className="tp-lay__bar tp-lay__bar--parts">{moved
        ? <><div className="tp-lay__me" /><div className="tp-lay__search" /></>
        : <><div className="tp-lay__search" /><div className="tp-lay__me" /></>}</div>
      <div className="tp-lay__col">{Array.from({ length: 4 }, (_, i) => <div key={i} className="tp-lay__ln" />)}</div>
    </div>
  </div>
  <span className="tp-shell__name">{name}</span>
</div>;
const Shells = ({ moved = false }: { moved?: boolean }) =>
  <Stage><div className="tp-shells"><Shell name="Payouts" /><Shell name="Invoices" moved={moved} /></div></Stage>;

// The head in reading order, or with the filters lifted above the title.
const PAYOUT_FILTERS = <RestingFilters search="Search payouts" placeholder="ID" label="Payout filters" chips={STATUS} />;
const Title = ({ lede = 'Payouts arrive within three business days.' }: { lede?: string }) => <>
  <h2 className="tp-title">Payouts</h2><p className="tp-lede">{lede}</p>
</>;
const Head = ({ lifted = false }: { lifted?: boolean }) => <Stage><div className="tp-rows">
  <div className="tp-head"><BackLink href="#" label="Finance" />{lifted ? null : <Title />}</div>
  {lifted ? <>{PAYOUT_FILTERS}<div className="tp-head"><Title /></div></> : PAYOUT_FILTERS}
</div></Stage>;

// The same page at rest, and with a dialog that opened itself on load.
const Resting = ({ covered = false }: { covered?: boolean }) => <Stage><div className="tp-rest">
  <div className="tp-rows">
    <div className="tp-head"><Title /></div>
    <div className="tp-acts"><Button variant="secondary">What’s new</Button></div>
  </div>
  {covered && <div className="tp-rest__scrim"><div className="rx-modal" role="group" aria-label="What’s new">
    <div className="rx-modal__head"><h2 className="rx-modal__title">What’s new</h2>
      <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" /></div>
    <div className="rx-modal__body"><p>Payout filters now keep your last search.</p></div>
  </div></div>}
</div></Stage>;

// The rules a designer decides, in the order a page is read. Which line of the kit
// holds each of them is the RULE_TO_CODE table in stories/guidelines/the-page.test.js.
const specimens = [
  { id: 'layout', do: () => <Shells />, dont: () => <Shells moved /> },
  { id: 'width', do: () => <Frame centered={false} />, dont: () => <Frame centered /> },
  { id: 'head', do: () => <Head />, dont: () => <Head lifted /> },
  { id: 'one-h1',
    do: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={2} text="Last 7 days" />
      <Out rank={2} text="Failed this week" /></div></Stage>,
    dont: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={1} text="Failed this week" bad />
      <Out rank={2} text="Last 7 days" /></div></Stage> },
  { id: 'outline',
    do: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={2} text="Last 7 days" />
      <Out rank={2} text="Payouts" /><Out rank={3} text="Failed this week" /></div></Stage>,
    dont: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={1} text="Last 7 days" bad />
      <Out rank={3} text="Payouts" bad /><Out rank={4} text="Failed this week" bad /></div></Stage> },
  { id: 'one-primary', do: () => <Agents />, dont: () => <Agents all /> },
  { id: 'stacking', do: () => <Stack n={LIMITS.cards} />, dont: () => <Stack n={12} over /> },
  { id: 'at-rest', do: () => <Resting />, dont: () => <Resting covered /> },
  { id: 'density', do: () => <Densities second />, dont: () => <Densities second={false} /> },
  { id: 'lede', do: () => <Stage><div className="tp-head"><Title /></div></Stage>,
    dont: () => <Stage><div className="tp-head"><Title lede="This is the payouts page." /></div></Stage> },
];

const meta: Meta = { title: 'Guidelines/The page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThePage: StoryObj = {
  name: 'The page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
