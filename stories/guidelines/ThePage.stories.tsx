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
import { Dropdown } from '../../react/src/Dropdown';
// The shell's own band rules, so the Do picture draws the bell as the shell does.
import '../../react/src/AppShell.css';
import { KeyValueList } from '../../react/src/KeyValueList';
import { SidebarNav, type SidebarNavSections } from '../../react/src/SidebarNav';
import { RestingFilters } from '../_table-filters';
import { prism } from '@apliteni/apliteni-ui';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_the-page.js';

const content = await loadGuideline('the-page.md', new URL('../../guidelines/the-page.md', import.meta.url));

const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;

// The outline, written out: the heading ranks as labels.
const Out = ({ rank, text, bad = false }: { rank: number; text: string; bad?: boolean }) =>
  <div className={`tp-out__row tp-out__row--${rank}${bad ? ' tp-out__row--bad' : ''}`}>
    <span className="ui-badge tp-out__rank">{`h${rank}`}</span><span>{text}</span>
  </div>;

// The sidebar's one way of grouping: sub-items with no labels, or labels with no
// sub-items. The mix is cast past the type that refuses it.
const payouts = { id: 'payouts', icon: 'card', label: 'Payouts',
  items: [{ id: 'pending', label: 'Pending' }, { id: 'history', label: 'History' }] };
const Side = ({ mixed }: { mixed: boolean }) => <Stage><div className="tp-side"><SidebarNav aria-label={mixed ? 'Sections, mixed' : 'Sections'} active="pending"
  sections={(mixed ? [{ label: 'Money', items: [{ id: 'home', icon: 'chart', label: 'Overview' }, payouts] },
    { label: 'Workspace', items: [{ id: 'prefs', icon: 'gear', label: 'Preferences' }] }]
    : [{ items: [{ id: 'home', icon: 'chart', label: 'Overview' }, payouts, { id: 'prefs', icon: 'gear', label: 'Preferences' }] }]) as SidebarNavSections} /></div></Stage>;

// The open sidebar's two columns, drawn with the shell's own parts: the logo, the glyphs,
// the version and the avatar on one edge, or the version moved onto the names' edge.
const SideColumn = ({ off }: { off: boolean }) => <Stage><div className="ui-app ui-react-app tp-rail"><div className="ui-app__rail">
  <div className="ui-app__head"><a className="ui-app__brand" href="#" aria-label="Finance">
    <i aria-hidden="true" className="ui-react-app__mark" dangerouslySetInnerHTML={{ __html: prism(`tp-mark-${off}`, 24) }} /><span>Finance</span>
  </a></div>
  <SidebarNav aria-label={off ? 'Sections, version off the column' : 'Sections, one column'} active="payouts"
    sections={[{ items: [{ id: 'home', icon: 'chart', label: 'Overview' }, { id: 'payouts', icon: 'card', label: 'Payouts' }] }]} />
  <p className={`ui-app__note${off ? ' tp-note--off' : ''}`}>v2.14.0</p>
  <div className="ui-app__user"><span className="ui-app__user-trigger">
    <span className="ui-app__av" aria-hidden="true"><Avatar personKey="dana@example.com" name="Dana Reyes" size={32} /></span>
    <span className="ui-app__who"><b>Dana Reyes</b><span>dana@example.com</span></span>
  </span></div>
</div></div></Stage>;

// The one primary action.
const Agents = ({ all = false }: { all?: boolean }) => <Stage>
  <Card title="Your agents" sub="Three connected, one revoked."><div className="tp-acts">
    <Button variant="primary" icon="key">Create token</Button>
    <Button variant={all ? 'primary' : 'secondary'}>Import agents</Button>
    <Button variant={all ? 'primary' : 'ghost'}>Export</Button>
  </div></Card>
</Stage>;

// Cards stack at one level, never one inside another.
const Stack = ({ nested }: { nested: boolean }) => <Stage>{nested
  ? <Card title="Payouts" level={3}><Card title="Last 7 days" level={3} sub="14 payouts" /><Card title="Failed" level={3} sub="2 payouts" /></Card>
  : <div className="ui-card-stack"><Card title="Payouts" level={3} sub="14 payouts" /><Card title="Last 7 days" level={3} sub="14 payouts" /><Card title="Failed" level={3} sub="2 payouts" /></div>}
</Stage>;

// One density per page. Each long table keeps its filter bar directly above it.
const STATUS = [{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid'] }];
// Brief drops Arrival so a table inside a card fits a 390px phone.
const MiniTable = ({ dense, brief = false, failed = false }: { dense: boolean; brief?: boolean; failed?: boolean }) => <table className={`ui-table ui-table--zebra${dense ? ' ui-table--dense' : ''}`}>
  <thead><tr><th>ID</th>{!brief && <th>Arrival</th>}<th className="ui-table__num">Net</th><th>Status</th></tr></thead>
  <tbody><tr><td>1162</td>{!brief && <td>2026-06-30</td>}<td className="ui-table__num">14,942.27</td><td>{failed ? <Badge variant="danger">Failed</Badge> : <Badge variant="success">Paid</Badge>}</td></tr></tbody>
</table>;
const Densities = ({ second }: { second: boolean }) => <Stage><div className="tp-rows">
  <div className="ui-card-stack"><RestingFilters search="Search payouts" placeholder="ID" label="Payout filters" chips={STATUS} />
  <Card title="Payouts"><MiniTable dense /></Card></div>
  <div className="ui-card-stack"><RestingFilters search="Search invoices" placeholder="ID" label="Invoice filters" chips={STATUS} />
  <Card title="Invoices"><MiniTable dense={second} /></Card></div>
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

// The bar's right end: the shell's bell, which serves every page, or a page's own button.
// The shell's class on the stage gives search and the bell the shell's look at each width.
const BarEnd = ({ page }: { page: boolean }) => <div className="gl-stage tp-screen ui-react-app"><div className="ui-app__bar tp-bar">
  <button type="button" className="ui-app__search">
    <span className="ui-app__search-ic"><Icon name="search" /></span>
    <span className="ui-app__search-txt">Search</span><kbd className="ui-cmdk__key">⌘K</kbd>
  </button>
  <span className="ui-app__bar-gap" />
  {page ? <Button variant="primary" icon="plus">New report</Button>
    : <div className="ui-react-app__band-actions"><Dropdown variant="menu" align="end" chevron={false} title="Notifications"
      ariaLabel="Notifications, 3 unread" triggerContent={<><Icon name="bell" /><span aria-hidden="true"><Badge>3</Badge></span></>}
      items={[{ label: 'Payout run PR-204 failed', value: 'payout' }]} /></div>}
</div></div>;

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

// The branded ground behind a dialog-only page: the mark and a slogan may stand on it,
// but a control stays inside the dialog. #850
const Branded = ({ control }: { control: boolean }) => <Stage><div className="ui-auth tp-auth">
  {control && <button type="button" className="ui-btn tp-on-ground">Import agents</button>}
  <div className="ui-auth__card tp-auth-card">
    <div className="ui-auth__brand">apliteni-ui</div>
    <h1 className="ui-auth__title">Sign in</h1>
    <p className="ui-auth__sub">Use your work account.</p>
    <Button variant="primary" block>Continue</Button>
  </div>
</div></Stage>;

// The sign-in note: it names who can sign in, never the product. #850
const SignNote = ({ named }: { named: boolean }) => <Stage><div className="ui-auth tp-auth">
  <div className="ui-auth__card tp-auth-card">
    <h1 className="ui-auth__title">Sign in</h1>
    <Button variant="primary" block>Continue</Button>
    <div className="ui-auth__foot">{named ? 'Only apliteni.com accounts can sign in.' : 'Only work accounts can sign in.'}</div>
  </div>
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
  { id: 'sidebar', do: () => <Side mixed={false} />, dont: () => <Side mixed /> },
  { id: 'sidebar-column', do: () => <SideColumn off={false} />, dont: () => <SideColumn off /> },
  { id: 'bar-end', do: () => <BarEnd page={false} />, dont: () => <BarEnd page /> },
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
  { id: 'stacking', do: () => <Stack nested={false} />, dont: () => <Stack nested /> },
  { id: 'at-rest', do: () => <AtLoad open={false} />, dont: () => <AtLoad open /> },
  { id: 'density', do: () => <Densities second />, dont: () => <Densities second={false} /> },
  { id: 'branded-background', do: () => <Branded control={false} />, dont: () => <Branded control /> },
  { id: 'sign-in-note', do: () => <SignNote />, dont: () => <SignNote named /> },
  { id: 'lede', do: () => <Lede sub="Payouts arrive within three business days." />,
    dont: () => <Lede sub="This is the payouts page." /> },
];

const meta: Meta = { title: 'Guidelines/The page', parameters: { layout: 'fullscreen' } };
export default meta;

export const ThePage: StoryObj = {
  name: 'The page',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
