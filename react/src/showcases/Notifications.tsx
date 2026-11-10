import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { icon } from '@apliteni/apliteni-ui';
import { AppShell } from '../AppShell';
import { DataTable, type Column } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { Button } from '../primitives/Button';
import { Callout } from '../primitives/Callout';
import { Card } from '../primitives/Card';
import { StatBand } from '../primitives/StatBand';
import './Notifications.css';

/* The bell with its count (#798). The owner chose a wordless bell in the shell's head, so its
   sentence is the accessible name. The page it opens lists each notification as a table row. */
export type NotificationsScene = 'list' | 'band' | 'overview' | 'zero' | 'empty' | 'error';

type Note = { name: string; glyph: string; title: string; time: string; dateTime: string; href: string };

/* Fabricated demo notifications. */
const NOTES: Note[] = [
  { name: 'n1', glyph: 'wallet', title: 'Invoice INV-2041 is paid', time: '2 min ago', dateTime: '2026-11-10T13:06', href: '#invoices/2041' },
  { name: 'n2', glyph: 'alert', title: 'Spring launch stopped at its daily budget', time: '18 min ago', dateTime: '2026-11-10T12:50', href: '#campaigns/spring-launch' },
  { name: 'n3', glyph: 'user', title: 'Maya Ortiz added you to the Growth team', time: '1 h ago', dateTime: '2026-11-10T12:04', href: '#teams/growth' },
  { name: 'n4', glyph: 'download', title: 'Your export of March clicks is ready', time: '3 h ago', dateTime: '2026-11-10T10:12', href: '#exports/march-clicks' },
  { name: 'n5', glyph: 'lock', title: 'The certificate for shop.example renews in 7 days', time: 'Yesterday', dateTime: '2026-11-09T16:30', href: '#domains/shop-example' },
  { name: 'n6', glyph: 'chart', title: 'The weekly report for 2–8 Nov is ready', time: 'Yesterday', dateTime: '2026-11-09T08:00', href: '#reports/weekly' },
];

/* Paths, not hashes: the shell matches the current section on the path alone. */
const SECTIONS = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/campaigns', label: 'Campaigns', icon: 'card' },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/agents', label: 'Access & agents', icon: 'user' },
  { href: '/preferences', label: 'Preferences', icon: 'gear' },
];
const ACCOUNT = { name: 'Sam Rivera', email: 'sam@example.com' };

const Glyph = ({ name, className }: { name: string; className?: string }) =>
  <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;

export const bellName = (count: number) => count > 0 ? `Notifications, ${count} unread` : 'Notifications';

/* Drawn as the fold beside it is drawn, a nav row with a glyph, so it takes the rail's current
   plate and the nav's neutral count. At zero the count is not drawn, and the link keeps its
   width so the bell does not move. */
function Bell({ count, current }: { count: number; current: boolean }) {
  return <a className={`ui-nav__item notifications__bell${count ? '' : ' notifications__bell--zero'}${current ? ' is-active' : ''}`}
    href="/notifications" aria-label={bellName(count)} aria-current={current ? 'page' : undefined}>
    <Glyph name="bell" className="ui-nav__ic" />
    {count > 0 && <span className="ui-nav__badge is-neutral" aria-hidden="true">{count}</span>}
  </a>;
}

/* A stand-in for a missing kit part: the phone band of a shell with sections has no slot for
   a product control, so the bell stands before Menu. The CSS shows it below 720px only. */
function BarBell(props: { count: number; current: boolean }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const menu = document.querySelector('.ui-app__bar > .ui-app__menu');
    if (!menu) return;
    const span = document.createElement('span');
    span.className = 'ui-react-app__head-control notifications__bar-bell';
    menu.before(span);
    setSlot(span);
    return () => span.remove();
  }, []);
  return slot && createPortal(<Bell {...props} />, slot);
}

const COLUMNS: Column<Note>[] = [
  { key: 'title', label: 'Notification', cell: 'title', linked: true,
    render: (note) => <a href={note.href} className="notifications__note"><Glyph name={note.glyph} /><span>{note.title}</span></a> },
  { key: 'time', label: 'Time', render: (note) => <time dateTime={note.dateTime}>{note.time}</time> },
];

/* With no rows there is no table, so no column head stands over nothing. */
const List = ({ rows }: { rows: Note[] }) => rows.length
  ? <DataTable caption="Notifications" columns={COLUMNS} rows={rows} selectable={false} pager={false} />
  : <Card><EmptyState variant="first-run" actions={<Button variant="secondary" href="/overview">Open Overview</Button>} /></Card>;

type Campaign = { name: string; campaign: string; clicks: string; conversions: string; spend: string };
const CAMPAIGNS: Campaign[] = [
  { name: 'spring-launch', campaign: 'Spring launch', clicks: '4,210', conversions: '118', spend: '$640' },
  { name: 'brand-search', campaign: 'Brand search', clicks: '3,875', conversions: '131', spend: '$512' },
  { name: 'retargeting', campaign: 'Retargeting', clicks: '2,640', conversions: '64', spend: '$455' },
  { name: 'newsletter', campaign: 'Newsletter November', clicks: '1,755', conversions: '29', spend: '$313' },
];
const CAMPAIGN_COLUMNS: Column<Campaign>[] = [
  { key: 'campaign', label: 'Campaign', cell: 'title' },
  { key: 'clicks', label: 'Clicks', num: true },
  { key: 'conversions', label: 'Conversions', num: true },
  { key: 'spend', label: 'Spend', num: true },
];

/* The page the bell is seen from. */
const Overview = () => <div className="ui-stack">
  <StatBand variant="band" label="Today" basis="Change from yesterday." stats={[
    { label: 'Clicks', value: '12,480', delta: { value: '+8%', tone: 'good' } },
    { label: 'Conversions', value: '342', delta: { value: '+5%', tone: 'good' } },
    { label: 'Spend', value: '$1,920', delta: { value: '−3%', tone: 'neutral' } },
  ]} />
  <DataTable caption="Campaigns today" columns={CAMPAIGN_COLUMNS} rows={CAMPAIGNS} selectable={false} pager={false} />
</div>;

export function Notifications({ scene = 'list' }: { scene?: NotificationsScene }) {
  // Retry loads the list again. In the demo the second load succeeds.
  const [failed, setFailed] = useState(scene === 'error');
  const onList = scene !== 'overview' && scene !== 'zero';
  const count = scene === 'zero' || scene === 'empty' ? 0 : NOTES.length;
  const many = scene !== 'band';
  let body: ReactNode = <Overview />;
  if (onList) body = failed
    ? <Callout variant="danger" actions={<Button variant="secondary" icon="refresh" onClick={() => setFailed(false)}>Retry</Button>}>
      Notifications did not load. Your other pages still work.
    </Callout>
    : <List rows={scene === 'empty' ? [] : NOTES} />;
  return <AppShell sections={many ? SECTIONS : SECTIONS.slice(0, 1)} pathname={onList ? '/notifications' : '/overview'}
    title={onList ? 'Notifications' : 'Overview'} word="Tracker" brandHref="/overview" account={ACCOUNT} onSignOut={() => {}}
    headControl={<Bell count={count} current={onList} />}>
    {body}
    {many && <BarBell count={count} current={onList} />}
  </AppShell>;
}
