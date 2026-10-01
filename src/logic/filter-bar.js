/* What a filter chip shows, and what it is called. The chip prints the chosen
 * value by itself — never the field's name beside it — and the field's name
 * stands in while nothing is chosen. Both faces ask these, so a chip reads the
 * same in vanilla and in React.
 * why: docs/specification.md#dense-financial-tables
 */

const unset = (value) => value == null || String(value) === '';

/** The one line the chip prints: the value, or the field's name while unset. */
export function filterChipText({ label, value } = {}) {
  return unset(value) ? label : String(value);
}

/** What a reader hears: the field, and its value when it has one. */
export function filterChipName({ label, value } = {}) {
  return unset(value) ? String(label ?? '') : `${label}: ${value}`;
}
