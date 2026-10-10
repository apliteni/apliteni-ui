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
 * edge, less the gap it keeps from the anchor and the edge inset it keeps from
 * that edge. `up` measures the room above the anchor, otherwise below it.
 *
 * Public for the same reason the two above are: the vanilla wiring and the React
 * <Dropdown> both have to arrive at the same number, and a panel that ends inside
 * the viewport in one and past it in the other is the bug this answers (#489).
 *
 * `min` is a floor: a trigger near the edge has little room, and a panel reduced
 * to a sliver is worse than one that spends some of the edge inset to stay
 * usable. The floor never spends room PAST the edge to get there, though,
 * because that room does not exist — it spends the inset instead, down to
 * nothing, and the panel still ends at or before the edge.
 */
export const dropdownAvail = ({ anchorTop, anchorBottom, viewport, gap, inset, min, up = false }) => {
  const room = Math.max(up ? anchorTop - gap : viewport - anchorBottom - gap, 0);
  return Math.max(room - inset, Math.min(min, room));
};
