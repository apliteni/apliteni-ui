import {
  Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode,
} from 'react';
import { icon } from '@apliteni/apliteni-ui';

// The React face of the kit's dropdown() factory and of wireDropdown()'s keyboard.
// The vanilla output is the source of truth for every class, role and aria
// attribute here, and Dropdown.test.tsx compares the two shape by shape — a rule
// this file expresses differently from src/components/dropdown.js is a failure
// there rather than a drift.
// why: docs/specification.md#the-dropdown-panel
// why: docs/specification.md#a-dropdown-row-is-a-div-a-link-or-a-button

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

export function Dropdown({
  label, value, placeholder = 'Select…', variant, items, sections,
  header, footer, triggerContent, triggerClass = '', chevron = true,
  align = 'start', direction = 'down', scroll = false,
  ariaLabel, id, panelClass = '',
  open: openProp, defaultOpen = false, onOpenChange, onSelect, row,
}: DropdownProps) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = openProp ?? selfOpen;
  // The row picked since this dropdown was mounted, which is what the trigger shows
  // and what carries the tick — until a `value` prop says the host owns that.
  const [picked, setPicked] = useState<DropdownItem | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // Where the keyboard asked focus to land once the panel is open: an index, or the
  // selected row. Read in a layout effect, because the rows have to be styled open
  // before one of them can take focus. why: docs/specification.md#the-dropdown-panel
  const landOn = useRef<number | 'selected' | null>(null);

  const setOpen = useCallback((next: boolean) => {
    if (openProp === undefined) setSelfOpen(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);
  const close = useRef(setOpen);
  useLayoutEffect(() => { close.current = setOpen; });

  const entries: DropdownEntry[] = sections?.length
    ? sections.flatMap((s) => s.items || [])
    : (items || []);
  const rows = entries.filter(isRow);
  const isSelect = variant === 'select'
    || (variant == null && rows.some((it) => it.selected || it.value != null));
  const listRole = isSelect ? 'listbox' : 'menu';
  const shown = value != null ? value
    : (isSelect ? (picked?.label ?? rows.find((it) => it.selected)?.label) : null);
  // After a pick the tick follows it, the way selectOption() rewrites the panel —
  // and like it, a disabled row keeps the state it was rendered with.
  const selectedOf = (it: DropdownItem) => (picked ? (it.disabled ? !!it.selected : it === picked) : !!it.selected);

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

  useLayoutEffect(() => {
    const want = landOn.current;
    landOn.current = null;
    if (!open || want == null) return;
    const els = itemsIn(panel.current);
    if (!els.length) return;
    const sel = els.findIndex((el) => el.getAttribute('aria-selected') === 'true');
    const at = want === 'selected' ? (sel >= 0 ? sel : 0) : want;
    (els[at] || els[0]).focus();
  }, [open]);

  const choose = (item: DropdownItem, e: ReactMouseEvent) => {
    if (item.disabled) { e.preventDefault(); return; }
    if (isSelect) setPicked(item);
    onSelect?.(item.value, item);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const onTrigger = e.target === trigger.current;
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

  function renderRow(entry: DropdownEntry, key: string) {
    if (!isRow(entry)) return <div key={key} className="ui-dropdown__sep" role="separator" />;
    const disabled = !!entry.disabled;
    const selected = selectedOf(entry);
    const asLink = !!entry.href && !disabled && !isSelect;
    const props: DropdownRowProps = {
      className: cx('ui-dropdown__item', selected && 'is-selected',
        disabled && 'is-disabled', entry.danger && 'is-danger'),
      'data-dd-item': '',
      role: isSelect ? 'option' : 'menuitem',
      tabIndex: -1,
      ...(entry.value != null ? { 'data-value': String(entry.value) } : null),
      ...(isSelect ? { 'aria-selected': selected } : null),
      ...(disabled ? { 'aria-disabled': true as const } : null),
      ...(asLink ? { href: entry.href, ...(entry.target ? { target: entry.target } : null) } : null),
      onClick: (e: ReactMouseEvent) => choose(entry, e),
      children: (
        <>
          {entry.icon && <Glyph name={entry.icon} className="ui-dropdown__ic" />}
          <span className="ui-dropdown__main">
            <span className="ui-dropdown__label">{entry.label}</span>
            {entry.description && <span className="ui-dropdown__desc">{entry.description}</span>}
          </span>
          {entry.badge ? <RowBadge badge={entry.badge} /> : null}
          {isSelect && <Glyph name="check" className="ui-dropdown__tick" hidden />}
        </>
      ),
    };
    if (row) return <Fragment key={key}>{row(entry, props)}</Fragment>;
    const Tag = asLink ? 'a' : 'div';
    return <Tag key={key} {...props} />;
  }

  const body = sections?.length
    ? sections.map((section, si) => (
      <div
        key={section.label ?? `s${si}`}
        className="ui-dropdown__section"
        role="group"
        aria-label={section.label || undefined}
      >
        {section.label && <div className="ui-dropdown__group" role="presentation">{section.label}</div>}
        {(section.items || []).map((entry, i) => renderRow(entry, `s${si}-${i}`))}
      </div>
    ))
    : (items || []).map((entry, i) => renderRow(entry, `i${i}`));

  return (
    <div className={cx('ui-dropdown', open && 'open')} id={id} ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={cx('ui-dropdown__trigger', triggerClass)}
        data-dropdown-trigger=""
        aria-haspopup={listRole}
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
          Boolean(scroll) && 'is-scroll', panelClass)}
        data-dropdown-panel=""
        role={listRole}
        aria-label={ariaLabel}
        style={scroll && scroll !== true
          ? { maxHeight: typeof scroll === 'number' ? `${scroll}px` : scroll }
          : undefined}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        {header}
        {body}
        {footer}
      </div>
    </div>
  );
}
