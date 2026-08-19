// Overlay primitives — the page state the kit's modal surfaces share. Drawer and Confirm
// are the same problem twice: content over a scrim that owns the keyboard until it is
// answered. What is inert, which overlay Escape talks to and where Tab may go are
// properties of the *page*, so they are answered here from one stack per document rather
// than from either component's own storage. Internal — not re-exported from src/index.js.

// What each overlay paints on today: a drawer at `--z-overlay` (styles/drawer.css) and a
// confirm above it (styles/confirm.css). Absolute values, not ranks, so a sheet that moves
// and a table that did not is a failed test — stories/overlay-css.test.js holds both.
export const OVERLAY_LAYER = { drawer: 100, confirm: 101 };

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Per document, not per module: JSDOM tests and Storybook iframes each get their
// own page, and one global stack would let one page's overlays decide another's.
//   stack   open overlays, bottom → top: { root, panel, dismiss, layer }
//   marked  what the current top hid, with the state to give back
const pages = new WeakMap();
function pageOf(doc) {
  let page = pages.get(doc);
  if (!page) { page = { stack: [], marked: [], keys: false }; pages.set(doc, page); }
  return page;
}

// Focusable to the *browser*, not merely matching the selector. A control in a closed
// overlay, an inert subtree or a hidden ancestor is skipped by the real tab order, so a
// trap that counts it wraps at an element focus never reaches.
function reachable(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.inert || n.hasAttribute('inert') || n.hasAttribute('hidden')) return false;
    const overlayRoot = n.hasAttribute('data-drawer') || n.hasAttribute('data-confirm');
    if (overlayRoot && !n.classList.contains('is-open')) return false;
  }
  // Browsers can answer the rest properly; JSDOM has no layout and no such method.
  return typeof el.checkVisibility !== 'function'
    || el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
}

// Focusable controls inside the panel, in DOM order.
export function focusablesIn(panel) {
  return Array.from(panel.querySelectorAll(FOCUSABLE)).filter(reachable);
}

// Hide everything *outside* `root` from AT + the tab order: walk root→body and mark each
// ancestor's other children. Scrim and panel live inside the root so they stay
// interactive; a drawer under an aria-modal alertdialog is outside it and must not be.
function mark(page, doc, root) {
  let node = root;
  while (node && node.parentElement && node !== doc.body) {
    for (const sib of node.parentElement.children) {
      if (sib === node) continue;
      page.marked.push([sib, sib.getAttribute('aria-hidden'), sib.hasAttribute('inert')]);
      sib.setAttribute('aria-hidden', 'true');
      sib.setAttribute('inert', '');
      sib.inert = true;
    }
    node = node.parentElement;
  }
}

function unmark(page) {
  for (let i = page.marked.length - 1; i >= 0; i--) {
    const [el, ariaHidden, hadInert] = page.marked[i];
    if (ariaHidden == null) el.removeAttribute('aria-hidden');
    else el.setAttribute('aria-hidden', ariaHidden);
    if (!hadInert) { el.removeAttribute('inert'); el.inert = false; }
  }
  page.marked = [];
}

// Recompute the page from the stack — never replay a snapshot taken when an overlay
// opened, because by the time it closes that snapshot describes a page that has moved on.
// Roots torn down while open drop out here.
function sync(doc) {
  const page = pageOf(doc);
  for (let i = page.stack.length - 1; i >= 0; i--) {
    if (!page.stack[i].root.isConnected) page.stack.splice(i, 1);
  }
  unmark(page);
  const top = page.stack[page.stack.length - 1];
  if (top) mark(page, doc, top.root);
}

// One keydown owner per document. Escape closes the single topmost overlay and
// Tab is trapped in that one's panel, so the answer never turns on which
// component registered a listener first or on where focus happens to be.
function ownKeys(page, doc) {
  if (page.keys) return;
  page.keys = true;
  doc.addEventListener('keydown', (e) => {
    const top = page.stack[page.stack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') {
      if (top.dismiss) { e.preventDefault(); top.dismiss(); }
    } else if (e.key === 'Tab') {
      trapTab(top.panel, e);
    }
  });
}

// Node.DOCUMENT_POSITION_PRECEDING, without reaching for a global Node that a
// document-scoped module has no business assuming is there.
const PRECEDING = 2;

// One way onto the stack. `where` picks the slot; everything after it — the
// duplicate guard, the key owner, the recompute — is the same either way. Every
// entry carries its layer, so the comparisons in adoptOverlay never meet undefined.
function place(root, panel, dismiss, layer, where) {
  const doc = root.ownerDocument;
  const page = pageOf(doc);
  if (page.stack.some((e) => e.root === root)) return;
  page.stack.splice(where(page), 0, { root, panel, dismiss, layer });
  ownKeys(page, doc);
  sync(doc);
}

// The layer this root actually paints on. In a browser the live z-index is the truth, so
// a consumer who moves an overlay in their own stylesheet gets the keyboard on the layer
// they can see. JSDOM hands back declared text rather than a number, so under test the
// passed constant stands — `auto` must not read as 0, and anything unparseable falls
// through.
function paintedLayer(root, layer) {
  const painted = root.ownerDocument.defaultView?.getComputedStyle(root)?.zIndex;
  const live = painted ? Number(painted) : NaN;
  return Number.isFinite(live) ? live : layer;
}

/**
 * Put an overlay on top of the page. `dismiss` is what Escape calls — pass null
 * for one that refuses to be dismissed, and Escape then does nothing rather than
 * falling through to the overlay underneath. This one goes on top whatever layer
 * it paints on, because opening is history the stack can order by: the thing just
 * opened is the thing the reader is looking at.
 */
export function pushOverlay(root, panel, dismiss, layer) {
  place(root, panel, dismiss, layer, (page) => page.stack.length);
}

/**
 * Take on a root that arrived already open — markup rendered with `open: true`, which
 * nobody called open…() for. Without this its aria-modal is a claim the page contradicts.
 * It goes in by PAINT ORDER, because wiring has no history to order by; document position
 * separates two overlays on the same layer, where the later root paints on top (CSS 2.2
 * Appendix E, steps 8 and 9). A root that renders closed is left alone.
 */
export function adoptOverlay(root, panel, dismiss, layer) {
  if (!root.classList.contains('is-open')) return;
  const level = paintedLayer(root, layer);
  place(root, panel, dismiss, level, (page) => {
    const at = page.stack.findIndex((e) => e.layer > level
      || (e.layer === level && (e.root.compareDocumentPosition(root) & PRECEDING)));
    return at === -1 ? page.stack.length : at;
  });
}

/** Take an overlay off the page, wherever in the stack it sits. */
export function popOverlay(root) {
  const doc = root.ownerDocument;
  const page = pageOf(doc);
  const at = page.stack.findIndex((e) => e.root === root);
  if (at !== -1) page.stack.splice(at, 1);
  sync(doc);
}

/**
 * Recompute from what is still on the page. The wiring calls this, and the
 * wiring runs on every re-render, so an overlay destroyed while open cannot
 * leave the page inert with no node left to hand it back.
 */
export function syncOverlays(doc = document) {
  sync(doc);
}

/**
 * Hand focus back to `el`. The overlay was open while the page carried on, so
 * the element it came from may be detached by now — and focus() on a detached
 * node is a silent no-op that leaves the reader with no place on the page. Look
 * for whatever inherited its identity in the re-render, then give up to the page.
 */
export function returnFocus(el, doc) {
  const live = el && !el.isConnected && el.id ? doc?.getElementById(el.id) : el;
  if (live && live.isConnected && typeof live.focus === 'function') { live.focus(); return; }
  doc?.body?.focus?.();
}

// Trap Tab within the panel while open; wrap at both ends, and pull focus back
// in when it has fallen outside the panel altogether.
export function trapTab(panel, e) {
  if (e.key !== 'Tab' || !panel) return;
  const items = focusablesIn(panel);
  if (!items.length) { e.preventDefault(); panel.focus(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const active = (panel.ownerDocument || document).activeElement;
  if (!panel.contains(active)) {
    e.preventDefault(); (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && (active === first || active === panel)) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault(); first.focus();
  }
}
