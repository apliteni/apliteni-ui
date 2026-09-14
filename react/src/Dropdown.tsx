import {
  Fragment, useCallback, useEffect, useId, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode,
} from 'react';
import { icon, dropdownMatch, dropdownFiltering } from '@apliteni/apliteni-ui';
import { useIsoLayoutEffect } from './dialog';

// The React face of the kit's dropdown() factory and of wireDropdown()'s keyboard.
// The vanilla output is the source of truth for every class, role and aria
// attribute here, and Dropdown.test.tsx compares the two shape by shape — a rule
// this file expresses differently from src/components/dropdown.js is a failure
// there rather than a drift. The one rule that is not re-expressed at all is the
// search match: dropdownMatch() is imported, so a list a server rendered and the
// same list after a keystroke hide the same rows.
// why: docs/specification.md#the-dropdown-panel
// why: docs/specification.md#a-dropdown-row-is-a-div-a-link-or-a-button
// why: docs/specification.md#a-dropdown-with-a-search-field

export type DropdownBadge = string | { text: string; tone?: string };

export type DropdownItem = {
  label: string;
  /** The pick, as `onSelect` reports it and as `data-value` carries it. */
  value?: string | number;
  description?: string;
  /** A kit glyph name, drawn in the row's leading slot. */
  icon?: string;
  badge?: DropdownBadge;
  selected?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** A row that goes somewhere. A `select` row never becomes a link, as the factory decides it. */
  href?: string;
  target?: string;
};

/** A rule between rows. `'---'` is the factory's shorthand for the same thing. */
export type DropdownSeparator = '---' | { separator: true };
export type DropdownEntry = DropdownItem | DropdownSeparator;
export type DropdownSection = { label?: string; items?: DropdownEntry[] };

/** The field above the rows. `true` takes every default. */
export type DropdownSearch = {
  placeholder?: string;
  /** Names the field. Without one it is named "Search " + the dropdown's name. */
  label?: string;
  /** The no-match line. `{q}` in it stands for the query. */
  empty?: string;
  /** The nudge under it. */
  hint?: string;
  /** What the field holds before it is opened; every open starts from the whole list. */
  query?: string;
};

/**
 * What a row has to carry to be a row: the classes, the role, the tab stop the
 * panel moves itself, the pick and the click. Spread it onto whatever element the
 * row should be — a router `<Link>`, a `<button>`, anything.
 */
export type DropdownRowProps = {
  className: string;
  role: 'option' | 'menuitem';
  tabIndex: -1;
  'data-dd-item': string;
  'data-value'?: string;
  'aria-selected'?: boolean;
  'aria-disabled'?: true;
  href?: string;
  target?: string;
  /** Only with `search`: the field names the row Enter would pick. */
  id?: string;
  hidden?: boolean;
  onClick: (e: ReactMouseEvent) => void;
  children: ReactNode;
};

export type DropdownProps = {
  /** Muted prefix in the trigger, e.g. "version:". */
  label?: string;
  /** What the trigger shows. Given one, the trigger is yours to update. */
  value?: string;
  placeholder?: string;
  /** Inferred from the items when it is left out, exactly as the factory infers it. */
  variant?: 'select' | 'menu';
  items?: DropdownEntry[];
  /** Grouped alternative to `items`. */
  sections?: DropdownSection[];
  header?: ReactNode;
  footer?: ReactNode;
  /** Replaces the trigger's label/value pair. With `ariaLabel`, names the trigger. */
  triggerContent?: ReactNode;
  triggerClass?: string;
  chevron?: boolean;
  /** The edge the panel hugs. */
  align?: 'start' | 'end';
  /** `'up'` opens into the space above the trigger. */
  direction?: 'down' | 'up';
  /** `true`, or a max height in px, to cap the panel and scroll it. */
  scroll?: boolean | number;
  /** A field above the rows that filters them as the reader types. */
  search?: boolean | DropdownSearch;
  ariaLabel?: string;
  id?: string;
  panelClass?: string;
  /** Controlled: the host owns the open state and answers `onOpenChange`. */
  open?: boolean;
  /** Uncontrolled: where it starts. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (value: string | number | undefined, item: DropdownItem) => void;
  /** Draw the row yourself. `props` is everything the row needs; spread it. */
  row?: (item: DropdownItem, props: DropdownRowProps) => ReactNode;
};

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

const isRow = (it: DropdownEntry): it is DropdownItem =>
  Boolean(it) && it !== '---' && !(it as { separator?: boolean }).separator;

// The glyph goes straight inside the slot the factory already draws, rather than
// through <Icon>, which brings a wrapper span of its own: `.ui-dropdown__ic` and
// `.ui-dropdown__tick` ARE that wrapper. <BackLink> has no such slot and uses <Icon>.
const Glyph = ({ name, className, hidden }: { name: string; className: string; hidden?: boolean }) => (
  <span
    className={className}
    aria-hidden={hidden ? 'true' : undefined}
    dangerouslySetInnerHTML={{ __html: icon(name) }}
  />
);

// A trailing status badge. A string reading "live" in any case takes the live tone.
function RowBadge({ badge }: { badge: DropdownBadge }) {
  const text = typeof badge === 'string' ? badge : badge.text;
  const given = typeof badge === 'string' ? '' : (badge.tone || '');
  const tone = given || (/^live$/i.test(String(text)) ? 'live' : 'neutral');
  return <span className={`ui-dropdown__badge is-${tone}`}>{text}</span>;
}

/** What names a row across a re-render: its value, or its label when it has none. */
const keyOf = (it: DropdownItem) => (it.value != null ? `v:${it.value}` : `l:${it.label}`);

/** Every enabled row still showing, in the order the arrows walk them. */
const itemsIn = (panel: HTMLElement | null) =>
  Array.from(panel?.querySelectorAll<HTMLElement>('[data-dd-item]') ?? [])
    .filter((el) => el.getAttribute('aria-disabled') !== 'true' && !el.hidden);

// One open dropdown at a time on the page, the way wireDropdown()'s closeAllDropdowns
// keeps it: opening one closes every other. Each mounted component registers its own
// close while it is open, because a click on another trigger stops at that trigger and
// never reaches this one's outside-click handler.
const openNow = new Set<() => void>();

// While an input method is composing, its keys commit or steer the text rather than
// driving the list. Safari's committing Enter carries keyCode 229, not isComposing.
const composing = (e: { isComposing?: boolean; keyCode?: number }) => e.isComposing || e.keyCode === 229;

const SEARCH_DEFAULTS = {
  placeholder: 'Search',
  empty: 'No match for “{q}”',
  hint: 'Check the spelling, or try fewer letters.',
};

export function Dropdown({
  label, value, placeholder = 'Select…', variant, items, sections,
  header, footer, triggerContent, triggerClass = '', chevron = true,
  align = 'start', direction = 'down', scroll = false, search = false,
  ariaLabel, id, panelClass = '',
  open: openProp, defaultOpen = false, onOpenChange, onSelect, row,
}: DropdownProps) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = openProp ?? selfOpen;
  // The row picked in this component, and the caller's own selection it was picked
  // against. Held as keys and not as items, because a caller that rebuilds its items on
  // every render — the ordinary `items.map(…)` — hands back equal rows that are not the
  // same objects, and a pick compared by identity would lose its tick on the next render.
  // Both halves are in ONE state written only from the click: a pick that stops applying
  // is derived below rather than cleared during a render, so nothing but an event can
  // move it. why: react/README.md#dropdown
  const [pick, setPick] = useState<{ key: string; against: string | null } | null>(null);
  const [query, setQuery] = useState(() => (search && search !== true ? search.query || '' : ''));
  // The row Enter would pick, by key. Null means "whichever is first in the list as it
  // stands", which is where every query change and every open put it.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  // Where the keyboard asked focus to land once the panel is open: an index, or the
  // selected row. Read in a layout effect, because the rows have to be styled open
  // before one of them can take focus. why: docs/specification.md#the-dropdown-panel
  const landOn = useRef<number | 'selected' | null>(null);
  // The pointer's last position. A move event carrying the one it already had is the
  // browser's own after a scroll, not the reader's, and it would take the active row
  // away from the arrows.
  const at = useRef('');
  const auto = useId().replace(/:/g, '');
  const uid = id ?? auto;

  const setOpen = useCallback((next: boolean) => {
    if (openProp === undefined) setSelfOpen(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);
  const close = useRef(setOpen);
  useIsoLayoutEffect(() => { close.current = setOpen; });

  const sx = search ? { ...SEARCH_DEFAULTS, ...strip(search === true ? {} : search) } : null;
  const entries: DropdownEntry[] = sections?.length
    ? sections.flatMap((s) => s.items || [])
    : (items || []);
  const rows = entries.filter(isRow);
  const isSelect = variant === 'select'
    || (variant == null && rows.some((it) => it.selected || it.value != null));
  const listRole = isSelect ? 'listbox' : 'menu';
  // With a field in it the panel is a dialog — a listbox may own only options and
  // groups — and every row inside becomes an option, a row carrying an href included.
  const asOption = isSelect || Boolean(sx);
  const name = ariaLabel || (label ? String(label).replace(/:\s*$/, '') : '') || 'Options';
  // The caller's own selection, and the pick measured against it: once the caller moves
  // its selection the pick was made against, the caller has taken the pick back and this
  // component's stops applying. Derived, so a re-render cannot drop a pick the reader
  // made and an unrelated render cannot restore one they did not.
  const given = rows.find((it) => it.selected);
  const givenKey = given ? keyOf(given) : null;
  const pickedKey = pick && pick.against === givenKey ? pick.key : null;
  const picked = pickedKey != null ? rows.find((it) => keyOf(it) === pickedKey) : undefined;
  const shown = value != null ? value
    : (isSelect ? (picked?.label ?? given?.label) : null);
  // After a pick the tick follows it, the way selectOption() rewrites the panel —
  // and like it, a disabled row keeps the state it was rendered with.
  const selectedOf = (it: DropdownItem) => (pickedKey != null
    ? (it.disabled ? !!it.selected : keyOf(it) === pickedKey)
    : !!it.selected);

  // The rows the query leaves showing, and of those the ones the arrows walk. Both are
  // read off the items rather than off the DOM, so the panel renders what it filtered.
  const hiddenBy = (it: DropdownItem) => Boolean(sx) && !dropdownMatch(it.label, query);
  const filtering = Boolean(sx) && dropdownFiltering(query);
  const visible = rows.filter((it) => !hiddenBy(it));
  const ring = visible.filter((it) => !it.disabled);
  const active = ring.find((it) => keyOf(it) === activeKey) ?? ring[0];
  const rowIds = new Map<DropdownItem, string>();
  rows.forEach((it, i) => rowIds.set(it, `${uid}-opt-${i}`));
  const listId = `${uid}-list`;

  // Opening closes every other dropdown on the page.
  useEffect(() => {
    if (!open) return;
    const mine = () => close.current(false);
    for (const other of [...openNow]) other();
    openNow.add(mine);
    return () => { openNow.delete(mine); };
  }, [open]);

  // Click-outside and Escape, while it is open. Escape pressed inside the dropdown is
  // the root's own handler below, which stops it before it reaches here.
  useEffect(() => {
    if (!open) return;
    const doc = root.current?.ownerDocument ?? document;
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close.current(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || composing(e)) return;
      close.current(false);
      trigger.current?.focus();
    };
    doc.addEventListener('click', onClick);
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('click', onClick);
      doc.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useIsoLayoutEffect(() => {
    const want = landOn.current;
    landOn.current = null;
    if (!open) return;
    // With a field, focus goes to it however the panel was opened, and the row Enter
    // would pick is the selected one or the first. Every open starts from the whole
    // list, so the query is cleared here and not on the way out — a panel fading out
    // after a pick does not flash back to every row.
    if (sx) {
      setQuery('');
      const enabled = rows.filter((it) => !it.disabled);
      const start = enabled.find(selectedOf) ?? enabled[0];
      setActiveKey(start ? keyOf(start) : null);
      if (panel.current) {
        // Hold the width the whole list needs, so the panel does not narrow as rows go.
        panel.current.style.minWidth = '';
        if (panel.current.offsetWidth) panel.current.style.minWidth = `${panel.current.offsetWidth}px`;
      }
      field.current?.focus();
      return;
    }
    if (want == null) return;
    const els = itemsIn(panel.current);
    if (!els.length) return;
    const sel = els.findIndex((el) => el.getAttribute('aria-selected') === 'true');
    const to = want === 'selected' ? (sel >= 0 ? sel : 0) : want;
    (els[to] || els[0]).focus();
  }, [open]);

  // Keep the active row inside the list's own scroll box, without scrolling the page
  // the way scrollIntoView() would.
  useIsoLayoutEffect(() => {
    if (!sx || !open || !active) return;
    const el = panel.current?.querySelector<HTMLElement>('[data-dd-item].is-active');
    const list = el?.closest<HTMLElement>('.ui-dropdown__list');
    if (!el || !list || !list.clientHeight) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + el.offsetHeight - list.clientHeight;
    }
  });

  const choose = (item: DropdownItem, e: ReactMouseEvent) => {
    if (item.disabled) { e.preventDefault(); return; }
    if (isSelect) setPick({ key: keyOf(item), against: givenKey });
    onSelect?.(item.value, item);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const onTrigger = e.target === trigger.current;
    const onField = e.target === field.current;
    if (onField && composing(e)) return;
    if (sx && open) {
      // The arrows walk the rows still showing; focus stays in the field.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!ring.length) return;
        const i = active ? ring.indexOf(active) : -1;
        const next = e.key === 'ArrowDown' ? (i + 1) % ring.length : (i <= 0 ? ring.length - 1 : i - 1);
        setActiveKey(keyOf(ring[next]));
        return;
      }
      if (onField && e.key === 'Enter') {
        e.preventDefault();
        // The element and not the item: a row a caller drew is a link, and a link is
        // followed by the click rather than by the callback beside it.
        panel.current?.querySelector<HTMLElement>('[data-dd-item].is-active')?.click();
        return;
      }
      // Home and End move the caret in a text field; they are not the list's.
      if (onField && (e.key === 'Home' || e.key === 'End')) return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (onTrigger || open)) {
      e.preventDefault();
      if (!open) {
        landOn.current = e.key === 'ArrowDown' ? 0 : 'selected';
        setOpen(true);
        return;
      }
      const els = itemsIn(panel.current);
      if (!els.length) return;
      const i = els.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
      els[next < 0 ? 0 : next]?.focus();
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      itemsIn(panel.current)[0]?.focus();
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      const els = itemsIn(panel.current);
      els[els.length - 1]?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && open
      && (e.target as HTMLElement).matches?.('[data-dd-item]')) {
      e.preventDefault();
      (e.target as HTMLElement).click();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    } else if (e.key === 'Tab' && open) {
      setOpen(false);
    }
  };

  // The pointer moves the pick too, so Enter takes the row under it.
  const onMouseMove = (e: ReactMouseEvent) => {
    if (!sx) return;
    const here = `${e.clientX},${e.clientY}`;
    if (here === at.current) return;
    at.current = here;
    const el = (e.target as HTMLElement).closest?.('[data-dd-item]');
    if (!el || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('is-active')) return;
    const item = rows.find((it) => rowIds.get(it) === el.id);
    if (item) setActiveKey(keyOf(item));
  };

  function renderRow(entry: DropdownEntry, key: string) {
    if (!isRow(entry)) {
      return <div key={key} className="ui-dropdown__sep" role="separator" hidden={filtering || undefined} />;
    }
    const disabled = !!entry.disabled;
    const selected = selectedOf(entry);
    const asLink = !!entry.href && !disabled && !asOption;
    const props: DropdownRowProps = {
      className: cx('ui-dropdown__item', selected && 'is-selected',
        disabled && 'is-disabled', entry.danger && 'is-danger',
        Boolean(sx) && open && entry === active && 'is-active'),
      'data-dd-item': '',
      role: asOption ? 'option' : 'menuitem',
      tabIndex: -1,
      ...(entry.value != null ? { 'data-value': String(entry.value) } : null),
      ...(asOption ? { 'aria-selected': selected } : null),
      ...(disabled ? { 'aria-disabled': true as const } : null),
      ...(asLink ? { href: entry.href, ...(entry.target ? { target: entry.target } : null) } : null),
      ...(sx ? { id: rowIds.get(entry), hidden: hiddenBy(entry) || undefined } : null),
      onClick: (e: ReactMouseEvent) => choose(entry, e),
      children: (
        <>
          {entry.icon && <Glyph name={entry.icon} className="ui-dropdown__ic" />}
          <span className="ui-dropdown__main">
            <span className="ui-dropdown__label">{entry.label}</span>
            {entry.description && <span className="ui-dropdown__desc">{entry.description}</span>}
          </span>
          {entry.badge ? <RowBadge badge={entry.badge} /> : null}
          {asOption && <Glyph name="check" className="ui-dropdown__tick" hidden />}
        </>
      ),
    };
    if (row) return <Fragment key={key}>{row(entry, props)}</Fragment>;
    const Tag = asLink ? 'a' : 'div';
    return <Tag key={key} {...props} />;
  }

  const body = sections?.length
    ? sections.map((section, si) => {
      // A group with nothing left in it goes, and so does its heading.
      const gone = filtering && !(section.items || []).some((it) => isRow(it) && !hiddenBy(it));
      return (
        <div
          key={section.label ?? `s${si}`}
          className="ui-dropdown__section"
          role="group"
          aria-label={section.label || undefined}
          hidden={gone || undefined}
        >
          {section.label && <div className="ui-dropdown__group" role="presentation">{section.label}</div>}
          {(section.items || []).map((entry, i) => renderRow(entry, `s${si}-${i}`))}
        </div>
      );
    })
    : (items || []).map((entry, i) => renderRow(entry, `i${i}`));

  const cap = scroll && scroll !== true
    ? { maxHeight: typeof scroll === 'number' ? `${scroll}px` : scroll }
    : undefined;
  // The no-match state. A function replacer, so a `$&` typed into the field is text
  // rather than a replacement pattern.
  const none = sx && filtering && !visible.length ? (
    <>
      <span className="ui-dropdown__none-title">{sx.empty.replace('{q}', () => query.trim())}</span>
      <span className="ui-dropdown__none-hint">{sx.hint}</span>
    </>
  ) : null;

  return (
    <div className={cx('ui-dropdown', open && 'open')} id={id} ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={cx('ui-dropdown__trigger', triggerClass)}
        data-dropdown-trigger=""
        aria-haspopup={sx ? 'dialog' : listRole}
        aria-expanded={open}
        aria-label={ariaLabel && triggerContent != null ? ariaLabel : undefined}
        ref={trigger}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      >
        {triggerContent != null ? triggerContent : (
          <>
            {label && <span className="ui-dropdown__pre">{label}</span>}
            <span className="ui-dropdown__value">{shown != null ? shown : placeholder}</span>
          </>
        )}
        {chevron && <span className="ui-dropdown__chevron" aria-hidden="true" />}
      </button>
      <div
        className={cx('ui-dropdown__panel', align === 'end' && 'is-end', direction === 'up' && 'is-up',
          Boolean(scroll) && !sx && 'is-scroll', Boolean(sx) && 'ui-dropdown__panel--search', panelClass)}
        data-dropdown-panel=""
        role={sx ? 'dialog' : listRole}
        aria-label={sx ? name : ariaLabel}
        style={sx ? undefined : cap}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={onMouseMove}
      >
        {header}
        {sx ? (
          <>
            {/* The field is a combobox that owns the list; the rows stay options, and
                the one Enter would pick is named by aria-activedescendant, so focus
                never leaves the field while the reader types. */}
            <div className="ui-dropdown__search">
              <Glyph name="search" className="ui-dropdown__search-ic" hidden />
              <input
                className="ui-dropdown__search-input"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded
                aria-controls={listId}
                aria-label={sx.label || `Search ${name}`}
                aria-activedescendant={open && active ? rowIds.get(active) : undefined}
                placeholder={sx.placeholder}
                autoComplete="off"
                spellCheck={false}
                data-dd-search=""
                value={query}
                ref={field}
                onChange={(e) => { setQuery(e.target.value); setActiveKey(null); }}
              />
            </div>
            <div className="ui-dropdown__list" role="listbox" id={listId} aria-label={name} style={cap}>
              {body}
            </div>
            <div
              className="ui-dropdown__none"
              role="status"
              data-dd-none=""
              data-dd-empty={sx.empty}
              data-dd-hint={sx.hint}
            >
              {none}
            </div>
          </>
        ) : body}
        {footer}
      </div>
    </div>
  );
}

/** Drop what a caller left empty, so it does not shadow a default — the `||` the
 *  factory writes on each of these fields, said once. */
function strip(o: DropdownSearch): DropdownSearch {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v != null && v !== ''),
  ) as DropdownSearch;
}
