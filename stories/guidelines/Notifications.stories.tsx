// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { icon } from '@apliteni/apliteni-ui';
import { ConfirmPicture, GuidelinePage, NoticePicture, Raw, noop } from '../_guideline';
import { Dropdown, type DropdownItem } from '../../react/src/Dropdown';
import { EmptyState } from '../../react/src/EmptyState';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_notifications.js';

const content = await loadGuideline('notifications.md', new URL('../../guidelines/notifications.md', import.meta.url));

// Fabricated events. Each row's glyph, title and time share its first line.
const NOTES = [
  { value: 'payout', glyph: 'circleX', label: 'Payout run PR-204 failed', sub: 'The bank refused 2 transfers.', time: '4 min' },
  { value: 'assign', glyph: 'user', label: 'CMP-88 assigned to you', sub: 'By Mira Kade', time: '1 h' },
  { value: 'comment', glyph: 'chat', label: 'Jon Avery commented', sub: 'On CMP-88', time: '3 h' },
];
const ITEMS: DropdownItem[] = NOTES.map(({ value, label }) => ({ value, label, href: '#' }));

const Bell = () => <div className="gl-stage gl-stage--menu">
  <Dropdown variant="menu" chevron={false} ariaLabel="Notifications, 120 unread" open onOpenChange={noop}
    triggerContent={<span className="gn-bell"><span className="ui-nav__ic" aria-hidden="true"><Raw html={icon('bell')} /></span>
      <span aria-hidden="true"><Badge>99+</Badge></span></span>}
    header={<div className="ui-dropdown__head"><b>Notifications</b></div>}
    items={ITEMS}
    row={(item, props) => {
      const note = NOTES.find(n => n.value === item.value)!;
      return <a {...props} onClick={event => event.preventDefault()}>
        <span className="ui-dropdown__ic" aria-hidden="true"><Raw html={icon(note.glyph)} /></span>
        <span className="ui-dropdown__main"><span className="ui-dropdown__label">{note.label}</span><span className="ui-dropdown__desc">{note.sub}</span></span>
        <span className="ui-dropdown__aside">{note.time}</span>
      </a>;
    }} />
</div>;

const Notice = (props: Parameters<typeof NoticePicture>[0]) => <div className="gl-stage"><NoticePicture {...props} /></div>;

const specimens = [
  { id: 'bell-toast-callout',
    do: () => <Bell />,
    dont: () => <Notice tone="danger" title="Payout run PR-204 failed" text="The bank refused 2 transfers." /> },
  { id: 'read-state',
    do: () => <Notice tone="success" title="3 notifications marked read" action="Undo" />,
    dont: () => <div className="gl-stage gl-stage--confirm"><ConfirmPicture title="Mark all notifications read?"
      cancelLabel="Keep unread" confirmLabel="Mark all read" /></div> },
  { id: 'failed-load',
    do: () => <div className="gl-stage"><Card title="Notifications" level={3}>
      <Callout variant="danger" actions={<Button variant="primary" size="sm" onClick={noop}>Retry</Button>}>
        <strong>Error:</strong> Notifications did not load. Check the connection, then try again.</Callout></Card></div>,
    dont: () => <div className="gl-stage"><Card title="Notifications" level={3}>
      <EmptyState icon="bell" title="No notifications" sub="Mentions, assignments and failed runs show here." /></Card></div> },
];

const meta: Meta = { title: 'Guidelines/Notifications', parameters: { layout: 'fullscreen' } };
export default meta;

export const Notifications: StoryObj = {
  name: 'Notifications',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
