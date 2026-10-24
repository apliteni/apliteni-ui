/* Where each notice rests in a collapsed toast stack, and where it fans out to,
 * and the functions that measure a live stack and publish that geometry.
 * The sheet (Toast.css) picks between the two positions on :hover and
 * :focus-within; nothing here listens for either.
 * why: docs/components.md#toast-stacks */

export const TOAST_PEEK = 8;          // px of each card showing above the one in front
export const TOAST_SCALE_STEP = 0.04; // how much smaller each tier is drawn
export const TOAST_TIERS = 2;         // tiers behind the front card; older notices share the last
export const TOAST_PILE_MIN = 2;      // one notice is not a pile
export const TOAST_GAP = 12;          // the fanned column's gap, held to .ui-toast-stack by test

export type ToastPileCard = {
  depth: number; tier: number; scale: number; lift: number; fan: number; box: number; natural: number;
};
export type ToastPileGeometry = { cards: ToastPileCard[]; collapsedHeight: number; fannedHeight: number };

/**
 * `heights` are layout heights in DOM order, oldest first: a bounding box would
 * feed the previous frame's scale back in. `lift` and `fan` are translateY in px,
 * negative upwards, because the stack is anchored to the bottom of its corner.
 * `natural` is the card's own height and `box` is the height it keeps while it
 * rests. A card too tall to fit between its peek and the front card's bottom
 * edge rests in a shorter box, so its bottom edge is never below the front's.
 */
export function toastPileGeometry(heights: readonly number[], gap = TOAST_GAP): ToastPileGeometry {
  const count = heights.length;
  if (!count) return { cards: [], collapsedHeight: 0, fannedHeight: 0 };
  const front = heights[count - 1];

  const cards = heights.map((height, index) => {
    const depth = count - 1 - index;
    const tier = Math.min(depth, TOAST_TIERS);
    const scale = 1 - tier * TOAST_SCALE_STEP;
    // The box ends on the front card's bottom edge at the lowest, so its top is
    // `tier` peeks above the front card's top, whatever the card's own height is.
    const reach = (front + tier * TOAST_PEEK) / scale;
    const box = depth > 0 ? Math.min(height, reach) : height;
    // Scaling about the bottom edge shortens the card, so the lift owes that back.
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

/** The notices of a stack, oldest first: the order the provider renders. */
export const pileCards = (stack: Element): HTMLElement[] =>
  [...stack.children].filter((el): el is HTMLElement => el.classList.contains('ui-toast'));

/* How tall a notice is when nothing holds it short. A resting back card is held
 * to a box, so its height is read from where its content ends. The timer line
 * is left out: it sits on the box's bottom edge. */
const naturalHeight = (card: HTMLElement) => {
  const style = card.ownerDocument.defaultView!.getComputedStyle(card);
  const frame = (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderTopWidth) || 0)
    + (parseFloat(style.borderBottomWidth) || 0);
  const content = ([...card.children] as HTMLElement[])
    .filter(el => !el.classList.contains('ui-toast__timer'))
    .reduce((end, el) => Math.max(end, el.offsetTop + el.offsetHeight), 0);
  return Math.max(card.offsetHeight, content + frame);
};

/** Measure `stack` and write the geometry its sheet reads. Safe to call again. */
export function applyToastPile(stack: HTMLElement | null): ToastPileGeometry | null {
  if (!stack) return null;
  const cards = pileCards(stack);
  const geometry = toastPileGeometry(cards.map(naturalHeight));
  stack.style.setProperty('--toast-pile-height', `${geometry.collapsedHeight}px`);
  stack.style.setProperty('--toast-fan-height', `${geometry.fannedHeight}px`);
  cards.forEach((card, index) => {
    const { lift, scale, fan, depth, box, natural } = geometry.cards[index];
    card.style.setProperty('--toast-card-lift', `${lift}px`);
    card.style.setProperty('--toast-card-scale', String(scale));
    card.style.setProperty('--toast-card-fan', `${fan}px`);
    card.style.setProperty('--toast-card-depth', String(cards.length - depth));
    // A back card is cut on its sides and bottom edge, which is the front card's
    // bottom edge or above it. Fanned, the cut hangs `fan` below its own bottom.
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

const PILE_PROPERTIES = ['--toast-pile-height', '--toast-fan-height'];
const CARD_PROPERTIES = ['--toast-card-lift', '--toast-card-scale', '--toast-card-fan', '--toast-card-depth',
  '--toast-card-clip', '--toast-card-fan-clip', '--toast-card-box', '--toast-card-natural'];

/** Remove everything applyToastPile() wrote, leaving the plain column. */
export function clearToastPile(stack: HTMLElement | null) {
  if (!stack) return;
  for (const name of PILE_PROPERTIES) stack.style.removeProperty(name);
  for (const card of pileCards(stack)) for (const name of CARD_PROPERTIES) card.style.removeProperty(name);
}

/**
 * Keep a pile measured. Re-measures when notices arrive or leave and when one
 * changes height, because a notice grows when its text wraps.
 * Returns a stop function that also clears the geometry.
 */
export function watchToastPile(stack: HTMLElement | null): () => void {
  if (!stack) return () => {};
  const view = stack.ownerDocument.defaultView;
  // Cards are observed once each and never un-observed: re-observing in the
  // callback that observing triggers is how a ResizeObserver loop starts.
  // A card held to a box cannot grow, so its content is observed too.
  const watched = new WeakSet<Element>();
  let observer: ResizeObserver | null = null;
  const sync = () => {
    applyToastPile(stack);
    for (const card of pileCards(stack)) {
      for (const el of [card, ...card.children]) {
        if (watched.has(el)) continue;
        watched.add(el);
        observer?.observe(el);
      }
    }
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
