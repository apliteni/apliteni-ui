// Where a floating panel goes and how big it may be: the dropdown's placement, shared
// by the vanilla wiring and the React <Dropdown> (#429 moved it out of
// src/components/dropdown.js, so it outlives the vanilla wiring). The functions read
// and write the panel's DOM; they hold no state of their own.
// why: docs/components.md#the-dropdown-panel
import { dropdownAvail, dropdownStop } from './dropdown.js';
import { transitionMs, prefersReducedMotion } from '../motion.js';

/** The window a box is measured in. A panel in a frame is laid out against the
 *  frame's viewport, not the top page's. */
export const ddViewOf = (node) => node.ownerDocument?.defaultView || window;

// The trigger-to-panel offset is --ui-dropdown-gap in src/styles/dropdown.css.
// This is the fallback for a document that has not loaded the sheet;
// src/components/dropdown.test.js pins the two to each other.
const DD_GAP = 9;

export function ddGap(panel) {
  const declared = parseFloat(ddViewOf(panel).getComputedStyle(panel).getPropertyValue('--ui-dropdown-gap'));
  return Number.isFinite(declared) ? declared : DD_GAP;
}

// The least a panel keeps between itself and the edge of its view. The number is
// --ui-dropdown-edge in src/styles/dropdown.css, and this is the fallback for a
// document that has not loaded the sheet, as DD_GAP is for the offset.
const DD_EDGE = 8;

function ddEdge(panel) {
  const declared = parseFloat(ddViewOf(panel).getComputedStyle(panel).getPropertyValue('--ui-dropdown-edge'));
  return Number.isFinite(declared) ? declared : DD_EDGE;
}

// The room a panel that opens down keeps between its end and the end of the Modal
// or Drawer body that holds it, so its shadow fades before the body clips it. The
// number is --ui-dropdown-shade in src/styles/dropdown.css.
const DD_SHADE = 48;

function ddShade(panel) {
  const declared = parseFloat(ddViewOf(panel).getComputedStyle(panel).getPropertyValue('--ui-dropdown-shade'));
  return Number.isFinite(declared) ? declared : DD_SHADE;
}

// The least height a capped panel keeps, below which it would rather spend the
// edge inset than shrink further. The number is --ui-dropdown-min in
// src/styles/dropdown.css. #489
const DD_MIN = 120;

export function ddMin(panel) {
  const declared = parseFloat(ddViewOf(panel).getComputedStyle(panel).getPropertyValue('--ui-dropdown-min'));
  return Number.isFinite(declared) ? declared : DD_MIN;
}

/** The width a panel has to stay inside: the LAYOUT viewport, which is what both
 *  `position: fixed` and a page's scrollable width are measured against. A classic
 *  scrollbar is in `innerWidth` and not in the box either of those means, so an
 *  end-anchored panel written from `innerWidth` sat a scrollbar's width inside its
 *  trigger. The fallback is for a view that lays nothing out, JSDOM among them. */
export const ddViewWidth = (panel) => {
  const view = ddViewOf(panel);
  return view.document?.documentElement?.clientWidth || view.innerWidth || 0;
};

/* The kit's menu floor, the one `.ui-dropdown__panel` writes. The stylesheets
 * carry the same number; stories/filter-bar-fit.test.js reads all of them and
 * fails when one drifts. why: src/styles/dropdown.css */
export const DD_MENU_FLOOR = 240;

/** The floor a panel asks for in the sheet, or null. A separate name from the
 *  floor this fit writes back: one that read its own output would pin a menu at
 *  whatever a narrow row once allowed. why: src/styles/filter-bar.css */
function ddPanelAsk(panel) {
  const view = panel?.ownerDocument?.defaultView;
  if (!panel || typeof view?.getComputedStyle !== 'function') return null;
  const asked = Number.parseFloat(view.getComputedStyle(panel).getPropertyValue('--ui-filter-panel-ask'));
  return Number.isFinite(asked) && asked > 0 ? asked : null;
}

/** The `.ui-dropdown__panel` inside a dropdown, by class rather than by data
 *  attribute: the fit's subjects are the panels the stylesheet's rules match, and
 *  filter-panel-fit.test.js hands this function hand-made elements. */
const ddFitPanelOf = (dd) => (typeof dd?.querySelector === 'function'
  ? dd.querySelector('.ui-dropdown__panel') : null);

/**
 * The filter row an anchored menu is measured inside, or null outside one.
 *
 * Two panels in a row are anchored at a trigger of their own: a chip's values, and
 * the add control's catalogue, which says so by asking for a width. The slide
 * filterPanelFit() computes is measured from that trigger's offset along the row,
 * which is arithmetic for either. A panel anchored to the row itself is neither,
 * and sizes itself.
 *
 * Published because `<Dropdown>` asks the same question — the same row to observe,
 * the same panels to hold through a close — and a second copy of this rule would
 * drift from the stylesheet. why: src/styles/filter-bar.css
 *
 * @param {Element} dd a `.ui-dropdown` that may be inside a filter row
 * @returns {Element|null} the `.ui-toolbar` or `.ui-filter-bar` this menu's fit is measured in
 */
export function filterPanelRow(dd) {
  if (typeof dd?.closest !== 'function') return null;
  const chip = dd.closest('.ui-filter-bar__chip');
  const bar = chip ? chip.closest('.ui-filter-bar') : ddPanelAsk(ddFitPanelOf(dd)) && dd.closest('.ui-filter-bar');
  // A bar in a toolbar is only as wide as its chips, so one chip's menu was that chip's
  // width. The toolbar's line is the row. #757
  return bar ? bar.closest('.ui-toolbar') || bar : null;
}

/**
 * Where a filter chip's menu may sit. #484 bounds the panel to its trigger, so a
 * chip printing its value alone (#536) left a 48px menu breaking words
 * mid-letter — #549. An OPEN panel takes the floor instead and slides along the
 * row when the room on the side it opens from is short; shut, it keeps the
 * trigger's width, which is why #467 needs no measuring at all.
 *
 * A panel is anchored at one edge of its dropdown — its inline end when it
 * carries `is-end` — so room is measured from that edge and the slide goes the
 * other way. Measuring an end-anchored panel forwards put one off the page.
 * why: docs/components.md#a-filter-row-holds-its-panels
 *
 * A menu that is not a chip's takes this arithmetic by asking, on its own panel,
 * for a width: `--ui-filter-panel-ask`. why: src/styles/filter-bar.css
 *
 * @param {Element} dd a `.ui-dropdown` that may be inside a filter row
 * @param {number} [floor] the width to reach for; the panel's own ask, else the kit's
 * @returns {{room: number, shift: number, floor: number, end: boolean}|null}
 */
export function filterPanelFit(dd, floor) {
  const panel = ddFitPanelOf(dd);
  // Which menus are this function's subjects is filterPanelRow()'s question.
  const bar = filterPanelRow(dd);
  if (!bar || typeof bar.getBoundingClientRect !== 'function') return null;
  const row = bar.getBoundingClientRect();
  const box = dd.getBoundingClientRect();
  const end = !!panel?.classList?.contains('is-end');
  // A row narrower than the floor decides the width; nothing may leave the row.
  const want = Math.min(floor ?? ddPanelAsk(panel) ?? DD_MENU_FLOOR, row.width);
  const ahead = end
    ? Math.max(0, box.right - row.left)    // an end-anchored panel grows backwards
    : Math.max(0, row.right - box.left);
  const slack = end
    ? Math.max(0, row.right - box.right)   // …and slides towards the row's end
    : Math.max(0, box.left - row.left);
  const shift = Math.min(slack, Math.max(0, want - ahead));
  return { room: ahead + shift, shift, floor: want, end };
}

/**
 * How tall a panel may be: the room between its trigger and the viewport edge,
 * from dropdownAvail() in src/logic/dropdown.js — one calculation, so the
 * vanilla wiring and the React `<Dropdown>` cannot disagree about where a panel
 * ends. Measured from the trigger, not the panel, the way dropdownViewportFit()
 * is measured from the panel and not the trigger: each is the box the number it
 * answers actually depends on. `null` when there is nothing to measure.
 * why: docs/components.md#the-dropdown-panel
 *
 * @param {Element} dd the `[data-dropdown]` container the trigger lives in
 * @param {Element} panel a `[data-dropdown-panel]`, for its gap/edge/min and its
 *   `is-up` direction
 */
export function dropdownHeightFit(dd, panel) {
  const trigger = dd?.querySelector?.('[data-dropdown-trigger]');
  if (!trigger || typeof trigger.getBoundingClientRect !== 'function' || !panel) return null;
  const t = trigger.getBoundingClientRect();
  const view = ddViewOf(panel);
  // Inside a scrolling body the panel may take the body less its field: dropdownReveal()
  // scrolls the body to show it, so the room is the body's, not what is left under the
  // trigger now. A lifted panel is measured against the viewport, as a portalled one is.
  const fit = ddLifted(panel) ? null : ddBodyFit(dd, panel);
  if (fit && !fit.lift) return fit.room;
  // A lifted panel is measured from where the body is about to bring its trigger.
  const by = ddLifted(panel) && !ddUp(panel) ? dd.__ddLiftBy || 0 : 0;
  return dropdownAvail({
    anchorTop: t.top - by,
    anchorBottom: t.bottom - by,
    viewport: view.innerHeight,
    gap: ddGap(panel),
    inset: ddEdge(panel),
    min: ddMin(panel),
    up: ddUp(panel),
  });
}

/* A panel the wiring lifted out of a body too short to hold it: `position: fixed`, so
 * it opens over the body the way a portalled panel does. The value is the side it
 * opens on. why: docs/components.md#the-dropdown-panel */
export const ddLifted = (panel) => typeof panel?.hasAttribute === 'function' && panel.hasAttribute('data-dd-lifted');
const ddUp = (panel) => (ddLifted(panel)
  ? panel.getAttribute('data-dd-lifted') === 'up'
  : !!panel?.classList?.contains('is-up'));

/** Every ancestor that scrolls the block axis, from a wrapper to the Modal or Drawer
 *  body round it, with the part of them a reader can see: their padding boxes clipped
 *  to each other and to the viewport. `el` is the one whose end is that part's end,
 *  which is the one that has to scroll. `height` is the least any of them shows, which
 *  is the room a panel has whatever they are scrolled to. `null` for a portalled panel
 *  (it is not inside them), a filter row (its row already bounds its panels) and a
 *  trigger with none. */
function ddScrollBox(dd, panel) {
  if (dd.__ddPanel || ddInFilterRow(panel)) return null;
  const view = ddViewOf(panel);
  const els = [];
  let top = 0;
  let bottom = view.innerHeight;
  let height = view.innerHeight;
  let el = null;
  for (let at = dd.parentElement; at && at !== at.ownerDocument.body; at = at.parentElement) {
    const overflow = view.getComputedStyle(at).overflowY;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;
    const start = at.getBoundingClientRect().top + at.clientTop;
    const end = start + at.clientHeight;
    els.push(at);
    top = Math.max(top, start);
    if (end <= bottom) { bottom = end; el = at; }
    height = Math.min(height, at.clientHeight);
  }
  if (!els.length || !(bottom > top)) return null;
  return { el: el || els[0], els, top, bottom, height };
}

/* Does a body round the panel hide part of its width? Only `hidden` and `clip` count:
 * a body that scrolls across still shows the rest. */
function ddClipsAcross(box, panel) {
  const view = ddViewOf(panel);
  const p = panel.getBoundingClientRect();
  return box.els.some((at) => {
    const overflow = view.getComputedStyle(at).overflowX;
    if (overflow !== 'hidden' && overflow !== 'clip') return false;
    const left = at.getBoundingClientRect().left + at.clientLeft;
    return p.left < left - 0.5 || p.right > left + at.clientWidth + 0.5;
  });
}

/* The top of what has to stay in view over the panel: the field's label when the
 * trigger has one above it, so the reader still sees what the list is for. */
function ddAnchorTop(dd, t) {
  const label = dd.closest?.('.ui-field')?.querySelector(':scope > .ui-field__label');
  const top = label?.getBoundingClientRect?.().top;
  return Number.isFinite(top) && top < t.top ? top : t.top;
}

/* The height a panel's rows ask for, uncapped: its own box plus whatever it and its
 * list hold past their ends. */
function ddContentHeight(panel) {
  let h = panel.offsetHeight + panel.scrollHeight - panel.clientHeight;
  const list = panel.querySelector?.('.ui-dropdown__list');
  if (list) h += list.scrollHeight - list.clientHeight;
  return h;
}

/**
 * How a panel fits the body it opens in. The body has to hold the field's label and
 * trigger, the gap, the panel and the room under it. That room is 48px where the body
 * can spare it, so the shadow fades before the body clips it, and it is spent down to
 * the 8px edge where the body cannot. Where even then the body cannot hold the floor
 * (or the whole list, when that is shorter), the panel is lifted out of the body.
 * Measured from the heights alone, so the answer is the same however far the body is
 * scrolled. A body that clips across and is narrower than the panel lifts it too: no
 * scroll shows what it cuts off, as the shell's rail cut the account menu (#736).
 * `null` with no scrolling body.
 */
function ddBodyFit(dd, panel) {
  const trigger = dd.querySelector('[data-dropdown-trigger]');
  const box = ddScrollBox(dd, panel);
  if (!box || !trigger) return null;
  if (ddClipsAcross(box, panel)) return { box, lift: true };
  const t = trigger.getBoundingClientRect();
  const edge = ddEdge(panel);
  const gap = ddGap(panel);
  const need = Math.min(ddMin(panel), ddContentHeight(panel));
  if (ddUp(panel)) {
    const room = box.height - 2 * edge - t.height - gap;
    return room >= need ? { box, end: edge, room, anchor: t.top } : { box, lift: true };
  }
  const anchor = ddAnchorTop(dd, t);
  const spare = box.height - edge - (t.bottom - anchor) - gap - need;
  const end = Math.max(edge, Math.min(ddShade(panel), spare));
  const room = box.height - edge - (t.bottom - anchor) - gap - end;
  return room >= need ? { box, end, room, anchor } : { box, lift: true };
}

/**
 * Lift an open panel out of a body too short to hold it, or put a lifted one back.
 * A lifted panel is `position: fixed` against the viewport and opens over the body,
 * below its trigger or, where the viewport has more room above, over it, the way a
 * portalled panel opens. It follows its trigger while the body scrolls. Call it with
 * the panel open and laid out, before sizing it. Returns whether the panel is lifted.
 * why: docs/components.md#the-dropdown-panel
 */
export function dropdownLift(dd, panel) {
  if (!dd || !panel?.style || dd.__ddPanel) return false;
  const lift = !!ddBodyFit(dd, panel)?.lift;
  if (!lift) {
    if (ddLifted(panel)) {
      panel.removeAttribute('data-dd-lifted');
      for (const side of ['top', 'bottom', 'left', 'right']) panel.style.removeProperty(side);
      panel.style.removeProperty('inline-size');
    }
    return false;
  }
  dd.__ddLiftBy = ddLiftPlan(dd, panel);
  ddPlaceLifted(dd, panel);
  return true;
}

/* How far the body scrolls to give a lifted panel that opens down the viewport's room
 * under its trigger: no further than the field's label reaching the body's top, and no
 * further than the panel needs. 0 for a panel that opens up. The label stays in view,
 * where a panel lifted over it would cover it. */
function ddLiftPlan(dd, panel) {
  const trigger = dd.querySelector('[data-dropdown-trigger]');
  const box = ddScrollBox(dd, panel);
  if (!trigger || !box || panel.classList.contains('is-up')) return 0;
  const t = trigger.getBoundingClientRect();
  const edge = ddEdge(panel);
  const rise = Math.max(0, ddAnchorTop(dd, t) - edge - box.top);
  const want = Math.min(ddContentHeight(panel), ddCeilingOf(panel));
  const over = t.bottom + ddGap(panel) + want + edge - ddViewOf(panel).innerHeight;
  return Math.max(0, Math.min(rise, Math.ceil(over)));
}

/* The tallest a panel may be before the room has a say: the cap a consumer asked for,
 * which under a search field is the list's and the field over it, or the standard cap. */
function ddCeilingOf(panel) {
  const view = ddViewOf(panel);
  const list = panel.querySelector?.('.ui-dropdown__list');
  const own = parseFloat((list || panel).style?.getPropertyValue('--ui-dropdown-cap'));
  if (Number.isFinite(own)) return own + (list ? panel.offsetHeight - list.offsetHeight : 0);
  const max = parseFloat(view.getComputedStyle(panel).getPropertyValue('--ui-dropdown-max'));
  return Number.isFinite(max) ? max : Infinity;
}

function ddPlaceLifted(dd, panel) {
  const trigger = dd.querySelector('[data-dropdown-trigger]');
  if (!trigger) return;
  const view = ddViewOf(panel);
  const t = trigger.getBoundingClientRect();
  const gap = ddGap(panel);
  // Below is counted after the body has scrolled the field up (ddLiftPlan()).
  const below = view.innerHeight - t.bottom - gap + (dd.__ddLiftBy || 0);
  const above = t.top - gap;
  // The configured side, unless it cannot hold the floor and the other side has more.
  const configured = panel.classList.contains('is-up');
  const mine = configured ? above : below;
  const other = configured ? below : above;
  const up = mine < Math.min(ddMin(panel), ddContentHeight(panel)) && other > mine ? !configured : configured;
  const s = panel.style;
  s.translate = '';
  if (panel.getAttribute('data-dd-lifted') !== (up ? 'up' : 'down')) {
    const held = s.transition;
    s.transition = 'none';
    panel.setAttribute('data-dd-lifted', up ? 'up' : 'down');
    view.getComputedStyle(panel).transform;
    s.transition = held;
  }
  ddWriteCeiling(panel);
  if (dd.parentElement?.classList.contains('ui-field')) s.inlineSize = `${t.width}px`;
  const width = panel.getBoundingClientRect().width;
  const end = panel.classList.contains('is-end');
  const shift = dropdownViewportFit(panel, { left: end ? t.right - width : t.left, width })?.shift || 0;
  const left = (end ? t.right - width : t.left) + shift;
  s.right = 'auto';
  s.left = `${left}px`;
  if (up) { s.top = 'auto'; s.bottom = `${view.innerHeight - t.top + gap}px`; }
  else { s.bottom = 'auto'; s.top = `${t.bottom + gap}px`; }
  /* An ancestor with a transform holds a fixed box too, and then the numbers above are
   * read from its corner. Measured and taken back, so the panel lands where they say. */
  const r = panel.getBoundingClientRect();
  if (!(r.width > 0)) return;
  const dx = r.left - left;
  const dy = up ? r.bottom - (t.top - gap) : r.top - (t.bottom + gap);
  if (Math.abs(dx) > 0.5) s.left = `${left - dx}px`;
  if (Math.abs(dy) > 0.5) {
    if (up) s.bottom = `${view.innerHeight - t.top + gap + dy}px`;
    else s.top = `${t.bottom + gap - dy}px`;
  }
}

/**
 * Scroll the body an open panel sits in the least distance that shows the whole
 * panel, the room under it and the field's label over it (dropdownHeightFit() makes
 * the panel no taller than that). A body that already shows them does not move. A
 * wrapper inside the body that does not scroll is passed over: the ancestor whose end
 * is the end of what the reader sees is the one scrolled. Instant under
 * `prefers-reduced-motion`. Returns the distance scrolled.
 * why: docs/components.md#the-dropdown-panel
 */
export function dropdownReveal(dd, panel) {
  const by = ddRevealOnce(dd, panel);
  /* A shut panel is held 6px off its place and the body cannot scroll past where
   * it ends, so the first scroll falls up to 6px short. One more look once the
   * panel has settled. */
  if (by && panel.style) {
    setTimeout(() => { if (dd.classList.contains('open')) ddRevealOnce(dd, panel); },
      transitionMs(panel) + DD_EXIT_SLACK_MS);
  }
  return by;
}

/* A body cannot scroll past the end of what it holds, and a panel is the last thing
 * in it: the panel's own bottom is the end. Without more below it, the room the
 * reveal keeps cannot be reached at the end of the body. The sheet draws a 1px spot
 * at the distance written here, below the trigger. `end` is that room: the body's,
 * or on a page the 8px edge, which the page's own fit keeps, so opening a panel on a
 * page that does not scroll makes it scroll by nothing. why: src/styles/dropdown.css */
function ddReserveEnd(dd, panel, end) {
  if (!dd.style || ddUp(panel) || ddLifted(panel)) return;
  const next = `${ddGap(panel) + panel.offsetHeight + end - 1}px`;
  if (dd.style.getPropertyValue('--ui-dropdown-reach') !== next) dd.style.setProperty('--ui-dropdown-reach', next);
}

/* A shut panel is still laid out, and a box that is laid out counts towards the scroll
 * of what holds it: the end of a Modal or Drawer body, or of a page, scrolled to blank
 * space as tall as the panel. So a shut panel is collapsed, once its fade is over, and
 * its room under it goes with it. The body cannot scroll past where it ends, so
 * collapsing under a reader who is looking at that room would slide the field down by
 * the whole of it: the box stays until the reader has scrolled out of the room, and the
 * field never moves. The panel is given its box back before anything measures it.
 * why: docs/components.md#the-dropdown-panel */
function ddScrollerOf(dd, panel) {
  return ddScrollBox(dd, panel)?.el ?? dd.ownerDocument.scrollingElement;
}

function ddCollapse(dd, panel) {
  const scroller = ddScrollerOf(dd, panel);
  const before = scroller?.scrollTop ?? 0;
  const reach = dd.style?.getPropertyValue('--ui-dropdown-reach') ?? '';
  panel.setAttribute('data-dd-shut', '');
  dd.style?.removeProperty('--ui-dropdown-reach');
  if (!scroller || scroller.scrollTop === before) return true;
  panel.removeAttribute('data-dd-shut');
  if (reach) dd.style.setProperty('--ui-dropdown-reach', reach);
  if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: before, behavior: 'instant' });
  else scroller.scrollTop = before;
  return false;
}

/**
 * Give a panel its box while it is open, and take the box away once it has shut and
 * its fade is over. Returns a function that cancels a collapse still waiting.
 * Does nothing for a portalled panel, which is `position: fixed` and adds no scroll,
 * and for a panel in a filter row, which its row already bounds.
 * why: docs/components.md#the-dropdown-panel
 *
 * @param {Element} dd the `[data-dropdown]` container
 * @param {Element} panel its `[data-dropdown-panel]`
 * @param {boolean} open whether the panel is opening (`true`) or has shut (`false`)
 * @param {number} [wait] ms to wait before collapsing; the panel's own fade by default
 */
export function dropdownRest(dd, panel, open, wait) {
  if (!dd || !panel?.style || dd.__ddPanel || ddInFilterRow(panel)) return () => {};
  dd.__ddRest?.();
  if (open) {
    panel.removeAttribute('data-dd-shut');
    return () => {};
  }
  let timer = null;
  let off = null;
  const cancel = () => {
    clearTimeout(timer);
    off?.();
    dd.__ddRest = null;
  };
  const attempt = () => {
    const done = !dd.isConnected || dd.classList.contains('open') || ddCollapse(dd, panel);
    if (done) cancel();
    return done;
  };
  const start = () => {
    timer = null;
    if (attempt()) return;
    const scroller = ddScrollerOf(dd, panel);
    const target = scroller === dd.ownerDocument.scrollingElement ? ddViewOf(panel) : scroller;
    target.addEventListener('scroll', attempt, { passive: true });
    off = () => target.removeEventListener('scroll', attempt);
  };
  dd.__ddRest = cancel;
  const ms = wait ?? transitionMs(panel) + DD_EXIT_SLACK_MS;
  if (ms > 0) timer = setTimeout(start, ms);
  else start();
  return cancel;
}

function ddRevealOnce(dd, panel) {
  const trigger = dd?.querySelector?.('[data-dropdown-trigger]');
  if (!trigger || typeof trigger.getBoundingClientRect !== 'function' || !panel) return 0;
  if (ddLifted(panel)) return ddRevealLifted(dd, panel, trigger);
  const fit = ddBodyFit(dd, panel);
  if (!fit) {
    // A page is held the same way: the shut panel lifts 6px, which would end the page 6px
    // sooner under a reader at its end.
    if (!dd.__ddPanel && !ddInFilterRow(panel)) ddReserveEnd(dd, panel, ddEdge(panel));
    // Focusing End can scroll only far enough to show the row. Finish the page
    // scroll so the open panel keeps its edge and the row's outline has room.
    if (!dd.__ddPanel && !ddLifted(panel) && !ddInFilterRow(panel)
      && panel.contains(dd.ownerDocument.activeElement?.closest?.('[data-dd-item]'))) {
      const view = ddViewOf(panel);
      const by = Math.ceil(panel.getBoundingClientRect().bottom + ddEdge(panel) - view.innerHeight);
      if (by > 0) { view.scrollBy({ top: by, behavior: 'instant' }); return by; }
    }
    return 0;
  }
  if (fit.lift) return 0;
  const { box, end } = fit;
  ddReserveEnd(dd, panel, end);
  const t = trigger.getBoundingClientRect();
  const edge = ddEdge(panel);
  const h = panel.offsetHeight;
  const up = ddUp(panel);
  const top = up ? t.top - ddGap(panel) - h - edge : ddAnchorTop(dd, t) - edge;
  const bottom = (up ? t.bottom : t.bottom + ddGap(panel) + h) + end;
  let by = 0;
  if (bottom > box.bottom) by = Math.min(bottom - box.bottom, top - box.top);
  else if (top < box.top) by = top - box.top;
  by = Math.round(by);
  if (!by) return 0;
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  /* The ancestor whose end the reader sees takes the scroll. What it has no room to
   * take goes to the others, nearest first, each up to the room it has. */
  const move = (el, d) => {
    if (typeof el.scrollBy === 'function') el.scrollBy({ top: d, behavior });
    else el.scrollTop += d;
  };
  const room = (el, d) => (d > 0 ? el.scrollHeight - el.clientHeight - el.scrollTop : -el.scrollTop);
  const first = room(box.el, by);
  move(box.el, by);
  let left = by > 0 ? by - Math.max(0, Math.min(by, first)) : by - Math.min(0, Math.max(by, first));
  for (const el of box.els) {
    if (el === box.el || !left) continue;
    const can = left > 0 ? Math.max(0, Math.min(left, room(el, left))) : Math.min(0, Math.max(left, room(el, left)));
    if (can) { move(el, can); left -= can; }
  }
  return by;
}

/* The scroll ddLiftPlan() asked for. The body may hold too little to scroll that far, so
 * the reserved spot is written to where the body's end then has to be. */
function ddRevealLifted(dd, panel, trigger) {
  const by = dd.__ddLiftBy || 0;
  const box = by && !ddUp(panel) ? ddScrollBox(dd, panel) : null;
  if (!box) return 0;
  const t = trigger.getBoundingClientRect();
  dd.style?.setProperty('--ui-dropdown-reach', `${Math.max(0, box.bottom + by - t.bottom - 1)}px`);
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  if (typeof box.el.scrollBy === 'function') box.el.scrollBy({ top: by, behavior });
  else box.el.scrollTop += by;
  return by;
}

/**
 * Stop an open panel's height where it cuts a row through the middle. A height that
 * falls between two rows, or in a row's padding, shows a complete last label and the
 * list looks whole; a half row says it goes on. The height is the one the panel gets:
 * the smaller of its cap and the room the wiring measured, so a panel the room limits
 * is cut the same way as one the cap limits. The rows are measured as they are drawn,
 * so every row height the kit has, with a description or without and under a search
 * field or not, stops at its own half row. A cap a consumer asked for (`scroll: <n>`)
 * is kept to its number where it is the smaller, and a panel that fits has nothing to
 * cut. Call it with the panel laid out and its room written.
 * why: docs/components.md#the-dropdown-panel
 */
export function dropdownSnap(dd, panel) {
  if (!panel?.style) return;
  const view = ddViewOf(panel);
  const set = (v) => {
    const next = v == null ? '' : `${v}px`;
    if (panel.style.getPropertyValue('--ui-dropdown-fit') === next) return;
    if (next) panel.style.setProperty('--ui-dropdown-fit', next);
    else panel.style.removeProperty('--ui-dropdown-fit');
  };
  const rows = Array.from(panel.querySelectorAll('[data-dd-item]')).filter((el) => el.getClientRects().length);
  let clip = panel;
  for (let el = rows[0]?.parentElement; el && el !== panel; el = el.parentElement) {
    const overflow = view.getComputedStyle(el).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') { clip = el; break; }
  }
  // The consumer's cap is on the panel, or on the list under a search field, where the
  // panel is that cap and the field over it.
  const own = parseFloat((clip === panel ? panel : clip).style.getPropertyValue('--ui-dropdown-cap'));
  const chrome = clip === panel ? 0 : panel.offsetHeight - clip.offsetHeight;
  const ceiling = ddCeilingOf(panel);
  const room = parseFloat(panel.style.getPropertyValue('--ui-dropdown-avail'));
  /* In a body, the room under the panel may be spent down to the 8px edge to reach the
   * next half row up, rather than stop a whole row short of the room. */
  const fit = room < ceiling && !ddLifted(panel) ? ddBodyFit(dd, panel) : null;
  const spare = fit && !fit.lift ? fit.end - ddEdge(panel) : 0;
  const height = Number.isFinite(room) ? Math.min(ceiling, room) : ceiling;
  if (!rows.length || !Number.isFinite(height)) { set(null); return; }
  // Kept to the consumer's number where it is the one that binds.
  if (Number.isFinite(own) && !(room < ceiling)) { set(chrome ? ceiling : null); return; }
  const box = panel.getBoundingClientRect();
  const clipBox = clip.getBoundingClientRect();
  if (!(box.height > 0)) return;
  let scrolled = 0;
  for (let el = rows[0].parentElement; el; el = el.parentElement) {
    scrolled += el.scrollTop;
    if (el === panel) break;
  }
  const edge = clip === panel ? panel.offsetHeight - panel.clientHeight - panel.clientTop : box.bottom - clipBox.bottom;
  const lead = clip === panel ? panel.clientTop : clipBox.top - box.top;
  const stop = dropdownStop({
    rows: rows.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - box.top + scrolled, height: r.height };
    }),
    below: edge,
    content: lead + clip.scrollHeight + edge,
    ceiling: height,
    reach: Math.min(ceiling, height + spare),
  });
  set(stop ?? (chrome && Number.isFinite(own) ? ceiling : null));
  if (stop > room) panel.style.setProperty('--ui-dropdown-avail', `${stop}px`);
}

/* A few frames past the sheet's own end, so the timer never cuts the fade's last
 * frame. The number the dialogs' exit uses. */
export const DD_EXIT_SLACK_MS = 50;

/** The shift a panel is already carrying, the one ddFitViewport() wrote. Taken
 *  off before the next measurement, so asking twice answers the same as asking
 *  once — the fit is measured from where the sheet puts the panel, not from where
 *  the last fit left it. */
const ddShiftOf = (panel) => parseFloat(panel.style?.translate) || 0;

/** The widest a panel may be: the view it is laid out in, less the keep-out it owes
 *  each edge. It is the bound a PORTALLED panel needs, whose room is the whole view
 *  because it is `position: fixed`; an in-place one is bounded by its trigger's own
 *  block, once `overflow-wrap` has let its long tokens break.
 *  why: src/styles/dropdown.css */
const ddCeiling = (panel) => Math.max(0, ddViewWidth(panel) - 2 * ddEdge(panel));

/** Write the ceiling, BEFORE the panel is measured: capping a panel's width
 *  changes the width a shift would be calculated from. The sheet reads the
 *  property and keeps its own 240px floor where the two disagree, which is a view
 *  narrower than 2 × edge + 240. why: src/styles/dropdown.css */
export function ddWriteCeiling(panel) {
  const max = ddCeiling(panel);
  panel.style?.setProperty('--ui-dropdown-ceiling', max > 0 ? `${max}px` : '');
}

/** A panel a filter row bounds to the row itself. It is nothing the viewport fit
 *  has to measure, and nothing the wiring has to watch for it.
 *  why: docs/components.md#a-filter-row-holds-its-panels */
export const ddInFilterRow = (panel) => typeof panel?.closest === 'function' && !!panel.closest('.ui-filter-bar');

/**
 * How wide a panel may be and how far along the inline axis it has to move to stay
 * inside the view it is laid out in: `left` at or after the edge, `right` at or
 * before the far one.
 *
 * `align` decides the edge of the trigger a panel hangs from, and that is all it
 * decides — on a phone it moves the clipping from one side to the other rather
 * than removing it, which is #572. So the preferred edge is measured and kept
 * whenever it fits, and overridden only when it does not: the same shape
 * `direction: 'auto'` gives the block axis.
 *
 * Measured, not derived from the classes: the panel's own box is where the sheet
 * has actually put it, so one answer covers `left: 0`, `.is-end`'s `right: 0` and
 * the topbar's bespoke menus alike, and a rule nobody here has read about cannot
 * send it the wrong way.
 *
 * A panel inside a `.ui-filter-bar` is not this function's subject: a filter row
 * bounds its panels to the row itself, which already holds them inside the view.
 * why: docs/components.md#a-filter-row-holds-its-panels
 *
 * @param {Element} panel a `[data-dropdown-panel]`, as the sheet has placed it
 * @param {{left: number, width: number}} [at] the box the caller is about to
 *   write, for a panel it places itself — the portal, whose own box is still the
 *   one the last call left it at
 * @returns {{shift: number, left: number, width: number, view: number, edge: number,
 *   max: number}|null}
 */
export function dropdownViewportFit(panel, at) {
  if (!panel || typeof panel.getBoundingClientRect !== 'function') return null;
  if (!at && ddInFilterRow(panel)) return null;
  const view = ddViewWidth(panel);
  const box = panel.getBoundingClientRect();
  const width = at ? at.width : box.width;
  const left = at ? at.left : box.left - ddShiftOf(panel);
  if (!(view > 0) || !(width > 0) || !Number.isFinite(left)) return null;
  const slack = view - width;
  /* The gap is what a panel can afford rather than what it asks for. A panel still
     wider than its view — the floor, inside a view too narrow for it — has no room
     for one and cannot honour both edges at all; it keeps its start, so the reader
     meets the beginning of the rows and not the end. */
  const edge = Math.max(0, Math.min(ddEdge(panel), slack / 2));
  const want = Math.max(edge, Math.min(left, slack - edge));
  return { shift: want - left, left: want, width, view, edge, max: ddCeiling(panel) };
}
