/* Where each notice rests in a collapsed toast stack, and where it fans out to.
 * why: docs/specification.md#toast-stacks */

export const TOAST_PEEK = 8;          // px of each card showing above the one in front
export const TOAST_SCALE_STEP = 0.04; // how much smaller each tier is drawn
export const TOAST_TIERS = 2;         // tiers behind the front card; older notices share the last
export const TOAST_PILE_MIN = 2;      // one notice is not a pile
export const TOAST_GAP = 12;          // the fanned column's gap, held to .ui-toast-stack by test

/**
 * @param {number[]} heights Layout heights in DOM order, oldest first. Use
 *   `offsetHeight`: a bounding box would feed the previous frame's scale back in.
 * @param {number} [gap] The fanned column's gap.
 * @returns {{cards: {depth: number, tier: number, scale: number, lift: number,
 *   fan: number}[], collapsedHeight: number, fannedHeight: number}}
 *   `lift` and `fan` are translateY in px, negative upwards: the stack is
 *   anchored to the bottom of its corner and grows away from it.
 */
export function toastPileGeometry(heights, gap = TOAST_GAP) {
  const count = heights.length;
  if (!count) return { cards: [], collapsedHeight: 0, fannedHeight: 0 };
  const front = heights[count - 1];

  const cards = heights.map((height, index) => {
    const depth = count - 1 - index;
    const tier = Math.min(depth, TOAST_TIERS);
    const scale = 1 - tier * TOAST_SCALE_STEP;
    // Scaling about the bottom edge shortens the card, so the lift owes that back.
    const lift = height * scale - front - tier * TOAST_PEEK;
    let fan = 0; // fanned, a card clears everything newer: their heights and gaps

    for (let after = index + 1; after < count; after += 1) fan -= heights[after] + gap;
    return { depth, tier, scale, lift, fan };
  });

  return {
    cards,
    collapsedHeight: front + Math.min(count - 1, TOAST_TIERS) * TOAST_PEEK,
    fannedHeight: heights.reduce((sum, height) => sum + height, 0) + (count - 1) * gap,
  };
}

/** The readable count above a pile. Below `TOAST_PILE_MIN` there is nothing to say. */
export function toastPileLabel(count) {
  return count === 1 ? '1 notice' : `${count} notices`;
}
