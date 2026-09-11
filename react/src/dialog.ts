// What Modal and Drawer share: a panel over a scrim that owns the keyboard while it is
// up, and that arrives and leaves with motion. One copy, so the two cannot disagree
// about where focus goes or when the page behind them comes back.
import {
  useEffect, useLayoutEffect, useState,
  type MouseEvent as ReactMouseEvent, type RefObject,
} from 'react';

// The candidates, in DOM order — `tabbable` below decides which of them Tab reaches. A
// disclosure's summary is focusable to the browser without matching any of the others.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
  + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), details > summary:first-of-type';

// In the *browser's* sequential tab order, not merely matching the selector. A field
// folded inside a closed disclosure, a hidden subtree or an inert one is skipped by that
// order, and focus() on one is a silent no-op — a dialog that opens onto one leaves the
// reader on <body>, outside it. Tab is the stricter of the two questions and it is the one
// asked here, because the same list decides where the dialog opens and where the trap
// wraps: opening on a control Tab cannot reach strands the reader at the first keystroke.
// The vanilla overlay asks a narrower version of the same question —
// src/components/overlay.js:32 `function reachable(el)` — and the React layer could not
// reuse it in any case: it is internal to the kit and no export reaches it.
function tabbable(el: HTMLElement) {
  // A negative tabindex is focusable to a script and skipped by Tab, whatever the element,
  // and `disabled` on an ancestor fieldset disables a control without the attribute ever
  // reaching it — except inside that fieldset's first legend, which stays enabled and
  // which `:disabled` already knows about.
  const tabindex = el.getAttribute('tabindex');
  if (tabindex !== null && Number(tabindex) < 0) return false;
  if (el.matches(':disabled')) return false;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node.inert || node.hasAttribute('inert') || node.hasAttribute('hidden')) return false;
    const holder: HTMLElement | null = node.parentElement;
    const folded = holder?.tagName === 'DETAILS' && !(holder as HTMLDetailsElement).open;
    if (folded && node !== holder.querySelector(':scope > summary')) return false;
  }
  // Browsers can answer the rest properly; jsdom has no layout and no such method.
  // `visibilityProperty` and not the vanilla's second option: a skipped
  // `content-visibility: auto` subtree reads as invisible there and Tab still reaches
  // it, because the browser un-skips it to put focus inside.
  return typeof el.checkVisibility !== 'function'
    || el.checkVisibility({ visibilityProperty: true });
}

const tabbablesIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(tabbable);

// A click on the scrim and nowhere else dismisses. preventDefault is what makes the
// opener keep the focus the dialog hands back: mousedown's own default action moves
// focus to the nearest focusable ancestor of what was hit — nothing, here — and it runs
// after this handler has already closed the dialog and restored the opener, so without
// it a complete click ends on <body> and only a synthetic mousedown looks correct.
export const dismissOnScrim = (onClose: () => void) => (e: ReactMouseEvent) => {
  if (e.target !== e.currentTarget) return;
  e.preventDefault();
  onClose();
};

type Ref = RefObject<HTMLElement | null>;

// Layout effects, so the enter class and the exit wait are in place before the browser
// paints. A plain effect on the server, where React 18 warns about the other.
const useIsoLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** The longest `transition-duration` + `transition-delay` on `el`, in ms, as computed. */
function transitionMs(el: Element): number {
  const cs = getComputedStyle(el);
  const times = (list: string) => list.split(',').map((t) => {
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n)) return 0;
    return t.trim().endsWith('ms') ? n : n * 1000;
  });
  const durations = times(cs.transitionDuration);
  const delays = times(cs.transitionDelay);
  return Math.max(0, ...durations.map((d, i) => d + delays[i % delays.length]));
}

/**
 * Mount on `open`, then add the open class once the start state has been styled, so the
 * stylesheet's transition runs from it. On close, drop the class and stay mounted until
 * the panel's transition ends, then unmount.
 *
 * `transitionend` is not a promise: jsdom never fires it, and a transition that did not
 * run (nothing changed, or the panel is `display: none`) fires nothing either. So a timer
 * backs it, sized from the panel's own computed transition — the stylesheet owns the
 * number. Under the reduced-motion net that computes to 0.01ms, and both paths fire.
 *
 * While it is leaving the root is inert: focus has already gone back to the opener, and a
 * control that fades out must not take a second click or a Tab on the way.
 */
export function usePresence(open: boolean, root: Ref, panel: Ref) {
  const [present, setPresent] = useState(open);
  const [entered, setEntered] = useState(false);
  if (open && !present) setPresent(true);
  const shown = open && entered;

  useIsoLayoutEffect(() => {
    if (!open || entered || !panel.current) return;
    // Reading layout makes the browser style the panel as it is now, without the open
    // class. Without a style for that start state there is nothing to transition from,
    // and the panel appears at its end state in one frame.
    panel.current.getBoundingClientRect();
    setEntered(true);
  }, [open, entered]);

  useIsoLayoutEffect(() => {
    root.current?.toggleAttribute('inert', !shown);
  }, [shown, present]);

  useIsoLayoutEffect(() => {
    if (open || !present) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setPresent(false);
      setEntered(false);
    };
    const el = panel.current;
    if (!el) { finish(); return; }
    // Only the panel's own transition: a hover fade on the close button bubbles here too.
    const onEnd = (e: TransitionEvent) => { if (e.target === el) finish(); };
    el.addEventListener('transitionend', onEnd);
    const timer = setTimeout(finish, transitionMs(el));
    // Re-opened mid-exit, or unmounted: the wait is abandoned, and nothing fires late.
    return () => {
      done = true;
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
    };
  }, [open, present]);

  return { mounted: present, shown };
}

/**
 * While `active`: Escape closes, Tab is trapped in the panel, the rest of the page is
 * inert, and focus starts on the first control in the body Tab can reach. When it stops
 * being active, focus goes back to whatever opened it.
 */
export function useDialog(active: boolean, { root, panel, body }: { root: Ref; panel: Ref; body: Ref },
  onClose: () => void) {
  // Esc closes, Tab is trapped. A dialog that lets Tab wander into the page
  // behind it is a dialog only in looks — the reader leaves and never comes back.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = tabbablesIn(panel.current);
      if (items.length === 0) { e.preventDefault(); panel.current.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const focused = document.activeElement;
      if (!panel.current.contains(focused)) { e.preventDefault(); first.focus(); return; }
      if (!e.shiftKey && focused === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (focused === first || focused === panel.current)) {
        e.preventDefault(); last.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onClose]);

  // Hide the rest of the page from assistive tech while the dialog is up, and
  // give focus back to whatever opened it on the way out.
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const portalRoot = root.current;
    const muted = (Array.from(document.body.children) as HTMLElement[])
      .filter((el) => el !== portalRoot && !el.hasAttribute('inert'));
    muted.forEach((el) => el.setAttribute('inert', ''));
    return () => {
      muted.forEach((el) => el.removeAttribute('inert'));
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [active]);

  // Focus the first control in the body that Tab can reach, not the header Close button —
  // and never a field a closed disclosure folds over or a fieldset locks, which focus()
  // would leave on <body> in silence. That is where #262 landed.
  useEffect(() => {
    if (!active) return;
    const target = (body.current ? tabbablesIn(body.current) : [])[0] || panel.current;
    target?.focus();
  }, [active]);
}
