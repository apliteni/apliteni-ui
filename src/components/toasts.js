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
import { toast } from './index.js';

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      if (!held || el.matches(':hover, :focus-within')) return;
      held = false;
      started = Date.now();
      timer = setTimeout(() => dismissToast(el), remaining);
    };
    el.addEventListener('mouseenter', hold);
    el.addEventListener('mouseleave', release);
    el.addEventListener('focusin', hold);
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
