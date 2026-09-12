// Overlay primitives — the page state the kit's modal surfaces share. Drawer and Confirm
// are the same problem twice: content over a scrim that owns the keyboard until it is
// answered. What is inert, which overlay Escape talks to and where Tab may go are
// properties of the *page*, so they are answered here from one stack per document rather
// than from either component's own storage. Internal — not re-exported from src/index.js.

// What each overlay paints on today: a drawer at `--z-overlay` (styles/drawer.css), a
// command palette one above it (styles/command-palette.css) and a confirm above both
// (styles/confirm.css). Three steps and not two, because at equal levels paint order falls
// back to document order and the overlay that owns the keyboard is then not reliably the
// one the reader can see. A palette is summoned deliberately and must be seen, so it goes
// over a drawer that was already open; a confirm is a question about whatever is under it,
// so it goes over both. Absolute values, not ranks, so a sheet that moves and a table that
// did not is a failed test — stories/overlay-css.test.js holds all three.
export const OVERLAY_LAYER = { drawer: 100, palette: 101, confirm: 102 };

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
    const overlayRoot = n.hasAttribute('data-drawer') || n.hasAttribute('data-confirm')
      || n.hasAttribute('data-cmdk');
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
// entry carries its layer, so the comparisons in the slot pickers never meet undefined.
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
 * Put an overlay on the page. `dismiss` is what Escape calls — pass null for one
 * that refuses to be dismissed, and Escape then does nothing rather than falling
 * through to the overlay underneath.
 *
 * It goes on top of everything it paints over, and under anything painted above
 * it. Opening is history the stack can order by, but only within a layer: an
 * overlay opened under one already on screen — a drawer opened from a palette
 * row, a palette opened while a confirm is up — is not the one the reader is
 * looking at, and giving it Escape and the Tab trap would put the keyboard on a
 * surface that is covered.
 */
export function pushOverlay(root, panel, dismiss, layer) {
  const level = paintedLayer(root, layer);
  place(root, panel, dismiss, level, (page) => {
    const at = page.stack.findIndex((e) => e.layer > level);
    return at === -1 ? page.stack.length : at;
  });
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

// Where an overlay puts focus when it opens: the first stop inside its panel,
// else the panel itself. One rule serves all three, because the kit's own markup
// puts each one's opening target first — a drawer's first control, the palette's
// text box, and the confirm's safe answer, which its panel renders before the
// destructive one.
function initialFocus(panel) {
  return (panel && focusablesIn(panel)[0]) || panel;
}

// What `el` can actually be handed focus, or null when nothing can take it. An
// overlay stays open while the page carries on, so by the time it closes the
// element it came from may be detached — look for whatever inherited its identity
// in the re-render — or sitting in a subtree that a lower overlay has just made
// inert again, where focus() is a silent no-op. <body> is null too: with no
// tabindex it cannot be focused either, and `activeElement === body` is what
// having no focus looks like, which is what an overlay summoned by its hotkey out
// of a page nobody had touched yet records as the place it came from.
function focusTarget(el, doc) {
  const live = el && !el.isConnected && el.id ? doc?.getElementById(el.id) : el;
  if (!live || !live.isConnected || live === live.ownerDocument.body) return null;
  return reachable(live) && typeof live.focus === 'function' ? live : null;
}

/**
 * Take an overlay off the page, wherever in the stack it sits. `opener` is what
 * the caller is about to hand focus back to, which this has to see: one overlay
 * can close over another that is still open, and the opener is then out on a page
 * that lower overlay is holding inert. Nobody would place focus at all, and the
 * reader would be left on <body> looking at a panel that holds neither the
 * keyboard nor the Tab trap — so open the panel now on top where it opens.
 */
export function popOverlay(root, opener) {
  const doc = root.ownerDocument;
  const page = pageOf(doc);
  const at = page.stack.findIndex((e) => e.root === root);
  if (at !== -1) page.stack.splice(at, 1);
  sync(doc);
  const top = page.stack[page.stack.length - 1];
  if (top && opener && !focusTarget(opener, doc)) initialFocus(top.panel)?.focus();
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
 *
 * With another overlay still open, the only place worth having focus is inside
 * it: an opener that overlay is holding inert cannot take focus at all, popOverlay
 * has already opened the panel now on top for exactly that case, and <body> behind
 * a live modal is not somewhere to give up to.
 */
export function returnFocus(el, doc) {
  if (doc && pageOf(doc).stack.length) { focusTarget(el, doc)?.focus(); return; }
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
