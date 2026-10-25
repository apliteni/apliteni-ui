// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { icon, rankGroups } from '@apliteni/apliteni-ui';
import { GuidelinePage } from '../_guideline';
import type { CommandGroup, CommandItem } from '../../react/src/CommandPalette';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_command-palette.js';

const content = await loadGuideline('command-palette.md', new URL('../../guidelines/command-palette.md', import.meta.url));

/* Every specimen is a picture of the React CommandPalette rather than the dialog,
 * because six modal palettes on one page would trap a reader in the first one.
 * It draws the palette's own markup with the kit's own ranking, so what is wrong
 * in a don't is the content, the order or the wording; never the markup.
 * `confirm` stands for the onConfirm a destructive row must carry. */
type Row = CommandItem & { confirm?: boolean };
const Glyph = ({ name, className }: { name: string; className: string }) =>
  <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
const keysOf = (shortcut?: string | string[]) => (shortcut == null ? [] : Array.isArray(shortcut) ? shortcut : [shortcut]);
const refused = (item: Row) => Boolean(item.disabled || (item.danger && !item.confirm));

const Palette = ({ groups, query = '', rank = true }: { groups: { label?: string; items: Row[] }[]; query?: string; rank?: boolean }) => {
  const shown = (rank ? rankGroups(groups, query) as CommandGroup[] : groups).filter(g => g.items.length) as { label?: string; items: Row[] }[];
  const active = shown.flatMap(g => g.items).find(item => !refused(item));
  return <div className="gc-stage"><div className="ui-cmdk is-open">
    <div className="ui-cmdk__scrim" />
    <div className="ui-cmdk__panel" role="group" aria-label="Command palette">
      <div className="ui-cmdk__search">
        <Glyph name="search" className="ui-cmdk__search-ic" />
        <input className="ui-cmdk__input" type="text" aria-label="Command palette" placeholder="Search or run a command…"
          defaultValue={query} readOnly autoComplete="off" spellCheck={false} />
      </div>
      <div className="ui-cmdk__list" role="listbox" aria-label="Command palette results">
        {shown.map((group, gi) => <div key={group.label ?? gi} className="ui-cmdk__group" role="group" aria-label={group.label}>
          {group.label && <div className="ui-cmdk__group-head">{group.label}</div>}
          {group.items.map(item => {
            const off = refused(item);
            return <div key={item.id} role="option" aria-selected={item === active} aria-disabled={off || undefined}
              aria-haspopup={item.danger && item.confirm && !off ? 'dialog' : undefined}
              className={['ui-cmdk__item', item.danger && !off && 'is-danger', off && 'is-disabled', item === active && 'is-active'].filter(Boolean).join(' ')}>
              {item.icon && <Glyph name={item.icon} className="ui-cmdk__ic" />}
              <span className="ui-cmdk__main">
                <span className="ui-cmdk__label">{item.label}</span>
                {item.description && <span className="ui-cmdk__desc">{item.description}</span>}
              </span>
              {item.badge && <span className="ui-cmdk__badge">{item.badge}</span>}
              {keysOf(item.shortcut).length > 0 && <span className="ui-cmdk__keys" aria-hidden="true">
                {keysOf(item.shortcut).map(k => <kbd key={k} className="ui-cmdk__key">{k}</kbd>)}
              </span>}
            </div>;
          })}
        </div>)}
      </div>
      <p className="ui-cmdk__empty" hidden={shown.length > 0}>No matches</p>
    </div>
  </div></div>;
};

// One product's list, so a reader comparing two specimens is comparing the rule
// and not the content: the finance portal's surfaces, named the way its own
// navigation names them.
const ACTIONS: Row[] = [
  { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus', shortcut: ['n'] },
  { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
  { id: 'export', label: 'Export rows as CSV', description: 'The current filter, all pages', icon: 'download' },
];
const PLACES: Row[] = [
  { id: 'reports', label: 'Reports', description: 'Revenue, payouts and fees', icon: 'chart', href: '#r' },
  { id: 'transactions', label: 'Transactions', description: '4,812 rows this month', icon: 'table', href: '#t' },
  { id: 'settings', label: 'Settings', description: 'Billing, members, API keys', icon: 'gear', href: '#s' },
];
const RECENT: Row[] = [
  { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc', badge: 'Unpaid', href: '#i1' },
  { id: 'inv-4809', label: 'INV-4809', description: 'Orbit GmbH · €960 · paid', icon: 'doc', href: '#i2' },
];
const GROUPED = [{ label: 'Actions', items: ACTIONS }, { label: 'Go to', items: PLACES }, { label: 'Recent', items: RECENT }];

const specimens = [
  { id: 'named-things', do: () => <Palette groups={GROUPED} />,
    // Four rows nobody would type: a heading that is not a command, a setting that
    // cannot be done here, the page the reader is already on, and a word that
    // names a menu rather than an action.
    dont: () => <Palette groups={[{ label: 'Actions', items: [
      { id: 'adv', label: 'Advanced…', description: 'More options', icon: 'gear' },
      { id: 'freq', label: 'Notification frequency', description: 'Daily, weekly or never', icon: 'bell' },
      { id: 'here', label: 'Transactions', description: 'You are here', icon: 'table' },
      { id: 'more', label: 'More', description: '', icon: 'grid' },
    ] }]} /> },
  { id: 'groups', do: () => <Palette groups={GROUPED} />, dont: () => <Palette groups={[{ items: [...ACTIONS, ...PLACES, ...RECENT] }]} /> },
  { id: 'ranking', do: () => <Palette groups={GROUPED} query="inv" />,
    // The same query answered alphabetically: `rank={false}` is the seam a
    // server-fed palette uses, and this is an order nobody ranked.
    dont: () => <Palette rank={false} query="inv" groups={[{ label: 'Results', items: [
      { id: 'inv-4809', label: 'INV-4809', description: 'Orbit GmbH · €960 · paid', icon: 'doc' },
      { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc' },
      { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
      { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus' },
    ] }]} /> },
  { id: 'keyboard' },
  { id: 'say-it' },
  { id: 'ask-first',
    do: () => <Palette groups={[{ label: 'Danger zone', items: [
      { id: 'del', label: 'Delete workspace…', description: 'Nebula · 42 API keys', icon: 'trash', danger: true, confirm: true },
      { id: 'revoke', label: 'Revoke every API key…', description: 'They stop working at once', icon: 'key', danger: true, confirm: true },
    ] }]} />,
    // `danger` and no confirm, which is what the caption is about: the palette
    // draws the pair disabled rather than running them.
    dont: () => <Palette groups={[{ label: 'Danger zone', items: [
      { id: 'del', label: 'Delete workspace', description: 'Nebula · 42 API keys', icon: 'trash', danger: true },
      { id: 'revoke', label: 'Revoke every API key', description: 'They stop working at once', icon: 'key', danger: true },
    ] }]} /> },
];

const meta: Meta = { title: 'Guidelines/The command palette', parameters: { layout: 'fullscreen' } };
export default meta;

export const CommandPalette: StoryObj = {
  name: 'The command palette',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
