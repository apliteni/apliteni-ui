// What Modal and Drawer share: a panel over a scrim that owns the keyboard while it is
// up, and that arrives and leaves with motion. One copy, so the two cannot disagree
// about where focus goes or when the page behind them comes back.
import {
  createContext, useContext, useEffect, useLayoutEffect, useRef, useState,
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

// ---- the page's stack --------------------------------------------------------
// Every open React dialog, bottom → top. Which one Escape talks to, where Tab may go and
// what is inert are properties of the page, so they are answered here, once, and never
// from one dialog's snapshot of the page as it was when that dialog opened. The rule is
// the vanilla overlay's (src/components/overlay.js), which the React layer cannot import.
// The two stacks are separate: react/README.md says what that costs.

/** Where a dialog sits in the React tree. One rendered inside another's content is above it. */
export type Scope = { parent: Scope | null };
export const DialogScope = createContext<Scope | null>(null);

type Entry = {
  scope: Scope;
  root: HTMLElement;
  panel: HTMLElement;
  body: HTMLElement | null;
  close: () => void;
  opener: Element | null; // had focus when this one opened, and gets it back when it closes
  resume: Element | null; // had focus in this one when another opened over it
};

const stack: Entry[] = [];
const leaving = new Set<HTMLElement>();
let marked: [HTMLElement, boolean][] = []; // what the top made inert, and whether it already was
let listening = false;

const firstIn = (entry: Entry) =>
  (entry.body ? tabbablesIn(entry.body) : [])[0] || entry.panel;

function trapTab(panel: HTMLElement, e: KeyboardEvent) {
  const items = tabbablesIn(panel);
  if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const focused = document.activeElement;
  if (!panel.contains(focused)) { e.preventDefault(); first.focus(); return; }
  if (!e.shiftKey && focused === last) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && (focused === first || focused === panel)) { e.preventDefault(); last.focus(); }
}

// One listener for the page. Only the top dialog answers the keyboard, so one Escape
// closes one dialog and Tab never meets a lower dialog's trap.
function onKey(e: KeyboardEvent) {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') top.close();
  else if (e.key === 'Tab') trapTab(top.panel, e);
}

// Recompute the page from the stack: everything outside the top dialog is inert, lower
// dialogs included, and a leaving root is inert and aria-hidden until it unmounts.
function sync() {
  for (const [el, was] of marked) if (!was) el.removeAttribute('inert');
  marked = [];
  const top = stack[stack.length - 1];
  for (let node = top?.root; node?.parentElement && node !== document.body; node = node.parentElement) {
    for (const sib of Array.from(node.parentElement.children) as HTMLElement[]) {
      if (sib === node || leaving.has(sib)) continue;
      marked.push([sib, sib.hasAttribute('inert')]);
      sib.setAttribute('inert', '');
    }
  }
  leaving.forEach((el) => {
    el.toggleAttribute('inert', true);
    if (el.getAttribute('aria-hidden') !== 'true') el.setAttribute('aria-hidden', 'true');
  });
  if (Boolean(top) !== listening) {
    listening = Boolean(top);
    if (listening) document.addEventListener('keydown', onKey);
    else document.removeEventListener('keydown', onKey);
  }
}

// Mirrors the vanilla overlay's returnFocus (src/components/overlay.js): the opener if it
// is still on the page, else whatever took its id in a re-render, else the page itself.
// overlay.js reaches the page with body.focus(), a no-op on a body with no tabindex, so
// blur() is used instead: it lands on <body> and leaves nothing focused in the dialog.
function returnFocus(opener: Element | null) {
  const live = opener && !opener.isConnected && opener.id ? document.getElementById(opener.id) : opener;
  if (live?.isConnected) (live as HTMLElement).focus?.();
  if (document.activeElement !== live) (document.activeElement as HTMLElement | null)?.blur?.();
}

function enter(entry: Entry) {
  // Opening is history: the dialog just opened goes on top. Inside one commit there is no
  // history, and React runs a nested dialog's effects before its parent's — so a dialog
  // goes beneath any already open inside its own content, and takes over their opener.
  const at = stack.findIndex((e) => {
    for (let s = e.scope.parent; s; s = s.parent) if (s === entry.scope) return true;
    return false;
  });
  if (at !== -1) {
    entry.opener = stack[at].opener;
    stack[at].opener = null;
    stack.splice(at, 0, entry);
    sync();
    return;
  }
  const covered = stack[stack.length - 1];
  if (covered?.panel.contains(document.activeElement)) covered.resume = document.activeElement;
  stack.push(entry);
  sync();
  firstIn(entry).focus();
}

function exit(entry: Entry) {
  const at = stack.indexOf(entry);
  if (at === -1) return;
  stack.splice(at, 1);
  // Closed from beneath: the one above was opened from inside it, and inherits its way back.
  const above = stack[at];
  if (above && (!above.opener || entry.root.contains(above.opener))) above.opener = entry.opener;
  sync();
  if (above) return;
  const next = stack[stack.length - 1];
  if (!next) { returnFocus(entry.opener); return; }
  // The next one down is live again: focus goes back where it was in it.
  const back = [entry.opener, next.resume].find((el) => el?.isConnected && next.panel.contains(el));
  ((back as HTMLElement | undefined) ?? firstIn(next)).focus();
}

// A few frames past the stylesheet's own end, so the backstop timer never cuts the last
// frame the transition paints.
const EXIT_SLACK_MS = 50;

/**
 * Mount on `open`, then add the open class once the start state has been styled, so the
 * stylesheet's transition runs from it. On close, drop the class and stay mounted until
 * the panel's transition ends, then unmount.
 *
 * `transitionend` is not a promise: jsdom never fires it, and a transition that did not
 * run (nothing changed, or the panel is `display: none`) fires nothing either. So a timer
 * backs it, sized from the panel's own computed transition plus a little slack — the
 * stylesheet owns the number. Under the reduced-motion net that computes to 0.01ms.
 *
 * While it is leaving the root is inert and aria-hidden: focus has already gone back, and
 * a dialog that fades out must not take a click, a Tab or a screen reader on the way.
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
    const el = root.current;
    if (open || !present || !el) return;
    leaving.add(el);
    sync();
    return () => {
      leaving.delete(el);
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
      sync();
    };
  }, [open, present]);

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
    const timer = setTimeout(finish, transitionMs(el) + EXIT_SLACK_MS);
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
 * While `active` the dialog is on the page's stack. On top, it takes Escape and Tab, the
 * rest of the page is inert, and focus starts on the first control in the body Tab can
 * reach. When it stops being active, focus goes back the way `exit` above sends it.
 * Returns the dialog's scope, which Modal and Drawer provide to what they render.
 */
export function useDialog(active: boolean, { root, panel, body }: { root: Ref; panel: Ref; body: Ref },
  onClose: () => void): Scope {
  const parent = useContext(DialogScope);
  const [scope] = useState<Scope>(() => ({ parent }));
  const close = useRef(onClose);
  useIsoLayoutEffect(() => { close.current = onClose; });

  // `enter` focuses the first control in the body that Tab can reach, not the header Close
  // button — and never a field a closed disclosure folds over or a fieldset locks, which
  // focus() would leave on <body> in silence. That is where #262 landed.
  useEffect(() => {
    if (!active || !root.current || !panel.current) return;
    const entry: Entry = {
      scope, root: root.current, panel: panel.current, body: body.current,
      close: () => close.current(), opener: document.activeElement, resume: null,
    };
    enter(entry);
    return () => exit(entry);
  }, [active]);
  return scope;
}
