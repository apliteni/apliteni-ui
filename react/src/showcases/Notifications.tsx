import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { icon } from '@apliteni/apliteni-ui';
import { AppShell } from '../AppShell';
import { DataTable } from '../DataTable';
import { Dropdown, type DropdownItem } from '../Dropdown';
import { EmptyState } from '../EmptyState';
import { KeyValueList } from '../KeyValueList';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Callout } from '../primitives/Callout';
import { Card } from '../primitives/Card';
import './Notifications.css';

type Note = { id: string; glyph: string; title: string; sub: string; time: string; unread: boolean; text: string; facts: { label: string; value: string }[]; href: string };
export type NotificationsLoad = 'unread' | 'read' | 'empty' | 'error';
export type NotificationsPage = 'campaigns' | 'notifications';

/* Fabricated demo notifications. The first three are unread, so the bell counts 3. */
const NOTES: Note[] = [
  { id: 'payout', glyph: 'alert', title: 'Payout run PR-204 failed', sub: 'The bank refused 2 transfers.', time: '4 min', unread: true, href: '/payouts',
    text: 'The bank refused 2 of 18 transfers in payout run PR-204.', facts: [{ label: 'Run', value: 'PR-204' }, { label: 'Refused', value: '2 transfers' }, { label: 'Time', value: '4 min ago' }] },
  { id: 'assign', glyph: 'user', title: 'Mira Kade assigned you CMP-88', sub: 'Spring offer landing page', time: '1 h', unread: true, href: '/campaigns',
    text: 'Mira Kade assigned you the campaign CMP-88, Spring offer landing page.', facts: [{ label: 'Campaign', value: 'CMP-88' }, { label: 'From', value: 'Mira Kade' }, { label: 'Time', value: '1 h ago' }] },
  { id: 'comment', glyph: 'chat', title: 'Jon Avery commented on Spring offer', sub: 'Can we move the start date?', time: '3 h', unread: true, href: '/campaigns',
    text: 'Jon Avery asked: Can we move the start date?', facts: [{ label: 'Campaign', value: 'Spring offer' }, { label: 'From', value: 'Jon Avery' }, { label: 'Time', value: '3 h ago' }] },
  { id: 'report', glyph: 'download', title: 'Report March totals is ready', sub: 'CSV, 412 rows', time: 'Yesterday', unread: false, href: '/reports',
    text: 'The report March totals is ready to download.', facts: [{ label: 'Format', value: 'CSV' }, { label: 'Rows', value: '412' }, { label: 'Time', value: 'Yesterday' }] },
  { id: 'export', glyph: 'check', title: 'Export of campaign stats finished', sub: 'CSV, 96 rows', time: '2 d', unread: false, href: '/reports',
    text: 'The export of campaign stats finished.', facts: [{ label: 'Format', value: 'CSV' }, { label: 'Rows', value: '96' }, { label: 'Time', value: '2 days ago' }] },
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

/* A bare glyph strokes under 1.5px, so each takes a kit glyph class that sets its box and stroke:
   the bell the nav glyph's, as the head control does, and a page row the panel row's. */
const Glyph = ({ name, className }: { name: string; className?: string }) => <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
/** The bell's accessible name: the count is in the sentence, never only in the badge. */
export const bellName = (count: number) => count > 0 ? `Notifications, ${count} unread` : 'Notifications';
/* A control in the head or foot of a role=menu panel is one of its items, so the arrows reach it.
   A Button with href is always a link, so a panel control is a button that opens the page.
   why: docs/components.md, "A dropdown row you write yourself" */
const asItem = { role: 'menuitem', 'data-dd-item': '', tabIndex: -1 } as const;

export function Notifications({ layout = 'side', initialPage = 'campaigns', initialLoad = 'unread', defaultOpen = false }:
  { layout?: 'side' | 'top'; initialPage?: NotificationsPage; initialLoad?: NotificationsLoad; defaultOpen?: boolean }) {
  const [page, setPage] = useState<NotificationsPage>(initialPage);
  const [load, setLoad] = useState<NotificationsLoad>(initialLoad);
  const [open, setOpen] = useState(defaultOpen);
  const [picked, setPicked] = useState(NOTES[0].id);
  const notes = load === 'empty' || load === 'error' ? [] : NOTES.map(note => ({ ...note, unread: load === 'unread' && note.unread }));
  const count = notes.filter(note => note.unread).length;
  const chosen = notes.find(note => note.id === picked) ?? notes[0];
  const showPage = (next: NotificationsPage, id?: string) => { setOpen(false); setPage(next); if (id) setPicked(id); };
  const follow = (href: string) => (event: MouseEvent) => {
    event.preventDefault();
    showPage(href === '/notifications' ? 'notifications' : 'campaigns');
  };
  /* Mark all read and Retry remove the focused control, in the panel and on the page.
     So focus goes to the first row there after the render, or it falls to the page body. */
  const shell = useRef<HTMLDivElement>(null);
  const refocus = useRef<'panel' | 'page' | null>(null);
  const setLoadFrom = (where: 'panel' | 'page', next: NotificationsLoad) => () => { refocus.current = where; setLoad(next); };
  useEffect(() => {
    const where = refocus.current;
    refocus.current = null;
    if (where) shell.current?.querySelector<HTMLElement>(where === 'panel' ? '.notifications__panel a[data-dd-item]' : 'main tbody a')?.focus();
  }, [load]);

  const title = (note: Note) => <>{note.title}{note.unread && <span className="ui-sr">, unread</span>}</>;
  const retry = (where: 'panel' | 'page') => <Button variant="primary" size="sm" {...(where === 'panel' ? asItem : {})} onClick={setLoadFrom(where, 'unread')}>Retry</Button>;
  /* A menu may own only its items, so the danger callout, an alert, cannot stand in the panel.
     The panel says it with the empty state. The PR names the kit gap. */
  const failed = (where: 'panel' | 'page') => where === 'panel'
    ? <EmptyState icon="alert" title="Notifications did not load" sub="Check the connection, then try again." actions={retry('panel')} />
    : <Callout variant="danger" actions={retry('page')}><strong>Error:</strong> {FAILED}</Callout>;
  const nothing = (where: 'panel' | 'page') => <EmptyState icon="bell" title="No notifications" sub="Mentions, assignments and failed runs show here."
    actions={where === 'panel' ? <Button variant="secondary" size="sm" {...asItem} onClick={() => showPage('campaigns')}>Settings</Button>
      : <Button variant="secondary" size="sm" href="/settings" onClick={follow('/settings')}>Settings</Button>} />;

  const items: DropdownItem[] = notes.map(note => ({ label: note.title, value: note.id, href: `/notifications#${note.id}` }));
  const bell = <Dropdown variant="menu" chevron={false} ariaLabel={bellName(count)} align={layout === 'top' ? 'end' : 'start'}
    panelClass="notifications__panel" scroll={480} open={open} onOpenChange={setOpen}
    triggerContent={<span className="notifications__bell"><Glyph name="bell" className="ui-nav__ic" />{count > 0 && <span className="notifications__count" aria-hidden="true"><Badge>{count}</Badge></span>}</span>}
    header={<div className="ui-dropdown__head notifications__head"><b>Notifications</b>
      {count > 0 && <Button variant="secondary" size="sm" {...asItem} onClick={setLoadFrom('panel', 'read')}>Mark all read</Button>}</div>}
    footer={<>
      {load === 'error' && failed('panel')}
      {load === 'empty' && nothing('panel')}
      {notes.length > 0 && <div className="ui-dropdown__foot"><Button variant="secondary" size="sm" {...asItem} onClick={() => showPage('notifications')}>All notifications</Button></div>}
    </>}
    items={items}
    onSelect={value => showPage('notifications', String(value))}
    row={(item, props) => {
      const note = notes.find(n => n.id === item.value)!;
      return <a {...props} onClick={event => { event.preventDefault(); props.onClick(event); }}>
        <Glyph name={note.glyph} className="ui-dropdown__ic" />
        <span className="ui-dropdown__main"><span className="ui-dropdown__label">{title(note)}</span><span className="ui-dropdown__desc">{note.sub}</span></span>
        <span className="ui-dropdown__aside">{note.time}</span>
      </a>;
    }} />;

  const onNotes = page === 'notifications';
  return <div className="notifications" ref={shell}>
    <AppShell word="Product" brandHref="/campaigns" sections={layout === 'side' ? SECTIONS : SECTIONS.slice(0, 1)}
      pathname={onNotes ? '/notifications' : '/campaigns'} title={onNotes ? 'Notifications' : 'Campaigns'} width="wide"
      renderLink={(section, props) => <a {...props} onClick={event => { props.onClick?.(event); follow(section.href)(event); }} />}
      tools={onNotes && count > 0 ? <Button variant="secondary" size="sm" onClick={setLoadFrom('page', 'read')}>Mark all read</Button> : undefined}
      headControl={bell} account={{ name: 'Demo user', email: 'demo@example.com' }} onSignOut={() => {}}>
      {!onNotes ? <DataTable selectable={false} pager={false} scrollLabel="Campaigns" rows={CAMPAIGNS} columns={[
        { key: 'name', label: 'Campaign' },
        { key: 'status', label: 'Status', render: row => <Badge variant={row.tone}>{row.status}</Badge> },
        { key: 'visits', label: 'Visits', num: true },
      ]} /> : load === 'error' ? failed('page') : load === 'empty' ? nothing('page')
        : <div className="notifications__columns">
          <DataTable selectable={false} pager={false} scrollLabel="Notifications" rows={notes.map(note => ({ ...note, name: note.id }))} rowState={note => note.id === chosen.id ? 'target' : undefined} columns={[
            { key: 'title', label: 'Notification', cell: 'title', render: note => <span className="notifications__entry">
              <Glyph name={note.glyph} className="ui-dropdown__ic" />
              <span><a href={`#${note.id}`} aria-current={note.id === chosen.id ? 'true' : undefined}
                onClick={event => { event.preventDefault(); setPicked(note.id); }}>{title(note)}</a><span className="ui-table__sub">{note.sub}</span></span>
            </span> },
            { key: 'time', label: 'Time', num: true },
          ]} />
          <Card title={chosen.title}>
            <p>{chosen.text}</p>
            <KeyValueList rows={chosen.facts} />
            <div><Button variant="primary" href={chosen.href} onClick={follow(chosen.href)}>Open</Button></div>
          </Card>
        </div>}
    </AppShell>
  </div>;
}
