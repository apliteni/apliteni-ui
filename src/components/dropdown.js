// Dropdown — the kit's one popover-list primitive. A trigger opens a panel of
// item rows; two flavours share the same panel and the same open/close JS:
//
//   variant: 'select'  → role="listbox" / role="option", value shown in trigger
//   variant: 'menu'    → role="menu"    / role="menuitem", action list
//
// The name is deliberate: `menu` implies actions only and `select` implies a
// form control bound to a value, and this factory is the umbrella both are
// specialisations of. The topbar's version switcher and account menu are thin
// consumers of the SAME wiring, so there is one open/close/Esc/keyboard
// implementation in the kit.
//
//   container.innerHTML = dropdown({ label: 'version:', value: '…', items });
//   wireDropdown(container);   // or let wireTopbar() do it
import { esc, icon } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// A trailing status badge. `badge` is the text shown, in the case it is written
// ("Live"), or { text, tone }; a string reading "live" in any case takes the live tone.
function ddBadge(badge) {
  if (!badge) return '';
  const text = typeof badge === 'string' ? badge : badge.text;
  let tone = typeof badge === 'string' ? '' : (badge.tone || '');
  if (!tone) tone = /^live$/i.test(text) ? 'live' : 'neutral';
  return `<span class="${cx('ui-dropdown__badge', `is-${tone}`)}">${esc(text)}</span>`;
}

// One item row. `listbox` picks role=option (selectable) vs role=menuitem (action).
function ddItem(it, listbox, ext) {
  if (it === '---' || it.separator) return `<div class="ui-dropdown__sep" role="separator"${ext?.filtering ? ' hidden' : ''}></div>`;
  const disabled = !!it.disabled;
  const selected = !!it.selected;
  const role = listbox ? 'option' : 'menuitem';
  const asLink = !!it.href && !disabled && !listbox;
  const tag = asLink ? 'a' : 'div';
  const lead = it.icon ? `<span class="ui-dropdown__ic">${icon(it.icon)}</span>` : '';
  const desc = it.description ? `<span class="ui-dropdown__desc">${esc(it.description)}</span>` : '';
  const main = `<span class="ui-dropdown__main"><span class="ui-dropdown__label">${esc(it.label)}</span>${desc}</span>`;
  const badge = ddBadge(it.badge);
  const tick = listbox ? `<span class="ui-dropdown__tick" aria-hidden="true">${icon('check')}</span>` : '';
  const attrs = [
    `class="${cx('ui-dropdown__item', selected && 'is-selected', disabled && 'is-disabled', it.danger && 'is-danger')}"`,
    'data-dd-item',
    `role="${role}"`,
    'tabindex="-1"',
    it.value != null ? `data-value="${esc(it.value)}"` : '',
    listbox ? `aria-selected="${selected ? 'true' : 'false'}"` : '',
    disabled ? 'aria-disabled="true"' : '',
    asLink ? `href="${esc(it.href)}"` : '',
    asLink && it.target ? `target="${esc(it.target)}"` : '',
    ext?.id ? `id="${esc(ext.id)}"` : '',
    ext?.hidden ? 'hidden' : '',
  ].filter(Boolean).join(' ');
  return `<${tag} ${attrs}>${lead}${main}${badge}${tick}</${tag}>`;
}

// Render a flat item list or grouped sections ([{ label, items }]). `sx` is the
// search variant's context; the plain dropdown passes none and its markup is
// unchanged.
function ddBody({ items, sections }, listbox, sx) {
  const one = (it) => ddItem(it, listbox, sx && ddRowExt(it, sx));
  if (sections && sections.length) {
    return sections.map((s) => {
      const head = s.label ? `<div class="ui-dropdown__group" role="presentation">${esc(s.label)}</div>` : '';
      const gone = sx && dropdownFiltering(sx.q)
        && !(s.items || []).some((it) => ddIsRow(it) && dropdownMatch(it.label, sx.q));
      return `<div class="ui-dropdown__section" role="group"${s.label ? ` aria-label="${esc(s.label)}"` : ''}${gone ? ' hidden' : ''}>${head}${(s.items || []).map(one).join('')}</div>`;
    }).join('');
  }
  return (items || []).map(one).join('');
}

// ---- Search --------------------------------------------------------------
// The match is a substring of the label, anywhere in it, ignoring case and
// accents; rows keep their order. The factory and the wiring both ask
// dropdownMatch(), so a preset query and a typed one hide the same rows.
// why: docs/specification.md#a-dropdown-with-a-search-field
// NFD takes the mark off é or ö; ł, ø, đ and the rest are letters of their own
// with nothing to take off, so they are mapped by hand.
const FOLD = { ł: 'l', ø: 'o', đ: 'd', ð: 'd', ß: 'ss', æ: 'ae', œ: 'oe', ı: 'i', þ: 'th' };
const fold = (s) => String(s == null ? '' : s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[łøđðßæœıþ]/g, (c) => FOLD[c]);

/**
 * Is this query narrowing anything? A query of spaces, or of marks with no letter
 * under them, is not — it leaves every row showing, and the separators with them.
 *
 * Public because a second implementation of this dropdown cannot write its own: the
 * React <Dropdown> asks these two, the way <CommandPalette> asks rankGroups(), so a
 * list a server rendered and the same list after a keystroke hide the same rows.
 */
export const dropdownFiltering = (query) => fold(query).trim() !== '';

/** Does `label` match `query`? A substring, anywhere, ignoring case and accents. */
export const dropdownMatch = (label, query) => fold(label).includes(fold(query).trim());
const ddIsRow = (it) => it && it !== '---' && !it.separator;

let _ddSeq = 0;

function ddSearchContext(search, id) {
  const o = search === true ? {} : search;
  return {
    base: id || `ui-dd-${++_ddSeq}`,
    n: 0,
    q: o.query || '',
    label: o.label,
    placeholder: o.placeholder || 'Search',
    empty: o.empty || 'No match for “{q}”',
    hint: o.hint || 'Check the spelling, or try fewer letters.',
  };
}

function ddRowExt(it, sx) {
  if (!ddIsRow(it)) return { filtering: dropdownFiltering(sx.q) };
  return { id: `${sx.base}-opt-${sx.n++}`, hidden: !dropdownMatch(it.label, sx.q) };
}

// The no-match state. A function replacer, so a `$&` typed into the field is
// text rather than a replacement pattern.
function ddNone(empty, hint, q) {
  return `<span class="ui-dropdown__none-title">${esc(empty.replace('{q}', () => q.trim()))}</span>`
    + `<span class="ui-dropdown__none-hint">${esc(hint)}</span>`;
}

// The field is a combobox that owns the list; the rows stay options, and the
// one Enter would pick is named by aria-activedescendant, so focus never
// leaves the field while the reader types.
function ddSearchBody({ items, sections }, sx, name, scroll) {
  const listId = `${sx.base}-list`;
  const rows = ddBody({ items, sections }, true, sx);
  const flat = (sections ? sections.flatMap((s) => s.items || []) : (items || [])).filter(ddIsRow);
  const shown = flat.some((it) => dropdownMatch(it.label, sx.q));
  const cap = scroll && scroll !== true ? ` style="max-height:${typeof scroll === 'number' ? scroll + 'px' : esc(scroll)}"` : '';
  const input = [
    'class="ui-dropdown__search-input"', 'type="text"', 'role="combobox"',
    'aria-autocomplete="list"', 'aria-expanded="true"', `aria-controls="${esc(listId)}"`,
    `aria-label="${esc(sx.label || `Search ${name}`)}"`, `placeholder="${esc(sx.placeholder)}"`,
    'autocomplete="off"', 'spellcheck="false"', 'data-dd-search',
    sx.q ? `value="${esc(sx.q)}"` : '',
  ].filter(Boolean).join(' ');
  return `<div class="ui-dropdown__search">`
    + `<span class="ui-dropdown__search-ic" aria-hidden="true">${icon('search')}</span><input ${input}></div>`
    + `<div class="ui-dropdown__list" role="listbox" id="${esc(listId)}" aria-label="${esc(name)}"${cap}>${rows}</div>`
    + `<div class="ui-dropdown__none" role="status" data-dd-none data-dd-empty="${esc(sx.empty)}" data-dd-hint="${esc(sx.hint)}">`
    + `${shown || !dropdownFiltering(sx.q) ? '' : ddNone(sx.empty, sx.hint, sx.q)}</div>`;
}

/**
 * The public factory. Returns an HTML string; wire it with wireDropdown().
 *
 * @param {object} [o]
 * @param {string} [o.label]       muted prefix in the trigger (e.g. "version:")
 * @param {string} [o.value]       current value shown in the trigger
 * @param {string} [o.placeholder] shown when there is no value
 * @param {string} [o.variant]     'select' (listbox) | 'menu' (inferred from items)
 * @param {Array}  [o.items]       [{ label, value?, description?, icon?, badge?, selected?, disabled?, href?, danger? }]
 * @param {Array}  [o.sections]    [{ label, items }] — grouped alternative to items
 * @param {string} [o.header]      raw HTML pinned to the top of the panel
 * @param {string} [o.footer]      raw HTML pinned to the bottom of the panel
 * @param {string} [o.align]       'start' (default) | 'end' — the edge the panel hugs
 * @param {string} [o.direction]   'down' (default) | 'up' | 'auto' — the way it opens
 * @param {boolean} [o.portal]     mount the panel on <body>, for a clipping or sticky ancestor
 * @param {boolean|number} [o.scroll] true, or a maxHeight in px, to cap and scroll
 * @param {boolean} [o.open]       render already-open (handy for screenshots)
 * @param {string} [o.ariaLabel]   accessible name for the panel and trigger
 * @param {boolean|object} [o.search] true, or { placeholder, label, empty, hint, query } —
 *   a field above the rows that filters them; `empty` may carry {q}
 * @returns {string} html
 */
export function dropdown({
  label, value, placeholder = 'Select…', variant, items, sections,
  header = '', footer = '', triggerContent, triggerClass = '', chevron = true,
  align = 'start', direction = 'down', portal = false,
  scroll = false, open = false, ariaLabel, id, panelClass = '', search = false,
} = {}) {
  const flat = sections ? sections.flatMap((s) => s.items || []) : (items || []);
  const isSelect = variant === 'select' || (variant == null && flat.some((it) => it && (it.selected || it.value != null)));
  const listRole = isSelect ? 'listbox' : 'menu';
  const cur = value != null ? value : (isSelect ? (flat.find((it) => it && it.selected)?.label) : null);
  const sx = search ? ddSearchContext(search, id) : null;
  const name = ariaLabel || (label ? String(label).replace(/:\s*$/, '') : '') || 'Options';

  const trig = triggerContent != null
    ? triggerContent
    : `${label ? `<span class="ui-dropdown__pre">${esc(label)}</span>` : ''}` +
      `<span class="ui-dropdown__value">${esc(cur != null ? cur : placeholder)}</span>`;
  const triggerAttrs = [
    `class="${cx('ui-dropdown__trigger', triggerClass)}"`,
    'type="button"',
    'data-dropdown-trigger',
    `aria-haspopup="${sx ? 'dialog' : listRole}"`,
    `aria-expanded="${open ? 'true' : 'false'}"`,
    ariaLabel && triggerContent != null ? `aria-label="${esc(ariaLabel)}"` : '',
  ].filter(Boolean).join(' ');

  // `is-open` beside `open` because the descendant selector the panel normally
  // takes its open state from stops matching once wireDropdown() portals it.
  const panelAttrs = [
    `class="${cx(
      'ui-dropdown__panel',
      align === 'end' && 'is-end',
      direction === 'up' && 'is-up',
      scroll && !sx && 'is-scroll',
      sx && 'ui-dropdown__panel--search',
      portal && 'ui-dropdown__panel--portal',
      portal && open && 'is-open',
      panelClass,
    )}"`,
    'data-dropdown-panel',
    // With search the panel holds a field and a list, which a listbox may not.
    `role="${sx ? 'dialog' : listRole}"`,
    sx ? `aria-label="${esc(name)}"` : (ariaLabel ? `aria-label="${esc(ariaLabel)}"` : ''),
    scroll && scroll !== true && !sx ? `style="max-height:${typeof scroll === 'number' ? scroll + 'px' : esc(scroll)}"` : '',
  ].filter(Boolean).join(' ');

  const ddAttrs = 'data-dropdown'
    + (isSelect ? ' data-dropdown-select' : '')
    + (direction === 'auto' ? ' data-dropdown-direction="auto"' : '')
    + (portal ? ' data-dropdown-portal' : '');

  return `<div class="${cx('ui-dropdown', open && 'open')}" ${ddAttrs}${id ? ` id="${esc(id)}"` : ''}>` +
    `<button ${triggerAttrs}>${trig}${chevron ? '<span class="ui-dropdown__chevron" aria-hidden="true"></span>' : ''}</button>` +
    `<div ${panelAttrs}>${header}${sx ? ddSearchBody({ items, sections }, sx, name, scroll) : ddBody({ items, sections }, isSelect)}${footer}</div>` +
    `</div>`;
}

// ---- Shared behaviour ----------------------------------------------------
// One implementation for every dropdown in the kit — the generic component AND
// the topbar's version switcher / account menu (they emit the same data hooks:
// [data-dropdown] > [data-dropdown-trigger] + [data-dropdown-panel], toggling
// `.open` on the container so each keeps its own visual CSS).
//
// Per-instance trigger + keyboard handlers are attached once (guarded by a flag
// on the element). Document-level click-outside + Esc are attached once per
// document. Safe to call repeatedly (e.g. Storybook re-renders).

// Every wired container, so the close handlers can reach a dropdown wherever it
// was drawn: `document.querySelectorAll` enters no shadow root and sees no other
// document. A Set and not a WeakSet, because this has to be walked.
// why: docs/specification.md#the-dropdown-panel
const _ddAll = new Set();
// One pair of close handlers per document that holds a dropdown, the same way
// wireShell() listens once per document it is handed.
const _ddWiredDocs = new WeakSet();

/** Where a portalled panel goes: the top of the tree its trigger lives in. A
 *  shadow root is its own top — moving the panel out to the page's <body> would
 *  leave every style scoped to that root behind. */
const ddHostOf = (node) => {
  const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  return root.nodeType === 9 ? root.body : root;
};

/** The window a box is measured in. A panel in a frame is laid out against the
 *  frame's viewport, not the top page's. */
const ddViewOf = (node) => node.ownerDocument?.defaultView || window;

// The trigger-to-panel offset is --ui-dropdown-gap in src/styles/dropdown.css.
// This is the fallback for a document that has not loaded the sheet;
// src/components/dropdown.test.js pins the two to each other.
const DD_GAP = 9;

// A portalled panel is no longer a descendant of its container, so everything
// below asks the container for its panel rather than querying inside it.
const ddPanelOf = (dd) => dd.__ddPanel || dd.querySelector('[data-dropdown-panel]');

function ddGap(panel) {
  const declared = parseFloat(ddViewOf(panel).getComputedStyle(panel).getPropertyValue('--ui-dropdown-gap'));
  return Number.isFinite(declared) ? declared : DD_GAP;
}

function ddItemsOf(dd) {
  const panel = ddPanelOf(dd);
  if (!panel) return [];
  return Array.from(panel.querySelectorAll('[data-dd-item]'))
    .filter((el) => el.getAttribute('aria-disabled') !== 'true' && !el.hidden);
}

// ---- Search wiring ---------------------------------------------------------
// why: docs/specification.md#a-dropdown-with-a-search-field
const ddSearchOf = (dd) => ddPanelOf(dd)?.querySelector('[data-dd-search]') || null;
const ddActiveOf = (dd) => ddPanelOf(dd)?.querySelector('[data-dd-item].is-active') || null;
const ddComposing = (e) => e.isComposing || e.keyCode === 229;

// Mark the row Enter would pick and keep it inside the list's scroll box,
// without scrolling the page the way scrollIntoView() would.
function ddSetActive(dd, row) {
  const search = ddSearchOf(dd);
  if (!search) return;
  ddActiveOf(dd)?.classList.remove('is-active');
  if (!row) { search.removeAttribute('aria-activedescendant'); return; }
  row.classList.add('is-active');
  search.setAttribute('aria-activedescendant', row.id);
  const list = row.closest('.ui-dropdown__list');
  if (!list || !list.clientHeight) return;
  const top = row.offsetTop - list.offsetTop;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + row.offsetHeight - list.clientHeight;
}

function ddFilter(dd) {
  const panel = ddPanelOf(dd);
  const search = ddSearchOf(dd);
  if (!panel || !search) return;
  const q = search.value;
  let shown = 0;
  panel.querySelectorAll('[data-dd-item]').forEach((row) => {
    row.hidden = !dropdownMatch((row.querySelector('.ui-dropdown__label') || row).textContent, q);
    if (!row.hidden) shown += 1;
  });
  panel.querySelectorAll('.ui-dropdown__sep').forEach((el) => { el.hidden = dropdownFiltering(q); });
  panel.querySelectorAll('.ui-dropdown__section').forEach((el) => { el.hidden = !el.querySelector('[data-dd-item]:not([hidden])'); });
  const none = panel.querySelector('[data-dd-none]');
  if (none) {
    none.innerHTML = shown || !dropdownFiltering(q) ? ''
      : ddNone(none.getAttribute('data-dd-empty') || '', none.getAttribute('data-dd-hint') || '', q);
  }
  ddSetActive(dd, ddItemsOf(dd)[0] || null);
}

// Every open starts from the whole list. Reset here rather than on close, so
// a panel fading out after a pick does not flash back to every row.
function ddResetSearch(dd, panel, search) {
  search.value = '';
  ddFilter(dd);
  panel.style.minWidth = '';
  // Hold the width the whole list needs, so the panel does not narrow as rows go.
  if (panel.offsetWidth) panel.style.minWidth = `${panel.offsetWidth}px`;
}

// `auto` is the only direction the wiring decides; `up` and the default are the
// panel's own class, set once at render. Flip only when below is too tight AND
// above is roomier, so a panel that fits nowhere still opens the way it says.
function ddResolveDirection(dd, panel) {
  if (dd.getAttribute('data-dropdown-direction') !== 'auto') return;
  const trigger = dd.querySelector('[data-dropdown-trigger]');
  if (!trigger || typeof trigger.getBoundingClientRect !== 'function') return;
  const t = trigger.getBoundingClientRect();
  const below = ddViewOf(panel).innerHeight - t.bottom;
  panel.classList.toggle('is-up', below < panel.offsetHeight + ddGap(panel) && t.top > below);
}

// Nothing lays a portalled panel out any more, so these four inline values are
// its layout. Inline, so no rule in any sheet can pin the opposite edge.
function positionPortalPanel(dd, panel) {
  const trigger = dd.querySelector('[data-dropdown-trigger]');
  if (!trigger || typeof trigger.getBoundingClientRect !== 'function') return;
  const view = ddViewOf(panel);
  const t = trigger.getBoundingClientRect();
  const gap = ddGap(panel);
  const s = panel.style;
  if (panel.classList.contains('is-up')) {
    s.top = 'auto';
    s.bottom = `${view.innerHeight - t.top + gap}px`;
  } else {
    s.bottom = 'auto';
    s.top = `${t.bottom + gap}px`;
  }
  if (panel.classList.contains('is-end')) {
    s.left = 'auto';
    s.right = `${view.innerWidth - t.right}px`;
  } else {
    s.right = 'auto';
    s.left = `${t.left}px`;
  }
}

// A portalled panel outlives the container that owned it — a re-render replaces
// the container and the old panel has nothing pointing at it. Swept in the host
// it was put in, which is the tree the new container is in too.
function sweepOrphanPanels(host) {
  host.querySelectorAll(':scope > [data-dropdown-panel][data-dropdown-portal]')
    .forEach((p) => { if (!p.__ddOwner || !p.__ddOwner.isConnected) p.remove(); });
}

function closeDropdown(dd) {
  if (!dd.classList.contains('open')) return;
  dd.classList.remove('open');
  ddPanelOf(dd)?.classList.remove('is-open');
  dd.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
}

/** Every wired dropdown still in a tree, the ones in frames and shadow roots
 *  included. Disconnected containers are dropped as they are passed. */
function ddLive() {
  const out = [];
  for (const dd of _ddAll) {
    if (dd.isConnected) out.push(dd);
    else _ddAll.delete(dd);
  }
  return out;
}

function closeAllDropdowns(except) {
  for (const dd of ddLive()) if (dd !== except && dd.classList.contains('open')) closeDropdown(dd);
}

function openDropdown(dd, focusIdx) {
  closeAllDropdowns(dd);
  const panel = ddPanelOf(dd);
  const search = ddSearchOf(dd);
  if (panel && search) ddResetSearch(dd, panel, search);
  if (panel) {
    ddResolveDirection(dd, panel);
    if (dd.__ddPanel) { positionPortalPanel(dd, panel); panel.classList.add('is-open'); }
  }
  dd.classList.add('open');
  dd.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'true');
  // With search, focus goes to the field however the panel was opened, and
  // the selected row (or the first) is the one Enter would pick.
  if (search) {
    const items = ddItemsOf(dd);
    ddSetActive(dd, items.find((el) => el.getAttribute('aria-selected') === 'true') || items[0] || null);
    search.focus();
    return;
  }
  if (focusIdx != null) {
    const items = ddItemsOf(dd);
    const sel = items.findIndex((el) => el.getAttribute('aria-selected') === 'true');
    (items[focusIdx === 'selected' && sel >= 0 ? sel : (focusIdx === 'selected' ? 0 : focusIdx)] || items[0])?.focus();
  }
}

// Single-select: reflect the picked option into aria-selected + the trigger value.
function selectOption(dd, item) {
  if (!dd.hasAttribute('data-dropdown-select')) return;
  // Every enabled row, the ones a search query has hidden included.
  ddPanelOf(dd)?.querySelectorAll('[data-dd-item]:not([aria-disabled="true"])')
    .forEach((el) => el.setAttribute('aria-selected', el === item ? 'true' : 'false'));
  ddPanelOf(dd)?.querySelectorAll('[data-dd-item].is-selected').forEach((el) => el.classList.remove('is-selected'));
  item.classList.add('is-selected');
  const valueEl = dd.querySelector('[data-dropdown-trigger] .ui-dropdown__value');
  const label = item.querySelector('.ui-dropdown__label');
  if (valueEl && label) valueEl.textContent = label.textContent;
}

// Click-outside, Escape and the repositioning sweep, registered once per document
// that holds a dropdown — the same shape wireShell()'s listen() has, and for the
// same reason: a frame is its own document and a listener on the page's never
// fires there. why: docs/specification.md#the-dropdown-panel
function ddListen(doc) {
  if (!doc || _ddWiredDocs.has(doc)) return;
  _ddWiredDocs.add(doc);
  doc.addEventListener('click', () => closeAllDropdowns());
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || ddComposing(e)) return;
    const open = ddLive().find((dd) => dd.classList.contains('open') && dd.ownerDocument === doc);
    if (open) { closeDropdown(open); open.querySelector('[data-dropdown-trigger]')?.focus(); }
  });
  // Viewport coordinates go stale the moment anything scrolls. Capture, so a
  // scroll inside the rail the panel was lifted out of counts too.
  const reposition = () => {
    for (const dd of ddLive()) {
      if (dd.classList.contains('open') && dd.__ddPanel) positionPortalPanel(dd, dd.__ddPanel);
    }
  };
  const view = doc.defaultView;
  if (!view) return;
  view.addEventListener('scroll', reposition, true);
  view.addEventListener('resize', reposition);
}

export function wireDropdown(root = document) {
  const scope = root === document ? document : root;
  scope.querySelectorAll('[data-dropdown]').forEach((dd) => {
    if (dd.__ddWired) return;
    dd.__ddWired = true;
    _ddAll.add(dd);
    ddListen(dd.ownerDocument);
    const trigger = dd.querySelector('[data-dropdown-trigger]');
    const panel = dd.querySelector('[data-dropdown-panel]');
    if (!trigger) return;

    // Portal: lift the panel onto <body>. An ancestor whose overflow is not
    // `visible` clips it on both axes, and one that is `position: sticky` opens
    // a stacking context whatever z-index the panel carries — the app rail is
    // both at once. why: docs/specification.md#the-dropdown-panel
    if (panel && dd.hasAttribute('data-dropdown-portal')) {
      // The tree the trigger is in, not the page's: a panel lifted out of a
      // frame or a shadow root into the top document leaves its stylesheet and
      // its close handler behind. why: docs/specification.md#the-dropdown-panel
      const host = ddHostOf(dd);
      sweepOrphanPanels(host);
      panel.setAttribute('data-dropdown-portal', '');
      panel.__ddOwner = dd;
      dd.__ddPanel = panel;
      host.appendChild(panel);
      if (dd.classList.contains('open')) {
        ddResolveDirection(dd, panel);
        positionPortalPanel(dd, panel);
        panel.classList.add('is-open');
      }
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dd.classList.contains('open')) closeDropdown(dd);
      else openDropdown(dd);
    });

    if (panel) {
      // Clicks inside the panel shouldn't reach the document close handler;
      // activating an item selects (single-select) + closes.
      panel.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = e.target.closest('[data-dd-item]');
        if (!item || item.getAttribute('aria-disabled') === 'true') return;
        selectOption(dd, item);
        closeDropdown(dd);
        trigger.focus();
      });
      const field = panel.querySelector('[data-dd-search]');
      if (field) {
        field.addEventListener('input', () => ddFilter(dd));
        // The pointer moves the pick too, so Enter takes the row under it. A
        // move to the same point is the browser's own after a scroll, not the
        // reader's, and would snatch the pick from the arrows.
        let at = '';
        panel.addEventListener('mousemove', (e) => {
          const here = `${e.clientX},${e.clientY}`;
          if (here === at) return;
          at = here;
          const row = e.target.closest('[data-dd-item]');
          if (row && row.getAttribute('aria-disabled') !== 'true' && !row.classList.contains('is-active')) ddSetActive(dd, row);
        });
      }
    }

    const onKeydown = (e) => {
      const open = dd.classList.contains('open');
      const onTrigger = e.target === trigger;
      const search = ddSearchOf(dd);
      // While an IME is composing, its keys commit or steer the text, not the
      // list. Safari's committing Enter carries keyCode 229, not isComposing.
      if (e.target === search && ddComposing(e)) return;
      if (search && open) {
        // Arrows walk the rows still showing; focus stays in the field.
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = ddItemsOf(dd);
          if (!items.length) return;
          const i = items.indexOf(ddActiveOf(dd));
          const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
          ddSetActive(dd, items[next]);
          return;
        }
        if (e.target === search && e.key === 'Enter') { e.preventDefault(); ddActiveOf(dd)?.click(); return; }
        // Home and End move the caret in a text field; they are not the list's.
        if (e.target === search && (e.key === 'Home' || e.key === 'End')) return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (onTrigger || open)) {
        e.preventDefault();
        if (!open) return openDropdown(dd, e.key === 'ArrowDown' ? 0 : 'selected');
        const items = ddItemsOf(dd);
        const i = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next < 0 ? 0 : next]?.focus();
      } else if (e.key === 'Home' && open) {
        e.preventDefault(); ddItemsOf(dd)[0]?.focus();
      } else if (e.key === 'End' && open) {
        e.preventDefault(); const it = ddItemsOf(dd); it[it.length - 1]?.focus();
      } else if ((e.key === 'Enter' || e.key === ' ') && open && e.target.matches('[data-dd-item]')) {
        e.preventDefault(); e.target.click();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault(); e.stopPropagation(); closeDropdown(dd); trigger.focus();
      } else if (e.key === 'Tab' && open) {
        closeDropdown(dd);
      }
    };

    dd.addEventListener('keydown', onKeydown);
    if (dd.__ddPanel) {
      // A portalled panel is no longer inside the container, so a keystroke on
      // an item never bubbles to it. Bound here only, or it would fire twice.
      dd.__ddPanel.addEventListener('keydown', onKeydown);
      // It is also placed once, on open, and a trigger whose box changes after
      // that — a webfont arriving, a longer label — leaves it adrift. Scroll
      // and resize do not see a reflow; this does.
      if (typeof ResizeObserver === 'function') {
        new ResizeObserver(() => {
          if (dd.classList.contains('open')) positionPortalPanel(dd, dd.__ddPanel);
        }).observe(trigger);
      }
    }
  });

}
