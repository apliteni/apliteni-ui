/* What a filter chip shows, what it is called, when it counts as unset, and
 * where the focus goes when the bar runs out of controls.
 * The chip prints the chosen value by itself — never the field's name beside it
 * — and the field's name stands in while nothing is chosen. Both faces ask
 * these, so a chip reads the same in vanilla and in React.
 *
 * `value` is display text: it is the chip's only visible line, so a consumer
 * answers a change with text a reader can read, not a raw code.
 * why: docs/specification.md#dense-financial-tables
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

/** The control a reader's next Tab would reach from `host`: forward in document
 *  order, else the nearest one behind it. A filter bar that has just dropped its
 *  last control keeps no box the focus ring can sit on, so the focus has to
 *  leave the bar rather than land on a line with no height.
 *
 *  It reads the document, not the layout. Where boxes are measurable, a control
 *  that draws nothing is skipped; where nothing has a box — JSDOM has no layout
 *  — every tab stop counts, so the answer stays the document's order rather than
 *  becoming null. why: docs/specification.md#a-filter-row-holds-its-panels */
export function nextFocusStop(host) {
  const doc = host && host.ownerDocument;
  if (!doc) return null;
  const stops = [...doc.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
    .filter(el => !host.contains(el) && el.tabIndex > -1 && !el.disabled
      && !el.closest('fieldset:disabled') && !el.closest('[hidden]'));
  const drawn = stops.filter(el => el.getClientRects().length);
  const order = drawn.length ? drawn : stops;
  const ahead = order.filter(el => host.compareDocumentPosition(el) & FOLLOWING);
  return ahead[0] || order.filter(el => host.compareDocumentPosition(el) & PRECEDING).pop() || null;
}
