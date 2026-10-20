/* Where each notice rests in a collapsed toast stack, and where it fans out to,
 * and the functions that measure a live stack and publish that geometry.
 * why: docs/components.md#toast-stacks */

export const TOAST_PEEK = 8;          // px of each card showing above the one in front
export const TOAST_SCALE_STEP = 0.04; // how much smaller each tier is drawn
export const TOAST_TIERS = 2;         // tiers behind the front card; older notices share the last
export const TOAST_PILE_MIN = 2;      // one notice is not a pile
export const TOAST_GAP = 12;          // the fanned column's gap, held to .ui-toast-stack by test

/**
 * @param {number[]} heights Layout heights in DOM order, oldest first. Use
 *   layout heights: a bounding box would feed the previous frame's scale back in.
 * @param {number} [gap] The fanned column's gap.
 * @returns {{cards: {depth: number, tier: number, scale: number, lift: number,
 *   fan: number, box: number, natural: number}[], collapsedHeight: number,
 *   fannedHeight: number}}
 *   `lift` and `fan` are translateY in px, negative upwards: the stack is
 *   anchored to the bottom of its corner and grows away from it.
 *   `natural` is the card's own height and `box` is the height it keeps while it
 *   rests. A card too tall to fit between its peek and the front card's bottom
 *   edge rests in a shorter box, so its bottom edge is never below the front's.
 */
export function toastPileGeometry(heights, gap = TOAST_GAP) {
  const count = heights.length;
  if (!count) return { cards: [], collapsedHeight: 0, fannedHeight: 0 };
  const front = heights[count - 1];

  const cards = heights.map((height, index) => {
    const depth = count - 1 - index;
    const tier = Math.min(depth, TOAST_TIERS);
    const scale = 1 - tier * TOAST_SCALE_STEP;
    // The card rests in a box that ends on the front card's bottom edge at the
    // lowest. Its top is then `tier` peeks above the front card's top, whatever
    // the card's own height is, and a taller card shows less of itself.
    const reach = (front + tier * TOAST_PEEK) / scale;
    const box = depth > 0 ? Math.min(height, reach) : height;
    // Scaling about the bottom edge shortens the card, so the lift owes that back.
    // The box is never taller than `reach`, so the lift is never below the front.
    const lift = box * scale - front - tier * TOAST_PEEK;
    let fan = 0; // fanned, a card clears everything newer: their heights and gaps

    for (let after = index + 1; after < count; after += 1) fan -= heights[after] + gap;
    return { depth, tier, scale, lift, fan, box, natural: height };
  });

  return {
    cards,
    collapsedHeight: front + Math.min(count - 1, TOAST_TIERS) * TOAST_PEEK,
    fannedHeight: heights.reduce((sum, height) => sum + height, 0) + (count - 1) * gap,
  };
}

/* ---- Measuring a live stack ------------------------------------------------
 * Measure a stack and publish where each notice rests and where it fans out to.
 * The sheet picks between the two on :hover and :focus-within; nothing here
 * listens for either, so the pile opens on the frame the pointer arrives and a
 * reader who asked for less motion gets the same switch without the travel.
 *
 * The React provider calls the same three functions, so both faces pile the
 * same measured way. why: docs/components.md#toast-stacks
 */

/** The notices of a stack, oldest first — the order both faces render. */
export const pileCards = (stack) => [...stack.children].filter((el) => el.classList.contains('ui-toast'));

/**
 * How tall a notice is when nothing holds it short. A resting back card is held
 * to a box, so its own height is read from where its content ends instead of from
 * the box. The timer line is left out: it sits on the box's bottom edge.
 */
const naturalHeight = (card) => {
  const style = card.ownerDocument.defaultView.getComputedStyle(card);
  const frame = (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderTopWidth) || 0)
    + (parseFloat(style.borderBottomWidth) || 0);
  const content = [...card.children]
    .filter((el) => !el.classList.contains('ui-toast__timer'))
    .reduce((end, el) => Math.max(end, el.offsetTop + el.offsetHeight), 0);
  return Math.max(card.offsetHeight, content + frame);
};

/**
 * Measure `stack` and write the geometry its sheet reads. Safe to call again.
 *
 * `newestFirst` is not cosmetic: pushToast() PREPENDS, so a live vanilla stack
 * reads newest-first, while the React provider appends and reads oldest-first.
 * The pile has to know which end is the front card, or it buries the one notice
 * the reader has not seen yet.
 */
export function applyToastPile(stack, { newestFirst = false, gap = TOAST_GAP } = {}) {
  if (!stack) return null;
  const cards = pileCards(stack);
  const order = newestFirst ? [...cards].reverse() : cards;
  // Layout heights, not bounding boxes: a box would already carry the scale this
  // call is about to rewrite, and each pass would shrink the pile a little more.
  const geometry = toastPileGeometry(order.map(naturalHeight), gap);
  stack.style.setProperty('--toast-pile-height', `${geometry.collapsedHeight}px`);
  stack.style.setProperty('--toast-fan-height', `${geometry.fannedHeight}px`);
  order.forEach((card, index) => {
    const { lift, scale, fan, depth, box, natural } = geometry.cards[index];
    card.style.setProperty('--toast-card-lift', `${lift}px`);
    card.style.setProperty('--toast-card-scale', String(scale));
    card.style.setProperty('--toast-card-fan', `${fan}px`);
    // Paint order follows the DOM, which the newest notice is not always last in.
    card.style.setProperty('--toast-card-depth', String(order.length - depth));
    // A card behind the front one is cut on its own sides and bottom edge, which is
    // the front card's bottom edge or above it, and the front card keeps its
    // shadow. Fanned, the front card's bottom edge lies `fan` below the card's own
    // bottom, so the cut hangs that far below it.
    // A card taller than its box rests in that box and opens to its own height
    // when the pile fans, so nothing of it is ever below the front card's bottom
    // edge. The move needs no clip to keep that true.
    if (depth > 0) {
      card.style.setProperty('--toast-card-clip', '0px');
      card.style.setProperty('--toast-card-fan-clip', `${fan}px`);
    } else {
      card.style.removeProperty('--toast-card-clip');
      card.style.removeProperty('--toast-card-fan-clip');
    }
    if (box < natural) {
      card.style.setProperty('--toast-card-box', `${box}px`);
      card.style.setProperty('--toast-card-natural', `${natural}px`);
    } else {
      card.style.removeProperty('--toast-card-box');
      card.style.removeProperty('--toast-card-natural');
    }
  });
  return geometry;
}

/** Remove everything applyToastPile() wrote, leaving the plain column. */
export function clearToastPile(stack) {
  if (!stack) return;
  stack.style.removeProperty('--toast-pile-height');
  stack.style.removeProperty('--toast-fan-height');
  for (const card of pileCards(stack)) {
    card.style.removeProperty('--toast-card-lift');
    card.style.removeProperty('--toast-card-scale');
    card.style.removeProperty('--toast-card-fan');
    card.style.removeProperty('--toast-card-depth');
    card.style.removeProperty('--toast-card-clip');
    card.style.removeProperty('--toast-card-fan-clip');
    card.style.removeProperty('--toast-card-box');
    card.style.removeProperty('--toast-card-natural');
  }
}

/**
 * Keep a pile measured. Re-measures when notices arrive or leave and when one
 * changes height — a notice grows when its text wraps, and a pile measured once
 * would leave every card behind it at the wrong offset.
 * Returns a stop function that also clears the geometry.
 */
export function watchToastPile(stack, { onSync, ...options } = {}) {
  if (!stack) return () => {};
  const view = stack.ownerDocument.defaultView;
  // Cards are observed once each and never un-observed: re-observing in the
  // callback that observing triggers is how a ResizeObserver loop starts.
  // A card held to a box cannot grow, so its content is observed too.
  const watched = new WeakSet();
  let observer = null;
  const sync = () => {
    applyToastPile(stack, options);
    for (const card of pileCards(stack)) {
      for (const el of [card, ...card.children]) {
        if (watched.has(el)) continue;
        watched.add(el);
        observer?.observe(el);
      }
    }
    onSync?.(stack);
  };
  observer = typeof view?.ResizeObserver === 'function' ? new view.ResizeObserver(sync) : null;
  const mutations = typeof view?.MutationObserver === 'function' ? new view.MutationObserver(sync) : null;
  mutations?.observe(stack, { childList: true });
  sync();
  return () => {
    observer?.disconnect();
    mutations?.disconnect();
    clearToastPile(stack);
  };
}
