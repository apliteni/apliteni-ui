/* What a filter chip shows, what it is called, and when it counts as unset.
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

/**
 * The chip's items with the current value marked, so the menu ticks the row the
 * trigger shows — Dropdown's own `selected`, and nothing else.
 *
 * `value` is display text, and a consumer answers a change with either the picked
 * row's `value` or its label, so a row matching either is the current one; only the
 * first match is marked, so one row carries the tick. Both sides are compared as
 * strings, because a row's `value` may be a number and a chip echoing one back must
 * still mark its row. Public because both faces of the filter bar ask it, the way
 * both ask dropdownMatch().
 * why: docs/specification.md#dense-financial-tables
 */
export function filterBarItems(items = [], value) {
  const want = value == null ? null : String(value);
  let marked = false;
  return items.map((item) => {
    // Separators and holes pass through untouched; the same rule as the kit's own isRow.
    if (!item || item === '---' || item.separator) return item;
    const hit = !marked && want != null
      && (item.label === want || (item.value != null && String(item.value) === want));
    if (hit) marked = true;
    return { ...item, selected: hit };
  });
}
