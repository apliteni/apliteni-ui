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
import { applyToastPile, watchToastPile, pileCards, TOAST_PILE_MIN } from '../logic/toast-stack.js';

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
  if (bar) {
    bar.classList.add('is-running');
    const dur = parseFloat(getComputedStyle(el).getPropertyValue('--toast-dur')) || 5;
    let remaining = dur * 1000;
    let started = Date.now();
    let timer = setTimeout(() => dismissToast(el), remaining);
    // The line's own pause lives in the sheet, on :hover and :focus-within, so
    // it covers a keyboard reader too. What is left here is the countdown that
    // has to stop with it. This runs even under reduced motion, where the line
    // is hidden but the reader still gets the same hold.
    let held = false;
    let pileHeld = false;
    const hold = () => {
      if (held) return;
      held = true;
      clearTimeout(timer);
      const visualLeft = !reduceMotion()
        ? parseFloat(getComputedStyle(bar).transform.split(',')[0].slice(7))
        : NaN;
      remaining = Number.isFinite(visualLeft)
        ? dur * 1000 * visualLeft
        : Math.max(0, remaining - (Date.now() - started));
    };
    const release = () => {
      if (!held || pileHeld || el.matches(':hover, :focus-within')) return;
      held = false;
      started = Date.now();
      timer = setTimeout(() => dismissToast(el), remaining);
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

/* The collapsed pile: the measuring lives in logic/toast-stack.js, shared with React. */

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
