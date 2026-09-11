// Command palette — one overlay, a text box and a ranked list of things to run
// or go to.
//
//   container.innerHTML = commandPalette({ groups });
//   wireCommandPalette(container);   // hotkey, ranking, keys, Esc, focus
//
// The kit ships the shell and the ranking and names no result kinds; a row goes
// somewhere, runs something, or asks a confirm first. Inertness, Escape and the
// focus trap come from ./overlay.js, the stack the drawer and the confirm share.
// why: docs/specification.md#the-command-palette
import { esc, icon } from './index.js';
import { OVERLAY_LAYER, adoptOverlay, popOverlay, pushOverlay, returnFocus, syncOverlays } from './overlay.js';

const cx = (...a) => a.filter(Boolean).join(' ');

let _uid = 0;
const nextId = (p = 'cmdk') => `${p}-${++_uid}`;

/**
 * How a match is worth more than another match.
 *
 * Six ways a query can meet an item, scored so that the whole beats the part
 * and the name beats the note. The numbers are a ladder and not a measurement —
 * what matters is the order, which is why src/components/command-palette.test.js
 * asserts the ORDER of the results rather than any of these values.
 *
 * cmdk's command-score is the other published answer: one continuous score
 * built out of SCORE_CONTINUE_MATCH 1, SCORE_SPACE_WORD_JUMP 0.9,
 * SCORE_NON_SPACE_WORD_JUMP 0.8 and SCORE_CHARACTER_JUMP 0.17. It ranks
 * beautifully and cannot be explained to a reader who asks why their item is
 * third. A ladder can: the kit's palettes hold tens of items, not thousands.
 */
export const SCORE = {
  exact: 100,
  prefix: 90,
  wordStart: 80,
  contains: 70,
  keyword: 60,
  description: 40,
  subsequence: 20,
};

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

// Every character of `q`, in order, somewhere in `s` — "nc" finding "New
// campaign". The weakest match the kit accepts, and the only one that can pair
// a two-letter query with a twenty-letter label.
function subsequence(s, q) {
  let at = 0;
  for (const ch of q) {
    at = s.indexOf(ch, at);
    if (at === -1) return false;
    at += 1;
  }
  return true;
}

// A word here starts after a space or one of the separators a product name uses,
// so "camp" reaches the second word of "New campaign" and the "utm" in
// "url-utm_source".
const wordStarts = (s) => s.split(/[\s/\-_.:,]+/).filter(Boolean);

function scoreField({ label, description, keywords }, q) {
  const name = norm(label);
  if (!name && !description && !(keywords || []).length) return 0;
  if (name === q) return SCORE.exact;
  if (name.startsWith(q)) return SCORE.prefix;
  if (wordStarts(name).some((w) => w.startsWith(q))) return SCORE.wordStart;
  if (name.includes(q)) return SCORE.contains;
  for (const k of keywords || []) {
    const key = norm(k);
    if (key === q || key.startsWith(q)) return SCORE.keyword;
  }
  if (norm(description).includes(q)) return SCORE.description;
  if (subsequence(name, q)) return SCORE.subsequence;
  return 0;
}

/**
 * What one item is worth against one query. 0 means it is not a result.
 *
 * An empty query scores everything the same, so a palette nobody has typed into
 * shows what the caller passed, in the caller's order — which is where a
 * product puts the four things somebody actually does here.
 *
 * A query with a space in it has to match as a whole OR token by token, every
 * token landing somewhere: "new camp" reaches "New campaign" as a whole, and
 * "camp new" reaches it one token at a time. The weakest token decides, because
 * a result is only as good as the part of the query it answers worst.
 */
export function scoreCommand(item, query) {
  const q = norm(query);
  if (!q) return 1;
  const whole = scoreField(item, q);
  const tokens = q.split(' ');
  if (tokens.length < 2) return whole;
  let weakest = Infinity;
  for (const t of tokens) {
    const s = scoreField(item, t);
    if (!s) { weakest = 0; break; }
    weakest = Math.min(weakest, s);
  }
  return Math.max(whole, weakest === Infinity ? 0 : weakest);
}

/**
 * The items that answer `query`, best first.
 *
 * Ties keep the caller's order — that is the whole of the kit's ordering
 * opinion, and it is what lets a product put its four most-used commands at the
 * top of the list it passes and have them stay there.
 */
export function rankCommands(items, query) {
  return (items || [])
    .map((item, i) => ({ item, i, score: scoreCommand(item, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.item);
}

/**
 * The groups that answer `query`, best group first, each holding its own ranked
 * rows and nothing that scored zero.
 *
 * A group is carried by its best row, and the caller's order breaks the tie at
 * both levels — so a palette nobody has typed into is exactly the list that was
 * passed in. cmdk ranks groups the same way; the tie-break is the kit's, and it
 * is what keeps a heading from moving under a reader who has typed nothing.
 */
export function rankGroups(groups, query) {
  return (groups || [])
    .map((g, i) => {
      const items = rankCommands(g.items || [], query);
      const best = items.length ? scoreCommand(items[0], query) : 0;
      return { group: { ...g, items }, i, best };
    })
    .filter((g) => g.group.items.length > 0)
    .sort((a, b) => b.best - a.best || a.i - b.i)
    .map((g) => g.group);
}

/** The label for the key that opens it, on the platform the caller is on. */
export function paletteHotkey(platform = typeof navigator === 'undefined' ? '' : navigator.platform) {
  return /mac|iphone|ipad|ipod/i.test(String(platform || '')) ? '⌘K' : 'Ctrl K';
}

// The three fields a query is matched against, written onto the row so the
// wiring can re-rank what is already rendered without being handed the data a
// second time. Three attributes and not one blob: the ranking weighs a name
// above a note, and a row carrying `label description keywords` in one string
// would have its description scored as if it were its name.
function searchAttrs(it) {
  const keywords = (it.keywords || []).map(norm).filter(Boolean).join('|');
  return [
    `data-label="${esc(norm(it.label))}"`,
    keywords ? `data-keywords="${esc(keywords)}"` : '',
    it.description ? `data-desc="${esc(norm(it.description))}"` : '',
  ].filter(Boolean).join(' ');
}

/** The fields back out of a rendered row, in the shape scoreCommand() takes. */
const fieldsOf = (el) => ({
  label: el.dataset.label || '',
  keywords: el.dataset.keywords ? el.dataset.keywords.split('|') : [],
  description: el.dataset.desc || '',
});

// A shortcut hint: 'g then i' or ['⌘', 'K'] or '⌘K'. Rendered as <kbd>, which is
// what it is, and never as part of the item's accessible name — the row already
// says what it does, and a screen reader reading "G then I" after every label is
// noise a sighted reader can simply skip.
function keysFor(shortcut) {
  if (!shortcut) return '';
  const keys = Array.isArray(shortcut) ? shortcut : [shortcut];
  return `<span class="ui-cmdk__keys" aria-hidden="true">`
    + keys.map((k) => `<kbd class="ui-cmdk__key">${esc(k)}</kbd>`).join('')
    + '</span>';
}

/**
 * One result row.
 *
 * Always a <div role="option">, never a link or a button: an option in a listbox
 * is reached with an arrow key and never with Tab, and both of the other tags
 * put every row into the page's tab order, where forty of them stand between a
 * reader and the rest of the palette. `href` is carried in data- and followed by
 * the wiring, which is also what makes Cmd+Enter open it in a tab.
 *
 * A destructive item that names no confirm is rendered DISABLED. The kit's rule
 * is that a delete asks first (docs/specification.md#the-command-palette), and a
 * palette is the one surface where a reader is typing fast and choosing from a
 * list that reorders under them.
 */
function paletteItem(it, uid, index, active) {
  const disabled = isRefused(it);
  const lead = it.icon ? `<span class="ui-cmdk__ic">${icon(it.icon)}</span>` : '';
  const desc = it.description
    ? `<span class="ui-cmdk__desc">${esc(it.description)}</span>` : '';
  const attrs = [
    // `is-danger` only while the row is actually offered: a destructive command
    // the palette refuses to run is an unavailable row, not a dangerous one, and
    // painting it in the danger signal would spend that signal on something
    // nothing can press.
    `class="${cx('ui-cmdk__item', it.danger && !disabled && 'is-danger', disabled && 'is-disabled', active && 'is-active')}"`,
    'role="option"',
    'tabindex="-1"',
    `id="${uid}-o${index}"`,
    'data-cmdk-item',
    `data-i="${index}"`,
    searchAttrs(it),
    it.id != null ? `data-id="${esc(it.id)}"` : '',
    it.href && !disabled ? `data-href="${esc(it.href)}"` : '',
    it.confirm && !disabled ? `data-confirm-open="${esc(it.confirm)}"` : '',
    it.confirm && !disabled ? 'aria-haspopup="dialog"' : '',
    disabled ? 'aria-disabled="true"' : '',
    `aria-selected="${active ? 'true' : 'false'}"`,
  ].filter(Boolean).join(' ');
  const badge = it.badge ? `<span class="ui-cmdk__badge">${esc(it.badge)}</span>` : '';
  return `<div ${attrs}>${lead}`
    + `<span class="ui-cmdk__main"><span class="ui-cmdk__label">${esc(it.label)}</span>${desc}</span>`
    + `${badge}${keysFor(it.shortcut)}</div>`;
}

/**
 * A destructive item that names no confirm is refused: the kit's rule is that a
 * delete asks first, and the palette is the one surface where a reader is
 * typing fast and choosing from a list that reorders under them.
 */
const isRefused = (it) => !!it.disabled || (!!it.danger && !it.confirm);

/**
 * Where the active row starts: the first row Enter could run.
 *
 * The markup carries it, rather than waiting for the wiring to add it, so a
 * palette rendered open by a server already says which row Enter answers — and
 * the React component, which has no wiring step at all, renders the same thing.
 */
function firstEnabledIndex(groups) {
  let n = 0;
  for (const g of groups || []) {
    for (const it of g.items || []) {
      if (!isRefused(it)) return n;
      n += 1;
    }
  }
  return -1;
}

/**
 * The inside of the listbox: the groups, in the caller's order.
 *
 * Exported on its own because a palette fed by a server re-renders THIS and not
 * the shell around it — the input keeps its value, its focus and its caret.
 */
export function commandPaletteList(groups = [], { uid = nextId(), from = 0 } = {}) {
  let n = from;
  const activeAt = firstEnabledIndex(groups) + from;
  return groups.map((g, gi) => {
    const items = (g.items || []);
    if (!items.length) return '';
    const headId = g.label ? `${uid}-g${gi}` : null;
    const head = headId
      ? `<div class="ui-cmdk__group-head" id="${headId}">${esc(g.label)}</div>` : '';
    const rows = items.map((it) => paletteItem(it, uid, n, n++ === activeAt)).join('');
    return `<div class="ui-cmdk__group" role="group" data-cmdk-group data-i="${gi}"`
      + `${headId ? ` aria-labelledby="${headId}"` : ''}>${head}${rows}</div>`;
  }).join('');
}

/**
 * The public factory. Returns an HTML string; wire it with wireCommandPalette().
 *
 * `specimen` renders it open as a PICTURE — same markup, minus the data-cmdk
 * hook and aria-modal — so a documentation page can show three at once without
 * any of them owning the page's keyboard. Use `open` when it is real.
 *
 * @param {object} [o]
 * @param {Array}  [o.groups]      [{ label, items: [{ id, label, description, icon,
 *                                  keywords, shortcut, badge, href, confirm, danger,
 *                                  disabled }] }]
 * @param {Array}  [o.items]       a flat list — the same thing as one unlabelled group
 * @param {string} [o.label]       accessible name of the dialog and the text box
 * @param {string} [o.placeholder] the text box's placeholder
 * @param {string} [o.query]       the query it renders with
 * @param {string} [o.empty]       what it says when nothing matches
 * @param {string} [o.density]     'compact' (default) | 'roomy'
 * @param {boolean} [o.hint]       draw the key legend along the bottom
 * @param {boolean} [o.rank]       false → the caller ranks, and is asked for results
 * @param {boolean} [o.hotkey]     false → this one does not answer Cmd/Ctrl+K
 * @param {boolean} [o.open]       render already-open, as a real dialog
 * @param {boolean} [o.specimen]   render open as a picture of the dialog
 * @param {string} [o.id]          root id a [data-cmdk-open] trigger targets
 * @returns {string} html
 */
export function commandPalette({
  groups, items, label = 'Command palette',
  placeholder = 'Search or run a command…', query = '',
  empty = 'No matches', density = 'compact', hint = true,
  rank = true, hotkey = true, open = false, specimen = false, id,
} = {}) {
  const uid = nextId();
  const given = groups && groups.length ? groups : [{ items: items || [] }];
  // Rendered with a query in it, the factory ranks — so a palette a server drew
  // against `?q=inv` and the same palette after a keystroke are the same list in
  // the same order, and a specimen of a ranked palette is not a hand-arrangement.
  const list = rank && query ? rankGroups(given, query) : given;
  const rows = list.reduce((n, g) => n + (g.items || []).length, 0);
  const activeAt = firstEnabledIndex(list);
  const inputId = `${uid}-q`;
  const listId = `${uid}-list`;

  const inputAttrs = [
    'class="ui-cmdk__input"', 'type="text"', `id="${inputId}"`,
    'role="combobox"', 'aria-autocomplete="list"', 'aria-expanded="true"',
    `aria-controls="${listId}"`, `aria-label="${esc(label)}"`,
    `placeholder="${esc(placeholder)}"`, `value="${esc(query)}"`,
    'autocomplete="off"', 'autocorrect="off"', 'spellcheck="false"',
    activeAt >= 0 ? `aria-activedescendant="${uid}-o${activeAt}"` : '',
    'data-cmdk-input',
  ].filter(Boolean).join(' ');

  const legend = hint
    ? '<div class="ui-cmdk__foot" aria-hidden="true">'
      + '<span><kbd class="ui-cmdk__key">↑</kbd><kbd class="ui-cmdk__key">↓</kbd> move</span>'
      + '<span><kbd class="ui-cmdk__key">↵</kbd> run</span>'
      + '<span><kbd class="ui-cmdk__key">esc</kbd> close</span>'
      + '</div>'
    : '';

  const rootCls = cx('ui-cmdk', density === 'roomy' && 'ui-cmdk--roomy', (open || specimen) && 'is-open');
  const rootAttrs = [
    `class="${rootCls}"`,
    specimen ? '' : 'data-cmdk',
    rank ? '' : 'data-cmdk-rank="off"',
    hotkey && !specimen ? 'data-cmdk-hotkey' : '',
    id ? `id="${esc(id)}"` : '',
  ].filter(Boolean).join(' ');

  return `<div ${rootAttrs}>`
    + '<div class="ui-cmdk__scrim" data-cmdk-scrim></div>'
    + `<div class="ui-cmdk__panel" role="dialog"${specimen ? '' : ' aria-modal="true"'}`
    + ` aria-label="${esc(label)}" tabindex="-1" data-cmdk-panel>`
    + '<div class="ui-cmdk__search">'
    + `<span class="ui-cmdk__search-ic" aria-hidden="true">${icon('search')}</span>`
    + `<input ${inputAttrs}>`
    + '</div>'
    + `<div class="ui-cmdk__list" id="${listId}" role="listbox" aria-label="${esc(label)} results" data-cmdk-list>`
    + commandPaletteList(list, { uid })
    + '</div>'
    + `<p class="ui-cmdk__empty" data-cmdk-empty${rows ? ' hidden' : ''}>${esc(empty)}</p>`
    + '<p class="ui-sr" role="status" aria-live="polite" data-cmdk-status></p>'
    + legend
    + '</div></div>';
}

// ---- Shared behaviour ----------------------------------------------------
// Per-instance handlers attach once (guarded by a flag on the node); the
// document-level hotkey and [data-cmdk-open] delegation attach once per
// document. Safe to call repeatedly (Storybook re-renders).

const inputOf = (root) => root.querySelector('[data-cmdk-input]');
const listOf = (root) => root.querySelector('[data-cmdk-list]');
const optionsOf = (root) => Array.from(root.querySelectorAll('[data-cmdk-item]'));
const visibleOptions = (root) => optionsOf(root)
  .filter((el) => !el.hidden && el.getAttribute('aria-disabled') !== 'true');

/** Mark one option active. DOM focus never moves: the text box keeps it. */
function setActive(root, el) {
  for (const opt of optionsOf(root)) {
    const on = opt === el;
    opt.classList.toggle('is-active', on);
    opt.setAttribute('aria-selected', on ? 'true' : 'false');
  }
  const input = inputOf(root);
  if (!input) return;
  if (el) input.setAttribute('aria-activedescendant', el.id);
  else input.removeAttribute('aria-activedescendant');
  // A row scrolled out of the list is a row the reader cannot see they are on.
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
}

const activeOf = (root) => root.querySelector('[data-cmdk-item].is-active');

/**
 * Say how many results there are, once, politely.
 *
 * The count and not the rows: a palette re-ranks on every keystroke, and a live
 * region holding the rows would read the whole list out again on each one. The
 * row the reader is on is announced by aria-activedescendant instead, which is
 * the combobox pattern's own answer.
 */
function announce(root, n) {
  const status = root.querySelector('[data-cmdk-status]');
  if (!status) return;
  const next = n === 0 ? 'No results' : `${n} result${n === 1 ? '' : 's'}`;
  if (status.textContent !== next) status.textContent = next;
}

/**
 * Re-rank what is rendered against what is typed.
 *
 * The rows are scored where they stand — the wiring reads each row's
 * `data-label`, `data-keywords` and `data-desc` rather than being handed the
 * items a second time, so a palette rendered by a server and one built in the
 * browser behave the same. Groups are carried by their best row, and the
 * caller's order breaks every tie, at both levels.
 */
function applyQuery(root) {
  const list = listOf(root);
  const input = inputOf(root);
  if (!list || !input) return;
  const q = input.value;
  const ranking = root.getAttribute('data-cmdk-rank') !== 'off';

  let shown = 0;
  const groups = Array.from(list.querySelectorAll('[data-cmdk-group]'));
  for (const group of groups) {
    const rows = Array.from(group.querySelectorAll('[data-cmdk-item]'));
    const scored = rows.map((el, i) => ({
      el,
      i: Number(el.dataset.i ?? i),
      score: ranking ? scoreCommand(fieldsOf(el), q) : 1,
    }));
    for (const r of scored) {
      r.el.hidden = r.score === 0;
      if (r.score > 0) shown += 1;
    }
    const live = scored.filter((r) => r.score > 0);
    if (ranking) {
      live.sort((a, b) => b.score - a.score || a.i - b.i);
      for (const r of live) group.append(r.el);
    }
    group.hidden = live.length === 0;
    group.dataset.best = String(live.length ? live[0].score : 0);
  }
  if (ranking) {
    const live = groups.filter((g) => !g.hidden);
    live.sort((a, b) => Number(b.dataset.best) - Number(a.dataset.best)
      || Number(a.dataset.i) - Number(b.dataset.i));
    for (const g of live) list.append(g);
  }

  const emptyMsg = root.querySelector('[data-cmdk-empty]');
  if (emptyMsg) emptyMsg.hidden = shown > 0;
  announce(root, shown);
  setActive(root, visibleOptions(root)[0] || null);
}

/**
 * Hand the palette a new set of results.
 *
 * This is the seam a product feeds. Called with groups it renders them; called
 * with a string it takes the markup as it is, which is how a server-rendered
 * page answers its own `ui-command-query`. Either way the text box is untouched.
 */
export function setPaletteResults(root, groups) {
  const list = listOf(root);
  if (!list) return;
  list.innerHTML = typeof groups === 'string' ? groups : commandPaletteList(groups, { uid: list.id.replace(/-list$/, '') });
  applyQuery(root);
}

/** Open it, remembering what to give focus back to. */
export function openCommandPalette(root, returnFocusTo) {
  if (!root || root.classList.contains('is-open')) return;
  root.__cmdkReturn = returnFocusTo
    || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  root.classList.add('is-open');
  const panel = root.querySelector('[data-cmdk-panel]');
  pushOverlay(root, panel, () => closeCommandPalette(root), OVERLAY_LAYER.palette);
  const input = inputOf(root);
  // It opens empty. A palette that comes back holding the last query shows a
  // list that answers a question the reader has already finished asking, and
  // the first keystroke then appends to it.
  if (input) { input.value = ''; input.focus(); }
  applyQuery(root);
}

export function closeCommandPalette(root) {
  if (!root || !root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  popOverlay(root);
  const back = root.__cmdkReturn;
  root.__cmdkReturn = null;
  returnFocus(back, root.ownerDocument);
}

/**
 * Run what the reader chose.
 *
 * An item that names a confirm is left alone: its `data-confirm-open` is the
 * kit's own trigger, and the confirm opens ABOVE the palette on the shared
 * overlay stack, so Escape answers the question rather than closing the palette
 * underneath it.
 */
function activate(root, el, e) {
  if (!el || el.getAttribute('aria-disabled') === 'true') return;
  const detail = { id: el.dataset.id, href: el.dataset.href || null, item: el };
  const newTab = !!(e && (e.metaKey || e.ctrlKey));
  const view = root.ownerDocument.defaultView;
  // The document's own constructor, not the global one: a page under test is a
  // second document, and an Event built by another realm's class is refused by it.
  root.dispatchEvent(new view.CustomEvent('ui-command', { detail, bubbles: true }));
  if (el.hasAttribute('data-confirm-open')) return; // confirm() takes it from here
  closeCommandPalette(root);
  const href = el.dataset.href;
  if (!href) return;
  if (newTab) view?.open(href, '_blank', 'noopener');
  else if (view) view.location.href = href;
}

function onKeydown(root, e) {
  const options = visibleOptions(root);
  const at = options.indexOf(activeOf(root));
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!options.length) return;
    e.preventDefault();
    const step = e.key === 'ArrowDown' ? 1 : -1;
    // Wrapping, because the list is short and a reader holding Down to see what
    // is at the end should not have to let go to get back to the top.
    const next = (at + step + options.length) % options.length;
    setActive(root, options[next]);
  } else if (e.key === 'Enter') {
    if (at === -1) return;
    e.preventDefault();
    activate(root, options[at], e);
  }
  // Escape is not handled here. overlay.js owns it for every overlay on the
  // page, so one Escape closes the one on top — the confirm this palette opened
  // before the palette itself.
}

export function wireCommandPalette(scope = document) {
  const root = scope === document ? document : scope;
  root.querySelectorAll('[data-cmdk]').forEach((cmdk) => {
    if (cmdk.__cmdkWired) return;
    cmdk.__cmdkWired = true;

    cmdk.querySelector('[data-cmdk-scrim]')?.addEventListener('click', () => closeCommandPalette(cmdk));
    const input = inputOf(cmdk);
    input?.addEventListener('input', () => {
      applyQuery(cmdk);
      if (cmdk.getAttribute('data-cmdk-rank') === 'off') {
        const view = cmdk.ownerDocument.defaultView;
        cmdk.dispatchEvent(new view.CustomEvent('ui-command-query', {
          detail: { query: input.value }, bubbles: true,
        }));
      }
    });
    cmdk.addEventListener('keydown', (e) => onKeydown(cmdk, e));
    // Pointer: hovering moves the active row the way every palette does, and the
    // click lands on mouseup like a menu item rather than on mousedown.
    listOf(cmdk)?.addEventListener('mousemove', (e) => {
      const row = e.target.closest?.('[data-cmdk-item]');
      if (row && !row.hidden && row !== activeOf(cmdk)) setActive(cmdk, row);
    });
    listOf(cmdk)?.addEventListener('click', (e) => {
      const row = e.target.closest?.('[data-cmdk-item]');
      if (row) activate(cmdk, row, e);
    });

    applyQuery(cmdk);
    adoptOverlay(cmdk, cmdk.querySelector('[data-cmdk-panel]'), () => closeCommandPalette(cmdk), OVERLAY_LAYER.palette);
  });

  const doc = scope === document ? document : (scope.ownerDocument || document);
  if (!doc.__cmdkGlobalWired) {
    doc.__cmdkGlobalWired = true;
    doc.addEventListener('click', (e) => {
      const opener = e.target.closest?.('[data-cmdk-open]');
      if (!opener) return;
      e.preventDefault();
      const target = doc.getElementById(opener.getAttribute('data-cmdk-open'));
      if (target) openCommandPalette(target, opener);
    });
    // Cmd/Ctrl+K opens the first palette on the page that asked for the key.
    // Ctrl+K alone is left to a text box the reader is typing in — it is
    // kill-to-end-of-line there on every platform — while Cmd+K is answered
    // wherever focus is, because it is nothing else's key.
    doc.addEventListener('keydown', (e) => {
      if (e.key !== 'k' && e.key !== 'K') return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const cmdk = doc.querySelector('[data-cmdk][data-cmdk-hotkey]');
      if (!cmdk) return;
      const typing = doc.activeElement;
      const inField = typing && /^(INPUT|TEXTAREA)$/.test(typing.tagName) && !cmdk.contains(typing);
      if (inField && !e.metaKey) return;
      e.preventDefault();
      if (cmdk.classList.contains('is-open')) closeCommandPalette(cmdk);
      else openCommandPalette(cmdk, typing instanceof HTMLElement ? typing : null);
    });
  }
  syncOverlays(doc);
}
