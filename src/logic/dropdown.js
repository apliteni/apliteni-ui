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
 * to a sliver is worse than one left to its content height. The floor never
 * spends room PAST the edge to reach itself, because that room does not exist.
 * Once even the whole inset cannot reach it, there is no cap a reader could
 * use, so this returns `Infinity`: "nothing measured," the word a caller
 * already reads from an unmeasured panel. The panel then keeps its content
 * height, the document grows, and a reader reaches every row by scrolling the
 * page — a 27px sliver hiding 446px of rows was danger 1 in #641's review.
 */
export const dropdownAvail = ({ anchorTop, anchorBottom, viewport, gap, inset, min, up = false }) => {
  const room = Math.max(up ? anchorTop - gap : viewport - anchorBottom - gap, 0);
  return room < min ? Infinity : Math.max(room - inset, min);
};

/**
 * Where a capped panel stops so that its last row is cut through the middle: the
 * list then reads as going on, and a half row is the least that says so. `rows` are
 * the rows' tops and heights from the panel's top edge, scrolled to its start;
 * `below` is the panel's box under the part that scrolls; `content` is the panel's
 * full height; `ceiling` is the tallest it may be. `reach`, past the ceiling, is room
 * that may be spent to stop at the next half row instead of a whole row short: the
 * least of it that does so is taken. Returns the height, or `null` where the panel fits
 * whole under the ceiling or no row's middle fits under it.
 */
export const dropdownStop = ({ rows, below, content, ceiling, reach = ceiling }) => {
  if (!(content > ceiling)) return null;
  let stop = null;
  let over = null;
  for (const { top, height } of rows) {
    const cut = Math.floor(top + height / 2 + below);
    if (cut <= ceiling && (stop === null || cut > stop)) stop = cut;
    else if (cut > ceiling && cut <= reach && (over === null || cut < over)) over = cut;
  }
  return over ?? stop;
};
