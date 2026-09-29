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
