// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage } from '../_guideline';
import { SidebarNav } from '../../react/src/SidebarNav';
import { Switch } from '../../react/src/Switch';
import { AccountMenu } from '../../react/src/TopBar';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_account-and-settings.js';

const content = await loadGuideline('account-and-settings.md', new URL('../../guidelines/account-and-settings.md', import.meta.url));

// Rule 1 records the kit's missing modal as #553, so the panel here is composed: the
// two-step edge and raised ground every kit overlay wears, around a real nav and real
// rows. The product behind it uses the block vocabulary of the page guideline.
const Stage = ({ children }: { children: ReactNode }) => <div className="gl-stage">{children}</div>;
const Rows = ({ n, cur }: { n: number; cur: number }) => <>{Array.from({ length: n }, (_, i) =>
  <div key={i} className={`gas-row${i === cur ? ' gas-row--cur' : ''}`} />)}</>;
const Lines = ({ widths }: { widths: string[] }) => <>{widths.map((w, i) => <div key={i} className={`gas-ln gas-ln--${w}`} />)}</>;
const Shell = ({ over }: { over?: ReactNode }) => <div className="gas-shell">
  <div className="gas-shell__rail"><Rows n={5} cur={2} /></div>
  <div className="gas-shell__well">
    <div className="gas-shell__bar" />
    <div className="gas-shell__col"><Lines widths={['short', 'half', 'half']} /></div>
  </div>
  {over}
</div>;
// The product, the scrim and one overlay shape over both, at one scale.
const Over = ({ children }: { children: ReactNode }) => <Stage><div className="gas-frame">
  <Shell over={<><div className="gas-scrim" />{children}</>} />
</div></Stage>;
const Panes = ({ count }: { count: number }) => <>{Array.from({ length: count }, (_, i) =>
  <div key={i} className="gas-over__pane"><Lines widths={['short', 'half', 'half']} /></div>)}</>;

// The pages the navigation rule names, so one vocabulary runs down the page.
const PANES = [
  { id: 'profile', icon: 'user', label: 'Profile' },
  { id: 'security', icon: 'shield', label: 'Security & sessions' },
  { id: 'agents', icon: 'key', label: 'Agents & API tokens' },
  { id: 'appearance', icon: 'sun', label: 'Appearance' },
  { id: 'notifications', icon: 'bell', label: 'Notifications' },
];
const DEVICES = [['This browser', 'Lisbon · active now'], ['Studio laptop', 'Lisbon · 2 days ago'], ['Phone', 'Lisbon · yesterday']];

const SettingRow = ({ lab, hint, children }: { lab: string; hint?: string; children?: ReactNode }) =>
  <div className="ui-card__row"><div><div className="lab">{lab}</div>{hint && <div className="hint">{hint}</div>}</div>{children}</div>;

// The pane holds no card: a card inside the panel is the box the drawer guideline
// refuses next door, and the panel is already the raised surface and the edge.
const Modal = ({ mod = '', children }: { mod?: string; children: ReactNode }) => <Stage><div className={`gas-modal${mod ? ` ${mod}` : ''}`}>
  <div className="gas-modal__bg"><Shell /><div className="gas-scrim" /></div>
  <div className="gas-modal__panel">
    <div className="gas-modal__head">
      <h3 className="gas-modal__title">Account</h3>
      <Button icon="x" iconOnly variant="ghost" size="sm">Close</Button>
    </div>
    <div className="gas-modal__body">{children}</div>
  </div>
</div></Stage>;
const Pane = ({ cap, children }: { cap?: string; children: ReactNode }) =>
  <div className="gas-modal__pane">{cap && <div className="gas-modal__cap">{cap}</div>}{children}</div>;
const Nav = ({ active }: { active: string }) =>
  <div className="gas-modal__nav"><SidebarNav items={PANES} active={active} aria-label="Account" /></div>;

const GROUPS = [
  ['Profile', 'Name, address and the photograph beside them.'],
  ['Security & sessions', 'The sign-in code, and every device signed in now.'],
  ['Agents & API tokens', 'The agents connected, and the tokens they hold.'],
  ['Appearance', 'Theme, accent and row density.'],
  ['Notifications', 'What the product emails, and how often.'],
];

// No current row: the row opens the modal, it is not the page the reader is on.
// The page sheet holds each menu open in the flow, so neither is a live dropdown.
const READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };
const row = ({ id, icon, label }: { id: string; icon: string; label: string }) => ({ label, icon, value: id, href: `#${id}` });
const WAY_IN = [{ id: 'settings', icon: 'gear', label: 'Account settings' }].map(row);
// A setting answered in the menu, drawn the only way the menu can draw one: the
// row states its current value. The menu holds no control, which is the point.
const ANSWERED = [
  { id: 'theme', icon: 'sun', label: 'Theme — Dark' },
  { id: 'digest', icon: 'bell', label: 'Weekly digest — On' },
  { id: 'news', icon: 'mail', label: 'Product news — Off' },
  { id: 'density', icon: 'layout', label: 'Rows — Compact' },
  { id: 'locale', icon: 'globe', label: 'Language — English' },
].map(row);
// A shut React menu panel is folded to no height ([data-dd-shut] in dropdown.css), so
// holding it open in the flow gives back the open panel's 6px and 1px edge as well.
// The React menu wraps trigger and panel in .ui-dropdown, which is made a block so
// the panel falls under the avatar, as it does when it floats.
const MENU_CSS = `<style>
  .gas-menu .acct > .ui-dropdown { display: block; }
  .gas-menu .amenu[data-dd-shut] { max-height: none; padding-block: 6px; border-block-width: 1px; overflow: visible; }
</style>`;
const Menu = ({ items }: { items: ReturnType<typeof row>[] }) =>
  <Stage><div className="gas-menu"><AccountMenu {...READER} items={items} current="" /></div></Stage>;

// Each agent beside the token it holds, masked the way a kit page shows one.
const TOKENS = [['Deploy bot', 'apl_••••7Q2 · used today'], ['Reporting agent', 'apl_••••K4D · used 2 days ago']];
const Tokens = ({ label }: { label: string }) => <Modal><Nav active="agents" /><Pane cap="Agents & API tokens">
  {TOKENS.map(([lab, hint]) => <SettingRow key={lab} lab={lab} hint={hint} />)}
  <div className="gas-acts"><Button variant="primary">{label}</Button></div>
</Pane></Modal>;

const specimens = [
  { id: 'modal',
    do: () => <Over><div className="gas-over gas-over--modal"><div className="gas-over__nav"><Rows n={5} cur={1} /></div><Panes count={1} /></div></Over>,
    dont: () => <Over><div className="gas-over gas-over--sheet"><Panes count={3} /></div></Over> },
  { id: 'nav',
    do: () => <Modal mod="gas-modal--nav"><Nav active="security" /><Pane cap="Signed in now">
      {DEVICES.map(([l, h]) => <SettingRow key={l} lab={l} hint={h} />)}</Pane></Modal>,
    dont: () => <Modal mod="gas-modal--nav"><Pane>{GROUPS.map(([title, sub]) => <SettingRow key={title} lab={title} hint={sub} />)}</Pane></Modal> },
  { id: 'menu', do: () => <Menu items={WAY_IN} />, dont: () => <Menu items={ANSWERED} /> },
  { id: 'in-row',
    do: () => <Stage><Card title="Notifications" level={3}>
      <SettingRow lab="Weekly digest" hint="A summary when things change."><Switch defaultChecked label="Weekly digest" /></SettingRow>
      <SettingRow lab="Agent activity" hint="Email me when an agent first connects."><Switch label="Agent activity" /></SettingRow>
      <SettingRow lab="Product news" hint="Occasional updates about new components."><Switch label="Product news" /></SettingRow>
    </Card></Stage>,
    dont: () => <Modal mod="gas-modal--short"><Nav active="notifications" /><Pane cap="Notifications">
      <SettingRow lab="Weekly digest"><Switch defaultChecked label="Weekly digest, in the modal" /></SettingRow>
    </Pane></Modal> },
  { id: 'one-action', do: () => <Tokens label="Create token" />, dont: () => <Tokens label="Save" /> },
];

const meta: Meta = { title: 'Guidelines/Account and settings', parameters: { layout: 'fullscreen' } };
export default meta;

export const AccountAndSettings: StoryObj = {
  name: 'Account and settings',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS + MENU_CSS} />,
};
