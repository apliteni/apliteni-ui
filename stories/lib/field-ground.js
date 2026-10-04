// What ground a field sits on, read rather than assumed — shared by the two gates
// over it, stories/field-ground.test.js and react/src/field-ground.test.tsx.
//
// Both ask the same question of a field: is the ground under it the page's own, or
// a surface somebody painted for it. Only the mounting differs — the vanilla gate
// calls a render fn for an HTML string, the React one mounts a component tree —
// which is why the walks are per workspace and this reading is not.
// Share the calculation but check each workspace separately.
//
// Cause and numbers: docs/specification.md#colour-and-contrast. Raised by Artur in
// round r28 of #551 — "Disabled fields almost invisible because of that."

import {
  composite, effectiveBackground, fadeOnto, parseColour, ratio, selectorPath,
} from './contrast.js';

/**
 * What the kit calls a field: the three form controls, plus the two that paint a
 * box of their own out of the same three tokens.
 *
 * Written once here so neither gate can drift to its own list and go on passing
 * over a control the other measures.
 */
export const FIELD = '.ui-input, .ui-select, .ui-textarea, .ui-check input, .ui-switch__track';

export const hex = (colour) => `#${colour.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
export const same = (a, b) => hex(a) === hex(b);

/**
 * One field's reading, or `null` when its ground is an image — nobody's to measure.
 *
 * `page` is the theme's `--bg` parsed once by the caller. `styleOf` is the lookup
 * to resolve a node with: makeStyleCache(win).of in the vanilla walk, an uncached
 * call in React's, where the tree is mounted fresh for every story anyway.
 *
 * The control's own colours are each mixed toward the ground it sits on by whatever
 * opacity it is drawn at, so a faded control's fill no longer hides the ground and
 * its ink is read on the result. #564 is why that matters: a browser that fades a
 * disabled control takes its edge and its words down together, and a colour the kit
 * sets cannot outrank a property it does not. `fade` is the reading that answers it.
 */
export function readField(el, win, { page, story, styleOf = (node) => win.getComputedStyle(node) }) {
  const ground = el.parentElement && effectiveBackground(el.parentElement, win, styleOf);
  if (!Array.isArray(ground)) return null;
  // The cache answers only for the properties it was asked to hold, and a border
  // colour is not one of them, so the control's own reading is taken live.
  const computed = win.getComputedStyle(el);
  const fade = Number(computed.opacity);
  let fill = parseColour(computed.backgroundColor);
  if (fill && fill[3] < 0.999) fill = composite(fill, ground);
  fill = fadeOnto(fill, fade, ground);
  const border = fadeOnto(parseColour(computed.borderTopColor), fade, ground);
  // The label carries the ink of a checkbox or a switch; the box carries its own.
  const inkOwner = el.matches('.ui-check input, .ui-switch__track') ? (el.closest('label') || el) : el;
  const own = win.getComputedStyle(inkOwner);
  const inkOn = fill && fill[3] >= 0.999 ? fill : ground;
  const ink = fadeOnto(parseColour(own.color), Number(own.opacity), inkOn);
  const path = selectorPath(el);
  return {
    story,
    path,
    leaf: path.split(' > ').pop(),
    disabled: el.disabled === true || el.hasAttribute('disabled'),
    onPage: same(ground, page),
    groundRgb: ground,
    fade: Number.isFinite(fade) ? fade : 1,
    ground: hex(ground),
    fill: fill ? hex(fill) : null,
    border: border && border[3] > 0 ? hex(border) : null,
    edge: border && border[3] > 0 ? Number(ratio(border, ground).toFixed(2)) : null,
    ink: ink ? Number(ratio(ink, inkOn).toFixed(2)) : null,
  };
}

/**
 * The problem lines a set of readings produces. One expression, so each gate's
 * claim and its mutation run the same code rather than two spellings of it.
 */
export const stranded = (fields) => fields.filter((f) => f.onPage).map((f) => `${f.story} → ${f.path}`);
