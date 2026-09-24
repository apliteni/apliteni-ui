import { prefersReducedMotion } from '../motion.js';

const transitions = new WeakMap();

// Internal shared animation; the live label keeps the sole accessible name.
export function slideButtonLabel(label, previous) {
  transitions.get(label)?.();
  if (!previous || prefersReducedMotion()) return () => {};
  const slot = label.parentElement;
  const old = previous.cloneNode(true);
  old.className = 'ui-btn__label-old';
  old.setAttribute('aria-hidden', 'true');
  old.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  old.removeAttribute('id');
  slot.append(old);
  label.classList.remove('is-changing');
  void label.offsetWidth;
  label.classList.add('is-changing');
  let timer;
  const cleanup = (event) => {
    if (event && event.target !== label) return;
    clearTimeout(timer);
    old.remove();
    label.classList.remove('is-changing');
    label.removeEventListener('animationend', cleanup);
    transitions.delete(label);
  };
  label.addEventListener('animationend', cleanup);
  timer = setTimeout(cleanup, 1000);
  transitions.set(label, cleanup);
  return cleanup;
}

