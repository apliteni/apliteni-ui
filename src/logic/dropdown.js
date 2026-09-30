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

/**
 * How tall a floating panel may be: the room between its anchor and the viewport
 * edge, less the gap it keeps from the anchor and the inset it keeps from the
 * edge. `up` measures the room above the anchor, otherwise below it.
 *
 * Public for the same reason the two above are: the vanilla wiring and the React
 * <Dropdown> both have to arrive at the same number, and a panel that ends inside
 * the viewport in one and past it in the other is the bug this answers (#489).
 *
 * `min` is a floor, because a trigger sitting on the viewport edge has no room at
 * all and a nought-pixel panel is worse than one that overhangs: below the floor
 * the panel keeps the floor and scrolls inside it.
 */
export const dropdownAvail = ({ anchorTop, anchorBottom, viewport, gap, inset, min, up = false }) =>
  Math.max((up ? anchorTop - gap : viewport - anchorBottom - gap) - inset, min);
