import { Fragment } from 'react';
import { Avatar } from './primitives/Avatar';

export type DropdownBadge = string | { text: string; tone?: string };

export type DropdownAvatar = { key?: string | number; name?: string | null; src?: string; empty?: boolean };

export type DropdownItem = {
  label: string;
  /** The pick, as `onSelect` reports it and as `data-value` carries it. */
  value?: string | number;
  description?: string;
  /** A kit glyph name, drawn in the row's leading slot. */
  icon?: string;
  /** A person's mark in the leading slot, in place of `icon`. `key` picks the hue, `name` the
   *  letters, `src` a photo. `{ empty: true }` is the dashed ring of a "No one" row. */
  avatar?: DropdownAvatar;
  badge?: DropdownBadge;
  /** A row that stays selectable but is no longer current, named by its state word, e.g.
   *  'Archived'. The word takes the badge slot in state ink, and the trigger shows it after
   *  the label. Use `disabled` for a row that cannot be picked. */
  muted?: string;
  selected?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** A row that goes somewhere. A `select` row never becomes a link, as the factory decides it. */
  href?: string;
  target?: string;
};

// A trailing status badge. A string reading "live" in any case takes the live tone.
export function RowBadge({ badge }: { badge: DropdownBadge }) {
  const text = typeof badge === 'string' ? badge : badge.text;
  const given = typeof badge === 'string' ? '' : (badge.tone || '');
  let tone = given || (/^live$/i.test(String(text)) ? 'live' : 'neutral');
  if (!given && tone === 'neutral' && /^(?:off|unset|disabled|archive|archived)$/i.test(text)) tone = 'state';
  return <span className={`ui-dropdown__badge is-${tone}`}>{text}</span>;
}

/** A muted row's state word, or nothing for a blank one. */
export const mutedOf = (it: DropdownItem | undefined) => it?.muted?.trim() || '';

/** The trigger's words for a chosen row: a muted row keeps its state word there too. */
export const shownOf = (it: DropdownItem | undefined) => (mutedOf(it) ? `${it?.label} (${mutedOf(it)})` : it?.label);

const markOf = (item: DropdownItem) => (item.avatar
  ? <Avatar personKey={item.avatar.key} name={item.avatar.name} src={item.avatar.src} empty={item.avatar.empty} />
  : <Avatar empty />);

/** A select's hidden rows in a Field, which make its trigger as wide as its widest row. */
export function FitRows({ rows, marked, placeholder }: { rows: DropdownItem[]; marked: boolean; placeholder: string }) {
  return (
    <span className="ui-dropdown__fit" aria-hidden="true">
      <span className="ui-dropdown__line">
        {marked && <Avatar empty />}
        <span className={marked ? 'ui-dropdown__value is-placeholder' : 'ui-dropdown__value'}>{placeholder}</span>
      </span>
      {/* Each row once as its panel row draws it, with its badge, and a muted row once more
          as the trigger shows it, with its word. #888 */}
      {rows.map((item, index) => {
        const mark = marked && markOf(item);
        const badge = mutedOf(item) ? { text: mutedOf(item), tone: 'state' as const } : item.badge;
        return (
          <Fragment key={index}>
            <span className="ui-dropdown__line">
              {mark}
              <span className="ui-dropdown__value">{item.label}</span>
              {badge && <RowBadge badge={badge} />}
            </span>
            {mutedOf(item) && <span className="ui-dropdown__line">
              {mark}
              <span className="ui-dropdown__value">{shownOf(item)}</span>
            </span>}
          </Fragment>
        );
      })}
    </span>
  );
}
