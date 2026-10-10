// Toast stack controller — entrance/exit, auto-dismiss timers, swipe-to-dismiss.
//
// The visual markup comes from toast() in index.js; this wires behaviour onto a
// container of them, or lets you push new ones onto a live stack:
//
//   import { toast } from '@apliteni/apliteni-ui';
//   import { wireToastStack, pushToast } from '@apliteni/apliteni-ui/toasts';
//   stack.innerHTML = toast({ variant: 'info', title: 'Saved', timer: 5 });
//   wireToastStack(stack);
//   pushToast(stack, { variant: 'success', title: 'Done', timer: 5 });
//
// The kit owns the animation + interaction; your app decides when to push and
// what each toast says. Reduced-motion is respected (no slide, instant remove).
//
//   const pile = collapseToastStack(stack);  // fan-out pile; pile.stop() undoes it
import { toast } from './index.js';
import { toastPileGeometry, TOAST_GAP, TOAST_PILE_MIN } from '../logic/toast-stack.js';

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PILE_HOLD = 'ui-toast-pile-hold';
const PILE_RELEASE = 'ui-toast-pile-release';
const PILE_TABINDEX = 'data-toast-pile-tabindex';
const PILE_LABEL = 'data-toast-pile-label';

const resolve = (container) =>
  (typeof container === 'string' ? document.querySelector(container) : container) || null;

// Slide-and-fade a toast out, then remove it. Idempotent.
export function dismissToast(el) {
  if (!el || el.dataset.leaving) return;
  el.dataset.leaving = '1';
  const remove = () => el.remove();
  if (reduceMotion()) return remove();
  el.classList.add('is-leaving');
  el.addEventListener('animationend', remove, { once: true });
  setTimeout(remove, 260); // fallback if animationend never fires
}

// Wire one toast: close button, auto-dismiss timer (pauses on hover),
// swipe-to-dismiss via pointer drag.
function wireToast(el) {
  if (el.dataset.wired) return;
  el.dataset.wired = '1';

  el.querySelector('.ui-toast__close')?.addEventListener('click', () => dismissToast(el));

  const bar = el.querySelector('[data-toast-timer]');
  if (bar && !reduceMotion()) {
    bar.classList.add('is-running');
    const dur = parseFloat(getComputedStyle(el).getPropertyValue('--toast-dur')) || 5;
    let timer = setTimeout(() => dismissToast(el), dur * 1000);
    // The line's own pause lives in the sheet, on :hover and :focus-within, so
    // it covers a keyboard reader too. What is left here is the countdown that
    // has to stop with it — read back off the paused line so the two agree.
    let held = false;
    let pileHeld = false;
    const hold = () => { if (held) return; held = true; clearTimeout(timer); };
    const release = () => {
      if (!held || pileHeld || el.matches(':hover, :focus-within')) return;
      held = false;
      const left = (parseFloat(getComputedStyle(bar).transform.split(',')[0].slice(7)) || 1);
      timer = setTimeout(() => dismissToast(el), dur * 1000 * left);
    };
    const pileHold = () => { pileHeld = true; hold(); };
    const pileRelease = () => { pileHeld = false; release(); };
    el.addEventListener('mouseenter', hold);
    el.addEventListener('mouseleave', release);
    el.addEventListener('focusin', hold);
    el.addEventListener(PILE_HOLD, pileHold);
    el.addEventListener(PILE_RELEASE, pileRelease);
    // At focusout the old target has already blurred and the new one has not
    // focused yet, so :focus-within reads false even for a move from the close
    // button to the action. relatedTarget is the only thing that knows.
    el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) release(); });
  } else if (bar && reduceMotion()) {
    // No animated bar under reduced motion, but still auto-dismiss on time.
    const dur = parseFloat(getComputedStyle(el).getPropertyValue('--toast-dur')) || 5;
    setTimeout(() => dismissToast(el), dur * 1000);
  }

  // Swipe-to-dismiss (ignore drags that start on a button).
  let x0 = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    x0 = e.clientX; el.setPointerCapture(e.pointerId); el.style.transition = 'none';
  });
  el.addEventListener('pointermove', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    el.style.transform = `translateX(${dx}px)`;
    el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 240));
  });
  const settle = (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 90) return dismissToast(el);
    el.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
    el.style.transform = ''; el.style.opacity = '';
  };
  el.addEventListener('pointerup', settle);
  el.addEventListener('pointercancel', settle);
}

// Wire every toast currently inside a container (string selector or element).
export function wireToastStack(container) {
  const root = resolve(container);
  if (!root) return null;
  root.querySelectorAll('.ui-toast').forEach(wireToast);
  return root;
}

// Build a toast from opts, prepend it to a live stack (newest on top), wire it.
export function pushToast(container, opts = {}) {
  const root = resolve(container);
  if (!root) return null;
  root.insertAdjacentHTML('afterbegin', toast(opts));
  const el = root.firstElementChild;
  wireToast(el);
  return el;
}

/* ---- The collapsed pile ----------------------------------------------------
 * Measure a stack and publish where each notice rests and where it fans out to.
 * The sheet picks between the two on :hover and :focus-within; nothing here
 * listens for either, so the pile opens on the frame the pointer arrives and a
 * reader who asked for less motion gets the same switch without the travel.
 *
 * The React provider calls the same three functions, so both faces pile the
 * same measured way. why: docs/specification.md#toast-stacks
 */

/** The notices of a stack, oldest first — the order both faces render. */
const pileCards = (stack) => [...stack.children].filter((el) => el.classList.contains('ui-toast'));

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

/**
 * Collapse a live stack into a pile and keep it measured. Below TOAST_PILE_MIN
 * notices there is no pile: one notice is not a stack, and collapsing it would
 * only hide it behind itself.
 */
export function collapseToastStack(container, options = {}) {
  const root = resolve(container);
  if (!root) return null;
  const setKeyboardEntry = (on) => {
    if (on) {
      if (!root.hasAttribute('tabindex')) {
        root.setAttribute('tabindex', '0');
        root.setAttribute(PILE_TABINDEX, '1');
      }
      if (!root.hasAttribute('aria-label')) {
        root.setAttribute('aria-label', 'Notifications');
        root.setAttribute(PILE_LABEL, '1');
      }
    } else {
      if (root.getAttribute(PILE_TABINDEX)) root.removeAttribute('tabindex');
      if (root.getAttribute(PILE_LABEL)) root.removeAttribute('aria-label');
      root.removeAttribute(PILE_TABINDEX);
      root.removeAttribute(PILE_LABEL);
    }
  };
  const dispatch = (type) => {
    for (const card of pileCards(root)) card.dispatchEvent(new Event(type));
  };
  const hold = () => dispatch(PILE_HOLD);
  const release = (event) => {
    if (event?.relatedTarget && root.contains(event.relatedTarget)) return;
    if (root.matches(':hover, :focus-within')) return;
    dispatch(PILE_RELEASE);
  };
  const mark = (stack) => {
    const collapsed = pileCards(stack).length >= TOAST_PILE_MIN;
    root.classList.toggle('ui-toast-stack--collapsed', collapsed);
    root.classList.toggle('ui-toast-stack--newest-first', collapsed && options.newestFirst === true);
    setKeyboardEntry(collapsed);
    if (collapsed && root.matches(':hover, :focus-within')) hold();
  };
  root.addEventListener('mouseenter', hold);
  root.addEventListener('mouseleave', release);
  root.addEventListener('focusin', hold);
  root.addEventListener('focusout', release);
  const stop = watchToastPile(root, { ...options, onSync: mark });
  return {
    sync: () => { applyToastPile(root, options); mark(root); },
    stop() {
      root.removeEventListener('mouseenter', hold);
      root.removeEventListener('mouseleave', release);
      root.removeEventListener('focusin', hold);
      root.removeEventListener('focusout', release);
      dispatch(PILE_RELEASE);
      stop();
      root.classList.remove('ui-toast-stack--collapsed');
      root.classList.remove('ui-toast-stack--newest-first');
      setKeyboardEntry(false);
    },
  };
}
