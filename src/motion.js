// apliteni-ui — motion hook.
//
// The one small piece of JS behind the CSS motion library: a scroll-reveal
// activator, the entrance player the components call when something they show
// appears (playEntrance), and a replay helper. Everything else is pure CSS
// (src/styles/motion.css). Framework-agnostic, no dependencies, guarded so it
// no-ops cleanly under `node --test` / SSR (no window, no IntersectionObserver).
//
//   import { initReveal } from 'apliteni-ui/motion'
//   initReveal();                 // wire every [data-reveal] on the page
//   initReveal(myContainer);      // scope to a subtree
//
// Stagger a group by giving siblings --reveal-i: 0, 1, 2, … (see motion.css).

/** True only when the user asked the OS to reduce motion. Safe off-DOM. */
export function prefersReducedMotion() {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Stagger delay for the Nth item given a per-step delay. Pure + testable. */
export function staggerDelay(index, stepMs = 120) {
  return Math.max(0, index) * stepMs;
}

/**
 * Reveal every [data-reveal] under `root` as it scrolls into view.
 * - Marks <html class="js-reveal"> so the CSS hides them only when JS is live.
 * - Reduced-motion or no IntersectionObserver → reveal everything at once.
 * Returns the observer (or undefined when there's nothing to observe).
 */
export function initReveal(root) {
  if (typeof document === 'undefined') return undefined;
  const scope = root || document;
  const els = scope.querySelectorAll('[data-reveal]');
  if (!els.length) return undefined;

  document.documentElement.classList.add('js-reveal');
  const show = (el) => el.classList.add('is-revealed');

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    els.forEach(show);
    return undefined;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          show(entry.target);
          obs.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );
  els.forEach((el) => io.observe(el));
  return io;
}

/**
 * How long playEntrance() waits for `animationend` before taking the class off
 * itself. Longer than the slowest --dur-* token, so it only ever fires for an
 * animation that never ran; src/motion.test.js holds it above that token.
 */
export const ENTRANCE_FALLBACK_MS = 1000;

const entering = new WeakMap();

/**
 * Play the one-shot entrance of something the reader just caused to appear.
 *
 * Adds `className` and takes it off at the element's own `animationend`, or
 * after ENTRANCE_FALLBACK_MS if that never fires (the element was hidden again,
 * or no stylesheet gives the class an animation) — so the class is never left
 * half-applied. The sheet decides what the entrance looks like: the component
 * pairs the class with an animation in its own stylesheet. A component calls
 * this on a change, never at first render, which is how the page loads still.
 * Reduced motion needs no branch here: the net in reduced-motion.css shortens
 * the animation to nothing and `animationend` still fires.
 */
export function playEntrance(el, className = 'is-entering') {
  if (!el || !el.classList) return;
  entering.get(el)?.();
  el.classList.remove(className);
  void el.offsetWidth; // restart the animation when the class was already on
  el.classList.add(className);
  let timer;
  const done = (e) => {
    if (e && e.target !== el) return; // a descendant's animation bubbling up
    clearTimeout(timer);
    el.removeEventListener('animationend', done);
    el.classList.remove(className);
    entering.delete(el);
  };
  el.addEventListener('animationend', done);
  timer = setTimeout(done, ENTRANCE_FALLBACK_MS);
  entering.set(el, () => done());
}

/** Restart the CSS animation on an element (for a "replay" control). */
export function replay(el) {
  if (!el || !el.style) return;
  el.style.animation = 'none';
  void el.offsetWidth; // force reflow so the next frame re-triggers
  el.style.animation = '';
}
