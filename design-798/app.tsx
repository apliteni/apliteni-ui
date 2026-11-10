// Prototype scenes for apliteni-ui #798. Each scene is one picture. Demo data is fabricated.
import '../src/index.css';
import '../react/dist/index.css';
import { icon } from '@apliteni/apliteni-ui';
import {
  AppShell, Button, Callout, Card, DataTable, Drawer, DrawerSection, Dropdown, EmptyState, Timeline,
} from '../react/dist/index.js';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';

type Note = { name: string; glyph: string; title: string; time: string; when: string; dateTime: string; href: string; link: string; kind: 'person' | 'rule' };

const notes: Note[] = [
  { name: 'n1', glyph: 'wallet', title: 'Invoice INV-2041 is paid', time: '2 min ago', when: '13:06', dateTime: '2026-11-10T13:06', href: '#invoices/2041', link: 'Open invoice', kind: 'rule' },
  { name: 'n2', glyph: 'alert', title: 'Spring launch stopped at its daily budget', time: '18 min ago', when: '12:50', dateTime: '2026-11-10T12:50', href: '#campaigns/spring-launch', link: 'Open campaign', kind: 'rule' },
  { name: 'n3', glyph: 'user', title: 'Maya Ortiz added you to the Growth team', time: '1 h ago', when: '12:04', dateTime: '2026-11-10T12:04', href: '#teams/growth', link: 'Open team', kind: 'person' },
  { name: 'n4', glyph: 'download', title: 'Your export of March clicks is ready', time: '3 h ago', when: '10:12', dateTime: '2026-11-10T10:12', href: '#exports/march-clicks', link: 'Download export', kind: 'rule' },
  { name: 'n5', glyph: 'lock', title: 'The certificate for shop.example renews in 7 days', time: 'Yesterday', when: '9 Nov', dateTime: '2026-11-09T16:30', href: '#domains/shop-example', link: 'Open domain', kind: 'rule' },
  { name: 'n6', glyph: 'chart', title: 'The weekly report for 2–8 Nov is ready', time: 'Yesterday', when: '9 Nov', dateTime: '2026-11-09T08:00', href: '#reports/weekly', link: 'Open report', kind: 'rule' },
];
const UNREAD = notes.length;

const sections = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/campaigns', label: 'Campaigns', icon: 'card' },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/agents', label: 'Access & agents', icon: 'user' },
  { href: '/prefs', label: 'Preferences', icon: 'gear' },
];
// Option D: the simpler option. A labelled section carries the shell's own count. 0 becomes undefined, so no badge is drawn.
const withNotes = (count: number) => [...sections.slice(0, 3), { href: '/notifications', label: 'Notifications', icon: 'bell', count: count || undefined }, ...sections.slice(3)];
const oneSection = [{ href: '/overview', label: 'Overview', icon: 'chart' }];
const account = { name: 'Sam Rivera', email: 'sam@example.com' };

const Glyph = ({ name }: { name: string }) => <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
// The count rides in the trigger as the nav's accent badge. At zero the badge is not drawn at all.
const BellFace = ({ count }: { count: number }) => <>
  <Glyph name="bell" />{count > 0 && <span className="ui-nav__badge is-accent" aria-hidden="true">{count}</span>}
</>;
const Count = ({ n }: { n: number }) => <span className="ui-nav__badge is-accent" aria-hidden="true">{n}</span>;
const bellName = (count: number) => count > 0 ? `Notifications, ${count} unread` : 'Notifications';

// Variant A: a menu panel at the bell.
function BellMenu({ count, open }: { count: number; open: boolean }) {
  const [isOpen, setOpen] = useState(open);
  return <Dropdown variant="menu" chevron={false} ariaLabel={bellName(count)} triggerClass="proto-bell"
    triggerContent={<BellFace count={count} />} open={isOpen} onOpenChange={setOpen} align="start"
    scroll={480}
    search={{ placeholder: 'Search notifications', label: 'Search notifications', empty: 'No notification matches' }}
    header={<div className="ui-dropdown__head"><strong>Notifications</strong></div>}
    footer={<div className="ui-dropdown__foot"><Button variant="ghost" size="sm" href="#notifications">View all</Button></div>}
    items={notes.map(note => ({ label: note.title, description: note.time, icon: note.glyph, href: note.href, value: note.name }))} />;
}

// Variant B: the bell opens a drawer on its own side.
function BellDrawer({ count, side, open: start = true }: { count: number; side: 'left' | 'right'; open?: boolean }) {
  const [open, setOpen] = useState(start);
  return <>
    <Button variant="ghost" leading={<Glyph name="bell" />} aria-label={bellName(count)} aria-expanded={open} onClick={() => setOpen(true)}>{count > 0 ? <Count n={count} /> : null}</Button>
    <Drawer open={open} title="Notifications" side={side} size="sm" onClose={() => setOpen(false)}
      footer={<Button variant="secondary" href="#notifications">View all</Button>}>
      <DrawerSection title="Today">
        <Timeline aria-label="Today" events={notes.slice(0, 4).map(note => ({ id: note.name, kind: note.kind, actor: note.title,
          dateTime: note.dateTime, timestamp: note.time, meta: <a href={note.href}>{note.link}</a> }))} />
      </DrawerSection>
      <DrawerSection title="Earlier">
        <Timeline aria-label="Earlier" events={notes.slice(4).map(note => ({ id: note.name, kind: note.kind, actor: note.title,
          dateTime: note.dateTime, timestamp: note.time, meta: <a href={note.href}>{note.link}</a> }))} />
      </DrawerSection>
    </Drawer>
  </>;
}

// Variant C: the bell is a link to the notifications page.
const BellLink = ({ count, current }: { count: number; current?: boolean }) => count > 0
  ? <Button variant="ghost" className="proto-bell" href="#notifications" leading={<Glyph name="bell" />} aria-label={bellName(count)} aria-current={current ? 'page' : undefined}><Count n={count} /></Button>
  : <Button variant="ghost" href="#notifications" icon="bell" iconOnly aria-label={bellName(count)} aria-current={current ? 'page' : undefined} />;

const columns = [
  { key: 'title', label: 'Notification', cell: 'title', linked: true, rowHeader: true,
    render: (note: Note) => <a href={note.href} className="proto-note"><Glyph name={note.glyph} /><span>{note.title}</span></a> },
  { key: 'time', label: 'Time', render: (note: Note) => <time dateTime={note.dateTime}>{note.time}</time> },
] as const;

const NotesTable = ({ rows }: { rows: Note[] }) =>
  <DataTable caption="Notifications" columns={columns as never} rows={rows} selectable={false} pager={false}
    empty={<EmptyState variant="first-run" actions={<Button variant="secondary" href="/overview">Open Overview</Button>} />} />;

function Overview() {
  return <Card><p>Overview content of the product page.</p></Card>;
}

function Shell({ control, many = true, title, lede, children, pathname, list }: {
  control?: React.ReactNode; many?: boolean; title: string; lede?: string; children: React.ReactNode; pathname?: string; list?: typeof sections;
}) {
  return <AppShell sections={list ?? (many ? sections : oneSection)} pathname={pathname ?? '/overview'} title={title} word="Tracker"
    lede={lede} account={account} onSignOut={() => {}} headControl={control}>{children}</AppShell>;
}

const scenes: Record<string, () => JSX.Element> = {
  'a-side': () => <Shell title="Overview" control={<BellMenu count={UNREAD} open />}><Overview /></Shell>,
  'a-band': () => <Shell many={false} title="Overview" control={<BellMenu count={UNREAD} open />}><Overview /></Shell>,
  'b-side': () => <Shell title="Overview" control={<BellDrawer count={UNREAD} side="left" />}><Overview /></Shell>,
  'b-band': () => <Shell many={false} title="Overview" control={<BellDrawer count={UNREAD} side="right" />}><Overview /></Shell>,
  'b-side-closed': () => <Shell title="Overview" control={<BellDrawer count={UNREAD} side="left" open={false} />}><Overview /></Shell>,
  'b-band-closed': () => <Shell many={false} title="Overview" control={<BellDrawer count={UNREAD} side="right" open={false} />}><Overview /></Shell>,
  'c-side': () => <Shell title="Notifications" pathname="/notifications" control={<BellLink count={UNREAD} current />}><NotesTable rows={notes} /></Shell>,
  'c-band': () => <Shell many={false} title="Notifications" pathname="/notifications" control={<BellLink count={UNREAD} current />}><NotesTable rows={notes} /></Shell>,
  'c-zero': () => <Shell title="Overview" control={<BellLink count={0} />}><Overview /></Shell>,
  'c-empty': () => <Shell title="Notifications" pathname="/notifications" control={<BellLink count={0} current />}><NotesTable rows={[]} /></Shell>,
  'c-error': () => <Shell title="Notifications" pathname="/notifications" control={<BellLink count={UNREAD} current />}>
    <Callout variant="danger" actions={<Button variant="secondary" icon="refresh">Retry</Button>}>
      Notifications did not load. Your other pages still work.
    </Callout>
  </Shell>,
  'c-phone-bar': () => <Shell title="Overview" control={<BellLink count={UNREAD} />}><Overview /></Shell>,
  'c-phone-menu': () => <Shell title="Overview" control={<BellLink count={UNREAD} />}><Overview /></Shell>,
  'c-phone-list': () => <Shell title="Notifications" pathname="/notifications" control={<BellLink count={UNREAD} current />}><NotesTable rows={notes} /></Shell>,
  'd-nav': () => <Shell title="Overview" list={withNotes(UNREAD)}><Overview /></Shell>,
  'd-nav-zero': () => <Shell title="Notifications" pathname="/notifications" list={withNotes(0)}><NotesTable rows={[]} /></Shell>,
  'd-phone-menu': () => <Shell title="Overview" list={withNotes(UNREAD)}><Overview /></Shell>,
};

const scene = location.hash.slice(1) || 'a-side';
document.documentElement.dataset.theme = 'light';
document.documentElement.dataset.scene = scene;
createRoot(document.getElementById('root')!).render(scenes[scene]());
