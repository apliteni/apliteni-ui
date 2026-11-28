import { useEffect, useId, useLayoutEffect, useRef, useState, type ClipboardEvent, type Dispatch, type KeyboardEvent, type RefObject, type SetStateAction } from 'react';
import { SearchField } from './SearchField';
import { Button } from './primitives/Button';
import { findQueryKey, parseQuery, type QueryKey, type QueryNode, type QueryState, type QueryValue } from './query';
import './QuerySearch.css';

export type QuerySearchProps = {
  /** The keys that a person can type, such as `state:` and `assignee:`. */
  keys: readonly QueryKey[];
  /** The chips and the text in the field. The page keeps them, such as in the URL. */
  value: QueryState;
  onChange: (next: QueryState) => void;
  /** The field's name. */
  ariaLabel: string;
  placeholder?: string;
  /** `sm` is the small field, as on SearchField. Its chips are then a small filter bar. */
  size?: 'sm';
  /** The hidden name of the chip group. */
  chipsLabel?: string;
  /** The state of a person lookup: the panel says Searching people, or offers Retry. */
  peopleStatus?: 'loading' | 'error';
  onRetryPeople?: () => void;
  /** Opens the panel on the first render, such as for a story of one state. */
  defaultOpen?: boolean;
  /** The suggestion that is active on the first render. */
  defaultActive?: number;
  /** Shows the error of the field's text on the first render. */
  defaultChecked?: boolean;
};

type Row = QueryValue & { insert: string };

// A group is a filter only when each of its parts is a filter. A group with title words stays text.
const isFilter = (node: QueryNode): boolean => node.type === 'field' || (node.type !== 'text' && node.items.every(isFilter));

// A side with OR outside any parenthesis goes in parentheses, so a space joins it by AND.
const grouped = (text: string) => {
  let depth = 0;
  const or = (text.match(/"[^"]*"|\(|\)|[^\s()"]+/g) || []).some(t => (depth += t === '(' ? 1 : t === ')' ? -1 : 0, !depth && /^OR$/i.test(t)));
  return or ? `(${text})` : text;
};

// The last condition: a key with one value word or an open quote, or `@` and a name.
// A completed value ends at a space, so `state:open @ma` reads `@ma`.
const KEY_SUFFIX = /(?:^|\s)([\w-]+:\s*(?:"[^"]*"?|[^\s():"]*)|@[^\s()]*)$/;

// The last condition in the field is the one the panel completes; earlier words stay.
function suggest(draft: string, keys: readonly QueryKey[]) {
  const full = draft.trimStart();
  const suffix = full.match(KEY_SUFFIX);
  const text = suffix ? suffix[1] : full.split(/\s+/).pop() || '';
  const typed = text.match(/^([\w-]+):\s*(.*)$/);
  const key = typed ? findQueryKey(keys, typed[1]) : text.startsWith('@') ? keys.find(k => k.kind === 'person') : undefined;
  const needle = (typed ? typed[2] : text.slice(1)).replace(/^[@"]|"$/g, '').toLowerCase();
  const rows: Row[] = key
    ? [...(typed && key.self ? [key.self] : []), ...key.values]
      .filter(v => v.label.toLowerCase().includes(needle) || v.value.toLowerCase().includes(needle) || (v.hint ?? '').toLowerCase().includes(needle))
      .map(v => ({ ...v, insert: `${key.key}:${v.value}` }))
    : keys.filter(k => !text || `${k.key}:`.startsWith(text.toLowerCase()))
      .map(k => ({ value: `${k.key}:`, label: k.label, hint: k.hint, insert: `${k.key}:` }));
  return { text, before: full.slice(0, full.length - text.length), key, rows };
}

// What the panel shows: the suggestions, or the state of a person lookup.
function panelState(open: boolean, { text, key, rows }: ReturnType<typeof suggest>, peopleStatus: QuerySearchProps['peopleStatus']) {
  const people = key?.kind === 'person';
  const waiting = people && peopleStatus != null;
  return {
    people, waiting, menu: open && (!text || !!key || rows.length > 0),
    retry: waiting && peopleStatus === 'error', offered: waiting ? [] : rows, group: key ? key.label : 'Filters',
  };
}

// The panel stops one step above the bottom of the visible viewport, and its rows scroll.
function usePanelCap(panel: RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const [cap, setCap] = useState<number>();
  useLayoutEffect(() => {
    const fit = () => {
      if (!panel.current) return;
      const edge = parseFloat(getComputedStyle(panel.current).getPropertyValue('--space-4')) || 0;
      const view = window.visualViewport;
      setCap(Math.max(0, (view?.height ?? window.innerHeight) + (view?.offsetTop ?? 0) - panel.current.getBoundingClientRect().top - edge));
    };
    fit();
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return cap;
}

function useCloseOutside(box: RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

type KeyState = {
  menu: boolean; offered: Row[]; active: number; waiting: boolean; retry: boolean; draft: string; chips: string[];
  choose: (row: Row) => void; commit: (query: string) => boolean; setOpen: (open: boolean) => void;
  setActive: Dispatch<SetStateAction<number>>; onChange: QuerySearchProps['onChange'];
};

const step = (i: number, n: number, down: boolean) => !n ? -1 : i < 0 ? (down ? 0 : n - 1) : (i + (down ? 1 : -1) + n) % n;

function onEnter(s: KeyState, chosen?: Row) {
  if (chosen) s.choose(chosen);
  else if (!s.waiting && s.draft.trim() && s.commit(s.draft)) s.setOpen(false);
}

function onTab(e: KeyboardEvent<HTMLInputElement>, s: KeyState, chosen?: Row) {
  if (chosen && !e.shiftKey) { e.preventDefault(); s.choose(chosen); }
  // People did not load: Tab goes on to Retry in the panel's foot, so the panel stays open.
  else if (!(s.menu && s.retry && !e.shiftKey)) s.setOpen(false);
}

// The field keeps the focus: the arrows move the active suggestion, and Enter or Tab takes it.
function onQueryKey(e: KeyboardEvent<HTMLInputElement>, s: KeyState) {
  if (e.nativeEvent.isComposing) return;
  const chosen = s.menu ? s.offered[s.active] : undefined;
  if (e.key === 'Escape') { if (s.menu) e.preventDefault(); s.setOpen(false); s.setActive(-1); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    s.setOpen(true);
    s.setActive(i => step(i, s.offered.length, e.key === 'ArrowDown'));
  } else if (e.key === 'Enter') { e.preventDefault(); onEnter(s, chosen); }
  else if (e.key === 'Tab') onTab(e, s, chosen);
  else if (e.key === 'Backspace' && !s.draft && s.chips.length) {
    e.preventDefault();
    s.setOpen(false);
    s.onChange({ chips: s.chips.slice(0, -1), draft: s.draft });
  }
}

type PanelProps = ReturnType<typeof panelState> & {
  panel: RefObject<HTMLDivElement | null>; cap?: number; listId: string; option: (i: number) => string; active: number;
  setActive: (i: number) => void; choose: (row: Row) => void; badges: boolean; empty: boolean;
  peopleStatus: QuerySearchProps['peopleStatus']; onRetry: () => void; onEscape: () => void; onLeave: (to: EventTarget | null) => void;
};

function QueryPanel({ panel, cap, group, listId, offered, option, active, setActive, choose, badges, waiting, retry, people, empty, peopleStatus, onRetry, onEscape, onLeave }: PanelProps) {
  return <div ref={panel} className="ui-dropdown__panel ui-query__panel" style={cap === undefined ? undefined : { maxHeight: `min(var(--ui-dropdown-max), ${cap}px)` }}>
    <div className="ui-dropdown__group" role="presentation">{group}</div>
    <div id={listId} role="listbox" aria-label={`${group} suggestions`}>
      {offered.map((row, i) => <button type="button" tabIndex={-1} key={row.insert} id={option(i)} role="option" aria-selected={active === i}
        className={`ui-dropdown__item${active === i ? ' is-active' : ''}`}
        onPointerMove={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => choose(row)}>
        <span className="ui-dropdown__main">
          <span className="ui-dropdown__label">{row.label}</span>
          {row.hint && <span className="ui-dropdown__desc">{row.hint}</span>}
        </span>
        {badges && <span className="ui-dropdown__badge">{row.insert}</span>}
      </button>)}
    </div>
    {waiting && peopleStatus === 'loading' && <div className="ui-dropdown__empty" role="status">Searching people…</div>}
    {/* The kit's pinned foot, so Retry keeps the panel's own room under it. */}
    {retry && <div className="ui-dropdown__foot">
      <span role="alert">People did not load.</span>
      <Button size="sm" onMouseDown={e => e.preventDefault()} onClick={onRetry}
        onKeyDown={e => { if (e.key === 'Escape') onEscape(); }}
        onBlur={e => onLeave(e.relatedTarget)}>Retry</Button>
    </div>}
    {!waiting && empty && <div className="ui-dropdown__empty" role="status">{people ? 'No people found.' : 'No values found.'} Change the text.</div>}
  </div>;
}

type ChipsProps = Pick<QuerySearchProps, 'keys' | 'size'> & {
  chips: string[]; chipsLabel: string; edit: (i: number) => void; remove: (i: number) => void; onEscape: () => void; onClear: () => void;
};

function QueryChips({ chips, keys, size, chipsLabel, edit, remove, onEscape, onClear }: ChipsProps) {
  return <fieldset className={`ui-filter-bar${size === 'sm' ? ' ui-filter-bar--sm' : ''} ui-query__chips`}>
    <legend className="ui-filter-bar__legend">{chipsLabel}</legend>
    {chips.map((raw, i) => {
      let label = raw;
      try { label = parseQuery(raw, keys)[0]?.label ?? raw; } catch { /* a chip from an old URL keeps its text */ }
      return <fieldset key={`${i}-${raw}`} className="ui-filter-bar__chip ui-query__chip">
        <legend className="ui-filter-bar__legend">{raw}</legend>
        <button type="button" className="ui-dropdown__trigger ui-query__label" aria-label={label === raw ? `Edit ${raw}` : `${label}: edit ${raw}`} onClick={() => edit(i)}
          onKeyDown={e => {
            if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); remove(i); }
            if (e.key === 'Escape') onEscape();
          }}>{label}</button>
        <button type="button" className="ui-query__remove" aria-label={`Remove ${raw} filter`} onClick={() => remove(i)}>×</button>
      </fieldset>;
    })}
    <span data-filter-clear=""><Button size="sm" variant="ghost" onClick={onClear}>Clear all</Button></span>
  </fieldset>;
}

/**
 * A search field that reads typed qualifiers. It suggests keys, then values or people, and
 * a known filter becomes a chip that a person can edit or remove. The field keeps the
 * focus while the arrow keys move the active suggestion.
 * why: docs/components.md#query-search
 */
export function QuerySearch({ keys, value, onChange, ariaLabel, placeholder, size, chipsLabel = 'Active filters',
  peopleStatus, onRetryPeople, defaultOpen = false, defaultActive = -1, defaultChecked = false }: QuerySearchProps) {
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(defaultActive);
  const [checked, setChecked] = useState(defaultChecked);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { chips, draft } = value;

  let error = '';
  if (checked && draft.trim()) try { parseQuery(draft, keys); } catch (e) { error = (e as Error).message; }

  const suggested = suggest(draft, keys);
  const { before, key, rows } = suggested;
  const shown = panelState(open, suggested, peopleStatus);
  const { menu, offered } = shown;
  const listId = `${uid}-list`;
  const helpId = `${uid}-help`;
  const errorId = `${uid}-error`;
  const option = (i: number) => `${uid}-option-${i}`;
  const focus = () => input.current?.focus();

  // Only a filter that exists becomes a chip. Title words stay in the field and match the titles.
  const commit = (query: string) => {
    try {
      const terms = parseQuery(query, keys);
      const words = terms.filter(t => !isFilter(t.node));
      onChange({ chips: [...chips, ...terms.filter(t => isFilter(t.node)).map(t => t.raw)], draft: words.map(t => t.raw).join(' ') });
      setChecked(false);
      return true;
    } catch {
      setChecked(true);
      return false;
    }
  };
  const choose = (row: Row) => {
    setActive(-1);
    if (row.insert.endsWith(':')) { onChange({ chips, draft: before + row.insert }); setOpen(true); }
    else { commit(before + row.insert); setOpen(false); }
    focus();
  };
  const remove = (i: number) => { onChange({ chips: chips.filter((_, j) => j !== i), draft }); focus(); };
  // The chip goes back after the title words in the field, so the words stay. AND still joins them.
  const edit = (i: number) => {
    onChange({ chips: chips.filter((_, j) => j !== i), draft: draft.trim() ? `${grouped(draft.trim())} ${grouped(chips[i])}` : chips[i] });
    setChecked(false); setOpen(false);
    focus();
  };

  useEffect(() => {
    if (menu && active >= 0) document.getElementById(option(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [menu, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const cap = usePanelCap(panel, [menu, chips.length, error]);
  useCloseOutside(box, () => setOpen(false));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => onQueryKey(e, { ...shown, active, draft, chips, choose, commit, setOpen, setActive, onChange });
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!/[:@()]/.test(pasted)) return;
    e.preventDefault();
    if (commit(pasted)) setOpen(false);
    else onChange({ chips, draft: pasted });
  };

  return <div className="ui-query" ref={box}>
    <div className={`ui-dropdown ui-query__anchor${menu ? ' open' : ''}`}>
      <SearchField ref={input} ariaLabel={ariaLabel} size={size} placeholder={placeholder} value={draft}
        role="combobox" aria-autocomplete="list" aria-expanded={menu} aria-controls={menu ? listId : undefined}
        aria-activedescendant={menu && offered[active] ? option(active) : undefined}
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${errorId} ${helpId}` : helpId}
        onFocus={() => { if (!draft) setOpen(true); }}
        onClick={() => setOpen(true)}
        onChange={e => { onChange({ chips, draft: e.target.value }); setChecked(false); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown} onPaste={onPaste} />
      {menu && <QueryPanel {...shown} panel={panel} cap={cap} listId={listId} option={option} active={active} setActive={setActive}
        choose={choose} badges={!key} empty={!rows.length} peopleStatus={peopleStatus}
        onRetry={() => { onRetryPeople?.(); focus(); }} onEscape={() => { setOpen(false); focus(); }}
        onLeave={to => { if (to !== input.current) setOpen(false); }} />}
    </div>
    <span id={helpId} className="ui-sr">Type a title, {keys.map(k => `${k.key}:`).join(', ')}{keys.some(k => k.kind === 'person') ? ', or @name' : ''}. Arrows choose a suggestion. Enter applies it. Escape closes the list.</span>
    {chips.length > 0 && <QueryChips chips={chips} keys={keys} size={size} chipsLabel={chipsLabel} edit={edit} remove={remove} onEscape={focus}
      onClear={() => { onChange({ chips: [], draft: '' }); setChecked(false); focus(); }} />}
    {error && <p className="ui-field__error" role="alert" id={errorId}>{error}</p>}
  </div>;
}
