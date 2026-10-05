/* What a filter chip shows, what it is called, when it counts as unset, and
 * where the focus goes when the bar runs out of controls.
 * The chip prints the chosen value by itself — never the field's name beside it
 * — and the field's name stands in while nothing is chosen. Both faces ask
 * these, so a chip reads the same in vanilla and in React.
 *
 * `value` is display text: it is the chip's only visible line, so a consumer
 * answers a change with text a reader can read, not a raw code.
 * why: docs/components.md#dense-financial-tables
 */

const text = (v) => (v == null ? '' : String(v));

/** No value chosen: absent, null or the empty string. */
export function filterChipUnset({ value } = {}) {
  return text(value) === '';
}

/** The one line the chip prints: the value, or the field's name while unset. */
export function filterChipText(filter = {}) {
  return filterChipUnset(filter) ? text(filter.label) : text(filter.value);
}

/** What a reader hears: the field, and its value or the empty state. A filter
 *  with no label is named by its value alone — "undefined" is not a name. */
export function filterChipName(filter = {}) {
  const field = text(filter.label);
  if (!field) return text(filter.value);
  return filterChipUnset(filter) ? `${field}: any` : `${field}: ${text(filter.value)}`;
}

/* compareDocumentPosition's own flags, without reaching for a `Node` global
   that a test environment need not define. */
const FOLLOWING = 4;
const PRECEDING = 2;

/** A tab stop the focus cannot actually land on. `hidden`, a disabled fieldset and
 *  `inert` are read off the document; `visibility` and `display` are read off the
 *  cascade, because a `visibility: hidden` control keeps its box and so passes any
 *  test made of rectangles. Each of them refuses `focus()` in a browser, and a
 *  refusal is silent: the focus lands on the body, with no ring on anything and
 *  the next Tab starting over from the top of the page. */
function unreachable(el) {
  if (el.tabIndex < 0 || el.disabled || el.inert) return true;
  if (el.closest('[hidden],[inert],fieldset:disabled')) return true;
  const view = el.ownerDocument.defaultView;
  const style = view && view.getComputedStyle(el);
  return !!style && (style.visibility === 'hidden' || style.visibility === 'collapse'
    || style.display === 'none');
}

/** The controls a reader's Tab reaches from `host`, in the order the focus should
 *  try them: forward in document order, then back from `host`.
 *
 *  It reads the document, not the layout. Where boxes are measurable, a control
 *  that draws nothing is skipped; where nothing has a box — JSDOM has no layout
 *  — every tab stop counts, so the answer stays the document's order rather than
 *  becoming empty. */
function stopsAround(host) {
  const doc = host && host.ownerDocument;
  if (!doc) return [];
  const stops = [...doc.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
    .filter(el => !host.contains(el) && !unreachable(el));
  const drawn = stops.filter(el => el.getClientRects().length);
  const order = drawn.length ? drawn : stops;
  return [...order.filter(el => host.compareDocumentPosition(el) & FOLLOWING),
    ...order.filter(el => host.compareDocumentPosition(el) & PRECEDING).reverse()];
}

/** The control a reader's next Tab would reach from `host`: forward in document
 *  order, else the nearest one behind it. A filter bar that has just dropped its
 *  last control keeps no box the focus ring can sit on, so the focus has to
 *  leave the bar rather than land on a line with no height.
 *  why: docs/components.md#a-filter-row-holds-its-panels */
export function nextFocusStop(host) {
  return stopsAround(host)[0] || null;
}

/** Puts the focus where an emptied bar hands it on, and answers with the element
 *  it ended on, or null if nothing took it.
 *
 *  A bar that still holds chips draws a box around them, so it takes the focus
 *  itself, made focusable for that moment. Emptied, it has only an out-of-flow
 *  legend left and measures 0 high, so the focus goes to the first control
 *  outside it that will have it — on the Stock screener the caller's own
 *  `Add filter`, in the React Finance composition the view strip's chosen tab.
 *
 *  Being reachable is not the same as taking the focus: a control can be visible
 *  and enabled and still refuse, so each candidate is asked and then checked, and
 *  the next one tried.
 *  why: docs/components.md#a-filter-row-holds-its-panels */
export function focusNextStop(host) {
  const doc = host && host.ownerDocument;
  if (!doc) return null;
  const bar = host.matches('[data-filter-bar]') ? host : host.querySelector('[data-filter-bar]');
  if (bar && bar.querySelector('[data-filter-id]')) {
    bar.tabIndex = -1; bar.focus();
    return doc.activeElement === bar ? bar : null;
  }
  for (const stop of stopsAround(host)) {
    stop.focus();
    if (doc.activeElement === stop) return stop;
  }
  return null;
}

/** The chip's menu with the chip's own value marked, so the line the chip prints
 *  and the row the menu marks cannot disagree. A row is identified the way the
 *  dropdown identifies it when it reports a pick: by `value`, or by `label` where
 *  it carries none.
 *
 *  Every row's flag is written, not only the chosen one's, so a chip with nothing
 *  chosen or a value in no row marks no row. Handing those items back as the
 *  consumer wrote them left whatever they had marked standing — a menu checking
 *  `All`, `aria-selected="true"` on it, under a chip printing `Asia`. The
 *  consumer's own array and objects are not written to. #550
 *  why: docs/components.md#a-filter-row-holds-its-panels */
export function filterChipItems(filter = {}) {
  const items = filter.items || [];
  const chosen = text(filter.value);
  const row = (it) => !!it && it !== '---' && !it.separator;
  const key = (it) => text(it.value != null ? it.value : it.label);
  const inForce = !filterChipUnset(filter) && items.some((it) => row(it) && key(it) === chosen);
  return items.map((it) => (row(it) ? { ...it, selected: inForce && key(it) === chosen } : it));
}
