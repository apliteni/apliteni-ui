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
  // offsetHeight, not a bounding box: the box would already carry the scale this
  // call is about to rewrite, and each pass would shrink the pile a little more.
  const geometry = toastPileGeometry(order.map((card) => card.offsetHeight), gap);
  stack.style.setProperty('--toast-pile-height', `${geometry.collapsedHeight}px`);
  stack.style.setProperty('--toast-fan-height', `${geometry.fannedHeight}px`);
  order.forEach((card, index) => {
    const { lift, scale, fan, depth } = geometry.cards[index];
    card.style.setProperty('--toast-card-lift', `${lift}px`);
    card.style.setProperty('--toast-card-scale', String(scale));
    card.style.setProperty('--toast-card-fan', `${fan}px`);
    // Paint order follows the DOM, which the newest notice is not always last in.
    card.style.setProperty('--toast-card-depth', String(order.length - depth));
    // How far the card's own bottom edge lies below the front card's bottom edge,
    // in the card's own pixels: scaling is about that edge, so the lift divides
    // by the scale. A card that ends above it needs no cut. The front card has
    // none to publish and keeps its shadow.
    if (depth > 0) card.style.setProperty('--toast-card-clip', `${Math.max(0, lift / scale)}px`);
    else card.style.removeProperty('--toast-card-clip');
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
  const watched = new WeakSet();
  let observer = null;
  const sync = () => {
    applyToastPile(stack, options);
    for (const card of pileCards(stack)) {
      if (watched.has(card)) continue;
      watched.add(card);
      observer?.observe(card);
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
