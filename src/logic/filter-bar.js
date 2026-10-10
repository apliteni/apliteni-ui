/* What a filter chip shows, what it is called, and when it counts as unset.
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
