import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { icon } from '@apliteni/apliteni-ui';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { Dropdown, type DropdownItem } from '../Dropdown';
import { EmptyState } from '../EmptyState';
import { BusyRegion, Skeleton, SkeletonTable } from '../Loading';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Callout } from '../primitives/Callout';
import { Toast, useToast } from '../Toast';
import './Notifications.css';

type Note = { id: string; glyph: string; title: string; sub: string; time: string; unread: boolean; text: string;
  path: string; record: string; section: string };
export type NotificationsLoad = 'loading' | 'unread' | 'read' | 'empty' | 'error';
export type NotificationsPage = 'campaigns' | 'notifications' | 'record';

/* Fabricated demo notifications. The first three are unread, so the bell counts 3.
   A circled glyph is a state, so a failed run and a finished export take one. Each opens its record's own page,
   where the title names the record and the text says what happened, so no fact shows twice. */
const NOTES: Note[] = [
  { id: 'payout', glyph: 'circleX', title: 'Payout run PR-204 failed', sub: 'The bank refused 2 transfers.', time: '4 min', unread: true,
    path: '/payouts/pr-204', record: 'Payout run PR-204', section: '/payouts',
    text: 'The bank refused 2 of 18 transfers.' },
  { id: 'assign', glyph: 'user', title: 'Mira Kade assigned you CMP-88', sub: 'Spring offer landing page', time: '1 h', unread: true,
    path: '/campaigns/cmp-88', record: 'CMP-88 landing page', section: '/campaigns',
    text: 'Mira Kade assigned this campaign to you.' },
  { id: 'comment', glyph: 'chat', title: 'Jon Avery commented on Spring offer', sub: 'Can we move the start date?', time: '3 h', unread: true,
    path: '/campaigns/spring-offer', record: 'Spring offer', section: '/campaigns',
    text: 'Jon Avery asked: Can we move the start date?' },
  { id: 'report', glyph: 'download', title: 'Report March totals is ready', sub: 'CSV, 412 rows', time: 'Yesterday', unread: false,
    path: '/reports/march-totals', record: 'March totals', section: '/reports',
    text: 'The report is ready to download as a CSV file of 412 rows.' },
  { id: 'export', glyph: 'circleCheck', title: 'Export of campaign stats finished', sub: 'CSV, 96 rows', time: '2 d', unread: false,
    path: '/reports/campaign-stats', record: 'Campaign stats', section: '/reports',
    text: 'The export finished as a CSV file of 96 rows.' },
];
const CAMPAIGNS = [
  { name: 'Spring offer', status: 'Active', tone: 'success', visits: '1,240' },
  { name: 'CMP-88 landing page', status: 'Draft', tone: 'neutral', visits: '0' },
  { name: 'Winter sale', status: 'Ended', tone: 'neutral', visits: '8,310' },
];
const SECTIONS = [
  { href: '/campaigns', label: 'Campaigns', icon: 'home' },
  { href: '/reports', label: 'Reports', icon: 'download' },
  { href: '/payouts', label: 'Payouts', icon: 'calendar' },
  { href: '/settings', label: 'Settings', icon: 'gear' },
];
const FAILED = 'Notifications did not load. Check the connection, then try again.';
const START = { campaigns: '/campaigns', notifications: '/notifications', record: NOTES[0].path };

/* A bare glyph strokes under 1.5px, so each takes a kit glyph class that sets its box and stroke:
   the bell the nav glyph's, as the head control does, and a page row the panel row's. */
const Glyph = ({ name, className }: { name: string; className?: string }) => <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
/** The bell's accessible name: the count is in the sentence, never only in the badge. */
export const bellName = (count: number) => count > 0 ? `Notifications, ${count} unread` : 'Notifications';
/* A control in the head or foot of a role=menu panel is one of its items, so the arrows reach it.
   A Button with href is always a link, so a panel control is a button that opens the page.
   why: docs/components.md, "A dropdown row you write yourself" */
const asItem = { role: 'menuitem', 'data-dd-item': '', tabIndex: -1 } as const;

/* markedAllRead starts the screen just after Mark all read: each row read and the toast with Undo showing. */
type Props = { layout?: 'side' | 'top'; initialPage?: NotificationsPage; initialLoad?: NotificationsLoad; defaultOpen?: boolean; markedAllRead?: boolean };

/* Mark all read says so in a toast with Undo, so the screen sits inside the toast provider. */
export function Notifications(props: Props) {
  return <Toast><Screen {...props} /></Toast>;
}

function Screen({ layout = 'side', initialPage = 'campaigns', initialLoad = 'unread', defaultOpen = false, markedAllRead = false }: Props) {
  const toast = useToast();
  const [path, setPath] = useState(START[initialPage]);
  const [load, setLoad] = useState<NotificationsLoad>(markedAllRead ? 'read' : initialLoad);
  const [open, setOpen] = useState(defaultOpen);
  /* Opening a notification marks it read. Mark all read and its Undo leave this set alone. */
  const [seen, setSeen] = useState<string[]>(initialPage === 'record' ? [NOTES[0].id] : []);
  const notes = load === 'unread' || load === 'read' ? NOTES.map(note => ({ ...note, unread: load === 'unread' && note.unread && !seen.includes(note.id) })) : [];
  const count = notes.filter(note => note.unread).length;
  const go = (next: string) => { setOpen(false); setPath(next); };
  const openNote = (note: Note) => { setSeen(ids => ids.includes(note.id) ? ids : [...ids, note.id]); go(note.path); };
  const follow = (href: string) => (event: MouseEvent) => { event.preventDefault(); go(href); };
  /* Mark all read and Retry remove the focused control, in the panel and on the page.
     So focus goes to the first row there after the render, or it falls to the page body. */
  const shell = useRef<HTMLDivElement>(null);
  const refocus = useRef<'panel' | 'page' | null>(null);
  const setLoadFrom = (where: 'panel' | 'page', next: NotificationsLoad) => () => { refocus.current = where; setLoad(next); };
  const announce = (marked: number) => toast({ title: `${marked} notifications marked read`, action: { label: 'Undo', onClick: () => setLoad('unread') } });
  const markAllRead = (where: 'panel' | 'page') => () => { setLoadFrom(where, 'read')(); announce(count); };
  useEffect(() => { if (markedAllRead) announce(NOTES.filter(note => note.unread).length); }, []);
  useEffect(() => {
    const where = refocus.current;
    refocus.current = null;
    if (where) shell.current?.querySelector<HTMLElement>(where === 'panel' ? '.notifications__panel a[data-dd-item]' : 'main tbody a')?.focus();
  }, [load]);
  /* The shell's back link is a plain link, so the showcase catches its click here and stays in this tab. */
  const back = (event: MouseEvent) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a.ui-back');
    if (link) follow(link.getAttribute('href')!)(event);
  };

  const title = (note: Note) => <>{note.title}{note.unread && <span className="ui-sr">, unread</span>}</>;
  const retry = (where: 'panel' | 'page') => <Button variant="primary" size="sm" {...(where === 'panel' ? asItem : {})} onClick={setLoadFrom(where, 'unread')}>Retry</Button>;
  /* A menu may own only its items, so the danger callout, an alert, cannot stand in the panel.
     The panel says it with the empty state. The PR names the kit gap. */
  const failed = (where: 'panel' | 'page') => where === 'panel'
    ? <EmptyState icon="circleAlert" title="Notifications did not load" sub="Check the connection, then try again." actions={retry('panel')} />
    : <Callout variant="danger" actions={retry('page')}><strong>Error:</strong> {FAILED}</Callout>;
  const nothing = (where: 'panel' | 'page') => <EmptyState icon="bell" title="No notifications" sub="Mentions, assignments and failed runs show here."
    actions={where === 'panel' ? <Button variant="secondary" size="sm" {...asItem} onClick={() => go('/settings')}>Settings</Button>
      : <Button variant="secondary" size="sm" href="/settings" onClick={follow('/settings')}>Settings</Button>} />;

  const items: DropdownItem[] = notes.map(note => ({ label: note.title, value: note.id, href: note.path }));
  const bell = <Dropdown variant="menu" chevron={false} ariaLabel={bellName(count)} align={layout === 'top' ? 'end' : 'start'}
    panelClass="notifications__panel" scroll={480} open={open} onOpenChange={setOpen}
    triggerContent={<span className="notifications__bell"><Glyph name="bell" className="ui-nav__ic" />{count > 0 && <span className="notifications__count" aria-hidden="true"><Badge>{count}</Badge></span>}</span>}
    header={<div className="ui-dropdown__head notifications__head"><b>Notifications</b>
      {count > 0 && <Button variant="secondary" size="sm" {...asItem} onClick={markAllRead('panel')}>Mark all read</Button>}</div>}
    footer={<>
      {load === 'loading' && <div className="ui-dropdown__foot"><Skeleton lines={3} /></div>}
      {load === 'error' && failed('panel')}
      {load === 'empty' && nothing('panel')}
      {/* A menu needs an item, so a loading panel keeps the way to the page. */}
      {(notes.length > 0 || load === 'loading') && <div className="ui-dropdown__foot"><Button variant="secondary" size="sm" {...asItem} onClick={() => go('/notifications')}>All notifications</Button></div>}
    </>}
    items={items}
    onSelect={value => openNote(NOTES.find(note => note.id === value)!)}
    row={(item, props) => {
      const note = notes.find(n => n.id === item.value)!;
      return <a {...props} onClick={event => { event.preventDefault(); props.onClick(event); }}>
        <Glyph name={note.glyph} className="ui-dropdown__ic" />
        <span className="ui-dropdown__main"><span className="ui-dropdown__label">{title(note)}</span><span className="ui-dropdown__desc">{note.sub}</span></span>
        <span className="ui-dropdown__aside">{note.time}</span>
      </a>;
    }} />;

  const record = NOTES.find(note => note.path === path);
  const section = SECTIONS.find(s => s.href === (record?.section ?? path));
  const onNotes = path === '/notifications';
  const list = <DataTable selectable={false} pager={false} scrollLabel="Notifications" rows={notes.map(note => ({ ...note, name: note.id }))} columns={[
    { key: 'title', label: 'Notification', cell: 'title', render: note => <span className="notifications__entry">
      <Glyph name={note.glyph} className="ui-dropdown__ic" />
      <span><a href={note.path} onClick={event => { event.preventDefault(); openNote(note); }}>{title(note)}</a><span className="ui-table__sub">{note.sub}</span></span>
    </span> },
    { key: 'time', label: 'Time', num: true },
  ]} />;
  const body = record ? <p>{record.text}</p>
    : onNotes ? load === 'loading' ? <BusyRegion busy label="Loading notifications" placeholder={<SkeletonTable rows={5} cols={2} />} />
      : load === 'error' ? failed('page') : load === 'empty' ? nothing('page') : list
    : path === '/campaigns' ? <DataTable selectable={false} pager={false} scrollLabel="Campaigns" rows={CAMPAIGNS} columns={[
      { key: 'name', label: 'Campaign' },
      { key: 'status', label: 'Status', render: row => <Badge variant={row.tone}>{row.status}</Badge> },
      { key: 'visits', label: 'Visits', num: true },
    ]} /> : <EmptyState variant="not-yet-built" title="Not in this demo" sub="This showcase draws only the Campaigns and Notifications pages." />;

  return <div className="notifications" ref={shell} onClick={back}>
    <AppShell word="Product" brandHref="/campaigns" sections={layout === 'side' ? SECTIONS : SECTIONS.slice(0, 1)}
      pathname={record ? record.section : path} title={record?.record ?? (onNotes ? 'Notifications' : section?.label ?? 'Campaigns')} width="wide"
      back={record && section ? { href: section.href, label: section.label } : undefined}
      tools={onNotes && count > 0 ? <Button variant="secondary" size="sm" onClick={markAllRead('page')}>Mark all read</Button> : undefined}
      renderLink={(s, props) => <a {...props} onClick={event => { props.onClick?.(event); follow(s.href)(event); }} />}
      headControl={bell} account={{ name: 'Demo user', email: 'demo@example.com' }} onSignOut={() => {}}>
      {body}
    </AppShell>
  </div>;
}
