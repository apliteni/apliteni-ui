// Prototype scenes for apliteni-ui #798. Each scene is one picture. Demo data is fabricated.
import '../src/index.css';
import '../react/dist/index.css';
import { icon } from '@apliteni/apliteni-ui';
import { AppShell, Button, Callout, Card, DataTable, EmptyState, StatBand } from '../react/dist/index.js';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useLayoutEffect, useState } from 'react';

type Note = { name: string; glyph: string; title: string; time: string; dateTime: string; href: string };

const notes: Note[] = [
  { name: 'n1', glyph: 'wallet', title: 'Invoice INV-2041 is paid', time: '2 min ago', dateTime: '2026-11-10T13:06', href: '#invoices/2041' },
  { name: 'n2', glyph: 'alert', title: 'Spring launch stopped at its daily budget', time: '18 min ago', dateTime: '2026-11-10T12:50', href: '#campaigns/spring-launch' },
  { name: 'n3', glyph: 'user', title: 'Maya Ortiz added you to the Growth team', time: '1 h ago', dateTime: '2026-11-10T12:04', href: '#teams/growth' },
  { name: 'n4', glyph: 'download', title: 'Your export of March clicks is ready', time: '3 h ago', dateTime: '2026-11-10T10:12', href: '#exports/march-clicks' },
  { name: 'n5', glyph: 'lock', title: 'The certificate for shop.example renews in 7 days', time: 'Yesterday', dateTime: '2026-11-09T16:30', href: '#domains/shop-example' },
  { name: 'n6', glyph: 'chart', title: 'The weekly report for 2–8 Nov is ready', time: 'Yesterday', dateTime: '2026-11-09T08:00', href: '#reports/weekly' },
];
const UNREAD = notes.length;

const sections = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/campaigns', label: 'Campaigns', icon: 'card' },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/agents', label: 'Access & agents', icon: 'user' },
  { href: '/prefs', label: 'Preferences', icon: 'gear' },
];
// Option D: a labelled section carries the shell's own count. 0 becomes undefined, so no badge is drawn.
const withNotes = (count: number) => [...sections.slice(0, 3), { href: '/notifications', label: 'Notifications', icon: 'bell', count: count || undefined }, ...sections.slice(3)];
const oneSection = [{ href: '/overview', label: 'Overview', icon: 'chart' }];
const account = { name: 'Sam Rivera', email: 'sam@example.com' };

const Glyph = ({ name, nav }: { name: string; nav?: boolean }) => <span className={nav ? 'ui-nav__ic' : undefined} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
const bellName = (count: number) => count > 0 ? `Notifications, ${count} unread` : 'Notifications';

// Option C: the bell is a link to the notifications page. It is drawn as the fold beside it is
// drawn, a nav row with a glyph, so it takes the rail's current plate and the nav's neutral count,
// the same count as option D's row. At zero the count is not drawn at all.
const BellLink = ({ count, current }: { count: number; current?: boolean }) =>
  <a className={`ui-nav__item proto-bell${current ? ' is-active' : ''}`} href="#notifications" aria-label={bellName(count)} aria-current={current ? 'page' : undefined}>
    <Glyph name="bell" nav />{count > 0 && <span className="ui-nav__badge is-neutral" aria-hidden="true">{count}</span>}
  </a>;

// A stand-in for a missing kit part: the phone bar of a shell with sections has no slot for a
// product control, so the bell is put before Menu here.
function BarBell({ count, current }: { count: number; current?: boolean }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const menu = document.querySelector('.ui-app__bar > .ui-app__menu');
    if (!menu) return;
    const span = document.createElement('span');
    span.className = 'ui-react-app__head-control proto-bar-bell';
    menu.before(span);
    setSlot(span);
    return () => span.remove();
  }, []);
  return slot && createPortal(<BellLink count={count} current={current} />, slot);
}

const columns = [
  { key: 'title', label: 'Notification', cell: 'title', linked: true,
    render: (note: Note) => <a href={note.href} className="proto-note"><Glyph name={note.glyph} /><span>{note.title}</span></a> },
  { key: 'time', label: 'Time', render: (note: Note) => <time dateTime={note.dateTime}>{note.time}</time> },
] as const;

// With no rows there is no table, so no column head moves.
const NotesTable = ({ rows }: { rows: Note[] }) => rows.length
  ? <DataTable caption="Notifications" columns={columns as never} rows={rows} selectable={false} pager={false} />
  : <Card><EmptyState variant="first-run" actions={<Button variant="secondary" href="#overview">Open Overview</Button>} /></Card>;

const campaigns = [
  { name: 'spring-launch', campaign: 'Spring launch', clicks: '4,210', conversions: '118', spend: '$640' },
  { name: 'brand-search', campaign: 'Brand search', clicks: '3,875', conversions: '131', spend: '$512' },
  { name: 'retargeting', campaign: 'Retargeting', clicks: '2,640', conversions: '64', spend: '$455' },
  { name: 'newsletter', campaign: 'Newsletter November', clicks: '1,755', conversions: '29', spend: '$313' },
];
const campaignColumns = [
  { key: 'campaign', label: 'Campaign', cell: 'title' },
  { key: 'clicks', label: 'Clicks', num: true },
  { key: 'conversions', label: 'Conversions', num: true },
  { key: 'spend', label: 'Spend', num: true },
] as const;

const Overview = () => <div className="ui-stack">
  <StatBand variant="band" label="Today" basis="Change from yesterday." stats={[
    { label: 'Clicks', value: '12,480', delta: { value: '+8%', tone: 'good' } },
    { label: 'Conversions', value: '342', delta: { value: '+5%', tone: 'good' } },
    { label: 'Spend', value: '$1,920', delta: { value: '−3%', tone: 'neutral' } },
  ]} />
  <DataTable caption="Campaigns today" columns={campaignColumns as never} rows={campaigns} selectable={false} pager={false} />
</div>;

type Bell = { count: number; current?: boolean };
function Shell({ bell, many = true, title, children, pathname, list }: {
  bell?: Bell; many?: boolean; title: string; children: React.ReactNode; pathname?: string; list?: typeof sections;
}) {
  return <AppShell sections={list ?? (many ? sections : oneSection)} pathname={pathname ?? '/overview'} title={title} word="Tracker"
    account={account} onSignOut={() => {}} headControl={bell && <BellLink {...bell} />}>
    {children}{bell && many && <BarBell {...bell} />}
  </AppShell>;
}

const failed = <Callout variant="danger" actions={<Button variant="secondary" icon="refresh">Retry</Button>}>
  Notifications did not load. Your other pages still work.
</Callout>;
const onNotes = { title: 'Notifications', pathname: '/notifications' };

const scenes: Record<string, () => JSX.Element> = {
  'c-side': () => <Shell {...onNotes} bell={{ count: UNREAD, current: true }}><NotesTable rows={notes} /></Shell>,
  'c-band': () => <Shell {...onNotes} many={false} bell={{ count: UNREAD, current: true }}><NotesTable rows={notes} /></Shell>,
  'c-overview': () => <Shell title="Overview" bell={{ count: UNREAD }}><Overview /></Shell>,
  'c-zero': () => <Shell title="Overview" bell={{ count: 0 }}><Overview /></Shell>,
  'c-empty': () => <Shell {...onNotes} bell={{ count: 0, current: true }}><NotesTable rows={[]} /></Shell>,
  'c-error': () => <Shell {...onNotes} bell={{ count: UNREAD, current: true }}>{failed}</Shell>,
  'd-nav': () => <Shell title="Overview" list={withNotes(UNREAD)}><Overview /></Shell>,
  'd-nav-zero': () => <Shell {...onNotes} list={withNotes(0)}><NotesTable rows={[]} /></Shell>,
};

const scene = location.hash.slice(1) || 'c-side';
document.documentElement.dataset.theme = 'light';
document.documentElement.dataset.scene = scene;
createRoot(document.getElementById('root')!).render(scenes[scene]());
