// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { DrawerPicture, GuidelinePage } from '../_guideline';
import { Avatar } from '../../react/src/primitives/Avatar';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { Icon } from '../../react/src/primitives/Icon';
import { BackLink } from '../../react/src/BackLink';
import { KeyValueList } from '../../react/src/KeyValueList';
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
// Brief drops Arrival so a table inside a card fits a 390px phone.
const MiniTable = ({ dense, brief = false, failed = false }: { dense: boolean; brief?: boolean; failed?: boolean }) => <table className={`ui-table ui-table--zebra${dense ? ' ui-table--dense' : ''}`}>
  <thead><tr><th>ID</th>{!brief && <th>Arrival</th>}<th className="ui-table__num">Net</th><th>Status</th></tr></thead>
  <tbody><tr><td>1162</td>{!brief && <td>2026-06-30</td>}<td className="ui-table__num">14,942.27</td><td>{failed ? <Badge variant="danger">Failed</Badge> : <Badge variant="success">Paid</Badge>}</td></tr></tbody>
</table>;
const Densities = ({ second }: { second: boolean }) => <Stage><div className="tp-rows">
  <RestingFilters search="Search payouts" placeholder="ID" label="Payout filters" chips={STATUS} />
  <Card title="Payouts"><MiniTable dense /></Card>
  <RestingFilters search="Search invoices" placeholder="ID" label="Invoice filters" chips={STATUS} />
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

// The shell's band on two pages: search at the start, the reader's menu at the end.
const Bar = ({ moved }: { moved: boolean }) => {
  const search = <button type="button" className="ui-app__search">
    <span className="ui-app__search-ic"><Icon name="search" /></span>
    <span className="ui-app__search-txt">Search</span><kbd className="ui-cmdk__key">⌘K</kbd>
  </button>;
  const menu = <Avatar personKey="dana@example.com" name="Dana Reyes" size={32} />;
  return <div className="ui-app__bar tp-bar">
    {moved ? <>{menu}<span className="ui-app__bar-gap" />{search}</> : <>{search}<span className="ui-app__bar-gap" />{menu}</>}
  </div>;
};
const Shells = ({ moved }: { moved: boolean }) => <div className="tp-rows">
  {['Payouts', 'Invoices'].map((title, i) => <div key={title} className="gl-stage tp-screen">
    <Bar moved={moved && i === 1} />
    <div className="ui-app__main tp-head"><h1>{title}</h1></div>
  </div>)}
</div>;

// A page head with the shell's own classes, in the order given.
const Head = ({ parts }: { parts: ('back' | 'title' | 'sub' | 'filters')[] }) => <Stage><div className="ui-app__main tp-head">
  {parts.map(part => part === 'back' ? <BackLink key={part} href="#" label="Payouts" />
    : part === 'title' ? <h1 key={part}>Payout 1162</h1>
    : part === 'sub' ? <p key={part} className="ui-app__sub">Transactions settled in this payout.</p>
    : <RestingFilters key={part} search="Search transactions" placeholder="ID" label="Transaction filters" chips={STATUS} />)}
</div></Stage>;

// One h1 with cards under it, or a second h1 that splits the page in two.
const Titles = ({ twice }: { twice: boolean }) => <Stage><div className="ui-app__main tp-head"><h1>Payouts</h1>
  {twice ? <div className="tp-rows"><MiniTable dense={false} brief /><h1>Failed payouts</h1><MiniTable dense={false} brief failed /></div>
    : <div className="tp-rows">
      <Card title="Last 7 days"><MiniTable dense={false} brief /></Card>
      <Card title="Failed this week"><MiniTable dense={false} brief failed /></Card>
    </div>}
</div></Stage>;

const Lede = ({ sub }: { sub: string }) => <Stage><div className="ui-app__main tp-head"><h1>Payouts</h1>
  <p className="ui-app__sub">{sub}</p><Card title="Last 7 days"><MiniTable dense={false} brief /></Card>
</div></Stage>;

// The page as it first paints, with or without a drawer already over it.
const AtLoad = ({ open }: { open: boolean }) => <><p>On load</p><div className="gl-stage tp-rest">
  <div className="ui-app__main tp-head">
    <div className="ui-app__title-row"><h1>Payouts</h1>
      <div className="ui-app__tools"><Button variant="primary" icon="plus">New payout</Button></div></div>
    <MiniTable dense={false} brief />
  </div>
  {open && <DrawerPicture title="Payout 1162">
    <KeyValueList rows={[{ label: 'Net', value: '14,942.27' }, { label: 'Status', value: 'Paid' }]} />
  </DrawerPicture>}
</div></>;

// The rules a designer decides, in the order a page is read. Which line of the kit
// holds each of them is the RULE_TO_CODE table in stories/guidelines/the-page.test.js.
const specimens = [
  { id: 'layout', do: () => <Shells moved={false} />, dont: () => <Shells moved /> },
  { id: 'width', do: () => <Frame centered={false} over={false} />, dont: () => <Frame centered over /> },
  { id: 'head', do: () => <Head parts={['back', 'title', 'sub', 'filters']} />,
    dont: () => <Head parts={['back', 'filters', 'title', 'sub']} /> },
  { id: 'one-h1', do: () => <Titles twice={false} />, dont: () => <Titles twice /> },
  { id: 'outline',
    do: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={2} text="Last 7 days" />
      <Out rank={2} text="Payouts" /><Out rank={3} text="Failed this week" /></div></Stage>,
    dont: () => <Stage><div className="tp-out"><Out rank={1} text="Payouts" /><Out rank={1} text="Last 7 days" bad />
      <Out rank={3} text="Payouts" bad /><Out rank={4} text="Failed this week" bad /></div></Stage> },
  { id: 'one-primary', do: () => <Agents />, dont: () => <Agents all /> },
  { id: 'stacking', do: () => <Stack n={LIMITS.cards} />, dont: () => <Stack n={12} over /> },
  { id: 'at-rest', do: () => <AtLoad open={false} />, dont: () => <AtLoad open /> },
  { id: 'density', do: () => <Densities second />, dont: () => <Densities second={false} /> },
  { id: 'lede', do: () => <Lede sub="Payouts arrive within three business days." />,
    dont: () => <Lede sub="This is the payouts page." /> },
];

const meta: Meta = { title: 'Guidelines/The page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThePage: StoryObj = {
  name: 'The page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
