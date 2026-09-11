import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { rankGroups, icon } from '@apliteni/apliteni-ui';
import { tabbablesIn, dismissOnScrim } from './dialog';

// The React face of the kit's commandPalette() factory. The vanilla output is
// the source of truth for every class name here, and CommandPalette.test.tsx
// compares the two shape by shape — a rule this file expresses differently from
// src/components/command-palette.js is a failure there rather than a drift. The
// ranking is not re-implemented at all: rankGroups() is imported from the kit,
// so a product cannot get one order in a server render and another in React.
// why: docs/specification.md#the-command-palette

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  /** Aliases a reader might type instead of the label. */
  keywords?: string[];
  /** Drawn as <kbd>, never read out: the row already says what it does. */
  shortcut?: string | string[];
  badge?: string;
  /** A row that goes somewhere. Cmd or Ctrl held on Enter opens it in a tab. */
  href?: string;
  /** A row that destroys something. It must carry `onConfirm`, or it is disabled. */
  danger?: boolean;
  /** What a destructive row opens instead of running. */
  onConfirm?: () => void;
  disabled?: boolean;
};

export type CommandGroup = { label?: string; items: CommandItem[] };

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  groups: CommandGroup[];
  /** What the reader chose. `newTab` is Cmd or Ctrl held, for a row with an href. */
  onSelect?: (item: CommandItem, meta: { newTab: boolean }) => void;
  label?: string;
  placeholder?: string;
  empty?: string;
  density?: 'compact' | 'roomy';
  hint?: boolean;
  /**
   * false → the caller ranks. `groups` is rendered in the order it is given and
   * `onQueryChange` is where the query goes — the shape a palette fed by a
   * server takes, where the rest of the results are not on this page to rank.
   */
  rank?: boolean;
  onQueryChange?: (query: string) => void;
};

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

// The vanilla factory's markup, as JSX. `icon()` is the kit's own glyph source —
// the alternative is a second set of paths that can disagree with it.
const Glyph = ({ name, className }: { name: string; className: string }) => (
  <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />
);

const keysOf = (shortcut?: string | string[]) =>
  (shortcut == null ? [] : Array.isArray(shortcut) ? shortcut : [shortcut]);

export function CommandPalette({
  open, onClose, groups, onSelect,
  label = 'Command palette', placeholder = 'Search or run a command…',
  empty = 'No matches', density = 'compact', hint = true,
  rank = true, onQueryChange,
}: CommandPaletteProps) {
  const uid = useId().replace(/:/g, '');
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);

  // It opens empty, the way the vanilla one does: a palette that comes back
  // holding the last query answers a question the reader has finished asking.
  useEffect(() => { if (open) { setQuery(''); setAt(0); } }, [open]);

  const shown = useMemo(
    () => (rank ? (rankGroups(groups, query) as CommandGroup[]) : groups).filter((g) => g.items.length),
    [groups, query, rank],
  );
  // One flat list in the order the rows are drawn, because that is the order the
  // arrows move in — the groups are a heading over it and never a second axis.
  const rows = useMemo(() => shown.flatMap((g) => g.items).filter((it) => !isDisabled(it)), [shown]);
  const active = rows[Math.min(at, rows.length - 1)];

  useEffect(() => { setAt(0); }, [query]);

  // Focus opens in the text box and goes back to the opener on the way out, and
  // the page behind is hidden from assistive tech while it is up. Same three
  // effects as <Modal>, which is where the React dialogs keep this behaviour
  // until #272 gives them one stack to share.
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement as HTMLElement | null;
    const portalRoot = panel.current?.closest('.ui-cmdk');
    const muted = (Array.from(document.body.children) as HTMLElement[])
      .filter((el) => el !== portalRoot && !el.hasAttribute('inert'));
    muted.forEach((el) => el.setAttribute('inert', ''));
    input.current?.focus();
    return () => {
      muted.forEach((el) => el.removeAttribute('inert'));
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = tabbablesIn(panel.current);
      if (items.length === 0) { e.preventDefault(); panel.current.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const run = useCallback((item: CommandItem, newTab: boolean) => {
    if (isDisabled(item)) return;
    onSelect?.(item, { newTab });
    // A destructive row opens its question and leaves the palette standing: the
    // confirm is what the reader has to answer, and closing underneath it takes
    // away what they were asked about.
    if (item.danger && item.onConfirm) { item.onConfirm(); return; }
    onClose();
    if (!item.href) return;
    if (newTab) window.open(item.href, '_blank', 'noopener');
    else window.location.href = item.href;
  }, [onClose, onSelect]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!rows.length) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setAt((was) => (was + step + rows.length) % rows.length);
    } else if (e.key === 'Enter') {
      if (!active) return;
      e.preventDefault();
      run(active, e.metaKey || e.ctrlKey);
    }
  };

  if (!open) return null;

  const listId = `${uid}-list`;
  let n = 0;
  return createPortal(
    <div className={cx('ui-cmdk', density === 'roomy' && 'ui-cmdk--roomy', 'is-open')}>
      <div className="ui-cmdk__scrim" onMouseDown={dismissOnScrim(onClose)} />
      <div
        className="ui-cmdk__panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={panel}
        onKeyDown={onKeyDown}
      >
        <div className="ui-cmdk__search">
          <Glyph name="search" className="ui-cmdk__search-ic" />
          <input
            ref={input}
            className="ui-cmdk__input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded
            aria-controls={listId}
            aria-label={label}
            aria-activedescendant={active ? rowId(uid, shown, active) : undefined}
            placeholder={placeholder}
            value={query}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => { setQuery(e.target.value); onQueryChange?.(e.target.value); }}
          />
        </div>
        <div className="ui-cmdk__list" id={listId} role="listbox" aria-label={`${label} results`}>
          {shown.map((group, gi) => (
            <div
              key={group.label ?? `g${gi}`}
              className="ui-cmdk__group"
              role="group"
              aria-labelledby={group.label ? `${uid}-g${gi}` : undefined}
            >
              {group.label && (
                <div className="ui-cmdk__group-head" id={`${uid}-g${gi}`}>{group.label}</div>
              )}
              {group.items.map((item) => {
                const disabled = isDisabled(item);
                const id = `${uid}-o${n++}`;
                const on = item === active;
                return (
                  <div
                    key={item.id}
                    id={id}
                    className={cx('ui-cmdk__item', item.danger && !disabled && 'is-danger',
                      disabled && 'is-disabled', on && 'is-active')}
                    role="option"
                    tabIndex={-1}
                    aria-selected={on}
                    aria-disabled={disabled || undefined}
                    aria-haspopup={item.danger && item.onConfirm ? 'dialog' : undefined}
                    onMouseMove={() => { if (!disabled) setAt(rows.indexOf(item)); }}
                    onClick={(e) => run(item, e.metaKey || e.ctrlKey)}
                  >
                    {item.icon && <Glyph name={item.icon} className="ui-cmdk__ic" />}
                    <span className="ui-cmdk__main">
                      <span className="ui-cmdk__label">{item.label}</span>
                      {item.description && <span className="ui-cmdk__desc">{item.description}</span>}
                    </span>
                    {item.badge && <span className="ui-cmdk__badge">{item.badge}</span>}
                    {keysOf(item.shortcut).length > 0 && (
                      <span className="ui-cmdk__keys" aria-hidden="true">
                        {keysOf(item.shortcut).map((k) => (
                          <kbd key={k} className="ui-cmdk__key">{k}</kbd>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Always in the DOM and hidden while there are rows, the way the vanilla
            factory renders it: an element that appears is an element a screen
            reader may or may not notice, and the count beside it is what says so. */}
        <p className="ui-cmdk__empty" hidden={countOf(shown) > 0}>{empty}</p>
        {/* The count and never the rows: a region holding the list would read all
            of it out again on every keystroke. */}
        <p className="ui-sr" role="status" aria-live="polite">
          {countOf(shown) === 0 ? 'No results'
            : `${countOf(shown)} result${countOf(shown) === 1 ? '' : 's'}`}
        </p>
        {hint && (
          <div className="ui-cmdk__foot" aria-hidden="true">
            <span><kbd className="ui-cmdk__key">↑</kbd><kbd className="ui-cmdk__key">↓</kbd> move</span>
            <span><kbd className="ui-cmdk__key">↵</kbd> run</span>
            <span><kbd className="ui-cmdk__key">esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * A destructive row that names no confirm is disabled, the same refusal the
 * vanilla factory makes: the palette is the fastest surface in a product and
 * the one where the reader is looking at the box rather than the list.
 */
const isDisabled = (item: CommandItem) => !!item.disabled || (!!item.danger && !item.onConfirm);

const countOf = (groups: CommandGroup[]) => groups.reduce((t, g) => t + g.items.length, 0);

// The id of a row, counted the way the list draws them, so aria-activedescendant
// names the element that is actually on the page.
function rowId(uid: string, groups: CommandGroup[], item: CommandItem) {
  let n = 0;
  for (const group of groups) {
    for (const it of group.items) {
      if (it === item) return `${uid}-o${n}`;
      n += 1;
    }
  }
  return undefined;
}
